// Divisão inteira do C/C++ no tradutor: em C, `7 / 2` é 3 e `t / 1500` (t inteiro) trunca;
// em JavaScript `/` dá sempre um número com casas decimais (3.5, 0.333…). Este passo troca
// `A / B` por `__idiv(A, B)` (Math.trunc da divisão) quando os DOIS operandos são de certeza
// inteiros, e `x /= e` por `x = __toInt(x / (e))` quando x é inteiro.
//
// É conservador: só conta como inteiro o que se sabe que é —
//   literais inteiros, variáveis/parâmetros declarados com um tipo inteiro (e nunca como
//   float/double noutro sítio), #define com valor inteiro, funções do Arduino que devolvem
//   inteiros (millis, analogRead, map…), funções do sketch declaradas com tipo inteiro e casts
//   (int)/(long)… Na dúvida (um float, um (float), um membro de um objeto desconhecido) fica a
//   divisão normal, como antes.
// Respeita a precedência: `x * 100 / 255` divide o produto ((x*100)/255), não só o 100.

const INT_T = /^(?:unsigned\s+long\s+long\s+int|unsigned\s+long\s+long|unsigned\s+long\s+int|unsigned\s+short\s+int|long\s+long\s+int|short\s+int|signed\s+char|unsigned\s+long|unsigned\s+int|unsigned\s+char|unsigned\s+short|long\s+long|long\s+int|unsigned|signed|long|int|short|bool|boolean|byte|char|word|size_t|uint8_t|uint16_t|uint32_t|uint64_t|int8_t|int16_t|int32_t|int64_t)$/
const FLOAT_T = /^(?:float|double)$/
const TYPE_RE =
  /\b(unsigned\s+long\s+long\s+int|unsigned\s+long\s+long|unsigned\s+long\s+int|unsigned\s+short\s+int|long\s+long\s+int|short\s+int|signed\s+char|unsigned\s+long|unsigned\s+int|unsigned\s+char|unsigned\s+short|long\s+long|long\s+int|unsigned|signed|long|int|short|float|double|bool|boolean|byte|char|word|size_t|uint8_t|uint16_t|uint32_t|uint64_t|int8_t|int16_t|int32_t|int64_t|String|void)\b\s*[*&]?\s*/g

// funções da API que devolvem inteiros (ou o tipo dos argumentos: abs/min/max/constrain)
const INT_FUNCS = new Set(['millis', 'micros', 'analogRead', 'digitalRead', 'pulseIn', 'pulseInLong', 'random', 'map', 'abs', 'min', 'max', 'constrain', 'bitRead', 'highByte', 'lowByte', 'sizeof', 'strlen', '__idiv', '__toInt', '__int', 'available', 'read', 'peek', 'parseInt', 'length', 'indexOf', 'toInt', 'charAt'])
// constantes do Arduino que são inteiras
const INT_CONSTS = new Set(['HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'LED_BUILTIN', 'true', 'false', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'DEC', 'HEX', 'BIN', 'OCT', 'CHANGE', 'RISING', 'FALLING'])
const CASTS_INT = /^\(\s*(?:int|long|short|byte|char|word|unsigned(?:\s+(?:long|int|char|short))?|u?int(?:8|16|32|64)_t|size_t)\s*\)/
const CASTS_FLOAT = /^\(\s*(?:float|double)\s*\)/
const KEYWORDS = new Set(['return', 'case', 'sizeof', 'new', 'delete', 'if', 'while', 'for', 'switch', 'do', 'else'])

// nomes com tipo: { int: Set, float: Set, intFns: Set }
function collectTypes(s) {
  const ints = new Set()
  const floats = new Set()
  const intFns = new Set()
  const reals = new Set() // float / double (só estes; `floats` inclui String, ponteiros…)
  const realFns = new Set()
  const narrow = new Set() // inteiros que truncam (bool e char ficam de fora)
  const bools = new Set()
  const kinds = new Map() // nome → classes de tipo com que foi declarado (o mesmo nome noutro sítio conta)
  TYPE_RE.lastIndex = 0
  let m
  while ((m = TYPE_RE.exec(s))) {
    const t = m[1].replace(/\s+/g, ' ')
    let i = TYPE_RE.lastIndex
    // lista de declaradores: nome [ [..] ] [ = inicializador ] , nome …
    for (let guard = 0; guard < 40; guard++) {
      const id = s.slice(i).match(/^([A-Za-z_]\w*)/)
      if (!id || KEYWORDS.has(id[1])) break
      const name = id[1]
      i += name.length
      while (/\s/.test(s[i] || '')) i++
      if (s[i] === '(') {
        // função: o tipo é o do valor devolvido
        if (INT_T.test(t)) intFns.add(name)
        else if (FLOAT_T.test(t)) realFns.add(name)
        break
      }
      const kind = /^(?:bool|boolean)$/.test(t) ? 'bool' : /\bchar\b/.test(t) ? 'char' : INT_T.test(t) ? 'int' : FLOAT_T.test(t) ? 'real' : 'other'
      if (!kinds.has(name)) kinds.set(name, new Set())
      kinds.get(name).add(kind)
      if (FLOAT_T.test(t)) reals.add(name)
      if (INT_T.test(t) && !/\b(?:bool|boolean|char)\b/.test(t)) narrow.add(name)
      if (/^(?:bool|boolean)$/.test(t)) bools.add(name)
      if (INT_T.test(t)) ints.add(name)
      else if (FLOAT_T.test(t)) floats.add(name)
      else floats.add(name) // String, void*… (não é inteiro)
      // salta [..] e o inicializador até à vírgula/; do mesmo nível
      let depth = 0
      for (; i < s.length; i++) {
        const c = s[i]
        if (c === '(' || c === '[' || c === '{') depth++
        else if (c === ')' || c === ']' || c === '}') {
          if (depth === 0) break
          depth--
        } else if (depth === 0 && (c === ',' || c === ';')) break
        else if (c === '"') i = skipString(s, i)
      }
      if (s[i] !== ',') break
      i++
      while (/\s/.test(s[i] || '')) i++
      // `int a, float b` (parâmetros): o próximo tem tipo próprio
      if (/^(?:const\s+)?(?:unsigned|signed|long|int|short|float|double|bool|boolean|byte|char|word|size_t|u?int\d+_t|String)\b/.test(s.slice(i))) break
    }
  }
  // #define N 10 (inteiro) / #define K 2.5 (não)
  for (const d of s.matchAll(/^\s*#\s*define\s+(\w+)\s+(.+)$/gm)) {
    const v = d[2].trim()
    if (/^\(?-?(?:0x[0-9a-fA-F]+|\d+)(?:UL|ul|L|l|U|u)?\)?$/.test(v)) ints.add(d[1])
    else floats.add(d[1])
  }
  for (const n of [...reals]) if (ints.has(n)) reals.delete(n)
  for (const n of ints) if (floats.has(n)) ints.delete(n) // declarado das duas maneiras: na dúvida, não
  for (const n of [...narrow]) if (!ints.has(n)) narrow.delete(n)
  for (const n of [...bools]) if (!ints.has(n)) bools.delete(n)
  // só nomes declarados de UMA maneira (um `b` que é bool numa função e long noutra fica de fora)
  for (const set of [bools, narrow, reals]) for (const n of [...set]) if (kinds.get(n)?.size !== 1) set.delete(n)
  return { ints, intFns, reals, realFns, narrow, bools }
}

function skipString(s, i) {
  const q = s[i]
  for (i++; i < s.length; i++) {
    if (s[i] === '\\') i++
    else if (s[i] === q) return i
  }
  return i
}

// o texto de um operando é de certeza inteiro?
function isIntExpr(txt, T) {
  const t = txt.trim()
  if (!t) return false
  if (CASTS_FLOAT.test(t) || /\(\s*(?:float|double)\s*\)/.test(t)) return false
  if (/\d\.\d*|\.\d|\d[eE][+-]?\d/.test(t.replace(/"[^"]*"/g, ''))) return false // literal com casas decimais
  if (/"/.test(t)) return false
  // identificadores (os seguidos de "(" são funções; os depois de "." são membros)
  const re = /([A-Za-z_]\w*)/g
  let m
  while ((m = re.exec(t))) {
    const name = m[1]
    const before = t.slice(0, m.index).trimEnd()
    const after = t.slice(m.index + name.length).trimStart()
    if (/\d$/.test(before) && /^[xXuUlL]/.test(name)) continue // 0x1F, 10UL
    if (before.endsWith('.') || before.endsWith('->')) {
      // membro: só métodos conhecidos que devolvem inteiros (Serial.available(), s.length()…)
      if (after.startsWith('(') && INT_FUNCS.has(name)) continue
      return false
    }
    if (after.startsWith('(')) {
      if (INT_FUNCS.has(name) || T.intFns.has(name)) continue
      if (/^(?:int|long|short|byte|char|word|unsigned|u?int\d+_t|size_t)$/.test(name)) continue // int(x)
      return false
    }
    if (/^(?:int|long|short|byte|char|word|unsigned|signed|u?int\d+_t|size_t)$/.test(name)) continue // dentro de um cast
    if (T.ints.has(name) || INT_CONSTS.has(name)) continue
    return false
  }
  return true
}

const isWord = (c) => /[\w$]/.test(c || '')

// operando à esquerda de s[i] (onde está o "/"): devolve o índice de início
function leftOperand(s, i) {
  let j = i - 1
  while (j >= 0 && /\s/.test(s[j])) j--
  if (j < 0) return -1
  const end = j
  const unit = (k) => {
    // um operando simples a acabar em s[k]: (…), […] com o nome antes, nome, número, membro
    if (s[k] === ')' || s[k] === ']') {
      const open = s[k] === ')' ? '(' : '['
      const close = s[k]
      let d = 0
      for (; k >= 0; k--) {
        if (s[k] === close) d++
        else if (s[k] === open && --d === 0) break
        else if (s[k] === '"') return -1
      }
      if (k < 0) return -1
      let a = k - 1
      while (a >= 0 && /\s/.test(s[a])) a--
      // nome de função / vetor / membro antes do parêntese
      if (isWord(s[a]) || s[a] === ']' || s[a] === ')') {
        if (s[a] === ']' || s[a] === ')') {
          if (open === '(') return k // (expr) a seguir a outro operando: não é chamada
          return unit(a)
        }
        while (a >= 0 && (isWord(s[a]) || s[a] === '.' || (s[a] === '>' && s[a - 1] === '-'))) a -= s[a] === '>' ? 2 : 1
        const name = s.slice(a + 1, k).trim()
        if (KEYWORDS.has(name)) return k
        return a + 1
      }
      return k
    }
    if (isWord(s[k]) || s[k] === '.') {
      while (k >= 0 && (isWord(s[k]) || s[k] === '.' || (s[k] === '>' && s[k - 1] === '-'))) k -= s[k] === '>' ? 2 : 1
      const start = k + 1
      const tok = s.slice(start, end + 1)
      if (KEYWORDS.has(tok)) return -1
      return start
    }
    return -1
  }
  let start = unit(end)
  if (start < 0) return -1
  // a mesma precedência (* / %) à esquerda faz parte do operando: a * b / c = (a*b)/c
  for (;;) {
    let k = start - 1
    while (k >= 0 && /\s/.test(s[k])) k--
    if (k < 0) break
    const c = s[k]
    // cast imediatamente antes do operando: (int) / (float)
    if (c === ')') {
      const mm = s.slice(0, k + 1).match(/\(\s*(?:float|double|int|long|short|byte|char|word|unsigned(?:\s+(?:long|int|char|short))?|u?int(?:8|16|32|64)_t|size_t)\s*\)$/)
      if (mm) {
        start = k + 1 - mm[0].length
        continue
      }
      break
    }
    if ((c === '*' || c === '%' || c === '/') && s[k - 1] !== c && s[k + 1] !== '=' && !(c === '*' && s[k - 1] === '/') && !(c === '/' && (s[k - 1] === '*' || s[k - 1] === '/'))) {
      // operador binário (não unário: há um operando antes)
      let p = k - 1
      while (p >= 0 && /\s/.test(s[p])) p--
      if (p < 0 || !(isWord(s[p]) || s[p] === ')' || s[p] === ']')) break
      const st = unitAt(p)
      if (st < 0) break
      start = st
      continue
    }
    break
  }
  return start
  function unitAt(k) {
    return unit(k)
  }
}

// operando à direita (a começar depois do "/"): devolve o índice a seguir ao fim
function rightOperand(s, i) {
  let k = i + 1
  while (k < s.length && /\s/.test(s[k])) k++
  const start = k
  // casts e sinal
  for (;;) {
    const mm = s.slice(k).match(/^\(\s*(?:float|double|int|long|short|byte|char|word|unsigned(?:\s+(?:long|int|char|short))?|u?int(?:8|16|32|64)_t|size_t)\s*\)\s*/)
    if (mm) {
      k += mm[0].length
      continue
    }
    if (s[k] === '-' || s[k] === '+') {
      k++
      while (/\s/.test(s[k] || '')) k++
      continue
    }
    break
  }
  const closeOf = (p, open, close) => {
    let d = 0
    for (; p < s.length; p++) {
      if (s[p] === '"' || s[p] === "'") p = skipString(s, p)
      else if (s[p] === open) d++
      else if (s[p] === close && --d === 0) return p
    }
    return -1
  }
  if (s[k] === '(') {
    const e = closeOf(k, '(', ')')
    if (e < 0) return -1
    k = e + 1
  } else if (isWord(s[k]) || s[k] === "'") {
    if (s[k] === "'") k = skipString(s, k) + 1
    else while (k < s.length && (isWord(s[k]) || s[k] === '.' || (s[k] === '-' && s[k + 1] === '>'))) k += s[k] === '-' ? 2 : 1
  } else return -1
  // chamadas / índices / membros a seguir: f(x), a[i], obj.m()
  for (;;) {
    let p = k
    while (/\s/.test(s[p] || '')) p++
    if (s[p] === '(' || s[p] === '[') {
      const e = closeOf(p, s[p], s[p] === '(' ? ')' : ']')
      if (e < 0) return -1
      k = e + 1
      continue
    }
    if (s[p] === '.' && isWord(s[p + 1])) {
      k = p + 1
      while (k < s.length && isWord(s[k])) k++
      continue
    }
    break
  }
  return start === k ? -1 : k
}

// ---------- casas decimais guardadas num inteiro ----------
// Em C++ `int x = 3.7;` e `x = f * 2.5;` (x inteiro) TRUNCAM (x = 3); em JavaScript a variável
// ficava com as casas decimais. Aqui, quando o valor é de certeza com casas decimais (um literal
// 2.5, uma variável float/double, sqrt/sin/…, uma função float do sketch), a declaração ou a
// atribuição passa a `x = __toInt(…)`. Conservador como a divisão inteira: na dúvida fica como estava.
const REAL_FUNCS = new Set(['sqrt', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'pow', 'exp', 'log', 'log10', 'fabs', 'fmod', 'hypot', 'radians', 'degrees', 'toFloat', 'toDouble', 'parseFloat', 'sq'])
const NARROW_DECL = /(?<=(^|[;{}(])\s*)((?:(?:const|static|volatile)\s+)*(?:unsigned\s+long\s+long|unsigned\s+long|unsigned\s+int|unsigned\s+short|long\s+long|long\s+int|short\s+int|unsigned|int|long|short|byte|word|size_t|u?int(?:8|16|32|64)_t)\s+)([A-Za-z_]\w*\s*=(?!=)[^;{}]*);/gm

function isRealExpr(txt, T) {
  const t = txt.trim()
  if (!t || /["']/.test(t) || t.startsWith('__toInt(')) return false
  if (isIntExpr(t, T)) return false
  if (/[<>?]|==|!=|&&|\|\|/.test(t)) return false // comparações e ?: (0/1, ou um dos ramos)
  if (CASTS_INT.test(t) && /^\(\s*[\w\s]+\)\s*(?:\w+|\([^()]*\))\s*$/.test(t)) return false // (int)x, (int)(…)
  if (/(?<![\w.])(?:\d+\.\d*|\.\d+|\d+[eE][+-]?\d+)/.test(t)) return true
  for (const m of t.matchAll(/(?<![\w.])([A-Za-z_]\w*)\s*(\()?/g)) {
    if (m[2] ? REAL_FUNCS.has(m[1]) || T.realFns.has(m[1]) : T.reals.has(m[1])) return true
  }
  return /\.\s*(?:toFloat|toDouble|parseFloat)\s*\(/.test(t)
}
const parensOk = (e) => {
  let d = 0
  for (const c of e) {
    if (c === '(' || c === '[') d++
    else if ((c === ')' || c === ']') && --d < 0) return false
  }
  return d === 0
}
// separa "a = 1, b = f(x, y)" pelas vírgulas do nível de cima
function splitTop(list) {
  const out = []
  let d = 0
  let cur = ''
  for (const c of list) {
    if (c === '(' || c === '[' || c === '{') d++
    else if (c === ')' || c === ']' || c === '}') d--
    if (c === ',' && d === 0) {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out
}

export function floatNarrowing(src) {
  const T = collectTypes(src)
  // declarações: int x = 3.7;   long a = 1, b = f * 2.0;
  let s = src.replace(NARROW_DECL, (all, pre, type, list) => {
    if (/["']/.test(list) || !parensOk(list)) return all
    let changed = false
    const parts = splitTop(list).map((d) => {
      const m = d.match(/^(\s*[A-Za-z_]\w*\s*=(?!=)\s*)([\s\S]+)$/)
      if (!m || !isRealExpr(m[2], T)) return d
      changed = true
      return `${m[1]}__toInt(${m[2].trim()})`
    })
    return changed ? `${type}${parts.join(',')};` : all
  })
  // atribuições: x = 2.5;   x += f;   (x declarado com um tipo inteiro, e só assim)
  if (T.narrow.size) {
    const names = [...T.narrow].join('|')
    s = s.replace(new RegExp(`(?<=(^|[;{})]|\\belse\\s)\\s*)(${names})\\s*(=|\\+=|-=|\\*=)(?!=)\\s*([^;{}]+);`, 'gm'), (all, pre, name, op, expr) => {
      if (!parensOk(expr) || splitTop(expr).length > 1 || !isRealExpr(expr, T)) return all
      const e = expr.trim()
      return op === '=' ? `${name} = __toInt(${e});` : `${name} = __toInt(${name} ${op[0]} (${e}));`
    })
  }
  // bool b = 12;  b = x * 2.5;  → true/false (em C++ qualquer valor diferente de 0 é true)
  const toBool = (e) => {
    const t = e.trim()
    if (/^(?:true|false|0|1|HIGH|LOW)$/.test(t) || /["']/.test(t) || t.startsWith('!') || /[<>]|==|!=|&&|\|\|/.test(t) || !parensOk(t)) return null
    if (/[A-Za-z_]\w*\s*\(/.test(t)) return null // funções: digitalRead(), sensor.begin()… ficam como estão
    return isRealExpr(t, T) || isIntExpr(t, T) ? `!!(${t})` : null
  }
  s = s.replace(/(?<=(^|[;{}(])\s*)((?:(?:const|static|volatile)\s+)*(?:bool|boolean)\s+)([A-Za-z_]\w*)(\s*=(?!=)\s*)([^;,{}]+)(?=[;,])/gm, (all, pre, type, name, eq, expr) => {
    const b = toBool(expr)
    return b ? `${type}${name}${eq}${b}` : all
  })
  if (T.bools.size) {
    s = s.replace(new RegExp(`(?<=(^|[;{})]|\\belse\\s)\\s*)(${[...T.bools].join('|')})(\\s*=(?!=)\\s*)([^;,{}]+)(?=;)`, 'gm'), (all, pre, name, eq, expr) => {
      const b = toBool(expr)
      return b ? `${name}${eq}${b}` : all
    })
  }
  return s
}

// Serial.print(x, 2): com um inteiro é BIN; com um float/double são 2 casas decimais. Em JS um
// float com valor inteiro (30.0) não se distingue de um int, por isso o tradutor marca a chamada
// quando o argumento é de certeza float (3.º argumento, lido pelo fmt do motor).
export function printFloatBase(src) {
  if (!/\.print(?:ln)?\s*\(/.test(src)) return src
  const T = collectTypes(src)
  const real = (e) => parensOk(e) && splitTop(e).length === 1 && isRealExpr(e, T)
  return src
    .replace(/\.(print|println)\s*\(([^;{}]*?),\s*2\s*\)(?=\s*;)/g, (all, fn, expr) => (real(expr) ? `.${fn}(${expr}, 2, 1)` : all))
    // Serial.print(t) com t float: sempre 2 casas decimais (30.0 → "30.00"), como no Arduino
    .replace(/\b(Serial\d?)\.(print|println)\s*\(([^;{}]+)\)(?=\s*;)/g, (all, obj, fn, expr) => (!/, 2, 1$/.test(expr) && real(expr) ? `${obj}.${fn}(${expr}, 2, 1)` : all))
}

export function intDivision(src) {
  if (!src.includes('/')) return src
  const T = collectTypes(src)
  let s = src
  // x /= e  (x inteiro) -> x = __toInt(x / (e))
  s = s.replace(/(^|[^\w.\]])([A-Za-z_]\w*(?:\s*\[[^\]]*\])?)\s*\/=\s*([^;,)]+)/g, (all, pre, lhs, rhs) => {
    const base = lhs.match(/^[A-Za-z_]\w*/)[0]
    return T.ints.has(base) ? `${pre}${lhs} = __toInt(${lhs} / (${rhs.trim()}))` : all
  })
  let out = ''
  let i = 0
  for (; i < s.length; i++) {
    const c = s[i]
    if (c === '"' || c === "'") {
      const e = skipString(s, i)
      out += s.slice(i, e + 1)
      i = e
      continue
    }
    if (c === '#') {
      // linhas do pré-processador (#include <a/b.h>) ficam como estão
      const e = s.indexOf('\n', i)
      const stop = e < 0 ? s.length : e
      out += s.slice(i, stop)
      i = stop - 1
      continue
    }
    if (c !== '/' || s[i + 1] === '=' || s[i + 1] === '/' || s[i + 1] === '*' || s[i - 1] === '*') {
      out += c
      continue
    }
    // "/" binário: operandos na saída já produzida (à esquerda) e no texto que falta (à direita)
    const L = leftOperand(out, out.length)
    const rEnd = rightOperand(s, i)
    if (L < 0 || rEnd < 0) {
      out += c
      continue
    }
    const left = out.slice(L)
    const right = s.slice(i + 1, rEnd)
    if (isIntExpr(left, T) && isIntExpr(right, T)) {
      out = `${out.slice(0, L)}__idiv(${left.trim()}, ${right.trim()})`
      i = rEnd - 1
    } else out += c
  }
  return out
}

// ---------- literais de carácter em contas e comparações ----------
// O tradutor guarda os `char` como texto de 1 letra (c == 'a', texto += c), mas em C um literal
// 'A' é o número 65 — e Serial.read(), peek(), s[i] num int… dão números. Misturar os dois em JS
// falha: `x == 'A'` com x = 65 é falso e `Serial.read() - '0'` dá 52 em vez de 4. Aqui, quando
// um literal 'x' é operando de == != < > <= >= - * % (ou de + com um inteiro), passa a ser o
// código (65) e o outro operando é envolvido em __ord() (texto de 1 letra → código; número fica).
// `switch` com `case 'x':` passa a comparar códigos: switch (__ord(e)) { case 65: … }.
const ESC = { n: 10, r: 13, t: 9, 0: 0, '\\': 92, "'": 39, '"': 34, a: 7, b: 8, f: 12, v: 11, '?': 63 }
function charCode(lit) {
  const b = lit.slice(1, -1)
  if (b.length === 1 && b !== '\\') return b.charCodeAt(0)
  if (b[0] !== '\\') return null
  if (b.length === 2 && b[1] in ESC) return ESC[b[1]]
  let m = b.match(/^\\x([0-9a-fA-F]{1,2})$/)
  if (m) return parseInt(m[1], 16)
  m = b.match(/^\\([0-7]{1,3})$/)
  return m ? parseInt(m[1], 8) : null
}
const CMP_OPS = ['==', '!=', '<=', '>=', '<', '>', '-', '*', '%', '+']
// operador binário no fim de `out` (antes do literal): devolve { op, at } ou null
function opBefore(out) {
  let j = out.length
  while (j > 0 && /\s/.test(out[j - 1])) j--
  for (const op of CMP_OPS) {
    if (!out.slice(0, j).endsWith(op)) continue
    const at = j - op.length
    const prev = out[at - 1]
    // não é: <<, >>, ->, --, ++, +=, -=, *=, ==… parcial, ponteiro/unário
    if (op.length === 1 && (prev === op || prev === '=' || prev === '!' || (op === '>' && prev === '-') || (op === '<' && prev === '<'))) return null
    let p = at - 1
    while (p >= 0 && /\s/.test(out[p])) p--
    if (p < 0 || !(isWord(out[p]) || out[p] === ')' || out[p] === ']' || out[p] === "'")) return null // unário (-'0', *p)
    return { op, at }
  }
  return null
}
function opAfter(s, k) {
  while (k < s.length && /\s/.test(s[k])) k++
  for (const op of CMP_OPS) {
    if (!s.startsWith(op, k)) continue
    const nx = s[k + op.length]
    if (op.length === 1 && (nx === '=' || nx === op || (op === '-' && nx === '>'))) return null
    return { op, end: k + op.length }
  }
  return null
}

export function charOperands(src) {
  if (!src.includes("'")) return src
  const T = collectTypes(src)
  let out = ''
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (c === '"') {
      const e = skipString(src, i)
      out += src.slice(i, e + 1)
      i = e
      continue
    }
    if (c === '#') {
      const e = src.indexOf('\n', i)
      const stop = e < 0 ? src.length : e
      out += src.slice(i, stop)
      i = stop - 1
      continue
    }
    if (c !== "'" || isWord(src[i - 1])) {
      out += c
      continue
    }
    const e = skipString(src, i)
    const lit = src.slice(i, e + 1)
    const code = charCode(lit)
    if (code == null) {
      out += lit
      i = e
      continue
    }
    // literal à direita do operador: a OP 'x'
    const b = opBefore(out)
    if (b) {
      const L = leftOperand(out, b.at)
      const left = L >= 0 ? out.slice(L, b.at).trim() : ''
      if (left && (b.op !== '+' || isIntExpr(left, T))) {
        out = `${out.slice(0, L)}${/^'/.test(left) ? left : `__ord(${left})`} ${b.op} ${code}`
        i = e
        continue
      }
    }
    // literal à esquerda: 'x' OP b
    const a = opAfter(src, e + 1)
    if (a) {
      const rEnd = rightOperand(src, a.end - 1)
      const right = rEnd >= 0 ? src.slice(a.end, rEnd).trim() : ''
      if (right && (a.op !== '+' || isIntExpr(right, T))) {
        const rc = /^'[^']*'$/.test(right) ? charCode(right) : null
        out += `${code} ${a.op} ${rc != null ? rc : `__ord(${right})`}`
        i = rEnd - 1
        continue
      }
    }
    out += lit
    i = e
  }
  // a OP 'x' com a também literal ficou 'y' OP 65: o literal da esquerda vira código
  out = out.replace(/(^|[^\w'])('(?:[^'\\]|\\[^']{1,3}|\\')') (==|!=|<=|>=|<|>|-|\*|%|\+) (\d+)/g, (all, pre, l, op, n) => {
    const k = charCode(l)
    return k == null ? all : `${pre}${k} ${op} ${n}`
  })
  // switch com case 'x':
  if (/\bcase\s*'/.test(out)) {
    out = out.replace(/\bcase\s*('(?:[^'\\]|\\[^']{1,3}|\\')')\s*:/g, (all, l) => {
      const k = charCode(l)
      return k == null ? all : `case ${k}:`
    })
    let r = ''
    let k = 0
    const re = /\bswitch\s*\(/g
    let m
    while ((m = re.exec(out))) {
      const open = m.index + m[0].length - 1
      let d = 0
      let p = open
      for (; p < out.length; p++) {
        if (out[p] === '"' || out[p] === "'") p = skipString(out, p)
        else if (out[p] === '(') d++
        else if (out[p] === ')' && --d === 0) break
      }
      if (p >= out.length) break
      r += `${out.slice(k, open + 1)}__ord(${out.slice(open + 1, p)})`
      k = p
      re.lastIndex = p
    }
    out = r + out.slice(k)
  }
  return out
}
