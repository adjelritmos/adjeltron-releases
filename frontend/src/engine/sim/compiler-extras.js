// Passos extra do transpilador (usados por compiler.js):
//  - variáveis `static` locais (persistem entre chamadas: passam a globais com nome próprio da função)
//  - parâmetros de saída (&x) das APIs do FreeRTOS (xTaskCreate, xQueueReceive…)
//  - EEPROM.get/put: precisam do tipo C da variável (int = 2 bytes no AVR, float = 4…)

// percorre uma string literal a partir de i (aspas em s[i]); devolve o índice da aspa final
function skipString(s, i) {
  const q = s[i]
  let j = i + 1
  while (j < s.length && s[j] !== q) j += s[j] === '\\' ? 2 : 1
  return j
}

// índice do fecho correspondente a s[open] ('(' ou '{' ou '[')
export function matchClose(s, open) {
  const o = s[open]
  const c = o === '(' ? ')' : o === '{' ? '}' : ']'
  let depth = 0
  for (let i = open; i < s.length; i++) {
    const ch = s[i]
    if (ch === '"' || ch === "'") {
      i = skipString(s, i)
      continue
    }
    if (ch === o) depth++
    else if (ch === c && --depth === 0) return i
  }
  return -1
}

// divide uma lista de argumentos ao nível 0 (sem os parênteses exteriores)
export function splitArgs(inner) {
  const out = []
  let depth = 0
  let cur = ''
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]
    if (ch === '"' || ch === "'") {
      const j = skipString(inner, i)
      cur += inner.slice(i, j + 1)
      i = j
      continue
    }
    if ('([{'.includes(ch)) depth++
    else if (')]}'.includes(ch)) depth--
    if (ch === ',' && depth === 0) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  if (cur.trim() || out.length) out.push(cur)
  return out
}

// substitui (fora de strings) as ocorrências de um identificador
function renameIdent(s, name, to) {
  const re = new RegExp(`(?<![\\w.$])${name}(?![\\w$])`, 'g')
  let out = ''
  let last = 0
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '"' || s[i] === "'") {
      out += s.slice(last, i).replace(re, to)
      const j = skipString(s, i)
      out += s.slice(i, j + 1)
      last = j + 1
      i = j
    }
  }
  return out + s.slice(last).replace(re, to)
}

// Aplica fn(args[], nomeDaChamada) a cada chamada nome(...) e substitui o texto devolvido
export function rewriteCalls(s, names, fn) {
  const re = new RegExp(`(?<![\\w$])(${names.join('|').replace(/\./g, '\\.')})\\s*\\(`, 'g')
  let m
  while ((m = re.exec(s))) {
    const open = m.index + m[0].length - 1
    const close = matchClose(s, open)
    if (close < 0) break
    const rep = fn(splitArgs(s.slice(open + 1, close)), m[1])
    if (rep == null) continue
    s = s.slice(0, m.index) + rep + s.slice(close + 1)
    re.lastIndex = m.index + 1
  }
  return s
}

// `static int c = 0;` dentro de funções: no C++ é inicializada uma vez e mantém o valor
// entre chamadas. Aqui passa a variável global `__st_<função>_c` declarada antes da função.
// Corre depois de as funções serem convertidas para `function* nome(...) {` e antes do
// passo das declarações (que transforma `static int` em `let`).
export function hoistStaticLocals(s, TYPES) {
  const fnRe = /function\* (\w+)\s*\(/g
  const fns = []
  let m
  while ((m = fnRe.exec(s))) {
    const close = matchClose(s, m.index + m[0].length - 1)
    if (close < 0) continue
    const open = s.indexOf('{', close)
    const end = open < 0 ? -1 : matchClose(s, open)
    if (end < 0) continue
    fns.push({ name: m[1], start: m.index, open, end })
  }
  const declRe = new RegExp(`^static\\s+(?:(?:const|volatile|static)\\s+)*${TYPES}\\s*[*]?\\s+([\\s\\S]*);$`)
  // do fim para o início, para os índices continuarem válidos
  for (const f of fns.reverse()) {
    let body = s.slice(f.open, f.end + 1)
    if (!/\bstatic\b/.test(body)) continue
    const hoisted = []
    const names = []
    let i = 0
    let rest = ''
    while (i < body.length) {
      const ch = body[i]
      if (ch === '"' || ch === "'") {
        const j = skipString(body, i)
        rest += body.slice(i, j + 1)
        i = j + 1
        continue
      }
      if (body.startsWith('static', i) && !/[\w$]/.test(body[i - 1] || '') && /\s/.test(body[i + 6] || '')) {
        // fim da declaração: ';' ao nível 0
        let depth = 0
        let k = i
        for (; k < body.length; k++) {
          const c = body[k]
          if (c === '"' || c === "'") {
            k = skipString(body, k)
            continue
          }
          if ('([{'.includes(c)) depth++
          else if (')]}'.includes(c)) depth--
          else if (c === ';' && depth === 0) break
        }
        const stmt = body.slice(i, k + 1)
        const dm = stmt.match(declRe)
        if (dm) {
          // um declarador por instrução (`static int a = 0, b[3];` -> duas declarações)
          const prefix = stmt.slice(0, stmt.length - dm[1].length - 1)
          for (const d of splitArgs(dm[1])) {
            const id = d.trim().match(/^(\w+)/)?.[1]
            if (!id) continue
            names.push(id)
            hoisted.push(`${prefix}${d.trim()};`)
          }
          i = k + 1
          continue
        }
      }
      rest += ch
      i++
    }
    if (!hoisted.length) continue
    body = rest
    let top = hoisted.join('\n')
    for (const n of names) {
      const to = `__st_${f.name}_${n}`
      body = renameIdent(body, n, to)
      top = renameIdent(top, n, to)
    }
    s = s.slice(0, f.start) + top + '\n' + s.slice(f.start, f.open) + body + s.slice(f.end + 1)
  }
  return s
}

// Parâmetros de saída (&var) das APIs do FreeRTOS: passam a um objeto com getter/setter
// { v } para a biblioteca poder escrever na variável do sketch.
const OUT_PARAMS = {
  xTaskCreate: [5],
  xTaskCreatePinnedToCore: [5],
  xQueueReceive: [1],
  xQueuePeek: [1],
  xQueueReceiveFromISR: [1],
  vTaskDelayUntil: [0],
  xTaskDelayUntil: [0],
  // sensores de cor (Adafruit_TCS34725 / Adafruit_APDS9960): getRawData(&r, &g, &b, &c)…
  getRawData: [0, 1, 2, 3],
  getRawDataOneShot: [0, 1, 2, 3],
  getRGB: [0, 1, 2],
  getColorData: [0, 1, 2, 3],
  // sscanf(texto, formato, &a, &b, …)
  sscanf: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
}
export function outParams(s) {
  return rewriteCalls(s, Object.keys(OUT_PARAMS), (args, name) => {
    let changed = false
    const out = args.map((a, i) => {
      const t = a.trim()
      if (!OUT_PARAMS[name].includes(i) || !t.startsWith('&')) return a
      changed = true
      const v = t.slice(1).trim()
      return ` { get v() { return ${v} }, set v(__v) { ${v} = __v } }`
    })
    return changed ? `${name}(${out.join(',')})` : null
  })
}

// tipo C declarado de cada variável (para EEPROM.get/put saberem quantos bytes usar)
export function declaredTypes(s, TYPES) {
  const map = {}
  const re = new RegExp(`\\b(?:const\\s+)?(${TYPES})\\s*[*]?\\s+(\\w+)\\b(?!\\s*\\()\\s*(\\[[^\\]]*\\])?`, 'g')
  let m
  while ((m = re.exec(s))) {
    if (m[1] === 'void') continue
    map[m[2]] = { type: m[1].replace(/\s+/g, '_'), arr: !!m[3] } // 'unsigned_long' (sem espaços: não confunde os passos seguintes)
  }
  return map
}

// EEPROM.get(addr, x) -> (x = EEPROM.get(addr, x, 'tipo'));  EEPROM.put(addr, x) -> EEPROM.put(addr, x, 'tipo')
export function eepromTyped(s, types) {
  if (!/\bEEPROM\s*\.\s*(get|put)\b/.test(s)) return s
  return rewriteCalls(s, ['EEPROM.get', 'EEPROM.put'], (args, name) => {
    if (args.length !== 2) return null
    const [addr, expr] = args.map((a) => a.trim())
    const base = expr.match(/^(\w+)/)?.[1]
    const d = types[base]
    const t = d ? (d.arr && !/\[/.test(expr) ? `${d.type}[]` : d.type) : ''
    return name === 'EEPROM.get' ? `(${expr} = EEPROM.get(${addr}, ${expr}, '${t}'))` : `EEPROM.put(${addr}, ${expr}, '${t}')`
  })
}

// tipos do FreeRTOS / ESP-IDF que o sketch declara: passam a inteiros (handles opacos)
export const RTOS_TYPES = /\b(TaskHandle_t|QueueHandle_t|SemaphoreHandle_t|BaseType_t|UBaseType_t|TickType_t|TimerHandle_t|EventGroupHandle_t|portMUX_TYPE|esp_err_t)\b/g
