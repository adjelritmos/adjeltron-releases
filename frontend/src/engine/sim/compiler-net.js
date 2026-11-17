// Passos do transpilador para os sketches de rede/IoT (usados por compiler.js):
//  - raw strings R"x(...)x" (páginas HTML), literais "a" "b" adjacentes
//  - String sem inicializador ("" em vez de 0), String x = expr (char[] → texto), String a[N]
//  - char buf[N] → CharBuf (snprintf/strcpy/dtostrf escrevem lá), casts (char) e (char*)
//  - métodos da String que alteram o próprio objeto (s.trim(); s.replace(a, b);…) e s.length()
//  - ArduinoJson: StaticJsonDocument<N>, .as<T>(), leituras doc["a"]["b"] → __jv(…), "|" → __jor(…)
//  - lambdas [](){…} (server.on("/", [](){…})), for (auto x : coleção), auto, nullptr
//  - time_t, struct tm, time(&t)
//  - chamadas bloqueantes de bibliotecas (client.loop(), http.GET(), server.handleClient()…)
//    → (yield* __await(…)): ver backend/sim/libs/_net.js
import { matchClose, splitArgs } from './compiler-extras.js'

function skipStr(s, i) {
  const q = s[i]
  let j = i + 1
  while (j < s.length && s[j] !== q) j += s[j] === '\\' ? 2 : 1
  return j
}

// R"delim( … )delim"  →  "…" (sem aspas literais lá dentro, para os outros passos não se perderem)
export function rawStrings(src) {
  if (!src.includes('R"')) return src
  let out = ''
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (c === '/' && src[i + 1] === '/') {
      const j = src.indexOf('\n', i)
      const e = j < 0 ? src.length : j
      out += src.slice(i, e)
      i = e - 1
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      const j = src.indexOf('*/', i + 2)
      const e = j < 0 ? src.length : j + 2
      out += src.slice(i, e)
      i = e - 1
      continue
    }
    if (c === 'R' && src[i + 1] === '"' && !/[\w$]/.test(src[i - 1] || '')) {
      const open = src.indexOf('(', i + 2)
      const delim = src.slice(i + 2, open)
      if (open > 0 && /^[^\s()\\]{0,16}$/.test(delim)) {
        const end = src.indexOf(`)${delim}"`, open + 1)
        if (end > 0) {
          const body = src.slice(open + 1, end)
          const lit = body.replace(/\\/g, '\\\\').replace(/"/g, '\\x22').replace(/'/g, '\\x27').replace(/\r/g, '').replace(/\n/g, '\\n').replace(/\t/g, '\\t')
          out += `"${lit}"`
          i = end + delim.length + 1
          continue
        }
      }
    }
    if (c === '"' || c === "'") {
      const j = skipStr(src, i)
      out += src.slice(i, j + 1)
      i = j
      continue
    }
    out += c
  }
  return out
}

// "abc" "def" (concatenação do C) → "abc" + "def"
function adjacentStrings(s) {
  if (!/"\s+"/.test(s)) return s
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === "'") {
      const j = skipStr(s, i)
      out += s.slice(i, j + 1)
      i = j
      continue
    }
    if (c === '"') {
      const j = skipStr(s, i)
      out += s.slice(i, j + 1)
      let k = j + 1
      while (k < s.length && /\s/.test(s[k])) k++
      if (s[k] === '"') out += ' +'
      i = j
      continue
    }
    out += c
  }
  return out
}

// parâmetros "int a, const char* b" → "a, b"
const paramNames = (params) =>
  params
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p && p !== 'void')
    .map((p) => {
      const def = p.split('=')
      const id = (def[0].replace(/\[[^\]]*\]/g, ' ').replace(/[*&]/g, ' ').trim().match(/(\w+)\s*$/) || [, ''])[1]
      return def[1] ? `${id} = ${def[1].trim()}` : id
    })
    .join(', ')

const JSON_TYPES = 'JsonDocument|StaticJsonDocument|DynamicJsonDocument|JsonObject|JsonArray|JsonVariant|JsonObjectConst|JsonArrayConst|JsonVariantConst'

// doc["a"]["b"] usado como valor → __jv(doc["a"]["b"]); doc["x"] | 0 → __jor(doc["x"], 0)
function jsonReads(s, names) {
  if (!names.size) return s
  const re = new RegExp(`(?<![\\w$.])(${[...names].join('|')})\\s*\\[`, 'g')
  const hits = []
  let m
  while ((m = re.exec(s))) hits.push(m.index)
  for (const start of hits.reverse()) {
    let open = s.indexOf('[', start)
    let close = -1
    for (;;) {
      close = matchClose(s, open)
      if (close < 0) break
      let k = close + 1
      while (/\s/.test(s[k] || '')) k++
      if (s[k] === '[') open = k
      else break
    }
    if (close < 0) continue
    const chain = s.slice(start, close + 1)
    const rest = s.slice(close + 1)
    const after = rest.trimStart()
    if (/^(=(?!=)|[-+*/%&|^]=|<<=|>>=|\+\+|--|\.|\()/.test(after)) continue
    const def = after.match(/^\|(?![|=])\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|-?\d[\d.]*(?:[eE][-+]?\d+)?[fFuUlL]*|true|false|[A-Za-z_][\w.]*(?:\([^()]*\))?)/)
    if (def) {
      const skip = rest.length - after.length + def[0].length
      s = s.slice(0, start) + `__jor(${chain}, ${def[1]})` + s.slice(close + 1 + skip)
    } else s = s.slice(0, start) + `__jv(${chain})` + s.slice(close + 1)
  }
  return s
}

// String x = expr;  →  String x = __S(expr);   (só uma variável por declaração)
// char c = expr;    →  char c = __chrv(expr);  (c passa a ser um carácter: c == '\n', texto += c)
function stringInits(s, re = /\bString\s+(\w+)\s*=(?!=)/g, fn = '__S') {
  const hits = []
  let m
  while ((m = re.exec(s))) hits.push({ at: m.index + m[0].length, name: m[1] })
  for (const h of hits.reverse()) {
    let depth = 0
    let k = h.at
    for (; k < s.length; k++) {
      const c = s[k]
      if (c === '"' || c === "'") {
        k = skipStr(s, k)
        continue
      }
      if ('([{'.includes(c)) depth++
      else if (')]}'.includes(c)) {
        if (--depth < 0) break
      } else if ((c === ';' || c === ',') && depth === 0) break
    }
    if (s[k] !== ';') continue
    const expr = s.slice(h.at, k).trim()
    if (/^"(?:[^"\\]|\\.)*"$/.test(expr) || /^'(?:[^'\\]|\\.)*'$/.test(expr) || /^__(S|chrv|cbuf)\(/.test(expr)) continue
    s = s.slice(0, h.at) + ` ${fn}(${expr})` + s.slice(k)
  }
  return s
}

export function netTransforms(s) {
  s = adjacentStrings(s)
  s = s.replace(/\bnullptr\b/g, 'NULL')
  // hora: time_t, struct tm, time(&t)
  s = s.replace(/\btime_t\b/g, 'unsigned long')
  s = s.replace(/\b(?:struct\s+)?tm\s*\*\s*(\w+)\s*=/g, 'let $1 =')
  s = s.replace(/\bstruct\s+tm\b/g, 'tm')
  s = s.replace(/\btime\s*\(\s*&\s*(\w+)\s*\)/g, '($1 = time(NULL))')
  // ArduinoJson: modelos (templates)
  s = s.replace(/\b(StaticJsonDocument|DynamicJsonDocument|JsonDocument)\s*<[^<>;]*>/g, '$1')
  s = s.replace(/\.\s*(as|is|to)\s*<([^<>()]+)>\s*\(\s*\)/g, (_, f, t) => `.${f}("${t.trim()}")`)
  s = s.replace(/\.\s*add\s*<([^<>()]+)>\s*\(\s*\)/g, (_, t) => `.add({__type:"${t.trim()}"})`)
  // for (Tipo x : coleção) → for (let x of __iter(coleção))
  {
    const re = /\bfor\s*\(\s*(?:const\s+)?(?:auto|[A-Za-z_]\w*(?:\s*<[^<>()]*>)?)\s*[&*]?\s*(\w+)\s*:(?!:)/g
    const hits = []
    let m
    while ((m = re.exec(s))) hits.push({ at: m.index, name: m[1], open: s.indexOf('(', m.index), end: m.index + m[0].length })
    for (const h of hits.reverse()) {
      const close = matchClose(s, h.open)
      if (close < 0) continue
      s = s.slice(0, h.at) + `for (let ${h.name} of __iter(${s.slice(h.end, close).trim()}))` + s.slice(close + 1)
    }
  }
  // lambdas: [](){…}  [&](String s){…}  [=]() -> void {…}
  s = s.replace(/(?<=[(,=]\s*)\[\s*[^\[\]]*\]\s*\(([^()]*)\)\s*(?:mutable\s*)?(?:->\s*[\w:<>*&\s]+?)?\s*\{/g, (_, params) => `function* (${paramNames(params)}) {`)
  // casts de texto: (char*)payload, (const char*)x → nada; (char)x → __chr(x)
  s = s.replace(/\(\s*(?:const\s+)?(?:unsigned\s+)?(?:char|byte|uint8_t)\s*\*\s*\)\s*/g, '')
  s = s.replace(/\(\s*char\s*\)\s*([\w.]+(?:\[[^\[\]]*\]|\([^()]*\))*|\([^()]*\)|'(?:[^'\\]|\\.)*')/g, '__chr($1)')
  // variáveis ArduinoJson (documentos, objetos, vetores, variantes — também parâmetros)
  const names = new Set([...s.matchAll(new RegExp(`\\b(?:${JSON_TYPES})\\s*[&*]?\\s+(\\w+)`, 'g'))].map((x) => x[1]))
  s = jsonReads(s, names)
  // conversão implícita com o tipo da variável: int x = doc["x"] (trunca, 0 se faltar), float, bool
  s = s.replace(/\b((?:unsigned\s+)?(?:int|long|short|byte|char|u?int(?:8|16|32|64)_t|size_t)|float|double|bool|boolean)(\s+\w+\s*=\s*)__jv\(/g, (m, t, mid) => `${t}${mid}${/float|double/.test(t) ? '__jnum' : /bool/.test(t) ? '__jbool' : t === 'char' ? '__jv' : '__jint'}(`)
  // String sem valor inicial é "" (e não 0)
  s = s.replace(/\bString\s+(\w+)\s*\[\s*([^\]]+)\]\s*;/g, 'let $1 = new Array($2).fill("");')
  s = s.replace(/\bString\s+(\w+(?:\s*,\s*\w+)*)\s*;/g, (_, list) => `String ${list.split(',').map((n) => `${n.trim()} = ""`).join(', ')};`)
  s = stringInits(s)
  s = stringInits(s, /(?<!unsigned\s+)\bchar\s+(\w+)\s*=(?!=)/g, '__chrv')
  // char buf[N]; → CharBuf (texto C mutável); char buf[N] = "texto";
  s = s.replace(/(?<!unsigned\s+)\bchar\s+(\w+)\s*\[\s*([^\]\s][^\]]*)\]\s*;/g, 'char $1 = __cbuf($2);')
  s = s.replace(/(?<!unsigned\s+)\bchar\s+(\w+)\s*\[\s*([^\]\s][^\]]*)\]\s*=\s*("(?:[^"\\]|\\.)*")\s*;/g, 'char $1 = __cbuf($2).setText($3);')
  // métodos da String
  s = s.replace(/\.length\s*\(\s*\)/g, '.length')
  const ST = '(^|[;{}\\n)]\\s*|\\belse\\s+)([A-Za-z_][\\w.]*(?:\\[[^\\[\\]]*\\])?)'
  s = s.replace(new RegExp(`${ST}\\.(trim|toUpperCase|toLowerCase)\\(\\s*\\)\\s*;`, 'g'), '$1$2 = $2.$3();')
  for (const [m, fn] of [['replace', '__strReplace'], ['remove', '__strRemove'], ['setCharAt', '__strSetChar'], ['concat', '__strConcat']]) {
    const re = new RegExp(`${ST}\\.${m}\\s*\\(`, 'g')
    let x
    const hits = []
    while ((x = re.exec(s))) hits.push({ at: x.index, pre: x[1], obj: x[2], open: x.index + x[0].length - 1 })
    for (const h of hits.reverse()) {
      const close = matchClose(s, h.open)
      if (close < 0) continue
      let k = close + 1
      while (/\s/.test(s[k] || '')) k++
      if (s[k] !== ';') continue
      const args = s.slice(h.open + 1, close)
      s = s.slice(0, h.at) + `${h.pre}${h.obj} = ${fn}(${h.obj}${args.trim() ? `, ${args}` : ''})` + s.slice(k)
    }
  }
  // serializeJson(doc, destino); com destino String: destino = __sj(doc, destino);
  s = s.replace(new RegExp(`${'(^|[;{}\\n)]\\s*|\\belse\\s+)'}serializeJson(Pretty)?\\s*\\(\\s*([^,;]+?)\\s*,\\s*([A-Za-z_]\\w*)\\s*\\)\\s*;`, 'g'), (_, pre, p, doc, dest) => `${pre}${dest} = __sj${p ? 'p' : ''}(${doc}, ${dest});`)
  // auto x = …
  s = s.replace(/\bauto\s*[&*]?\s+(?=[A-Za-z_])/g, 'let ')
  return s
}

// métodos que podem bloquear (o sketch espera em tempo virtual) ou chamar callbacks do sketch
const BLOCKING_METHODS = ['loop', 'handleClient', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'sendRequest', 'connect', 'update', 'forceUpdate', 'calcOffsets', 'calcGyroOffsets', 'calcAccOffsets', 'tick', 'execute', 'run', 'easeTo', 'delay', 'rotate', 'move', 'service', 'moveTo', 'runToPosition', 'runToNewPosition', 'write', 'wait', 'slowmove', 'easeToD', 'powerDown', 'idle', 'powerSave', 'powerStandby', 'powerExtStandby', 'adcNoiseReduction', 'deepSleep', 'serviceAlarms']
const BLOCKING_FUNCS = ['getLocalTime', 'updateAndWaitForAllServosToStop']

export function wrapNetBlocking(s) {
  const re = new RegExp(
    `(?<![\\w$.])((?:[A-Za-z_$][\\w$]*)(?:\\[[^\\[\\]]*\\])*(?:\\s*\\.\\s*[A-Za-z_$][\\w$]*(?:\\[[^\\[\\]]*\\])*)*?)\\s*\\.\\s*(${BLOCKING_METHODS.join('|')})\\s*\\(|(?<![\\w$.])(${BLOCKING_FUNCS.join('|')})\\s*\\(`,
    'g',
  )
  const hits = []
  let m
  while ((m = re.exec(s))) {
    // não mexe em "function* loop(" nem em "yield* x(" já tratados
    const before = s.slice(Math.max(0, m.index - 12), m.index)
    if (/function\*?\s*$/.test(before)) continue
    hits.push({ at: m.index, open: m.index + m[0].length - 1 })
  }
  for (const h of hits.reverse()) {
    const close = matchClose(s, h.open)
    if (close < 0) continue
    s = s.slice(0, h.at) + `(yield* __await(${s.slice(h.at, close + 1)}))` + s.slice(close + 1)
  }
  return s
}

export { splitArgs }
