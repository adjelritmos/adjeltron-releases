// Transpilador Arduino (subconjunto de C/C++) -> JavaScript (generators).
// Cada função do utilizador vira function*, para o programa poder "pausar"
// (delay, fim de fatia de tempo) e retomar em sincronia com a física.

const TYPES =
  '(?:unsigned\\s+long\\s+long\\s+int|unsigned\\s+long\\s+long|unsigned\\s+long\\s+int|unsigned\\s+short\\s+int|long\\s+long\\s+int|short\\s+int|signed\\s+char|unsigned\\s+long|unsigned\\s+int|unsigned\\s+char|unsigned\\s+short|long\\s+long|long\\s+int|unsigned|signed|long|int|short|float|double|bool|boolean|byte|char|String|word|size_t|uint8_t|uint16_t|uint32_t|uint64_t|int8_t|int16_t|int32_t|int64_t|void)'

export const API_NAMES = [
  'pinMode', 'digitalWrite', 'digitalRead', 'analogWrite', 'analogRead', 'millis', 'micros',
  'pulseIn', 'tone', 'noTone', 'map', 'constrain', 'abs', 'min', 'max', 'random', 'randomSeed',
  'sq', 'sqrt', 'pow', 'sin', 'cos', 'tan', 'atan2', 'round', 'floor', 'ceil', 'Serial', 'String',
  'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'LED_BUILTIN', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5',
  'DEC', 'HEX', 'BIN', 'PI', 'bitRead', 'isnan', 'fabs', 'boolean_',
]

const TICK = 'if((__rt.t+=1)>=__rt.target)yield;'

import { hoistStaticLocals, outParams, declaredTypes, eepromTyped, RTOS_TYPES, matchClose, rewriteCalls } from './compiler-extras.js'
import { rawStrings, netTransforms, wrapNetBlocking } from './compiler-net.js'
import { groupGTransforms } from './compiler-g.js'
import { picoTransforms, picoLateTransforms } from './compiler-pico.js'
import { intDivision, charOperands } from './compiler-intdiv.js'
import { classTransforms, classSkeletons } from './compiler-classes.js'
import { preprocess } from './compiler-pre.js'
import * as i18n from '../../../../shared/i18n.js'

// funções que "consomem tempo"/bloqueiam (generators da API): FreeRTOS e yield()
const BLOCKING = ['vTaskDelay', 'vTaskDelayUntil', 'xTaskDelayUntil', 'xQueueSend', 'xQueueSendToBack', 'xQueueSendToFront', 'xQueueReceive', 'xQueuePeek', 'xSemaphoreTake', 'xSemaphoreTakeRecursive', 'taskYIELD', 'yield']

function stripComments(src) {
  let out = ''
  let i = 0
  while (i < src.length) {
    const c = src[i]
    const n = src[i + 1]
    if (c === '"' || c === "'") {
      const q = c
      let j = i + 1
      while (j < src.length && src[j] !== q) j += src[j] === '\\' ? 2 : 1
      out += src.slice(i, j + 1)
      i = j + 1
    } else if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') i++
    } else if (c === '/' && n === '*') {
      const j = src.indexOf('*/', i + 2)
      const block = src.slice(i, j < 0 ? src.length : j + 2)
      out += block.replace(/[^\n]/g, ' ')
      i = j < 0 ? src.length : j + 2
    } else {
      out += c
      i++
    }
  }
  return out
}

function matchParen(s, openIdx) {
  let depth = 0
  for (let i = openIdx; i < s.length; i++) {
    const c = s[i]
    if (c === '"' || c === "'") {
      let j = i + 1
      while (j < s.length && s[j] !== c) j += s[j] === '\\' ? 2 : 1
      i = j
      continue
    }
    if (c === '(') depth++
    else if (c === ')') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

// (int)expr -> __toInt(expr) (Math.trunc; num caractere em texto, o código ASCII): consome um operando unário completo, com parênteses
// aninhados — (int)((x / 100.0f) * (1023 - 200)), (int)-v, (int)obj.m(a)[i], (int)(byte)x
function intCasts(s) {
  const TAG = '__int '
  const operand = (i) => {
    // devolve o índice logo a seguir ao operando que começa em i (ou -1)
    while (i < s.length && /\s/.test(s[i])) i++
    if (s.startsWith(TAG, i)) return operand(i + TAG.length)
    while (i < s.length && '-+!~'.includes(s[i])) i++
    while (i < s.length && /\s/.test(s[i])) i++
    if (s[i] === '(') {
      const e = matchParen(s, i)
      if (e < 0) return -1
      i = e + 1
    } else {
      const m = /^[\w.]+/.exec(s.slice(i))
      if (!m) return -1
      i += m[0].length
    }
    for (;;) {
      if (s[i] === '(') {
        const e = matchParen(s, i)
        if (e < 0) return -1
        i = e + 1
      } else if (s[i] === '[') {
        let d = 0, j = i
        for (; j < s.length; j++) {
          if (s[j] === '[') d++
          else if (s[j] === ']' && --d === 0) break
        }
        if (j >= s.length) return -1
        i = j + 1
      } else if (s[i] === '.' && /\w/.test(s[i + 1] || '')) {
        i += 1 + /^\w+/.exec(s.slice(i + 1))[0].length
      } else break
    }
    return i
  }
  let at = s.indexOf(TAG)
  while (at >= 0) {
    const end = operand(at + TAG.length)
    if (end < 0) {
      s = s.slice(0, at) + s.slice(at + TAG.length)
    } else {
      const inner = s.slice(at + TAG.length, end).replace(new RegExp(TAG, 'g'), '')
      s = s.slice(0, at) + `__toInt(${inner})` + s.slice(end) // Math.trunc, ou o código ASCII de um caractere
    }
    at = s.indexOf(TAG)
  }
  return s
}

// parâmetro inteiro passado por valor: instrução que o converte como no C++ (ou '')
function intParamCast(decl, id) {
  if (!id || /[&*\[]/.test(decl) || /\bconst\b.*&/.test(decl)) return ''
  const t = decl.replace(new RegExp(`\\b${id}\\s*$`), '').trim()
  if (/\b(float|double|bool|boolean|char|String)\b/.test(t) && !/\bunsigned\s+char\b/.test(t)) return ''
  if (/\b(uint8_t|byte|unsigned\s+char)\b/.test(t)) return `${id} = __toInt(${id}) & 255;`
  if (/\b(uint16_t|word|unsigned\s+short)\b/.test(t)) return `${id} = __toInt(${id}) & 65535;`
  if (/\bint8_t\b/.test(t)) return `${id} = (__toInt(${id}) << 24) >> 24;`
  if (/\bint16_t\b/.test(t)) return `${id} = (__toInt(${id}) << 16) >> 16;`
  if (/\b(int|long|short|unsigned|size_t|u?int32_t|u?int64_t)\b/.test(t)) return `${id} = __toInt(${id});`
  return ''
}

// Parâmetros por referência de tipos simples nas funções do sketch (void f(float &x)): em JS
// os números passam por valor, por isso cada chamada passa um objeto { v } com getter/setter
// para a variável de quem chama, e dentro da função x passa a x.v.
function refParams(s, TYPES) {
  const DEF = new RegExp(`(?:\\b(?:static|inline)\\s+)*(?:\\bconst\\s+)?\\b${TYPES}\\s*[*&]?\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*\\{`, 'g')
  const PRIM = new RegExp(`^(?:volatile\\s+)?${TYPES}\\s*&\\s*(\\w+)$`)
  const refs = {}
  const defs = []
  for (const m of s.matchAll(DEF)) {
    const idx = []
    const names = []
    m[2].split(',').forEach((p, i) => {
      const t = p.split('=')[0].trim()
      if (/\bconst\b/.test(t)) return
      const r = t.match(PRIM)
      if (r) idx.push(i), names.push(r[1])
    })
    if (!idx.length) continue
    refs[m[1]] = idx
    defs.push({ open: m.index + m[0].length - 1, names })
  }
  if (!defs.length) return s
  // corpo: x → x.v (do fim para o início, os índices continuam válidos)
  for (const d of defs.reverse()) {
    const end = matchClose(s, d.open)
    if (end < 0) continue
    let body = s.slice(d.open, end + 1)
    for (const n of d.names) body = body.replace(new RegExp(`(?<![\\w$.])${n}\\b(?!\\s*:)`, 'g'), `${n}.v`)
    s = s.slice(0, d.open) + body + s.slice(end + 1)
  }
  // chamadas: o argumento passa a { get v(), set v() } (ou { v } se não for uma variável)
  const isDef = new RegExp(`^\\s*(?:const\\s+)?${TYPES}\\b`)
  return rewriteCalls(s, Object.keys(refs), (args, name) => {
    if (args.length && isDef.test(args[0])) return null
    let changed = false
    const out = args.map((a, i) => {
      if (!refs[name].includes(i)) return a
      const e = a.trim()
      if (/^\{ get v\(\)/.test(e)) return a
      changed = true
      return /^[A-Za-z_]\w*(\s*\[[^\]]*\]|\.\w+)*$/.test(e) ? ` { get v() { return ${e} }, set v(__v) { ${e} = __v } }` : ` { v: ${e} }`
    })
    return changed ? `${name}(${out.join(',')})` : null
  })
}

// parâmetros de uma função C++ para escolher a sobrecarga: tipo ('f' vírgula flutuante,
// 's' texto, 'i' inteiro/bool/char, 'o' objeto) e se têm valor por omissão
function paramInfo(params) {
  return params
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p && p !== 'void')
    .map((p) => {
      const [decl, dflt] = p.split('=')
      const t = decl.replace(/\b\w+\s*(\[[^\]]*\])*\s*$/, '').trim()
      const kind = /\b(float|double)\b/.test(t) && !/\*/.test(t) ? 'f' : /\bString\b|\bchar\s*\*/.test(t) ? 's' : /\b(int|long|short|byte|bool|boolean|char|unsigned|word|size_t|u?int\d+_t)\b/.test(t) ? 'i' : 'o'
      return { kind, opt: dflt != null }
    })
}

// despachantes das funções sobrecarregadas: escolhem a versão cujo número de parâmetros
// aceita os argumentos e cujos tipos melhor coincidem (inteiro → int, decimal → float,
// texto → String/char*)
function overloadDispatchers(overloads) {
  const names = Object.keys(overloads)
  if (!names.length) return ''
  let out = `
function __ovl(a, list) {
  let best = null, bestScore = -Infinity
  for (const [fn, ps] of list) {
    const req = ps.filter((p) => !p.opt).length
    if (a.length < req || a.length > ps.length) continue
    let sc = 0
    a.forEach((v, i) => {
      const k = ps[i].kind
      const isStr = typeof v === 'string' || (v && typeof v === 'object' && typeof v.c_str === 'function')
      if (isStr) sc += k === 's' ? 3 : -5
      else if (typeof v === 'number' || typeof v === 'boolean') sc += k === 'i' ? (Number.isInteger(+v) ? 3 : 0) : k === 'f' ? (Number.isInteger(+v) ? 2 : 3) : k === 's' ? -5 : 0
      else sc += k === 'o' ? 2 : 0
    })
    if (sc > bestScore) (best = fn), (bestScore = sc)
  }
  if (!best) throw new Error('nenhuma versão da função aceita ' + a.length + ' argumento(s)')
  return best
}
`
  for (const n of names) {
    const table = overloads[n].map((o) => `[${o.jsName}, ${JSON.stringify(o.params)}]`).join(', ')
    out += `function* ${n}(...a) { return yield* __ovl(a, [${table}])(...a) }\n`
  }
  return out
}

// fim (índice do último carácter) da instrução C que começa em k: bloco {…}, if (…) x [else y],
// for/while/switch (…) x, do x while (…); ou expressão até ao ';' de profundidade 0
function skipWs(s, k) {
  while (k < s.length && /\s/.test(s[k])) k++
  return k
}
function matchBrace(s, open) {
  let depth = 0
  for (let i = open; i < s.length; i++) {
    const c = s[i]
    if (c === '"' || c === "'") {
      let j = i + 1
      while (j < s.length && s[j] !== c) j += s[j] === '\\' ? 2 : 1
      i = j
      continue
    }
    if (c === '{') depth++
    else if (c === '}' && --depth === 0) return i
  }
  return s.length - 1
}
function stmtEnd(s, k) {
  k = skipWs(s, k)
  if (s[k] === '{') return matchBrace(s, k)
  const kw = s.slice(k, k + 8).match(/^(if|for|while|switch|do|else)\b/)?.[1]
  if (kw === 'do') {
    const body = stmtEnd(s, k + 2)
    const w = skipWs(s, body + 1)
    const close = matchParen(s, s.indexOf('(', w))
    const semi = skipWs(s, close + 1)
    return s[semi] === ';' ? semi : close
  }
  if (kw && kw !== 'else') {
    const open = s.indexOf('(', k)
    const close = matchParen(s, open)
    if (close < 0) return s.length - 1
    let end = stmtEnd(s, close + 1)
    if (kw === 'if') {
      const n = skipWs(s, end + 1)
      if (/^else\b/.test(s.slice(n, n + 5))) end = stmtEnd(s, n + 4)
    }
    return end
  }
  let depth = 0
  for (let e = k; e < s.length; e++) {
    const c = s[e]
    if (c === '"' || c === "'") {
      let j = e + 1
      while (j < s.length && s[j] !== c) j += s[j] === '\\' ? 2 : 1
      e = j
      continue
    }
    if (c === '(' || c === '[' || c === '{') depth++
    else if (c === ')' || c === ']' || c === '}') depth--
    else if (c === ';' && depth === 0) return e
  }
  return s.length - 1
}

// Insere um "tick" no corpo de for/while/do, para laços infinitos não congelarem o browser
function instrumentLoops(s) {
  const re = /\b(for|while)\s*\(/g
  let m
  const src = s
  // inserções [posição no texto original, texto] aplicadas no fim (laços aninhados sem
  // chavetas — for (…) for (…) x; — ficam com as posições certas)
  const ins = []
  while ((m = re.exec(src))) {
    const open = m.index + m[0].length - 1
    const close = matchParen(src, open)
    if (close < 0) break
    // "while" de um do..while: ignora (precedido de "}")
    if (m[1] === 'while') {
      const before = src.slice(0, m.index).trimEnd()
      if (before.endsWith('}')) {
        // verifica se esse } fecha um do { ... }
        let depth = 0
        let k = before.length - 1
        for (; k >= 0; k--) {
          if (before[k] === '}') depth++
          else if (before[k] === '{') {
            depth--
            if (depth === 0) break
          }
        }
        if (/\bdo\s*$/.test(before.slice(0, k))) continue
      }
    }
    let k = close + 1
    while (k < src.length && /\s/.test(src[k])) k++
    if (src[k] === '{') {
      ins.push([k + 1, TICK])
    } else if (src[k] === ';') {
      ins.push([k, `{${TICK}`], [k + 1, '}'])
    } else {
      // instrução única sem chavetas (também if {…} else …, blocos e laços aninhados)
      const e = stmtEnd(src, k)
      ins.push([k, `{${TICK}`], [e + 1, '}'])
    }
  }
  // por ordem de posição (estável: a abertura de um laço exterior fica antes da do interior)
  ins.sort((a, b) => a[0] - b[0])
  let out = ''
  let last = 0
  for (const [pos, text] of ins) {
    out += src.slice(last, pos) + text
    last = pos
  }
  out += src.slice(last)
  out = out.replace(/\bdo\s*\{/g, `do{${TICK}`)
  return out
}

// ---------- ponteiros para funções ----------
// void (*f)(int);  void (*tabela[4])();  bool registar(void (*cb)(const char *))  e variáveis de um
// typedef de ponteiro para função (typedef void (*Handler)(); Handler h;): as declarações passam a
// "auto nome" e cada chamada f(…), (*f)(…), obj.f(…), v[i](…) fica (yield* __fp(…)) — a função
// apontada é um generator (pode usar delay) ou uma função da API (valor direto).
function fnPtrDecls(s) {
  const names = new Set()
  s = s.replace(/\b(?:const\s+)?[A-Za-z_]\w*(?:\s+[A-Za-z_]\w*)*\s*[*&]?\s*\(\s*\*\s*([A-Za-z_]\w*)\s*((?:\[[^\]]*\])*)\s*\)\s*\(([^()]*)\)/g, (all, n, dims, _args, off, str) => {
    if (/^typedef\b/.test(all) || /\btypedef\s+[^;]*$/.test(str.slice(Math.max(0, off - 40), off))) return all
    names.add(n)
    return `void *${n}${dims}`
  })
  const tds = [...s.matchAll(/\btypedef\s+[^;()]*\(\s*\*\s*(\w+)\s*\)\s*\([^)]*\)\s*;/g)].map((m) => m[1])
  for (const t of tds) for (const m of s.matchAll(new RegExp(`\\b${t}\\s*[*&]?\\s+([A-Za-z_]\\w*)`, 'g'))) names.add(m[1])
  return { s, names: [...names] }
}
function wrapFnPtrCalls(s, names) {
  if (!names.length) return s
  const N = names.join('|')
  // (*f)(…) / (*obj.f)(…) / (*v[i])(…) → f(…)
  s = s.replace(new RegExp(`\\(\\s*\\*\\s*((?:[\\w$]+\\s*\\.\\s*)*(?:${N})(?:\\s*\\[[^\\]]*\\])?)\\s*\\)\\s*\\(`, 'g'), '$1(')
  const re = new RegExp(`(?<![\\w$.])((?:[\\w$]+\\s*\\.\\s*)*(?:${N}))\\s*(\\[[^\\]]*\\])?\\s*\\(`, 'g')
  let m
  while ((m = re.exec(s))) {
    const before = s.slice(Math.max(0, m.index - 12), m.index)
    if (/function\*?\s*$/.test(before) || /__fp\($/.test(before)) continue
    const open = m.index + m[0].length - 1
    const close = matchParen(s, open)
    if (close < 0) break
    const rep = `(yield* __fp(${s.slice(m.index, close + 1)}))`
    s = s.slice(0, m.index) + rep + s.slice(close + 1)
    re.lastIndex = m.index + '(yield* __fp('.length + 1
  }
  return `function* __fp(v) { if (v && typeof v.next === 'function' && typeof v[Symbol.iterator] === 'function' && !Array.isArray(v)) return yield* v; return v }\n${s}`
}

// Envolve chamadas a funções-generator: nome(...) -> (yield* nome(...))
function wrapCalls(s, names, rename = {}) {
  if (!names.length) return s
  const re = new RegExp(`(?<![\\w.$])(${names.join('|')})\\s*\\(`, 'g')
  let m
  while ((m = re.exec(s))) {
    const before = s.slice(Math.max(0, m.index - 10), m.index)
    if (/function\*\s*$/.test(before)) continue
    const open = m.index + m[0].length - 1
    const close = matchParen(s, open)
    if (close < 0) break
    const name = rename[m[1]] || m[1]
    const inner = s.slice(open, close + 1)
    const rep = `(yield* ${name}${inner})`
    s = s.slice(0, m.index) + rep + s.slice(close + 1)
    re.lastIndex = m.index + `(yield* ${name}`.length + 1
  }
  return s
}

// Converte inicializadores {…} (também aninhados) em literais de vetor JS […]
function arrayInitializers(s) {
  const re = /\b(let|const)\s+(\w+)\s*((?:\[[^\]]*\]\s*)+)=\s*\{/g
  let out = ''
  let last = 0
  let m
  while ((m = re.exec(s))) {
    const open = m.index + m[0].length - 1
    let depth = 0
    let k = open
    for (; k < s.length; k++) {
      const c = s[k]
      if (c === '"' || c === "'") {
        let j = k + 1
        while (j < s.length && s[j] !== c) j += s[j] === '\\' ? 2 : 1
        k = j
        continue
      }
      if (c === '{') depth++
      else if (c === '}' && --depth === 0) break
    }
    let body = ''
    for (let i = open; i <= k; i++) {
      const c = s[i]
      if (c === '"' || c === "'") {
        let j = i + 1
        while (j < s.length && s[j] !== c) j += s[j] === '\\' ? 2 : 1
        body += s.slice(i, j + 1)
        i = j
        continue
      }
      body += c === '{' ? '[' : c === '}' ? ']' : c
    }
    out += s.slice(last, m.index) + `${m[1]} ${m[2]} = ${body}`
    last = k + 1
    re.lastIndex = k + 1
  }
  return out + s.slice(last)
}

// operadores alternativos do C++ (if (a or b and not c)) -> ||, &&, ! … (fora das strings)
const ALT_OPS = { and: '&&', or: '||', not: '!', and_eq: '&=', or_eq: '|=', xor: '^', xor_eq: '^=', bitand: '&', bitor: '|', compl: '~', not_eq: '!=' }
function altOperators(src) {
  return src
    .split(/("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/)
    .map((part, i) => (i % 2 ? part : part.replace(/\b(and_eq|or_eq|xor_eq|not_eq|bitand|bitor|compl|and|or|not|xor)\b/g, (w) => ` ${ALT_OPS[w]} `)))
    .join('')
}

// aplica fn aos troços de código, deixando intactos os literais "…" e '…'
function codeOnly(s, fn) {
  const parts = []
  let last = 0
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '"' || c === "'") {
      let j = i + 1
      while (j < s.length && s[j] !== c && s[j] !== '\n') j += s[j] === '\\' ? 2 : 1
      parts.push([false, s.slice(last, i)], [true, s.slice(i, j + 1)])
      last = j + 1
      i = j
    }
  }
  parts.push([false, s.slice(last)])
  // marca as strings, transforma o código todo de uma vez (as declarações podem ter strings) e repõe
  const marks = []
  const joined = parts.map(([isStr, t]) => (isStr ? (marks.push(t), `\u0001${marks.length - 1}\u0001`) : t)).join('')
  return fn(joined).replace(/\u0001(\d+)\u0001/g, (_, k) => marks[+k])
}

// bibliotecas que escrevem nas variáveis do programa por referência (PID(&entrada, &saida, &alvo),
// mpu.getMotion6(&ax, …), gps.f_get_position(&lat, &lon)): &x passa a __ref(() => x, (v) => x = v)
const REF_CTORS = ['PID', 'QuickPID', 'PID_v2', 'AutoPID']
const REF_METHODS = ['getMotion6', 'getMotion9', 'getAcceleration', 'getRotation', 'getMag', 'getHeading', 'f_get_position', 'get_position', 'crack_datetime', 'getEvent2']
function refArgs(args) {
  return splitArgsTop(args)
    .map((a) => {
      const m = a.trim().match(/^&\s*([A-Za-z_][\w.]*(?:\[[^\]]*\])?)$/)
      return m ? ` __ref(() => ${m[1]}, (__v) => { ${m[1]} = __v; })` : a
    })
    .join(',')
}
function splitArgsTop(t) {
  const out = []
  let depth = 0
  let cur = ''
  for (const ch of t) {
    if ('([{'.includes(ch)) depth++
    else if (')]}'.includes(ch)) depth--
    if (ch === ',' && depth === 0) (out.push(cur), (cur = ''))
    else cur += ch
  }
  out.push(cur)
  return out
}
function libTransforms(s) {
  // templates de bibliotecas: ArduinoFFT<double> → ArduinoFFT; Timer<> → Timer
  s = s.replace(/\b(ArduinoFFT|Timer|movingAvg|RunningAverage)\s*<[^<>;()]*>/g, '$1')
  // classes dentro de namespaces de bibliotecas
  s = s.replace(/\bBounce2\s*::\s*Button\b/g, 'Bounce2Button').replace(/\bRotaryEncoder\s*::\s*(LatchMode|Direction)\s*::\s*/g, 'RotaryEncoder.$1.')
  // referências
  const reCall = new RegExp(`(\\b(?:${REF_CTORS.join('|')})\\s+\\w+\\s*\\(|\\.\\s*(?:${REF_METHODS.join('|')})\\s*\\()`, 'g')
  let m
  while ((m = reCall.exec(s))) {
    const open = m.index + m[0].length - 1
    const close = matchClose(s, open)
    if (close < 0) break
    const inner = s.slice(open + 1, close)
    if (!inner.includes('&')) continue
    const rep = refArgs(inner)
    s = s.slice(0, open + 1) + rep + s.slice(close)
    reCall.lastIndex = open + rep.length
  }
  // Streaming.h: Serial << a << b << endl;  → Serial.print(a); Serial.print(b); Serial.println();
  s = s.replace(/(^|[;{}]\s*)(Serial\d?)\s*<<([^;]*);/gm, (all, pre, port, rest) => {
    const parts = splitShift(rest)
    if (!parts) return all
    return pre + parts.map((p) => (/^\s*endl\s*$/.test(p) ? `${port}.println();` : `${port}.print(${p.trim()});`)).join(' ')
  })
  return s
}
// divide "a << b << endl" pelos << do topo (fora de parênteses e strings)
function splitShift(t) {
  const out = []
  let depth = 0
  let cur = ''
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]
    if (ch === '"' || ch === "'") {
      let j = i + 1
      while (j < t.length && t[j] !== ch) j += t[j] === '\\' ? 2 : 1
      cur += t.slice(i, j + 1)
      i = j
      continue
    }
    if ('([{'.includes(ch)) depth++
    else if (')]}'.includes(ch)) depth--
    if (depth === 0 && ch === '<' && t[i + 1] === '<') {
      out.push(cur)
      cur = ''
      i++
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out.filter((x) => x.trim()).length ? out.filter((x) => x.trim()) : null
}

export function transpile(source, { classes = ['Servo'], defines = ['ARDUINO=10819'], libs = {} } = {}) {
  // (compiler-net.js: raw strings, String/char[], ArduinoJson, lambdas, tempo…)
  // class / struct / enum / typedef do próprio sketch (compiler-classes.js)
  const libClasses = classes
  // pré-processador: #include das bibliotecas do utilizador, #if/#ifdef, macros (compiler-pre.js)
  const pre = preprocess(stripComments(rawStrings(source)), { defines, libs })
  // <setjmp.h> (jmp_buf = int) e extern "C" (ligação de C, sem efeito no simulador)
  const fptr = fnPtrDecls(pre.replace(/\bjmp_buf\b/g, 'int').replace(/\bextern\s+"C"\s*(?!\{)/g, ''))
  const ct = classTransforms(altOperators(fptr.s), { TYPES, libClasses })
  classes = [...classes, ...ct.classes.map((c) => c.name)]
  // sizeof de variáveis: sizeof(v) / sizeof(v[0]) = número de elementos; sizeof(v) = bytes
  let s0 = libTransforms(ct.s)
  // objeto com o mesmo nome da classe (como nos exemplos do Otto DIY: "Otto Otto;"): em C++ o nome
  // passa a referir-se ao objeto; em JS colidiria com a classe → o objeto ganha um nome interno.
  // (antes de "Classe::constante" virar "Classe.constante", que continua a referir-se à classe)
  for (const { name: c } of ct.classes) {
    if (!new RegExp(`(^|[;{}\\n])\\s*${c}\\s+${c}\\s*(?=[;(=])`).test(s0)) continue
    const v = `${c}__obj`
    s0 = s0.replace(new RegExp(`\\b${c}(\\s+)${c}(?=\\s*[;(=])`, 'g'), `${c}$1${v}`).replace(new RegExp(`(?<![\\w.:])${c}\\s*\\.(?=\\s*[A-Za-z_])`, 'g'), `${v}.`)
  }
  s0 = s0.replace(/\bsizeof\s*\(\s*([A-Za-z_][\w.]*)\s*\)\s*\/\s*sizeof\s*\(\s*(?:\1\s*\[\s*0\s*\]|\*\s*\1)\s*\)/g, '(__arrLen($1))')
  const vtypes = declaredTypes(s0, TYPES)
  s0 = s0.replace(/\bsizeof\s*\(\s*([A-Za-z_]\w*)\s*\)/g, (all, v) => (vtypes[v] ? `__sizeofV(${v}, '${vtypes[v].type}')` : all))
  // unsigned long / uint32_t: operações bit a bit ficam sem sinal (em JS "x << 24" e "|" dão
  // inteiros de 32 bits COM sinal: 0xFF << 24 seria negativo e n == 0xFFFFFFFF falharia)
  const U32 = Object.keys(vtypes).filter((v) => /^(unsigned_long|uint32_t|unsigned_long_int)$/.test(vtypes[v].type) && !vtypes[v].arr)
  if (U32.length) {
    const BIT = /<<|>>|(?<!\|)\|(?!\|)|\^|(?<!&)&(?!&)|~/
    const names = U32.join('|')
    // n >> k com n sem sinal: deslocamento lógico (>>>)
    s0 = s0.replace(new RegExp(`(?<![\\w.$])(${names})\\s*>>(?![>=])`, 'g'), '$1 >>>')
    s0 = s0.replace(new RegExp(`(?<![\\w.$])(${names})\\s*(\\|=|&=|\\^=|<<=|>>=)\\s*([^;{}]+);`, 'g'), (all, n, op, e) => `${n} = (${n} ${op.slice(0, -1)} (${e})) >>> 0;`)
    s0 = s0.replace(new RegExp(`(?<![\\w.$])(${names})\\s*=(?!=)\\s*([^;{}]+);`, 'g'), (all, n, e) => (BIT.test(e) && !/>>>\s*0\s*$/.test(e) ? `${n} = (${e}) >>> 0;` : all))
  }
  let s = netTransforms(s0)
  // templates e macros do FastLED / GxEPD2 (compiler-g.js)
  s = groupGTransforms(s)
  // BOOTSEL e enums da Pico4Drive (compiler-pico.js)
  s = picoTransforms(s)

  // divisão inteira do C (7 / 2 = 3) — antes de os tipos e os casts desaparecerem
  s = intDivision(s)
  // 'A' em contas/comparações com números (Serial.read() == 'A', c - '0', switch com case 'x')
  s = charOperands(s)

  // pré-processador (PROGMEM não existe fora do AVR)
  s = s.replace(/\bPROGMEM\b/g, '')
  // EEPROM.get/put precisam do tipo C da variável (antes de os tipos desaparecerem)
  s = eepromTyped(s, declaredTypes(s, TYPES))
  // atributos de ISR do ESP32/ESP8266 e tipos do FreeRTOS (handles = inteiros)
  s = s.replace(/\b(?:IRAM_ATTR|ICACHE_RAM_ATTR|ARDUINO_ISR_ATTR)\b/g, '')
  s = s.replace(RTOS_TYPES, 'long')
  // constantes de classe: AccelStepper::DRIVER -> AccelStepper.DRIVER
  s = s.replace(/\b([A-Za-z_]\w*)::(\w+)/g, '$1.$2')
  s = s.replace(/^\s*#\s*include.*$/gm, '')
  s = s.replace(/^\s*#\s*define\s+(\w+)\s+(.+)$/gm, 'const $1 = $2;')
  s = s.replace(/^\s*#\s*define\s+(\w+)\s*$/gm, 'const $1 = 1;')

  // objetos de bibliotecas: Servo a, b;  Servo braco[4];  LiquidCrystal_I2C lcd(0x27, 16, 2);
  // Keypad k = Keypad(makeKeymap(keys), …);
  const C = classes.join('|')
  // (só no código: "PID in=" dentro de uma string não é uma declaração)
  s = codeOnly(s, (t) => {
    t = t.replace(new RegExp(`\\b(${C})\\s+(\\w+)\\s*\\[\\s*(\\w+)\\s*\\]\\s*;`, 'g'), 'let $2 = Array.from({ length: $3 }, () => new $1());')
    t = t.replace(new RegExp(`\\b(${C})\\s+(\\w+)\\s*=\\s*(${C})\\s*\\(`, 'g'), 'let $2 = new $3(')
    t = t.replace(new RegExp(`\\b(${C})\\s+(\\w+)\\s*\\(`, 'g'), 'let $2 = new $1(')
    // DateTime agora = rtc.now();  File f = SD.open(…);  (objetos de biblioteca vindos de uma expressão)
    t = t.replace(new RegExp(`\\b(${C})\\s+(\\w+)\\s*=(?!=)`, 'g'), 'let $2 =')
    // ponteiros para objetos de biblioteca: camera_fb_t *fb = esp_camera_fb_get();  Servo *s = &a;
    // (o ponteiro é o próprio objeto; p->campo vira p.campo em compiler-classes.js)
    t = t.replace(new RegExp(`(^|[;{}(\\n]\\s*)(?:const\\s+)?(${C})\\s*\\*\\s*(\\w+)\\s*=(?!=)`, 'gm'), '$1let $3 =')
    t = t.replace(new RegExp(`(^|[;{}\\n]\\s*)(?:const\\s+)?(${C})\\s*\\*\\s*(\\w+)\\s*;`, 'gm'), '$1let $3 = null;')
    // IPAddress ip = WiFi.localIP();  (tipos de biblioteca inicializados com uma expressão)
    t = t.replace(/\b(IPAddress|wl_status_t)\s+(\w+)\s*=/g, 'let $2 =')
    t = t.replace(new RegExp(`\\b(${C})\\s+([\\w\\s,]+);`, 'g'), (_, cls, list) => `let ${list.split(',').map((n) => `${n.trim()} = new ${cls}()`).join(', ')};`)
    return t
  })
  // parâmetros de saída do FreeRTOS (&handle, &valor) -> objeto { v }
  s = outParams(s)
  // &Wire -> Wire (endereços não existem em JS)
  s = s.replace(/([(,]\s*)&(?=[A-Za-z_])/g, '$1')
  // p = &objeto;  return &objeto;  (ponteiro = o próprio objeto)
  s = s.replace(/((?<![=!<>])=\s*|\breturn\s+)&(?=[A-Za-z_])/g, '$1')

  // sizeof(tipo) -> tamanho na placa (int = 2 bytes no AVR, 4 no ESP32…)
  s = s.replace(new RegExp(`\\bsizeof\\s*\\(\\s*(${TYPES})\\s*\\)`, 'g'), (_, t) => `__sizeofT('${t.replace(/\s+/g, '_')}')`)
  // protótipos só com tipos (void pause(int); void f(const char *, int);) — antes dos casts, que
  // tomariam "(int)" por um cast e deixariam "void pause int;"
  const BARE = `(?:const\\s+)?${TYPES}\\s*[*&]?\\s*`
  s = s.replace(new RegExp(`^\\s*(?:static\\s+|inline\\s+)*${TYPES}\\s*[*&]?\\s+\\w+\\s*\\(\\s*${BARE}(?:,\\s*${BARE})*\\)\\s*;`, 'gm'), '')
  // casts
  s = s.replace(/\(\s*(?:int|long|byte|unsigned\s+long|unsigned\s+int|unsigned|uint8_t|int8_t|int16_t|uint16_t|int32_t|uint32_t|size_t|short)\s*\)\s*/g, '__int ')
  s = s.replace(/\(\s*(?:float|double)\s*\)\s*/g, '')
  s = intCasts(s)

  // valores por omissão escritos só no protótipo (void f(int a, int v = 12);  …  void f(int a, int v) {…})
  const protoDefaults = {}
  for (const m of s.matchAll(new RegExp(`^\\s*(?:static\\s+|inline\\s+)*${TYPES}\\s*[*&]?\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*;`, 'gm'))) {
    const ds = m[2].split(',').map((p) => (p.includes('=') ? p.slice(p.indexOf('=') + 1).trim() : null))
    if (ds.some((d) => d != null)) protoDefaults[m[1]] = ds
  }
  // protótipos: tipo nome(...);
  s = s.replace(new RegExp(`^\\s*(?:static\\s+|inline\\s+)*${TYPES}\\s*[*&]?\\s+\\w+\\s*\\([^)]*\\)\\s*;`, 'gm'), '')
  // parâmetros por referência (float &x) nas funções do sketch
  s = refParams(s, TYPES)

  // definições de funções
  const userFns = []
  const FN_DEF = new RegExp(`(?:\\b(?:static|inline)\\s+)*(?:\\bconst\\s+)?\\b${TYPES}\\s*[*&]?\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*\\{`, 'g')
  // sobrecarga (C++): várias funções com o mesmo nome e parâmetros diferentes. Em JS só pode
  // haver uma por nome — a última apagava as outras e mover(a) → mover(a, 15) chamava-se a si
  // própria até "Maximum call stack size exceeded". Cada versão fica com nome próprio
  // (nome__o0, nome__o1…) e nome() passa a ser um despachante que escolhe pelo número e
  // pelo tipo dos argumentos (ver overloadDispatchers).
  const defCount = {}
  for (const m of s.matchAll(FN_DEF)) defCount[m[1]] = (defCount[m[1]] || 0) + 1
  const overloads = {}
  s = s.replace(
    FN_DEF,
    (_, name, params) => {
      userFns.push(name)
      let jsName = name
      if (defCount[name] > 1) {
        const list = (overloads[name] ||= [])
        jsName = `${name}__o${list.length}`
        list.push({ jsName, params: paramInfo(params) })
      }
      const coerce = []
      const ps = params
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p && p !== 'void')
        .map((p, i) => {
          const def = p.split('=')
          let id = (def[0].replace(/\[[^\]]*\]/g, ' ').replace(/[*&]/g, ' ').trim().match(/(\w+)\s*$/) || [, ''])[1]
          // parâmetro sem nome (bool f(void *), void g(int)): só o tipo
          if (!id || new RegExp(`^${TYPES}$`).test(def[0].replace(/[*&]/g, ' ').trim()) || /^(void|const|unsigned)$/.test(id)) id = `__p${i}`
          // parâmetro inteiro (passado por valor): um float que chega é truncado, como no C++
          // (moverServo(porta, 47.3) → 47); uint8_t/byte dão a volta aos 256
          const cast = intParamCast(def[0], id)
          if (cast) coerce.push(cast)
          const dflt = def[1]?.trim() ?? protoDefaults[name]?.[i]
          return dflt != null ? `${id} = ${dflt}` : id
        })
      return `function* ${jsName}(${ps.join(', ')}) {${TICK}${coerce.join('')}`
    },
  )

  // variáveis static locais: mantêm o valor entre chamadas
  s = hoistStaticLocals(s, TYPES)

  // declarações de variáveis
  s = s.replace(
    new RegExp(`\\b(?:(?:static|volatile)\\s+)*(const\\s+)?(?:(?:static|volatile)\\s+)*${TYPES}(?:\\s*\\*\\s*|\\s+)(?=[A-Za-z_])`, 'g'),
    (_, isConst) => (isConst ? 'const ' : 'let '),
  )
  // vetores: let a[3] = {1,2,3};  let m[4][4] = {{…},…};  let a[5];
  s = arrayInitializers(s)
  s = s.replace(/\b(let|const)\s+(\w+)\s*\[\s*([^\]]+)\]\s*;/g, '$1 $2 = new Array($3).fill(0);')
  // várias na mesma linha: int x[50], y[50], i, n = 10;  (e matrizes m[4][4] sem inicializador)
  s = s.replace(/\b(let|const)\s+([^;{}()"]*\[[^;{}()"]*);/g, (all, kw, list) =>
    /=\s*\[/.test(list) ? all : `${kw} ${list
      .split(',')
      .map((it) => {
        const m = it.trim().match(/^(\w+)\s*((?:\[[^\]]+\]\s*)+)$/)
        if (!m) return /^\w+$/.test(it.trim()) ? `${it.trim()} = 0` : it.trim()
        const dims = [...m[2].matchAll(/\[([^\]]+)\]/g)].map((d) => d[1].trim())
        const mk = (k) => (k === dims.length - 1 ? `new Array(${dims[k]}).fill(0)` : `Array.from({ length: ${dims[k]} }, () => ${mk(k + 1)})`)
        return `${m[1]} = ${mk(0)}`
      })
      .join(', ')};`,
  )
  s = s.replace(/\b(let|const)\s+(\w+)\s*\[[^\]]*\]\s*=\s*("[^"]*")/g, '$1 $2 = $3')
  // declarações sem inicializador -> 0
  s = s.replace(/\blet\s+([^;=()]+);/g, (_, list) => `let ${list.split(',').map((v) => `${v.trim()} = 0`).join(', ')};`)

  // literais e palavras específicas
  s = s.replace(/\b(0[xX][0-9a-fA-F]+|0[bB][01]+|\d+)(?:ULL|ull|LL|ll|UL|ul|LU|lu|L|l|U|u)\b/g, '$1')
  s = s.replace(/\b(\d+\.\d*|\.\d+)f\b/g, '$1')
  s = s.replace(/\bNULL\b/g, 'null')

  s = instrumentLoops(s)

  // chamadas a funções do utilizador e funções que "consomem tempo"
  s = wrapCalls(s, userFns)
  s += overloadDispatchers(overloads)
  s = wrapCalls(s, ['delay', 'delayMicroseconds'], { delay: '__delay', delayMicroseconds: '__delayUs' })
  s = wrapCalls(s, BLOCKING, { yield: '__yield' })
  // bibliotecas de rede: client.loop(), http.GET(), server.handleClient()… (compiler-net.js)
  s = wrapNetBlocking(s)
  s = picoLateTransforms(s)
  s = wrapFnPtrCalls(s, fptr.names)

  s = classSkeletons(s, ct.classes, libClasses)

  if (!userFns.includes('setup')) throw new Error(i18n.m('Falta a função void setup() { ... }', 'Missing function void setup() { ... }'))
  if (!userFns.includes('loop')) throw new Error(i18n.m('Falta a função void loop() { ... }', 'Missing function void loop() { ... }'))

  const body = `${s}
return function* __main(){
  yield* setup();
  for(;;){ yield* loop(); __rt.t += 4; if(__rt.t>=__rt.target) yield; }
};`
  return body
}

export function compile(source, api) {
  return compileJs(transpile(source), api)
}

// Carrega um programa já traduzido (ex.: pelo backend em Bun)
// nomes declarados no nível de topo do programa (variáveis globais, funções, classes): têm
// prioridade sobre os da API com o mesmo nome (int map = 3; int hour; …), como no C++
function topLevelNames(js) {
  const out = new Set()
  let depth = 0
  for (let i = 0; i < js.length; i++) {
    const c = js[i]
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1
      while (j < js.length && js[j] !== c) j += js[j] === '\\' ? 2 : 1
      i = j
      continue
    }
    if (c === '/' && js[i + 1] === '/') {
      while (i < js.length && js[i] !== '\n') i++
      continue
    }
    if (c === '{' || c === '(' || c === '[') depth++
    else if (c === '}' || c === ')' || c === ']') depth--
    else if (depth === 0 && /[A-Za-z_$]/.test(c) && !/[\w$]/.test(js[i - 1] || '')) {
      const m = js.slice(i, i + 80).match(/^(?:let|const|var|class|function\*?)\s+([A-Za-z_$][\w$]*)/)
      if (m) {
        out.add(m[1])
        // let a = 1, b = 2;
        if (/^(let|const|var)\b/.test(m[0])) {
          const end = js.indexOf(';', i)
          for (const mm of js.slice(i, end < 0 ? i : end).matchAll(/,\s*([A-Za-z_$][\w$]*)\s*=/g)) out.add(mm[1])
        }
      }
    }
  }
  return out
}

export function compileJs(js, api) {
  const mine = topLevelNames(js)
  const names = Object.keys(api).filter((n) => !mine.has(n))
  let factory
  try {
    // eslint-disable-next-line no-new-func
    factory = new Function(...names, js)
  } catch (e) {
    const err = new Error(i18n.m(`Erro de sintaxe: ${e.message}`, `Syntax error: ${e.message}`))
    err.js = js
    throw err
  }
  const args = names.map((n) => api[n])
  // cada arranque corre de novo as variáveis globais e os construtores (como no Arduino: depois
  // de um reset as globais voltam ao valor inicial e os construtores correm já com os pinos
  // no estado de arranque). Um erro nas globais aparece como erro do programa.
  const main = () => {
    try {
      return factory(...args)()
    } catch (e) {
      return (function* () {
        throw e
      })()
    }
  }
  return { main, js }
}
