// FreeRTOS (ESP32) cooperativo: cada tarefa é um generator com o seu próprio relógio.
// A cada 1 ms o motor corre o loop() principal e depois cada tarefa até ao fim desse ms
// (vTaskDelay/delay avançam o relógio da tarefa e cedem; laços sem espera cedem ao fim
// do ms, como um "time slice"). Filas, semáforos e mutexes bloqueiam por sondagem a cada
// 1 ms (tick de 1 ms, configTICK_RATE_HZ = 1000, como no Arduino-ESP32).
import * as i18n from '../../../../shared/i18n.js'
const MAX_DELAY = 0xffffffff
export const TASK_DELETE = Symbol('vTaskDelete')

export function createRtos({ rt, warnOnce }) {
  const tasks = [] // { id, name, gen, t, prio, core, done, suspended }
  let current = null // tarefa a correr (null = loopTask, o setup()/loop() do Arduino)
  let nextId = 1
  const handles = new Map() // id -> tarefa / fila / semáforo

  const setRef = (ref, v) => {
    if (ref && typeof ref === 'object' && 'v' in ref) {
      const cur = ref.v
      // destino vetor (char buf[16]…): copia os elementos
      if (Array.isArray(cur) && Array.isArray(v)) {
        for (let i = 0; i < cur.length; i++) cur[i] = v[i] ?? 0
      } else ref.v = v
    } else if (Array.isArray(ref) && Array.isArray(v)) for (let i = 0; i < ref.length; i++) ref[i] = v[i] ?? 0
  }
  const copy = (v) => (Array.isArray(v) ? v.slice() : v && typeof v === 'object' && 'v' in v ? copy(v.v) : v)
  const ticksUs = (ticks) => (ticks >= MAX_DELAY ? Infinity : Math.max(0, +ticks || 0) * 1000)

  // espera (cedendo a cada ms) até cond() ou fim do prazo; devolve true/false
  function* waitFor(cond, ticks, what) {
    const until = rt.t + ticksUs(ticks)
    for (;;) {
      if (cond()) return true
      if (rt.t >= until) return false
      if (!current && until === Infinity) warnOnce(`rtos-block-${what}`, i18n.m(`${what} com portMAX_DELAY no loop(): o loop fica bloqueado até chegar um valor.`, `${what} with portMAX_DELAY in loop(): the loop stays blocked until a value arrives.`), 'info')
      rt.t = Math.min(until, Math.floor(rt.t / 1000) * 1000 + 1000)
      if (rt.t >= rt.target) yield
    }
  }

  const obj = (h, kind, fn) => {
    const o = handles.get(h)
    if (!o || o.kind !== kind) throw new Error(i18n.m(`${fn}(): handle inválido (${kind === 'queue' ? 'a fila foi criada com xQueueCreate?' : kind === 'sem' ? 'o semáforo foi criado com xSemaphoreCreate…?' : 'tarefa inexistente'})`, `${fn}(): invalid handle (${kind === 'queue' ? 'was the queue created with xQueueCreate?' : kind === 'sem' ? 'was the semaphore created with xSemaphoreCreate…?' : 'task does not exist'})`))
    return o
  }
  const newHandle = (o) => {
    const id = nextId++
    handles.set(id, { id, ...o })
    return id
  }
  const taskOf = (h) => (h == null || h === 0 ? current : handles.get(h)?.kind === 'task' ? handles.get(h) : null)

  function create(fn, name, stack, param, prio, ref, core) {
    if (typeof fn !== 'function') throw new Error(i18n.m('xTaskCreate(): o 1.º argumento tem de ser uma função void tarefa(void *parametro)', 'xTaskCreate(): the 1st argument must be a function void task(void *parameter)'))
    if (tasks.filter((k) => !k.done).length >= 16) {
      warnOnce('rtos-many', i18n.m('xTaskCreate(): demasiadas tarefas (máx. 16 no simulador).', 'xTaskCreate(): too many tasks (max 16 in the simulator).'))
      return 0
    }
    const id = nextId++
    const k = { id, kind: 'task', name: String(name ?? `tarefa${id}`), gen: fn(param), t: rt.t, prio: +prio || 1, core: core ?? 1, stack: +stack || 2048, done: false, suspended: false }
    handles.set(id, k)
    tasks.push(k)
    setRef(ref, id)
    rt.t += 30
    return 1 // pdPASS
  }

  const api = {
    pdTRUE: 1, pdFALSE: 0, pdPASS: 1, pdFAIL: 0, errQUEUE_FULL: 0, portMAX_DELAY: MAX_DELAY, portTICK_PERIOD_MS: 1, portTICK_RATE_MS: 1,
    configTICK_RATE_HZ: 1000, tskIDLE_PRIORITY: 0, configMAX_PRIORITIES: 25, tskNO_AFFINITY: 0x7fffffff, ARDUINO_RUNNING_CORE: 1, CONFIG_ARDUINO_RUNNING_CORE: 1,
    portMUX_INITIALIZER_UNLOCKED: 0,
    pdMS_TO_TICKS: (ms) => Math.trunc(+ms || 0),
    pdTICKS_TO_MS: (t) => Math.trunc(+t || 0),
    xTaskCreate: (fn, name, stack, param, prio, ref) => create(fn, name, stack, param, prio, ref, null),
    xTaskCreatePinnedToCore: (fn, name, stack, param, prio, ref, core) => create(fn, name, stack, param, prio, ref, core),
    *vTaskDelay(ticks) {
      rt.t += Math.max(0, +ticks || 0) * 1000
      if (rt.t >= rt.target) yield
    },
    // vTaskDelayUntil(&ultimo, periodo): período fixo
    *vTaskDelayUntil(ref, ticks) {
      const last = (ref && typeof ref === 'object' ? +ref.v : 0) || 0
      const wake = last + (+ticks || 0)
      if (ref && typeof ref === 'object') ref.v = wake
      rt.t = Math.max(rt.t, wake * 1000)
      if (rt.t >= rt.target) yield
      return 1
    },
    *xTaskDelayUntil(ref, ticks) {
      return yield* api.vTaskDelayUntil(ref, ticks)
    },
    *taskYIELD() {
      rt.t += 5
      if (rt.t >= rt.target) yield
    },
    vTaskDelete(h) {
      const k = taskOf(h)
      if (h == null || h === 0 || k === current) {
        if (current) current.done = true
        throw TASK_DELETE // termina a tarefa atual (ou o loopTask) já
      }
      if (k) k.done = true
    },
    vTaskSuspend(h) {
      const k = taskOf(h)
      if (k) k.suspended = true
    },
    vTaskResume(h) {
      const k = taskOf(h)
      if (k) k.suspended = false
    },
    xTaskGetTickCount: () => Math.floor(rt.t / 1000),
    xTaskGetTickCountFromISR: () => Math.floor(rt.t / 1000),
    xPortGetCoreID: () => (current ? (current.core === 0 ? 0 : 1) : 1),
    xTaskGetCurrentTaskHandle: () => current?.id ?? 0,
    pcTaskGetName: (h) => (taskOf(h) || { name: 'loopTask' }).name,
    pcTaskGetTaskName: (h) => (taskOf(h) || { name: 'loopTask' }).name,
    uxTaskGetStackHighWaterMark: (h) => Math.round((taskOf(h)?.stack ?? 8192) * 0.6),
    uxTaskPriorityGet: (h) => taskOf(h)?.prio ?? 1,
    vTaskPrioritySet: (h, p) => {
      const k = taskOf(h)
      if (k) k.prio = +p
    },
    uxTaskGetNumberOfTasks: () => tasks.filter((k) => !k.done).length + 1,
    portENTER_CRITICAL: () => {},
    portEXIT_CRITICAL: () => {},
    portENTER_CRITICAL_ISR: () => {},
    portEXIT_CRITICAL_ISR: () => {},
    portYIELD_FROM_ISR: () => {},
    vTaskStartScheduler: () => {},

    // ---- filas ----
    xQueueCreate: (len, size) => newHandle({ kind: 'queue', len: Math.max(1, +len || 1), size: +size || 4, items: [] }),
    *xQueueSend(q, v, ticks = 0) {
      const o = obj(q, 'queue', 'xQueueSend')
      const val = copy(v)
      if (!(yield* waitFor(() => o.items.length < o.len, ticks, 'xQueueSend'))) return 0
      o.items.push(val)
      rt.t += 5
      return 1
    },
    *xQueueSendToBack(q, v, ticks = 0) {
      return yield* api.xQueueSend(q, v, ticks)
    },
    *xQueueSendToFront(q, v, ticks = 0) {
      const o = obj(q, 'queue', 'xQueueSendToFront')
      const val = copy(v)
      if (!(yield* waitFor(() => o.items.length < o.len, ticks, 'xQueueSendToFront'))) return 0
      o.items.unshift(val)
      return 1
    },
    xQueueSendFromISR(q, v) {
      const o = obj(q, 'queue', 'xQueueSendFromISR')
      if (o.items.length >= o.len) return 0
      o.items.push(copy(v))
      return 1
    },
    xQueueOverwrite(q, v) {
      const o = obj(q, 'queue', 'xQueueOverwrite')
      o.items = [copy(v)]
      return 1
    },
    *xQueueReceive(q, ref, ticks = 0) {
      const o = obj(q, 'queue', 'xQueueReceive')
      if (!(yield* waitFor(() => o.items.length > 0, ticks, 'xQueueReceive'))) return 0
      setRef(ref, o.items.shift())
      rt.t += 5
      return 1
    },
    xQueueReceiveFromISR(q, ref) {
      const o = obj(q, 'queue', 'xQueueReceiveFromISR')
      if (!o.items.length) return 0
      setRef(ref, o.items.shift())
      return 1
    },
    *xQueuePeek(q, ref, ticks = 0) {
      const o = obj(q, 'queue', 'xQueuePeek')
      if (!(yield* waitFor(() => o.items.length > 0, ticks, 'xQueuePeek'))) return 0
      setRef(ref, copy(o.items[0]))
      return 1
    },
    uxQueueMessagesWaiting: (q) => obj(q, 'queue', 'uxQueueMessagesWaiting').items.length,
    uxQueueSpacesAvailable: (q) => {
      const o = obj(q, 'queue', 'uxQueueSpacesAvailable')
      return o.len - o.items.length
    },
    xQueueReset: (q) => ((obj(q, 'queue', 'xQueueReset').items = []), 1),
    vQueueDelete: (q) => handles.delete(q),

    // ---- semáforos e mutexes ----
    xSemaphoreCreateMutex: () => newHandle({ kind: 'sem', mutex: true, count: 1, max: 1, owner: null }),
    xSemaphoreCreateRecursiveMutex: () => newHandle({ kind: 'sem', mutex: true, recursive: true, count: 1, max: 1, owner: null, depth: 0 }),
    xSemaphoreCreateBinary: () => newHandle({ kind: 'sem', count: 0, max: 1 }),
    xSemaphoreCreateCounting: (max, init) => newHandle({ kind: 'sem', count: +init || 0, max: +max || 1 }),
    *xSemaphoreTake(h, ticks = 0) {
      const o = obj(h, 'sem', 'xSemaphoreTake')
      const me = current?.id ?? 0
      if (o.mutex && o.owner === me && o.count === 0 && !o.recursive) warnOnce('rtos-mutex-twice', i18n.m('xSemaphoreTake(): esta tarefa já tem o mutex — vai bloquear-se a si própria (deadlock). Use xSemaphoreGive() antes.', 'xSemaphoreTake(): this task already holds the mutex — it will block itself (deadlock). Use xSemaphoreGive() first.'))
      if (!(yield* waitFor(() => o.count > 0, ticks, 'xSemaphoreTake'))) return 0
      o.count--
      o.owner = me
      rt.t += 3
      return 1
    },
    *xSemaphoreTakeRecursive(h, ticks = 0) {
      const o = obj(h, 'sem', 'xSemaphoreTakeRecursive')
      const me = current?.id ?? 0
      if (o.owner === me && o.depth > 0) {
        o.depth++
        return 1
      }
      if (!(yield* waitFor(() => o.count > 0, ticks, 'xSemaphoreTakeRecursive'))) return 0
      o.count--
      o.owner = me
      o.depth = 1
      return 1
    },
    xSemaphoreGive(h) {
      const o = obj(h, 'sem', 'xSemaphoreGive')
      if (o.count >= o.max) return 0
      if (o.mutex && o.owner !== (current?.id ?? 0)) warnOnce('rtos-mutex-owner', i18n.m('xSemaphoreGive(): esta tarefa não tem o mutex (só quem o obteve com xSemaphoreTake o deve libertar).', 'xSemaphoreGive(): this task does not hold the mutex (only the task that took it with xSemaphoreTake should release it).'))
      o.count++
      o.owner = null
      return 1
    },
    xSemaphoreGiveRecursive(h) {
      const o = obj(h, 'sem', 'xSemaphoreGiveRecursive')
      if (--o.depth > 0) return 1
      o.count = 1
      o.owner = null
      return 1
    },
    xSemaphoreGiveFromISR: (h) => api.xSemaphoreGive(h),
    xSemaphoreTakeFromISR(h) {
      const o = obj(h, 'sem', 'xSemaphoreTakeFromISR')
      if (o.count <= 0) return 0
      o.count--
      return 1
    },
    uxSemaphoreGetCount: (h) => obj(h, 'sem', 'uxSemaphoreGetCount').count,
    vSemaphoreDelete: (h) => handles.delete(h),
  }

  // corre todas as tarefas até ao fim deste ms (chamado pelo motor depois do loop())
  function run(simUs) {
    if (!tasks.length) return
    const mainT = rt.t
    try {
      for (const k of tasks) {
        if (k.done || k.suspended) continue
        current = k
        rt.t = Math.max(k.t, simUs - 1000) // (uma tarefa retomada não "recupera" o tempo suspensa)
        let guard = 0
        try {
          while (rt.t < simUs) {
            if (k.gen.next().done) {
              // no FreeRTOS real uma tarefa não pode "retornar": termina com vTaskDelete(NULL)
              warnOnce(`rtos-ret${k.id}`, i18n.m(`A tarefa "${k.name}" terminou sem vTaskDelete(NULL) — no ESP32 real isso dá erro (abort). Use for(;;) { … } ou vTaskDelete(NULL) no fim.`, `Task "${k.name}" ended without vTaskDelete(NULL) — on a real ESP32 that is an error (abort). Use for(;;) { … } or vTaskDelete(NULL) at the end.`))
              k.done = true
              break
            }
            if (++guard > 200000) throw new Error(i18n.m(`a tarefa "${k.name}" não avança no tempo (laço infinito sem vTaskDelay?)`, `task "${k.name}" does not advance in time (infinite loop without vTaskDelay?)`))
          }
        } catch (e) {
          if (e !== TASK_DELETE) throw e
          k.done = true
        }
        k.t = rt.t
      }
    } finally {
      current = null
      rt.t = mainT
    }
    if (tasks.length > 8 && tasks.every((k) => k.done)) tasks.length = 0
  }

  return {
    api,
    run,
    get active() {
      return tasks.some((k) => !k.done)
    },
    reset() {
      tasks.length = 0
      handles.clear()
      current = null
    },
  }
}
