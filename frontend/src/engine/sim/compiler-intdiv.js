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
        break
      }
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
  for (const n of ints) if (floats.has(n)) ints.delete(n) // declarado das duas maneiras: na dúvida, não
  return { ints, intFns }
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
