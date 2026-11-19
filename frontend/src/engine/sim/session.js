// Uma sessão de simulação por ligação WebSocket: o motor corre aqui, no Bun,
// e o browser só recebe "fotografias" do estado para desenhar.
import { createEngine } from './engine.js'
import { isBoard, DEFS } from '../../../../shared/components.js'
import { diagnose } from './electrical.js'
import { getTrackModel } from './track.js'
import { planEngine } from './engine-select.js'
import { createSessionNet } from './session-net.js'
import * as i18n from '../../../../shared/i18n.js'

const TICK_MS = 16 // passo do ciclo (a física interna avança em passos de 1 ms)
const SNAP_MS = 33 // ~30 fotografias por segundo

const r3 = (v) => Math.round(v * 1000) / 1000

export function createSession(send) {
  let engine = null
  let timer = null
  let paused = false
  let speed = 1
  let realtime = 1
  let lastTick = 0
  let lastSnap = 0
  let inputs = {}
  let serial = []
  let partial = ''
  let startSeq = 0
  const probes = new Map()
  // rede: id da sessão, ponte para o WebServer do sketch e painel MQTT (session-net.js)
  const snet = createSessionNet(send)
  // osciloscópio (pinos escolhidos no browser) e EEPROM/Preferences por projeto
  let scopePins = []
  let project = ''
  let lastNvm = 0
  const nvmByProject = new Map()
  const flushNvm = (force = false) => {
    if (!engine?.nvmDirty) return
    const now = performance.now()
    if (!force && now - lastNvm < 500) return
    lastNvm = now
    const data = engine.nvmTake()
    nvmByProject.set(project, data)
    send({ type: 'nvm', data })
  }

  const pushSerial = (text, level) => {
    if (level) {
      serial.push({ text: text.replace(/\n$/, ''), level })
      return
    }
    partial += text
    const lines = partial.split('\n')
    partial = lines.pop()
    // "\r\n" (println, print do Fogu): o CR não aparece, como na emulação real (avr/host.js)
    for (const l of lines) serial.push({ text: l.replace(/\r$/, '') })
    if (partial.length > 200) {
      serial.push({ text: partial })
      partial = ''
    }
    if (serial.length > 400) serial = serial.slice(-400)
  }

  function snapshot() {
    const e = engine
    const msg = {
      type: 'snap',
      t: e.timeMs,
      realtime,
      paused,
      arduino: e.hasArduino ? e.arduinoRunning() : null,
      halted: e.halted,
      shortCircuit: e.shortCircuit,
      pins: e.pinState(),
      powered: Object.fromEntries(e.parts.map((p) => [p.id, !!e.circuit.st[p.id]?.powered])),
      vehicles: e.vehicles.map((v) => ({ id: v.part.id, x: r3(v.pose.x), z: r3(v.pose.z), theta: r3(v.pose.theta), v: r3(v.v), collided: v.collided })),
      cubes: e.cubes.map((c) => ({ id: c.part.id, m: Array.from(c.matrix.elements, r3), held: !!c.heldBy, by: c.heldBy || null })),
      motors: e.motors.map((m) => ({ id: m.part.id, side: m.side, angle: r3(m.angle), volts: r3(m.volts), amps: r3(m.amps), rpm: r3((m.w * 60) / (2 * Math.PI)) })),
      servos: e.servos.map((s) => ({ id: s.part.id, angle: r3(s.angle), target: s.target, stalled: s.stalled, powered: s.powered })),
      irs: e.irs.map((s) => ({ id: s.part.id, ao: r3(s.ao), do: s.do })),
      sonars: e.sonars.map((s) => ({ id: s.part.id, dist: r3(s.dist) })),
      leds: e.leds.map((l) => ({ id: l.part.id, b: r3(l.b), burned: l.burned, i: r3(l.i) })),
      buzzers: e.buzzers.map((b) => {
        const on = b.on || !!b.hit
        b.hit = false
        return { id: b.part.id, on }
      }),
      live: e.live,
      probes: Object.fromEntries([...probes.keys()].map((k) => {
        const [part, pin] = k.split('|')
        const v = e.pinVoltage(part, pin)
        return [k, v == null ? null : r3(v)]
      })),
    }
    if (e.scopeOn) msg.scope = e.scopeTake()
    // traços das canetas: só os pontos novos (o browser acumula-os)
    const ink = e.inkTake?.()
    if (ink) msg.ink = ink
    if (serial.length) {
      msg.serial = serial
      serial = []
    }
    return msg
  }

  function loop() {
    const now = performance.now()
    const dt = Math.min(0.05, (now - lastTick) / 1000)
    lastTick = now
    if (!engine) return
    if (!paused) {
      realtime = engine.advance(dt * speed, 12)
      if (engine.shortCircuit) paused = true
    }
    if (now - lastSnap >= SNAP_MS) {
      lastSnap = now
      send(snapshot())
      flushNvm()
    }
  }

  function stop() {
    flushNvm(true)
    clearInterval(timer)
    timer = null
    engine?.dispose?.()
    engine = null
    probes.clear()
  }

  async function start({ parts, wires, code, track, realism, nvm, project: proj, engine: mode = 'auto', libs = [] }) {
    stop()
    serial = []
    partial = ''
    paused = false
    const short = diagnose(parts, wires).issues.find((i) => i.short)
    if (short) return send({ type: 'error', msg: i18n.m(`Não é seguro ligar: ${short.msg}`, `Not safe to power on: ${short.msg}`), tab: 'diag' })

    // motor: emulação real (arduino-cli + avr8js) ou tradutor rápido — ver engine-select.js
    const startId = ++startSeq
    const board = parts.find((p) => isBoard(p.type))?.type
    const plan = await planEngine({ code, board, parts, mode, libs })
    if (startId !== startSeq) return // entretanto chegou outro "start"
    const r = plan.compile
    send({ type: 'compile', result: r })
    const errors = r.diagnostics.filter((d) => d.severity === 'error')
    if (errors.length || !r.ok) return send({ type: 'error', msg: i18n.m(`${errors.length || 1} erro(s) de compilação${plan.engine === 'avr' ? ' (avr-gcc)' : ''} — veja o código`, `${errors.length || 1} compile error(s)${plan.engine === 'avr' ? ' (avr-gcc)' : ''} — see the code`), tab: 'code' })

    inputs = {}
    for (const p of parts) {
      if (p.type === 'pot') inputs[p.id] = { value: p.config?.value ?? 0.5 }
      // valor inicial dos controlos interativos (sensores, interruptores…)
      const ia = DEFS[p.type]?.interactive
      if (ia && !inputs[p.id]) inputs[p.id] = { value: p.config?.value ?? ia.default ?? 0, on: !!p.config?.on, x: 0.5, y: 0.5 }
    }
    project = String(proj ?? '')
    // EEPROM/Preferences: o browser envia as do projeto (guardadas no localStorage); senão, as desta ligação
    const e = createEngine({ parts, wires, code, compiled: r.js, firmware: plan.firmware || null, track: getTrackModel(track), realism, onSerial: pushSerial, inputs, net: snet.net, nvm: nvm !== undefined ? nvm : nvmByProject.get(project) })
    if (e.error) return send({ type: 'error', msg: i18n.m(`Falha na compilação: ${e.error}`, `Compilation failed: ${e.error}`) })
    engine = e
    e.scopeSet(scopePins)
    // compiler: clang++/arduino-cli (servidor); sem ele, só o tradutor, que corre aqui no browser
    const when = r.cached ? i18n.m(', em cache', ', cached') : `, ${r.ms} ms`
    pushSerial(r.compiler ? i18n.m(`✔ Compilado no servidor (${r.compiler}${when}) e carregado.\n`, `✔ Compiled on the server (${r.compiler}${when}) and loaded.\n`) : i18n.m(`✔ Traduzido no browser (tradutor rápido${when}) e carregado.\n`, `✔ Translated in the browser (fast translator${when}) and loaded.\n`), 'ok')
    for (const n of plan.notes) pushSerial(`${n.text}\n`, n.level)
    // ESP32/Pico: a compilação verdadeira acaba depois (os erros reais aparecem no editor)
    plan.background?.then((real) => {
      if (engine !== e || !real?.available) return
      send({ type: 'compile', result: { ...real, background: true } })
      const errs = real.diagnostics.filter((d) => d.severity === 'error')
      if (errs.length) pushSerial(i18n.m(`✖ Compilação real (${real.compiler}): ${errs.length} erro(s) — numa placa verdadeira este código NÃO compila (${errs[0].line ? `linha ${errs[0].line}: ` : ''}${errs[0].message}). A simulação continua com o tradutor, que é mais permissivo.\n`, `✖ Real compilation (${real.compiler}): ${errs.length} error(s) — on a real board this code does NOT compile (${errs[0].line ? `line ${errs[0].line}: ` : ''}${errs[0].message}). The simulation continues with the translator, which is more permissive.\n`), 'error')
      else pushSerial(i18n.m(`✔ Compilação real (${real.compiler}) sem erros${real.size ? ` — ${real.size.flash} bytes de flash (${real.size.flashPct}%)` : ''}.\n`, `✔ Real compilation (${real.compiler}) without errors${real.size ? ` — ${real.size.flash} bytes of flash (${real.size.flashPct}%)` : ''}.\n`), 'ok')
    })
    if (!parts.some((p) => isBoard(p.type))) pushSerial(i18n.m('⚠ Não há Arduino no projeto — só a eletrónica é simulada.\n', '⚠ There is no Arduino in the project — only the electronics are simulated.\n'), 'warn')
    send({ type: 'started', engine: plan.engine })
    lastTick = lastSnap = performance.now()
    timer = setInterval(loop, TICK_MS)
    setTimeout(() => {
      if (engine === e && e.hasArduino && !e.arduinoRunning()) pushSerial(i18n.m('⚠ O Arduino não liga (sem alimentação ou danificado). Veja o separador Diagnóstico.\n', '⚠ The Arduino does not power on (no power or damaged). See the Diagnostics tab.\n'), 'warn')
    }, 300)
  }

  return {
    async message(msg) {
      if (snet.message(msg)) return
      switch (msg.type) {
        case 'start':
          return start(msg)
        case 'stop':
          stop()
          return send({ type: 'stopped' })
        case 'pause':
          paused = !!msg.paused
          return
        case 'speed':
          speed = Math.max(0.05, Math.min(8, +msg.value || 1))
          return
        case 'input': {
          // botões e potenciómetros mexidos no browser
          if (msg.release) {
            for (const [id, v] of Object.entries(inputs)) if (v.pressed || v.key || v.reset || v.boot || v.off) inputs[id] = { ...v, pressed: false, key: null, reset: false, boot: false, off: false }
          } else if (msg.data) inputs[msg.id] = { ...(inputs[msg.id] || {}), ...msg.data }
          else inputs[msg.id] = msg.value != null ? { value: +msg.value } : { pressed: !!msg.pressed }
          engine?.invalidate()
          return
        }
        case 'camFrame': {
          // imagem do módulo de câmara renderizada no browser (CameraFeeds.jsx): { id, w, h, rgb }
          // → env.input(id).frame, lida por esp_camera_fb_get() (libs/esp_camera.js). Não
          // invalida o circuito: a imagem não muda nada na parte elétrica.
          if (msg.id && msg.rgb && msg.w > 0 && msg.h > 0 && msg.rgb.length >= msg.w * msg.h * 3) inputs[msg.id] = { ...(inputs[msg.id] || {}), frame: { w: msg.w, h: msg.h, rgb: msg.rgb } }
          return
        }
        case 'world':
          // física de corpos rígidos do browser: pose das peças dinâmicas, ângulos reais das juntas e IMU (~60 Hz)
          engine?.setWorld(msg)
          return
        case 'serial':
          // texto do Monitor Série (o browser já junta o fim de linha)
          engine?.serialInput(String(msg.data ?? ''))
          return
        case 'scope':
          // osciloscópio: até 4 pinos da placa ([] desliga)
          scopePins = Array.isArray(msg.pins) ? msg.pins.slice(0, 4) : []
          engine?.scopeSet(scopePins)
          return
        case 'nvmClear':
          // botão "Apagar EEPROM": apaga EEPROM e Preferences do projeto
          nvmByProject.delete(project)
          if (engine) {
            engine.nvmClear()
            flushNvm(true)
            pushSerial(i18n.m('ℹ EEPROM / Preferences apagadas (os valores lidos a partir de agora vêm a 0xFF / por omissão).\n', 'ℹ EEPROM / Preferences erased (values read from now on come back as 0xFF / defaults).\n'), 'info')
          }
          return
        case 'probe': {
          // tensão num pino, pedida ao passar o rato
          probes.clear()
          if (msg.part) probes.set(`${msg.part}|${msg.pin}`, true)
          return
        }
      }
    },
    close() {
      stop()
      snet.close()
    },
  }
}
