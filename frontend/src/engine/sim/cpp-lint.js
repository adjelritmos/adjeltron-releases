// Verificação do C++ do sketch sem compilador (no browser / Vercel não há clang++): o tradutor
// passa o programa para JavaScript, que aceita o que o C++ não aceita — um ';' em falta passa
// (o JavaScript mete-o sozinho) e os tipos desaparecem. Aqui apanha-se, com a linha:
//   · ';' em falta no fim de uma instrução ou depois de struct/class/enum { … }   (erro)
//   · valor com casas decimais guardado num inteiro (int x = 3.7; x = meuFloat;)   (aviso: em
//     C++ compila e TRUNCA — o simulador faz o mesmo, ver floatNarrowing em compiler-intdiv.js)
// É conservador: na dúvida não acusa (macros, expressões em várias linhas, inicializadores).
import * as i18n from '../../../../shared/i18n.js'

const TYPE_KW = new Set(['void', 'int', 'long', 'short', 'float', 'double', 'char', 'bool', 'boolean', 'byte', 'word', 'unsigned', 'signed', 'String', 'size_t', 'auto', 'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t', 'int8_t', 'int16_t', 'int32_t', 'int64_t'])
const QUAL_KW = new Set(['const', 'static', 'volatile', 'extern', 'inline', 'constexpr', 'register', 'mutable', 'virtual', 'explicit', 'friend', 'typename'])
const CTRL_KW = new Set(['if', 'for', 'while', 'switch', 'catch'])
const OTHER_KW = new Set(['else', 'do', 'return', 'break', 'continue', 'goto', 'case', 'default', 'struct', 'class', 'enum', 'union', 'typedef', 'namespace', 'template', 'using', 'public', 'private', 'protected', 'new', 'delete', 'sizeof', 'try', 'throw', 'operator', 'this', 'true', 'false', 'nullptr'])
// palavras que continuam a instrução da linha anterior (não começam uma nova)
const CONTINUES = new Set(['and', 'or', 'xor', 'not_eq', 'bitand', 'bitor', 'and_eq', 'or_eq', 'xor_eq', 'const', 'override', 'noexcept', 'final', 'throw', 'volatile'])
const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '|=', '&=', '^=', '<<=', '>>='])
const OPS = ['<<=', '>>=', '...', '->*', '++', '--', '->', '::', '<<', '>>', '<=', '>=', '==', '!=', '&&', '||', '+=', '-=', '*=', '/=', '%=', '|=', '&=', '^=']
const isKw = (v) => TYPE_KW.has(v) || QUAL_KW.has(v) || CTRL_KW.has(v) || OTHER_KW.has(v)

// → { toks: [{ k: 'id' | 'num' | 'str' | 'op', v, line }], clean, macros }
// clean: o código com comentários, textos e linhas do pré-processador trocados por espaços
// (mesmas posições e linhas)
function scan(src) {
  const toks = []
  const macros = new Map()
  const out = src.split('')
  const blank = (a, b) => {
    for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' '
  }
  let line = 1
  let bol = true // início de linha (só espaços antes)
  const n = src.length
  for (let i = 0; i < n; ) {
    const c = src[i]
    if (c === '\n') {
      line++
      bol = true
      i++
      continue
    }
    if (c === ' ' || c === '\t' || c === '\r') {
      i++
      continue
    }
    if (c === '/' && src[i + 1] === '/') {
      let j = i
      while (j < n && src[j] !== '\n') j++
      blank(i, j)
      i = j
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      let j = src.indexOf('*/', i + 2)
      j = j < 0 ? n : j + 2
      blank(i, j)
      for (let k = i; k < j; k++) if (src[k] === '\n') line++
      i = j
      continue
    }
    if (c === '#' && bol) {
      // linha do pré-processador (com continuações "\")
      let j = i
      while (j < n && (src[j] !== '\n' || src[j - 1] === '\\' || (src[j - 1] === '\r' && src[j - 2] === '\\'))) j++
      const text = src.slice(i, j).replace(/\\\r?\n/g, ' ').replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, ' ')
      const d = text.match(/^#\s*define\s+(\w+)(\([^)]*\))?\s*(.*)$/)
      if (d) macros.set(d[1], d[3].trim())
      blank(i, j)
      for (let k = i; k < j; k++) if (src[k] === '\n') line++
      i = j
      continue
    }
    bol = false
    if (c === 'R' && src[i + 1] === '"') {
      // texto em bruto: R"delim( … )delim"
      const m = src.slice(i).match(/^R"([^(\s]*)\(/)
      if (m) {
        const close = `)${m[1]}"`
        let j = src.indexOf(close, i + m[0].length)
        j = j < 0 ? n : j + close.length
        toks.push({ k: 'str', v: '""', line })
        blank(i + 2, j - 1)
        for (let k = i; k < j; k++) if (src[k] === '\n') line++
        i = j
        continue
      }
    }
    if (c === '"' || c === "'") {
      let j = i + 1
      while (j < n && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1
      toks.push({ k: 'str', v: c === '"' ? '""' : "''", line })
      blank(i + 1, Math.min(j, n))
      i = j + 1
      continue
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1
      while (j < n && /[\w$]/.test(src[j])) j++
      toks.push({ k: 'id', v: src.slice(i, j), line })
      i = j
      continue
    }
    if (/\d/.test(c) || (c === '.' && /\d/.test(src[i + 1] || ''))) {
      let j = i + 1
      while (j < n && (/[\w.]/.test(src[j]) || ((src[j] === '+' || src[j] === '-') && /[eE]/.test(src[j - 1]) && !/^0[xX]/.test(src.slice(i, j))))) j++
      toks.push({ k: 'num', v: src.slice(i, j), line })
      i = j
      continue
    }
    const op = OPS.find((o) => src.startsWith(o, i)) || c
    toks.push({ k: 'op', v: op, line })
    i += op.length
  }
  return { toks, clean: out.join(''), macros }
}

const semi = (line) => ({ line, col: 0, severity: 'error', message: i18n.m("falta um ';' no fim desta instrução", "expected ';' at the end of this statement") })

// ---------- ';' em falta ----------
function missingSemicolons(toks, macros) {
  const diags = []
  const endsStmt = (name) => {
    const body = macros.get(name)
    return body != null && (body === '' || /[;}]$/.test(body))
  }
  // a instrução `st` (sem ';') já está completa? prev = o último token
  const complete = (st) => {
    const prev = st[st.length - 1]
    const first = st[0]
    if (!prev || !first) return false
    if (st.some((t) => t.k === 'id' && endsStmt(t.v))) return false // macro que já traz o ';'
    const valueLike = (prev.k === 'id' && (!isKw(prev.v) || prev.v === 'true' || prev.v === 'false' || prev.v === 'nullptr' || prev.v === 'this')) || prev.k === 'num' || prev.k === 'str' || prev.v === ')' || prev.v === ']' || prev.v === '}'
    if (first.v === 'break' || first.v === 'continue') return st.length === 1
    if (first.v === 'return' || first.v === 'goto') return st.length === 1 || valueLike
    if (['struct', 'class', 'enum', 'union', 'typedef', 'namespace', 'template', 'using', 'public', 'private', 'protected', 'case', 'default', 'operator'].includes(first.v)) return false
    if (st.some((t) => t.v === 'operator')) return false
    if (prev.v === '++' || prev.v === '--') return st.length > 1
    if ((first.v === '++' || first.v === '--') && valueLike) return true
    if (st.some((t) => t.depth === 0 && t.k === 'op' && ASSIGN_OPS.has(t.v))) return valueLike
    if (prev.v === ')') {
      // chamada: nome(…) — o nome antes do "(" que fecha aqui
      const open = st.findLastIndex((t) => t.v === '(' && t.depth === 0)
      const callee = st[open - 1]
      if (!callee || callee.k !== 'id' || CTRL_KW.has(callee.v)) return false
      if (/^[A-Z][A-Z0-9_]*$/.test(callee.v) || macros.has(callee.v)) return false // macro (ISR(…), TEST(…))
      return true
    }
    // declaração simples: int x   /  float v[3]
    if ((TYPE_KW.has(first.v) || QUAL_KW.has(first.v)) && st.length >= 2 && !st.some((t) => t.v === '(')) return (prev.k === 'id' && !isKw(prev.v)) || prev.v === ']'
    return false
  }
  // objeto de uma biblioteca sem ';' (Servo motor ⏎ void setup…): dois nomes e a seguir uma palavra reservada
  const objDecl = (st, next) => st.length === 2 && st.every((t) => t.k === 'id' && !isKw(t.v) && !/^[A-Z][A-Z0-9_]*$/.test(t.v) && !macros.has(t.v)) && isKw(next.v) && !CONTINUES.has(next.v)
  // pilha de chavetas: block (código), type (struct/class/union), enum, init ({1, 2}), opaque (dentro de parênteses)
  const stack = [{ kind: 'block', st: [], paren: 0 }]
  let paren = 0
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]
    const top = stack[stack.length - 1]
    const st = top.st
    const prev = st[st.length - 1]
    const code = top.kind === 'block' || top.kind === 'type'
    // instrução nova a começar numa linha seguinte, ou "}" a fechar o bloco, sem ';' antes
    if (code && paren === 0 && prev && (complete(st) || (t.k === 'id' && t.line > prev.line && objDecl(st, t)))) {
      const newStmt = t.line > prev.line && t.k === 'id' && !CONTINUES.has(t.v)
      const closes = t.v === '}'
      if (newStmt || closes) {
        diags.push(semi(prev.line))
        st.length = 0
      }
    }
    if (t.v === '(' || t.v === '[') {
      st.push({ ...t, depth: paren })
      paren++
      continue
    }
    if (t.v === ')' || t.v === ']') {
      paren = Math.max(0, paren - 1)
      st.push({ ...t, depth: paren })
      // cabeça de if/for/while/switch fechada: o corpo é uma instrução nova
      if (code && paren === 0 && t.v === ')') {
        const k = st.findIndex((x) => !(x.v === 'else'))
        if (k >= 0 && CTRL_KW.has(st[k].v) && st[k + 1]?.v === '(' && st.findLastIndex((x) => x.v === '(' && x.depth === 0) === k + 1) st.length = 0
      }
      continue
    }
    if (t.v === '{') {
      let kind = 'block'
      if (paren > 0 || top.kind === 'opaque') kind = 'opaque'
      else if (top.kind === 'init' || top.kind === 'enum') kind = 'init'
      else if (prev && (ASSIGN_OPS.has(prev.v) || prev.v === ',' || prev.v === 'return' || prev.v === ']')) kind = 'init'
      else if (st.some((x) => x.v === 'enum') && !st.some((x) => x.v === '(')) kind = 'enum'
      else if (st.some((x) => x.v === 'struct' || x.v === 'class' || x.v === 'union') && prev?.v !== ')' && !st.some((x) => x.depth === 0 && ASSIGN_OPS.has(x.v))) kind = 'type'
      stack.push({ kind, st: [], paren, open: kind === 'type' || kind === 'enum' ? st.slice() : null })
      if (kind === 'block' || kind === 'type') st.length = 0
      paren = 0
      continue
    }
    if (t.v === '}') {
      if (stack.length > 1) {
        const closed = stack.pop()
        paren = closed.paren
        const outer = stack[stack.length - 1]
        if (closed.kind === 'init' || closed.kind === 'opaque') outer.st.push({ ...t, depth: paren })
        else if (closed.kind === 'type' || closed.kind === 'enum') {
          // struct/class/enum { … } tem de acabar em ';' (ou no nome de uma variável e ';')
          const next = toks[i + 1]
          outer.st.length = 0
          if (!next || (next.k === 'id' && (TYPE_KW.has(next.v) || ['struct', 'class', 'enum', 'union', 'typedef'].includes(next.v)) && next.line > t.line))
            diags.push({ line: t.line, col: 0, severity: 'error', message: i18n.m("falta um ';' depois de '}' (struct, class e enum acabam em ';')", "expected ';' after '}' (struct, class and enum end with ';')") })
          else if (next.v !== ';') outer.st.push({ k: 'id', v: 'struct', line: t.line, depth: paren }) // struct {…} nome;
        } else outer.st.length = 0
      } else st.length = 0
      continue
    }
    if (!code) continue
    if (paren > 0) {
      st.push({ ...t, depth: paren })
      continue
    }
    if (t.v === ';') {
      st.length = 0
      continue
    }
    if (t.v === ':') {
      // case 1:  default:  public:  etiqueta:   (não o ":" de um ?: nem de uma lista de inicialização)
      const f = st[0]?.v
      if (['case', 'default', 'public', 'private', 'protected'].includes(f) || (st.length === 1 && st[0].k === 'id' && !isKw(st[0].v))) {
        st.length = 0
        continue
      }
    }
    if (t.k === 'id' && (t.v === 'else' || t.v === 'do' || t.v === 'try')) {
      st.length = 0
      if (t.v !== 'else') continue
      // "else if": o if começa a instrução
      if (toks[i + 1]?.v === 'if') continue
      continue
    }
    st.push({ ...t, depth: 0 })
  }
  // fim do ficheiro com uma instrução por fechar
  const last = stack[0].st
  if (stack.length === 1 && last.length && complete(last)) diags.push(semi(last[last.length - 1].line))
  return diags
}

// ---------- casas decimais guardadas num inteiro ----------
const INT_DECL = 'unsigned\\s+long\\s+long|unsigned\\s+long|unsigned\\s+int|unsigned\\s+short|long\\s+long|long\\s+int|short\\s+int|unsigned|int|long|short|byte|word|size_t|u?int(?:8|16|32|64)_t'
const FLOAT_LIT = /(?<![\w.])(\d+\.\d*|\.\d+|\d+(?=[eE][+-]?\d))(?:[eE][+-]?\d+)?f?(?![\w.])/
// expressões que já dão um inteiro de propósito
const INT_ON_PURPOSE = /^\s*(?:\(\s*(?:int|long|short|byte|word|unsigned(?:\s+\w+)?|u?int\d+_t|size_t)\s*\)|(?:int|long|byte|word|round|lround|floor|ceil|trunc|map|constrain|millis|micros|analogRead|digitalRead|random|__toInt)\s*\()/

function floatToInt(clean) {
  const diags = []
  const lineAt = (idx) => {
    let l = 1
    for (let k = 0; k < idx; k++) if (clean.charCodeAt(k) === 10) l++
    return l
  }
  // nomes declarados float/double e nomes declarados com um tipo inteiro (nunca das duas maneiras)
  const floats = new Set()
  const ints = new Map()
  const others = new Set()
  for (const m of clean.matchAll(/\b(?:float|double)\s+([A-Za-z_]\w*)\s*(?=[=;,)\[])/g)) floats.add(m[1])
  for (const m of clean.matchAll(new RegExp(`\\b(${INT_DECL})\\s+([A-Za-z_]\\w*)\\s*(?=[=;,)])`, 'g'))) ints.set(m[2], m[1].replace(/\s+/g, ' '))
  for (const m of clean.matchAll(/\b(?:String|char|bool|boolean|auto)\s*[*&]?\s*([A-Za-z_]\w*)\s*(?=[=;,)\[])/g)) others.add(m[1])
  for (const nm of [...ints.keys()]) if (floats.has(nm) || others.has(nm)) ints.delete(nm), floats.delete(nm)
  const balanced = (e) => {
    let d = 0
    for (const ch of e) {
      if (ch === '(') d++
      else if (ch === ')' && --d < 0) return false
    }
    return d === 0
  }
  const seen = new Set()
  // tira o que já é inteiro de propósito: (int)(…), (long)x, int(…), round(…), map(…)…
  const dropInts = (e) => {
    const re = /\(\s*(?:int|long|short|byte|word|unsigned(?:\s+\w+)?|u?int\d+_t|size_t)\s*\)\s*|\b(?:int|long|byte|word|round|lround|floor|ceil|trunc|map|constrain|__toInt)\s*(?=\()/g
    for (let m; (m = re.exec(e)); ) {
      let j = m.index + m[0].length
      if (e[j] === '(') {
        let d = 0
        for (; j < e.length; j++) {
          if (e[j] === '(') d++
          else if (e[j] === ')' && --d === 0) break
        }
        j++
      } else j += (e.slice(j).match(/^[\w.]+/) || [''])[0].length
      e = e.slice(0, m.index) + ' 0 ' + e.slice(j)
      re.lastIndex = m.index
    }
    return e
  }
  const check = (name, type, expr0, idx) => {
    if (!balanced(expr0) || INT_ON_PURPOSE.test(expr0)) return
    // comparações e ?: dão inteiros (0/1 ou um dos ramos)
    if (/[<>?]|==|!=|&&|\|\|/.test(expr0)) return
    const expr = dropInts(expr0)
    const line = lineAt(idx)
    if (seen.has(`${line}:${name}`)) return
    const lit = expr.match(FLOAT_LIT)
    const fvar = [...expr.matchAll(/(?<![\w.])([A-Za-z_]\w*)\b(?!\s*[(.\[])/g)].map((m) => m[1]).find((v) => floats.has(v))
    // um literal só conta sozinho ou em contas simples; dentro de uma função (map(x, 0.5, …)) não se sabe
    if (lit && !/[A-Za-z_]\w*\s*\(/.test(expr)) {
      const only = expr0.trim().match(/^-?\s*(\d+\.\d*|\.\d+)f?$/)
      const v = only ? Math.trunc(parseFloat(expr0.replace(/\s|f$/g, ''))) : null
      seen.add(`${line}:${name}`)
      diags.push({
        line,
        col: 0,
        severity: 'warning',
        message: only
          ? i18n.m(`'${name}' é ${type}: ${expr0.trim()} perde as casas decimais e fica ${v} (em C++ um inteiro trunca). Use float, ou round() se quiser arredondar.`, `'${name}' is ${type}: ${expr0.trim()} loses its decimals and becomes ${v} (in C++ an integer truncates). Use float, or round() to round.`)
          : i18n.m(`'${name}' é ${type}: o resultado desta conta com casas decimais é truncado (em C++ um inteiro não guarda decimais). Use float, ou (int)/round() se for de propósito.`, `'${name}' is ${type}: the result of this decimal expression is truncated (in C++ an integer holds no decimals). Use float, or (int)/round() if intended.`),
      })
    } else if (fvar && !/[A-Za-z_]\w*\s*\(/.test(expr)) {
      seen.add(`${line}:${name}`)
      diags.push({
        line,
        col: 0,
        severity: 'warning',
        message: i18n.m(`'${name}' é ${type} e recebe '${fvar}', que é float: as casas decimais perdem-se (trunca). Use float, ou (int)/round() se for de propósito.`, `'${name}' is ${type} and receives '${fvar}', which is a float: the decimals are lost (truncated). Use float, or (int)/round() if intended.`),
      })
    }
  }
  // declarações: int x = 3.7;   long a = 1, b = f * 2;
  for (const m of clean.matchAll(new RegExp(`\\b(${INT_DECL})\\s+([A-Za-z_]\\w*)\\s*=(?!=)\\s*([^;,{}]+)(?=[;,])`, 'g'))) check(m[2], m[1].replace(/\s+/g, ' '), m[3], m.index)
  // atribuições: x = 2.5;   x = f;
  if (ints.size) {
    const names = [...ints.keys()].join('|')
    for (const m of clean.matchAll(new RegExp(`(^|[;{})]\\s*|\\belse\\s+)(${names})\\s*=(?!=)\\s*([^;,{}]+)(?=;)`, 'gm'))) check(m[2], ints.get(m[2]), m[3], m.index + m[1].length)
  }
  return diags
}

// ---------- tipos que não combinam ----------
//   erro (o C++ não compila):  texto "…" ou uma String guardados num número; "texto" num char
//   aviso (compila, mas o valor muda):  bool com um número que não é 0/1; byte fora de 0–255
const NUM_DECL = `${INT_DECL}|float|double`
function typeMismatch(clean) {
  const diags = []
  const lineAt = (idx) => {
    let l = 1
    for (let k = 0; k < idx; k++) if (clean.charCodeAt(k) === 10) l++
    return l
  }
  const push = (idx, severity, pt, en) => diags.push({ line: lineAt(idx), col: 0, severity, message: i18n.m(pt, en) })
  const types = new Map() // nome → tipo (só nomes declarados de uma única maneira)
  const dup = new Set()
  for (const m of clean.matchAll(new RegExp(`\\b(${NUM_DECL}|bool|boolean|String|char)\\s+([A-Za-z_]\\w*)\\s*(?=[=;,)])`, 'g'))) {
    const t = m[1].replace(/\s+/g, ' ')
    if (types.has(m[2]) && types.get(m[2]) !== t) dup.add(m[2])
    types.set(m[2], t)
  }
  for (const n of dup) types.delete(n)
  const isNum = (t) => t && !/^(?:bool|boolean|String|char)$/.test(t)
  // em `clean` os textos ficam "   " (aspas com espaços): a expressão é só um texto?
  const onlyText = (e) => /^\s*"[^"]*"\s*$/.test(e)
  const one = (name, type, expr, idx) => {
    const e = expr.trim()
    if (!e) return
    const strVar = /^[A-Za-z_]\w*$/.test(e) && types.get(e) === 'String'
    if (isNum(type)) {
      if (onlyText(expr)) push(idx, 'error', `'${name}' é ${type} e não pode guardar um texto ("…"). Use String, ou converta com .toInt() / .toFloat().`, `'${name}' is ${type} and cannot hold text ("…"). Use String, or convert with .toInt() / .toFloat().`)
      else if (strVar) push(idx, 'error', `'${name}' é ${type} e '${e}' é uma String: não se converte sozinha. Use ${e}.${/float|double/.test(type) ? 'toFloat' : 'toInt'}().`, `'${name}' is ${type} and '${e}' is a String: it does not convert by itself. Use ${e}.${/float|double/.test(type) ? 'toFloat' : 'toInt'}().`)
      else if (/^(?:byte|uint8_t)$/.test(type) && /^-?\d+$/.test(e) && (+e > 255 || +e < 0)) push(idx, 'warning', `'${name}' é ${type} (0 a 255): ${e} não cabe e fica ${((+e % 256) + 256) % 256}. Use int.`, `'${name}' is ${type} (0 to 255): ${e} does not fit and becomes ${((+e % 256) + 256) % 256}. Use int.`)
    } else if (type === 'bool' || type === 'boolean') {
      if (onlyText(expr)) push(idx, 'warning', `'${name}' é ${type}: um texto ("…") conta sempre como true. Use true ou false.`, `'${name}' is ${type}: text ("…") always counts as true. Use true or false.`)
      else if (strVar) push(idx, 'error', `'${name}' é ${type} e '${e}' é uma String: não se converte sozinha. Compare, por exemplo ${e} == "sim" ou ${e}.length() > 0.`, `'${name}' is ${type} and '${e}' is a String: it does not convert by itself. Compare, e.g. ${e} == "yes" or ${e}.length() > 0.`)
      else if (/^-?(?:\d+\.?\d*|\.\d+)f?$/.test(e) && !/^(?:0|1)$/.test(e)) push(idx, 'warning', `'${name}' é ${type} e só guarda true ou false: ${e} passa a ${parseFloat(e) !== 0 ? 'true' : 'false'}. Use true/false, ou um int se quer guardar o número.`, `'${name}' is ${type} and only holds true or false: ${e} becomes ${parseFloat(e) !== 0 ? 'true' : 'false'}. Use true/false, or an int to keep the number.`)
    } else if (type === 'char') {
      if (onlyText(expr)) push(idx, 'error', `'${name}' é char (uma só letra, entre plicas: 'a'). Para um texto use String ou char ${name}[] = "…".`, `'${name}' is char (a single letter, in single quotes: 'a'). For text use String or char ${name}[] = "…".`)
    }
  }
  // declarações (cada "nome = valor" da lista) e atribuições
  for (const m of clean.matchAll(new RegExp(`\\b(${NUM_DECL}|bool|boolean|char)\\s+([A-Za-z_]\\w*)\\s*=(?!=)\\s*([^;,{}]+)(?=[;,])`, 'g'))) one(m[2], m[1].replace(/\s+/g, ' '), m[3], m.index)
  const names = [...types.keys()].filter((n) => types.get(n) !== 'String')
  if (names.length) for (const m of clean.matchAll(new RegExp(`(?<=(^|[;{})]|\\belse\\s)\\s*)(${names.join('|')})\\s*=(?!=)\\s*([^;,{}]+)(?=;)`, 'gm'))) one(m[2], types.get(m[2]), m[3], m.index)
  return diags
}

// → diagnósticos [{ line, col, severity, message }]
export function lintCpp(code) {
  try {
    const { toks, clean, macros } = scan(String(code))
    return [...missingSemicolons(toks, macros), ...typeMismatch(clean), ...floatToInt(clean)].sort((a, b) => a.line - b.line)
  } catch {
    return [] // o verificador nunca impede a compilação por um erro seu
  }
}
