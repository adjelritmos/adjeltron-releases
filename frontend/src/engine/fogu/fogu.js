// Fogu para placas com a biblioteca mcu (https://fogulang.microaitec.com/libs/mcu, v0.7.0):
// o mesmo ficheiro .fg que o "fogu mcu build/run" compila para o chip corre aqui no simulador.
// Este compilador segue o subconjunto e a API da biblioteca e gera C++ (Arduino) com um pequeno
// runtime (FgPin, FgAdc, FgPwm, FgBytes, FgI2c, eventos) que depois segue o caminho normal:
// tradutor rápido (simulador) ou arduino-cli.
//
// Subconjunto (como na biblioteca): int (32 bits), bool, duration (ms), str, bytes, pin, adc, pwm,
// i2c; let / const (globais no topo), fn com parâmetros anotados (sem anotação = int), if / else
// if / else (condições bool), while, loop, for i in a..b, for x in bytes, break / continue,
// return, print, modelos `…${x}…`, operadores de bits, handlers (fn de topo ou () => { … }).
// Não há: floats, listas, mapas (exceto as opções { freq: 1000 } das chamadas), structs, match,
// nil, ?, fg / chan, outros módulos.
//
// O programa corre de cima para baixo (o código do topo); os handlers (pin.onPress, mcu.every,
// mcu.serial.onReceive…) correm durante mcu.delay / mcu.poll, uma vez por volta de cada ciclo
// e depois de o código do topo acabar — como na biblioteca.
import { DEFS, boardProfile } from '../../../../shared/components.js'
import { RUNTIME } from './runtime.js'
import { m as L } from '../../../../shared/i18n.js' // L(pt, en): mensagens no idioma da interface

export class FoguError extends Error {
  constructor(msg, line) {
    super(line ? L(`linha ${line}: ${msg}`, `line ${line}: ${msg}`) : msg)
    this.line = line || 0
    this.fogu = msg
  }
}
const fail = (msg, line) => {
  throw new FoguError(msg, line)
}

// ---------------------------------------------------------------- tokens
const KW = new Set(['let', 'const', 'fn', 'return', 'if', 'else', 'while', 'for', 'in', 'break', 'continue', 'loop', 'match', 'struct', 'new', 'true', 'false', 'nil', 'import', 'from', 'export', 'embed', 'interface', 'fg', 'select', 'case', 'this'])
const DUR = { ns: 1e-6, us: 1e-3, ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 }
const OPS = ['...', '..', '=>', '**', '<<=', '>>=', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '<-', '<<', '>>', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '+', '-', '*', '/', '%', '<', '>', '=', '!', '~', '^', '(', ')', '{', '}', '[', ']', ',', '.', ':', ';', '?', '|', '&']
const CONT = new Set(['+', '-', '*', '/', '%', '**', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '??', '=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=', '<<', '>>', '&', '|', '^', ',', '(', '[', '{', '.', '=>', ':', '..'])

function lex(src) {
  const toks = []
  const stack = []
  let i = 0
  let line = 1
  const push = (t) => toks.push({ ...t, line })
  while (i < src.length) {
    const c = src[i]
    if (c === '\n') {
      line++
      i++
      const top = stack[stack.length - 1]
      const prev = toks[toks.length - 1]
      if (top !== '(' && top !== '[' && prev && prev.t !== 'nl' && !(prev.t === 'op' && CONT.has(prev.v))) push({ t: 'nl' })
      continue
    }
    if (/\s/.test(c)) {
      i++
      continue
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      const j = src.indexOf('*/', i + 2)
      const e = j < 0 ? src.length : j + 2
      line += (src.slice(i, e).match(/\n/g) || []).length
      i = e
      continue
    }
    let m = src.slice(i).match(/^(0x[0-9a-fA-F_]+|0b[01_]+|\d[\d_]*(\.\d[\d_]*)?([eE][+-]?\d+)?)(ns|us|ms|s|m|h|d)?(?![\w$])/)
    if (m) {
      const raw = m[1].replace(/_/g, '')
      const isFloat = !!(m[2] || m[3]) && !/^0[xb]/i.test(raw)
      const v = /^0b/i.test(raw) ? parseInt(raw.slice(2), 2) : Number(raw)
      if (m[4]) push({ t: 'dur', v: v * DUR[m[4]], unit: m[4], n: v, isFloat })
      else push({ t: 'num', v, isFloat, raw })
      i += m[0].length
      continue
    }
    if (c === '"' || c === "'") {
      let j = i + 1
      let s = ''
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\n') fail(L('string por fechar', 'unterminated string'), line)
        if (src[j] === '\\') {
          const e = src[j + 1]
          const map = { n: '\n', t: '\t', r: '\r', '\\': '\\', '"': '"', "'": "'", 0: '\0', $: '$', '`': '`' }
          if (e === 'u' && src[j + 2] === '{') {
            const k = src.indexOf('}', j)
            s += String.fromCodePoint(parseInt(src.slice(j + 3, k), 16))
            j = k + 1
            continue
          }
          s += map[e] ?? e
          j += 2
          continue
        }
        s += src[j++]
      }
      push({ t: 'str', v: s })
      i = j + 1
      continue
    }
    if (c === '`') {
      const parts = []
      let j = i + 1
      let s = ''
      const l0 = line
      while (j < src.length && src[j] !== '`') {
        if (src[j] === '\\') {
          const map = { n: '\n', t: '\t', '\\': '\\', '`': '`', $: '$', '"': '"' }
          s += map[src[j + 1]] ?? src[j + 1]
          j += 2
          continue
        }
        if (src[j] === '$' && src[j + 1] === '{') {
          if (s) parts.push(s)
          s = ''
          let depth = 1
          let k = j + 2
          while (k < src.length && depth) {
            if (src[k] === '{') depth++
            else if (src[k] === '}') depth--
            k++
          }
          parts.push({ src: src.slice(j + 2, k - 1), line })
          j = k
          continue
        }
        if (src[j] === '\n') line++
        s += src[j++]
      }
      if (s) parts.push(s)
      toks.push({ t: 'tmpl', parts, line: l0 })
      i = j + 1
      continue
    }
    m = src.slice(i).match(/^[A-Za-z_$][\w$]*/)
    if (m) {
      push(KW.has(m[0]) ? { t: 'kw', v: m[0] } : { t: 'id', v: m[0] })
      i += m[0].length
      continue
    }
    const op = OPS.find((o) => src.startsWith(o, i))
    if (!op) fail(L(`carácter inesperado "${c}"`, `unexpected character "${c}"`), line)
    if (op === '(' || op === '[' || op === '{') stack.push(op)
    else if (op === ')' || op === ']' || op === '}') stack.pop()
    if (op === '}' && toks.length && toks[toks.length - 1].t !== 'nl') push({ t: 'nl' })
    push({ t: 'op', v: op })
    i += op.length
  }
  push({ t: 'nl' })
  push({ t: 'eof' })
  return toks
}

// ---------------------------------------------------------------- parser
const NOT_MCU = (what, instead) => L(`${what} não faz parte do Fogu da biblioteca mcu${instead ? `: ${instead}` : ''}`, `${what} is not part of Fogu for the mcu library${instead ? `: ${instead}` : ''}`)

function parse(src, lineOffset = 0) {
  const toks = lex('\n'.repeat(lineOffset) + src)
  let p = 0
  const peek = (k = 0) => toks[p + k]
  const at = (t, v) => peek().t === t && (v === undefined || peek().v === v)
  const isOp = (v) => at('op', v)
  const isKw = (v) => at('kw', v)
  const next = () => toks[p++]
  const line = () => peek().line
  const tokName = (t) => (t.t === 'nl' ? L('o fim da linha', 'the end of the line') : t.t === 'eof' ? L('o fim do programa', 'the end of the program') : `"${t.v ?? t.t}"`)
  const expect = (t, v, what) => {
    if (!at(t, v)) fail(L(`esperava ${what || v || t} e encontrei ${tokName(peek())}`, `expected ${what || v || t} but found ${tokName(peek())}`), line())
    return next()
  }
  const skipNL = () => {
    while (at('nl') || isOp(';')) next()
  }
  const skipNLin = () => {
    while (at('nl')) next()
  }
  const endStmt = () => {
    if (at('nl') || isOp(';')) return skipNL()
    if (isOp('}') || at('eof')) return
    fail(L(`esperava o fim da instrução e encontrei ${tokName(peek())}`, `expected the end of the statement but found ${tokName(peek())}`), line())
  }

  function program() {
    const body = []
    skipNL()
    while (!at('eof')) {
      body.push(statement(true))
      skipNL()
    }
    return body
  }
  function block() {
    expect('op', '{', '{')
    skipNL()
    const body = []
    while (!isOp('}')) {
      if (at('eof')) fail(L('falta } a fechar o bloco', 'missing } to close the block'), line())
      body.push(statement(false))
      skipNL()
    }
    next()
    return body
  }
  function typeAnn() {
    const t = expect('id', undefined, L('um tipo', 'a type')).v
    if (isOp('<')) fail(NOT_MCU(L(`o tipo ${t}<…>`, `the type ${t}<…>`), L('não há listas nem mapas (use bytes)', 'there are no lists or maps (use bytes)')), line())
    return { name: t }
  }
  function params() {
    expect('op', '(', '(')
    const ps = []
    while (!isOp(')')) {
      const l = line()
      if (isOp('...')) fail(NOT_MCU(L('um parâmetro variádico', 'a variadic parameter')), l)
      const name = expect('id', undefined, L('o nome do parâmetro', 'the parameter name')).v
      const type = isOp(':') ? (next(), typeAnn()) : null
      if (isOp('=')) fail(NOT_MCU(L('um valor por omissão num parâmetro', 'a default parameter value'), L('passe sempre todos os argumentos', 'always pass every argument')), l)
      ps.push({ name, type })
      if (!isOp(')')) expect('op', ',', ',')
    }
    next()
    return ps
  }
  function fnDecl(ln, top) {
    if (!top) fail(NOT_MCU(L('uma função dentro de outra', 'a function inside another'), L('declare-a no topo do ficheiro', 'declare it at the top of the file')), ln)
    const name = expect('id', undefined, L('o nome da função', 'the function name')).v
    const ps = params()
    const ret = isOp(':') ? (next(), typeAnn()) : null
    return { k: 'fn', name, params: ps, ret, body: block(), line: ln }
  }

  function statement(top) {
    const ln = line()
    if (isKw('export')) next()
    if (isKw('import')) {
      next()
      const names = []
      let def = null
      if (isOp('{')) {
        next()
        skipNL()
        while (!isOp('}')) {
          names.push(expect('id').v)
          if (isOp(',')) next()
          skipNL()
        }
        next()
      } else if (at('id')) def = next().v
      if (isKw('from')) next()
      const from = expect('str', undefined, L('o nome do módulo', 'the module name')).v
      endStmt()
      return { k: 'import', def, names, from, line: ln }
    }
    if (isKw('fn')) {
      next()
      if (!at('id')) fail(NOT_MCU(L('uma função anónima aqui', 'an anonymous function here'), L('só os handlers podem ser () => { … }', 'only handlers can be () => { … }')), ln)
      return fnDecl(ln, top)
    }
    if (isKw('struct') || isKw('interface') || isKw('embed')) fail(NOT_MCU(peek().v, L('use variáveis separadas e funções', 'use separate variables and functions')), ln)
    if (isKw('fg') || isKw('select')) fail(NOT_MCU(peek().v, L('use mcu.every(1s, fn), onPress(…) ou o padrão de mcu.millis()', 'use mcu.every(1s, fn), onPress(…) or the mcu.millis() pattern')), ln)
    if (isKw('match')) fail(NOT_MCU('match', L('use if / else if', 'use if / else if')), ln)
    if (isKw('let') || isKw('const')) {
      const kind = next().v
      if (isOp('[')) fail(NOT_MCU(L('desestruturar [a, b] = …', 'destructuring [a, b] = …')), ln)
      const name = expect('id', undefined, L('o nome da variável', 'the variable name')).v
      const type = isOp(':') ? (next(), typeAnn()) : null
      let init = null
      if (isOp('=')) {
        next()
        init = expr()
      } else if (kind === 'const') fail(L('const precisa de um valor', 'const needs a value'), ln)
      endStmt()
      return { k: 'var', kind, name, type, init, top, line: ln }
    }
    if (isKw('if')) return ifStmt()
    if (isKw('while')) {
      next()
      const cond = expr(true)
      return { k: 'while', cond, body: block(), line: ln }
    }
    if (isKw('loop')) {
      next()
      return { k: 'loop', body: block(), line: ln }
    }
    if (isKw('for')) {
      next()
      const a = expect('id', undefined, L('o nome da variável do for', 'the for variable name')).v
      let b = null
      if (isOp(',')) {
        next()
        b = expect('id').v
      }
      expect('kw', 'in', 'in')
      const iter = expr(true)
      return { k: 'for', a, b, iter, body: block(), line: ln }
    }
    if (isKw('break') || isKw('continue')) {
      const v = next().v
      endStmt()
      return { k: v, line: ln }
    }
    if (isKw('return')) {
      next()
      let value = null
      if (!at('nl') && !isOp('}') && !isOp(';')) {
        value = expr()
        if (isOp(',')) fail(NOT_MCU(L('devolver vários valores (valor, erro)', 'returning several values (value, error)')), ln)
      }
      endStmt()
      return { k: 'return', value, line: ln }
    }
    const e = expr()
    const asg = ['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>='].find((o) => isOp(o))
    if (asg) {
      next()
      const value = expr()
      endStmt()
      if (!['id', 'idx'].includes(e.k)) fail(L('só se pode atribuir a uma variável ou a b[i]', 'you can only assign to a variable or to b[i]'), ln)
      return { k: 'assign', op: asg, target: e, value, line: ln }
    }
    endStmt()
    return { k: 'expr', e, line: ln }
  }

  function ifStmt() {
    const ln = line()
    expect('kw', 'if')
    const cond = expr(true)
    const then = block()
    let els = null
    const save = p
    skipNL()
    if (isKw('else')) {
      next()
      els = isKw('if') ? [ifStmt()] : block()
    } else p = save
    return { k: 'if', cond, then, else: els, line: ln }
  }

  // precedência do Fogu: & | ^ ligam mais do que as comparações (flags & MASK != 0)
  const BIN = [['||', '??'], ['&&'], ['==', '!='], ['<', '<=', '>', '>='], ['|'], ['^'], ['&'], ['<<', '>>'], ['+', '-'], ['*', '/', '%']]
  function expr(nb = false) {
    const a = logic(nb, 0)
    if (isOp('..')) {
      const ln = line()
      next()
      return { k: 'range', a, b: logic(nb, 0), line: ln }
    }
    return a
  }
  function logic(nb, lvl) {
    if (lvl === BIN.length) return power(nb)
    let a = logic(nb, lvl + 1)
    // "|" de um padrão não existe aqui; ">" de um tipo também não
    while (BIN[lvl].some((o) => isOp(o))) {
      const ln = line()
      const op = next().v
      const b = logic(nb, lvl + 1)
      if (op === '??') fail(NOT_MCU('?? (nil)'), ln)
      a = { k: 'bin', op, a, b, line: ln }
    }
    return a
  }
  function power(nb) {
    const a = unary(nb)
    if (isOp('**')) {
      const ln = line()
      next()
      return { k: 'bin', op: '**', a, b: power(nb), line: ln }
    }
    return a
  }
  function unary(nb) {
    const ln = line()
    if (isOp('!') || isOp('-') || isOp('~')) {
      const op = next().v
      return { k: 'un', op, e: unary(nb), line: ln }
    }
    if (isOp('<-')) fail(NOT_MCU(L('canais (<-)', 'channels (<-)')), ln)
    return postfix(nb)
  }
  function args() {
    expect('op', '(')
    skipNLin()
    const out = []
    while (!isOp(')')) {
      out.push(argExpr())
      skipNLin()
      if (!isOp(')')) expect('op', ',', ',')
      skipNLin()
    }
    next()
    return out
  }
  // argumento: handler () => { … }, mapa de opções { freq: 1000 } ou expressão
  function argExpr() {
    const ln = line()
    if (isOp('{')) {
      next()
      skipNLin()
      const entries = []
      while (!isOp('}')) {
        const key = at('id') || at('kw') ? next().v : expect('str', undefined, L('o nome da opção', 'the option name')).v
        expect('op', ':', ':')
        entries.push([key, expr()])
        skipNLin()
        if (isOp(',')) next()
        skipNLin()
      }
      next()
      return { k: 'map', entries, line: ln }
    }
    return expr()
  }
  function arrow() {
    const ln = line()
    const ps = params()
    expect('op', '=>', '=>')
    const body = isOp('{') ? block() : [{ k: 'expr', e: expr(), line: ln }]
    return { k: 'arrow', params: ps, body, line: ln }
  }
  function postfix(nb) {
    let e = primary(nb)
    for (;;) {
      const ln = line()
      if (isOp('(')) e = { k: 'call', f: e, args: args(), line: ln }
      else if (isOp('[')) {
        next()
        const i = expr()
        expect('op', ']', ']')
        e = { k: 'idx', o: e, i, line: ln }
      } else if (isOp('.') || isOp('?.')) {
        if (next().v === '?.') fail(NOT_MCU('?. (nil)'), ln)
        const n = at('kw') ? next().v : expect('id', undefined, L('um nome depois do ponto', 'a name after the dot')).v
        e = { k: 'mem', o: e, n, line: ln }
      } else if (isOp('?')) fail(NOT_MCU(L('o operador ? (erros como valores)', 'the ? operator (errors as values)')), ln)
      else return e
    }
  }
  function primary(nb) {
    const ln = line()
    const t = peek()
    if (t.t === 'num') {
      next()
      if (t.isFloat) fail(L('floats não são suportados (os int têm 32 bits: use unidades menores, ex.: milivolts em vez de volts)', 'floats are not supported (ints are 32-bit: use smaller units, e.g. millivolts instead of volts)'), ln)
      return { k: 'num', v: t.v, raw: t.raw, line: ln }
    }
    if (t.t === 'dur') {
      next()
      if (t.isFloat || !Number.isInteger(t.v)) fail(L('as durações são milissegundos inteiros (use 1500ms em vez de 1.5s; para microssegundos mcu.delayUs(n))', 'durations are whole milliseconds (use 1500ms instead of 1.5s; for microseconds use mcu.delayUs(n))'), ln)
      return { k: 'dur', ms: t.v, line: ln }
    }
    if (t.t === 'str') return next(), { k: 'str', v: t.v, line: ln }
    if (t.t === 'tmpl') {
      next()
      return { k: 'tmpl', parts: t.parts.map((x) => (typeof x === 'string' ? x : parse(x.src, x.line - 1).expr())), line: ln }
    }
    if (isKw('true') || isKw('false')) return { k: 'bool', v: next().v === 'true', line: ln }
    if (isKw('nil')) fail(NOT_MCU('nil'), ln)
    if (isKw('match')) fail(NOT_MCU('match', L('use if / else if', 'use if / else if')), ln)
    if (isKw('new') || isKw('this')) fail(NOT_MCU(`"${t.v}"`, L('não há structs', 'there are no structs')), ln)
    if (isKw('fn')) fail(NOT_MCU(L('fn(…) { … } como valor', 'fn(…) { … } as a value'), L('um handler é uma fn de topo ou () => { … }', 'a handler is a top-level fn or () => { … }')), ln)
    if (t.t === 'id') {
      next()
      return { k: 'id', n: t.v, line: ln }
    }
    if (isOp('(')) {
      let depth = 0
      let k = p
      for (; k < toks.length; k++) {
        if (toks[k].v === '(') depth++
        else if (toks[k].v === ')' && --depth === 0) break
      }
      if (toks[k + 1]?.v === '=>') return arrow()
      next()
      const e = expr()
      expect('op', ')', ')')
      return { k: 'paren', e, line: ln }
    }
    if (isOp('[')) {
      next()
      skipNLin()
      const items = []
      while (!isOp(']')) {
        items.push(expr())
        skipNLin()
        if (!isOp(']')) expect('op', ',', ',')
        skipNLin()
      }
      next()
      return { k: 'list', items, line: ln }
    }
    if (isOp('{') && !nb) fail(NOT_MCU(L('mapas { chave: valor }', 'maps { key: value }'), L('só como opções de uma chamada, ex.: mcu.pwm(pino, { freq: 1000 })', 'only as call options, e.g. mcu.pwm(pin, { freq: 1000 })')), ln)
    fail(L(`não esperava ${tokName(t)}`, `did not expect ${tokName(t)}`), ln)
  }
  return { program, expr }
}

// ---------------------------------------------------------------- placas
// pino → número no core Arduino da placa; LED e botão de cada placa (tabela "Boards" da mcu)
const AVR_PORT = { PD: 0, PB: 8, PC: 14 } // Uno/Nano: PD0–7 = D0–7, PB0–5 = D8–13, PC0–5 = A0–A5
export const MCU_BOARDS = 'Arduino Uno / Nano, Raspberry Pi Pico, ESP32 e STM32 Blue Pill'
function boardInfo(boardType) {
  const type = DEFS[boardType] ? boardType : 'arduino'
  const prof = boardProfile(type)
  const id = prof.id
  const fam = id === 'uno' ? ((DEFS[type]?.variantOf || type) === 'nano' ? 'nano' : 'uno') : id === 'esp32' ? 'esp32' : prof.family === 'pico' ? 'pico' : id === 'bluepill' ? 'bluepill' : null
  if (!fam) fail(L(`a biblioteca mcu não suporta a placa ${DEFS[type]?.name || type} (placas: ${MCU_BOARDS})`, `the mcu library does not support the board ${DEFS[type]?.name || type} (boards: ${MCU_BOARDS.replace(' e ', ' and ')})`), 0)
  const pinNum = (name, line) => {
    const n = String(name)
    let i = prof.pins.indexOf(n)
    if (i < 0 && prof.consts[n] != null && !/^(LED_BUILTIN|SDA|SCL|PIN_|DAC|T\d)/.test(n)) i = prof.consts[n]
    if (i < 0 && (fam === 'uno' || fam === 'nano')) {
      const m = n.match(/^(P[BCD])([0-7])$/)
      if (m && !(m[1] !== 'PD' && +m[2] > 5)) i = AVR_PORT[m[1]] + +m[2]
    }
    if (i == null || i < 0) {
      const ex = { uno: L('"D13", "A0" (números do Arduino) ou "PB5"', '"D13", "A0" (Arduino numbers) or "PB5"'), nano: L('"D13", "A0" ou "PB5"', '"D13", "A0" or "PB5"'), pico: '"GP15"', esp32: '"GPIO4"', bluepill: '"PA5", "PC13"' }[fam]
      fail(L(`'${n}' não é um nome de pino do ${prof.mcu} (ex.: ${ex})`, `'${n}' is not a pin name on the ${prof.mcu} (e.g. ${ex})`), line)
    }
    if ((fam === 'uno' || fam === 'nano') && (i === 0 || i === 1)) fail(L(`'${n}' é um pino da consola (Serial D0/D1): a mcu não o deixa usar`, `'${n}' is a console pin (Serial D0/D1): mcu does not let you use it`), line)
    if (fam === 'bluepill' && (i === 9 || i === 10)) fail(L(`'${n}' é um pino da consola (USART1 PA9/PA10): a mcu não o deixa usar`, `'${n}' is a console pin (USART1 PA9/PA10): mcu does not let you use it`), line)
    return i
  }
  const nameOf = (i) => prof.pins[i] || `pino ${i}`
  const LED = { uno: 13, nano: 13, pico: prof.consts.LED_BUILTIN, esp32: 2, bluepill: 32 }[fam]
  const BUTTON = { uno: 2, nano: 2, pico: 15, esp32: 0, bluepill: 0 }[fam]
  const avr = fam === 'uno' || fam === 'nano'
  const BP_PWM = [8, 9, 10, 11, 0, 1, 2, 3, 6, 7, 16, 17, 22, 23, 24, 25]
  const pwmOk = (i) => (avr ? [3, 9, 10, 11].includes(i) : fam === 'bluepill' ? BP_PWM.includes(i) : fam === 'esp32' ? !(i >= 34 && i <= 39) : true)
  const pwmList = avr ? L('D3, D9, D10, D11 (o Timer0 de D5/D6 é o relógio)', 'D3, D9, D10, D11 (Timer0 on D5/D6 is the clock)') : fam === 'bluepill' ? 'PA0–PA3, PA6–PA11, PB0, PB1, PB6–PB9' : L('qualquer saída exceto GPIO34–39', 'any output except GPIO34–39')
  const adcPins = fam === 'uno' ? [14, 15, 16, 17, 18, 19] : fam === 'nano' ? [14, 15, 16, 17, 18, 19, 20, 21] : fam === 'pico' ? [26, 27, 28, 29] : fam === 'esp32' ? [32, 33, 34, 35, 36, 37, 38, 39] : [0, 1, 2, 3, 4, 5, 6, 7, 16, 17]
  const adcList = { uno: 'A0–A5', nano: 'A0–A7', pico: 'GP26–GP29', esp32: 'GPIO32–GPIO39 (ADC1)', bluepill: 'PA0–PA7, PB0, PB1' }[fam]
  // leitura bruta e escala: 10 bits (AVR) / 12 bits (os outros) e a tensão de referência
  const adc = avr ? { bits: 10, mv: 5000, scale: 1 } : fam === 'bluepill' ? { bits: 12, mv: 3300, scale: 4 } : { bits: 12, mv: 3300, scale: 1 }
  return { type, prof, fam, pinNum, nameOf, LED, BUTTON, pwmOk, pwmList, adcPins, adcList, adc, avr }
}

// ---------------------------------------------------------------- tipos
// 'int' 'bool' 'dur' 'str' 'bytes' 'pin' 'adc' 'pwm' 'i2c' 'void'
const ANN = { int: 'int', int8: 'int', int16: 'int', int32: 'int', uint8: 'int', uint16: 'int', uint32: 'int', uint: 'int', byte: 'int', rune: 'int', bool: 'bool', duration: 'dur', str: 'str', char: 'str', bytes: 'bytes', pin: 'pin', adc: 'adc', pwm: 'pwm', i2c: 'i2c' }
const CT = { int: 'long', bool: 'bool', dur: 'long', str: 'String', bytes: 'FgBytes', pin: 'FgPin', adc: 'FgAdc', pwm: 'FgPwm', i2c: 'FgI2c', void: 'void' }
const SIZED = { int8: ['int8_t', -128, 127], uint8: ['uint8_t', 0, 255], byte: ['uint8_t', 0, 255], int16: ['int16_t', -32768, 32767], uint16: ['uint16_t', 0, 65535], int32: ['long'], uint32: ['long', 0, 2147483647], uint: ['long', 0, 2147483647], rune: ['long'] }
const UNSUPPORTED = new Set(['spi', 'uart', 'display', 'touch', 'rgb', 'sd', 'storage', 'fs', 'ui', 'wifi', 'http', 'tcp', 'udp', 'websocket', 'mqtt', 'espnow', 'ble', 'lora', 'rfid', 'zigbee', 'usb', 'task', 'spawn', 'channel', 'atomic', 'mutex', 'isrQueue', 'timer', 'deepSleep', 'critical', 'interrupts', 'cores', 'coreId', 'watchdog', 'handled', 'missed', 'inInterrupt', 'tasks', 'taskInfo', 'tasksSupported', 'cpuMain'])
const METHODS = {
  pin: { output: 'pin', input: 'pin', inputPullUp: 'pin', inputPullDown: 'pin', high: 'void', low: 'void', toggle: 'void', write: 'void', read: 'bool', onPress: 'void', onRelease: 'void', onEdge: 'void', onChange: 'void', onClick: 'void', onDblClick: 'void', onInterrupt: 'void', pulseCount: 'int', resetPulseCount: 'void' },
  adc: { read: 'int', millivolts: 'int', bits: 'int', onChange: 'void', onAbove: 'void', onBelow: 'void' },
  pwm: { duty: 'void', dutyFine: 'void', off: 'void' },
  i2c: { probe: 'bool', write: 'bool', read: 'bytes', writeRead: 'bytes' },
  bytes: { len: 'int', push: 'void', text: 'str' },
  str: { len: 'int', isEmpty: 'bool', startsWith: 'bool', endsWith: 'bool', contains: 'bool', indexOf: 'int', slice: 'str', trim: 'str', toUpperCase: 'str', toLowerCase: 'str', code: 'int', bytes: 'bytes' },
}
const ARDUINO_NAMES = /^(pinMode|digitalWrite|digitalRead|analogRead|analogWrite|delay|delayMicroseconds|millis|micros|Serial|tone|noTone|attachInterrupt|LED_BUILTIN|HIGH|LOW|OUTPUT|INPUT|INPUT_PULLUP)$/

// ---------------------------------------------------------------- compilador
export function foguToCpp(src, { board = 'arduino' } = {}) {
  const prog = parse(src).program()
  let B = null
  const board_ = () => (B ||= boardInfo(board))

  // ---------- importações ----------
  let mcuName = null
  const imported = {}
  for (const s of prog) {
    if (s.k !== 'import') continue
    if (s.from !== 'mcu') fail(L(`o módulo "${s.from}" não existe no Fogu das placas — a única importação é a biblioteca: import mcu from "mcu"`, `the module "${s.from}" does not exist in Fogu for boards — the only import is the library: import mcu from "mcu"`), s.line)
    if (s.def) mcuName = s.def
    for (const n of s.names) imported[n] = n
  }

  // ---------- funções do topo (podem ser chamadas antes de declaradas) ----------
  function annT(a, line) {
    if (!a) return null
    const t = ANN[a.name]
    if (!t) fail(L(/^float(32|64)?$/.test(a.name) ? 'floats não são suportados (os int têm 32 bits)' : /^u?int64$/.test(a.name) ? `${a.name} não existe aqui (os int têm 32 bits)` : `tipo desconhecido "${a.name}"`, /^float(32|64)?$/.test(a.name) ? 'floats are not supported (ints are 32-bit)' : /^u?int64$/.test(a.name) ? `${a.name} does not exist here (ints are 32-bit)` : `unknown type "${a.name}"`), line)
    return t
  }
  const fns = {}
  for (const s of prog) if (s.k === 'fn') {
    if (fns[s.name]) fail(L(`a função ${s.name} já existe`, `the function ${s.name} already exists`), s.line)
    fns[s.name] = { node: s, params: s.params.map((p) => annT(p.type, s.line) || 'int'), ret: s.ret ? annT(s.ret, s.line) : null, busy: false }
  }

  // ---------- âmbito ----------
  let scopes = [{}]
  const declare = (n, t, kind = 'let', line) => {
    const top = scopes[scopes.length - 1]
    if (top[n] && scopes.length > 1) fail(L(`"${n}" já foi declarado neste bloco`, `"${n}" was already declared in this block`), line)
    top[n] = { t, kind }
  }
  const lookup = (n) => {
    for (let i = scopes.length - 1; i >= 0; i--) if (scopes[i][n]) return scopes[i][n]
    return null
  }
  let curFn = null
  let inHandler = false
  const constPins = {}

  // ---------- handlers ----------
  const handlers = []
  const handlerId = (h, line) => {
    if (h?.k === 'id' && fns[h.n] && !lookup(h.n)) {
      if (fns[h.n].params.length) fail(L(`o handler ${h.n} não pode ter parâmetros`, `the handler ${h.n} cannot have parameters`), line)
      let i = handlers.findIndex((x) => x.name === h.n)
      if (i < 0) i = handlers.push({ name: h.n }) - 1
      return i
    }
    if (h?.k === 'arrow') {
      if (h.params.length) fail(L('este handler não recebe parâmetros: () => { … }', 'this handler takes no parameters: () => { … }'), line)
      if (h._id == null) h._id = handlers.push({ name: `__fg_h${handlers.length}`, node: h }) - 1
      return h._id
    }
    fail(L('um handler é o nome de uma fn de topo sem parâmetros ou () => { … }', 'a handler is the name of a top-level fn with no parameters, or () => { … }'), line)
  }

  // ---------- referências à mcu ----------
  const isMcu = (e) => e?.k === 'id' && mcuName && e.n === mcuName && !lookup(e.n)
  const mcuCall = (e) => {
    if (e.k !== 'call') return null
    const f = e.f
    if (f.k === 'mem' && isMcu(f.o)) return f.n
    if (f.k === 'mem' && f.o.k === 'mem' && isMcu(f.o.o)) return `${f.o.n}.${f.n}`
    if (f.k === 'id' && imported[f.n] && !lookup(f.n) && !fns[f.n]) return imported[f.n]
    return null
  }
  const optOf = (m, key) => (m?.k === 'map' ? m.entries.find(([k]) => k === key)?.[1] : undefined)
  const M = () => mcuName || 'mcu'

  function pinConst(e) {
    if (!e) return null
    if (e.k === 'paren') return pinConst(e.e)
    if (e.k === 'id' && constPins[e.n] != null && lookup(e.n)?.kind === 'const') return constPins[e.n]
    if (e.k === 'call' && e.f.k === 'mem' && ['output', 'input', 'inputPullUp', 'inputPullDown'].includes(e.f.n)) return pinConst(e.f.o)
    const c = mcuCall(e)
    if (c === 'led') return board_().LED
    if (c === 'button') return board_().BUTTON
    if (c === 'pin' && e.args[0]?.k === 'str') return board_().pinNum(e.args[0].v, e.line)
    return null
  }

  // ---------- tipos ----------
  function typeOf(e) {
    switch (e.k) {
      case 'num':
        return 'int'
      case 'dur':
        return 'dur'
      case 'str':
        return 'str'
      case 'tmpl':
        e.parts.forEach((x) => typeof x !== 'string' && typeOf(x))
        return 'str'
      case 'bool':
        return 'bool'
      case 'paren':
        return typeOf(e.e)
      case 'list':
        for (const it of e.items) if (typeOf(it) !== 'int') fail(L('[…] é um valor bytes: só inteiros 0..255 (não há listas)', '[…] is a bytes value: only integers 0..255 (there are no lists)'), e.line)
        if (e.items.length > 16) fail(L('um literal bytes tem no máximo 16 valores aqui (use b.push(x))', 'a bytes literal has at most 16 values here (use b.push(x))'), e.line)
        return 'bytes'
      case 'map':
        fail(NOT_MCU(L('um mapa { … } aqui', 'a map { … } here'), L('só como opções de uma chamada da mcu', 'only as options of an mcu call')), e.line)
        break
      case 'arrow':
        fail(L('() => { … } só como handler (ex.: botao.onPress(() => { … }))', '() => { … } only as a handler (e.g. botao.onPress(() => { … }))'), e.line)
        break
      case 'id': {
        const v = lookup(e.n)
        if (v) return v.t
        if (mcuName && e.n === mcuName) fail(L(`use ${mcuName}.função(…)`, `use ${mcuName}.function(…)`), e.line)
        if (fns[e.n]) fail(L(`"${e.n}" é uma função: chame-a com ${e.n}() ou passe-a como handler`, `"${e.n}" is a function: call it with ${e.n}() or pass it as a handler`), e.line)
        if (ARDUINO_NAMES.test(e.n)) fail(L(`"${e.n}" é do Arduino, não do Fogu: use a biblioteca mcu (import mcu from "mcu"; ex.: mcu.pin("D7").output(), mcu.led(), mcu.delay(500ms), mcu.millis())`, `"${e.n}" is Arduino, not Fogu: use the mcu library (import mcu from "mcu"; e.g. mcu.pin("D7").output(), mcu.led(), mcu.delay(500ms), mcu.millis())`), e.line)
        fail(L(`"${e.n}" não está definido`, `"${e.n}" is not defined`), e.line)
        break
      }
      case 'un': {
        const t = typeOf(e.e)
        if (e.op === '!') {
          if (t !== 'bool') fail(L(`! precisa de um bool, não ${t}`, `! needs a bool, not ${t}`), e.line)
          return 'bool'
        }
        if (t !== 'int' && !(e.op === '-' && t === 'dur')) fail(L(`${e.op} precisa de um int, não ${t}`, `${e.op} needs an int, not ${t}`), e.line)
        return t
      }
      case 'bin': {
        const a = typeOf(e.a)
        const b = typeOf(e.b)
        const op = e.op
        if (op === '&&' || op === '||') {
          if (a !== 'bool' || b !== 'bool') fail(L(`${op} precisa de bools`, `${op} needs bools`), e.line)
          return 'bool'
        }
        if (op === '==' || op === '!=') {
          if (a !== b) fail(L(`não se pode comparar ${a} com ${b}`, `cannot compare ${a} with ${b}`), e.line)
          if (!['int', 'bool', 'dur', 'str', 'bytes'].includes(a)) fail(L(`não se pode comparar ${a}`, `cannot compare ${a}`), e.line)
          return 'bool'
        }
        if (['<', '<=', '>', '>='].includes(op)) {
          if (a !== b || !['int', 'dur'].includes(a)) fail(L(`não se pode aplicar '${op}' a ${a} e ${b}`, `cannot apply '${op}' to ${a} and ${b}`), e.line)
          return 'bool'
        }
        if (op === '+' && (a === 'str' || b === 'str')) {
          if (a !== b) fail(L(`não se pode aplicar '+' a ${a} e ${b} (use str(x) ou \`…\${x}…\`)`, `cannot apply '+' to ${a} and ${b} (use str(x) or \`…\${x}…\`)`), e.line)
          return 'str'
        }
        if (['&', '|', '^', '<<', '>>'].includes(op)) {
          if (a !== 'int' || b !== 'int') fail(L(`'${op}' é para ints`, `'${op}' is for ints`), e.line)
          return 'int'
        }
        if (a === 'dur' || b === 'dur') {
          if ((op === '+' || op === '-') && a === 'dur' && b === 'dur') return 'dur'
          if (op === '*' && (a === 'int' || b === 'int')) return 'dur'
          if (op === '/' && a === 'dur') return b === 'dur' ? 'int' : 'dur'
          if (op === '%' && a === 'dur' && b === 'dur') return 'dur'
          fail(L(`não se pode aplicar '${op}' a ${a} e ${b}`, `cannot apply '${op}' to ${a} and ${b}`), e.line)
        }
        if (a !== 'int' || b !== 'int') fail(L(`não se pode aplicar '${op}' a ${a} e ${b}`, `cannot apply '${op}' to ${a} and ${b}`), e.line)
        return 'int'
      }
      case 'range':
        fail(L('um intervalo a..b só se usa no for', 'a range a..b can only be used in a for'), e.line)
        break
      case 'idx': {
        const o = typeOf(e.o)
        if (typeOf(e.i) !== 'int') fail(L('o índice tem de ser int', 'the index must be an int'), e.line)
        if (o === 'bytes') return 'int'
        if (o === 'str') return 'str'
        fail(L(`não se pode indexar um ${o}`, `cannot index a ${o}`), e.line)
        break
      }
      case 'mem': {
        if (isMcu(e.o)) fail(L(`${mcuName}.${e.n} é uma função: ${mcuName}.${e.n}(…)`, `${mcuName}.${e.n} is a function: ${mcuName}.${e.n}(…)`), e.line)
        if (e.o.k === 'mem' && isMcu(e.o.o)) fail(`${mcuName}.${e.o.n}.${e.n}(…)`, e.line)
        fail(L(`.${e.n} sem parênteses: os valores só têm métodos (ex.: b.len())`, `.${e.n} without parentheses: values only have methods (e.g. b.len())`), e.line)
        break
      }
      case 'call':
        return callType(e)
    }
    fail(L(`expressão não suportada (${e.k})`, `unsupported expression (${e.k})`), e.line)
  }

  function callType(e) {
    const c = mcuCall(e)
    if (c != null) return mcuType(c, e)
    if (e.f.k === 'id') {
      const n = e.f.n
      const f = fns[n]
      if (f && !lookup(n)) {
        if (e.args.length !== f.params.length) fail(L(`${n}() precisa de ${f.params.length} argumento(s), não ${e.args.length}`, `${n}() needs ${f.params.length} argument(s), not ${e.args.length}`), e.line)
        e.args.forEach((a, i) => {
          const t = typeOf(a)
          if (t !== f.params[i]) fail(L(`o argumento ${i + 1} de ${n}() é ${f.params[i]}, não ${t}${!f.node.params[i].type ? ' (os parâmetros sem anotação são int)' : ''}`, `argument ${i + 1} of ${n}() is ${f.params[i]}, not ${t}${!f.node.params[i].type ? ' (parameters without a type annotation are int)' : ''}`), e.line)
        })
        if (!f.ret) {
          if (f.busy) fail(L(`${n} é recursiva: anote o tipo de retorno (fn ${n}(…): int)`, `${n} is recursive: annotate the return type (fn ${n}(…): int)`), e.line)
          inferRet(f)
        }
        return f.ret
      }
      const t0 = e.args.map((a) => typeOf(a))
      switch (n) {
        case 'print':
          return 'void'
        case 'str':
          return 'str'
        case 'len':
          if (!['str', 'bytes'].includes(t0[0])) fail(L('len() é para str e bytes', 'len() is for str and bytes'), e.line)
          return 'int'
        case 'int':
          if (!['str', 'int', 'bool', 'dur'].includes(t0[0])) fail(L(`int() não converte ${t0[0]}`, `int() cannot convert ${t0[0]}`), e.line)
          return 'int'
        case 'char':
          return 'str'
        case 'bool':
          return 'bool'
        case 'typeof':
          return 'str'
        case 'panic':
          return 'void'
      }
      if (SIZED[n]) return 'int'
      if (/^float(32|64)?$/.test(n)) fail(L('floats não são suportados (os int têm 32 bits)', 'floats are not supported (ints are 32-bit)'), e.line)
      typeOf(e.f)
    }
    if (e.f.k === 'mem') {
      const o = typeOf(e.f.o)
      const m = METHODS[o]?.[e.f.n]
      if (!m) fail(L(`${o} não tem o método ${e.f.n}()${METHODS[o] ? ` (tem: ${Object.keys(METHODS[o]).join(', ')})` : ''}`, `${o} has no method ${e.f.n}()${METHODS[o] ? ` (it has: ${Object.keys(METHODS[o]).join(', ')})` : ''}`), e.line)
      if (o === 'pin' && e.f.n === 'inputPullDown' && board_().avr) fail(L('o ATmega328P não tem pull-downs internos: use inputPullUp() e um botão ao GND', 'the ATmega328P has no internal pull-downs: use inputPullUp() and a button to GND'), e.line)
      for (const a of e.args) if (a.k === 'arrow' || a.k === 'map' || (a.k === 'id' && fns[a.n] && !lookup(a.n))) continue
      else typeOf(a)
      if (o === 'pin' && /^on/.test(e.f.n)) handlerId(e.args.find((a) => a.k === 'arrow' || (a.k === 'id' && fns[a.n])), e.line)
      return m
    }
    fail(L('chamada não suportada', 'unsupported call'), e.line)
  }

  function mcuType(c, e) {
    const A = (i) => e.args[i]
    const T = (i) => (A(i) && A(i).k !== 'map' && A(i).k !== 'arrow' ? typeOf(A(i)) : null)
    const head = c.split('.')[0]
    if (UNSUPPORTED.has(head)) fail(L(`${M()}.${c}() existe na biblioteca mcu mas ainda não é simulado no adjeltron`, `${M()}.${c}() exists in the mcu library but is not simulated in adjeltron yet`), e.line)
    switch (c) {
      case 'pin':
        if (A(0)?.k !== 'str') fail(L(`${M()}.pin("D7"): o nome do pino é um texto fixo (verificado na compilação)`, `${M()}.pin("D7"): the pin name is a fixed string (checked at compile time)`), e.line)
        board_().pinNum(A(0).v, e.line)
        return 'pin'
      case 'led':
      case 'button':
        board_()
        return 'pin'
      case 'delay':
        if (T(0) !== 'dur') fail(L(`${M()}.delay recebe uma duração (500ms); para um int use ${M()}.delayMs(n)`, `${M()}.delay takes a duration (500ms); for an int use ${M()}.delayMs(n)`), e.line)
        return 'void'
      case 'delayMs':
      case 'delayUs':
      case 'delayMicros':
      case 'delayUntil':
        if (T(0) !== 'int') fail(L(`${M()}.${c}(n) recebe um int`, `${M()}.${c}(n) takes an int`), e.line)
        return 'void'
      case 'millis':
      case 'micros':
        return 'int'
      case 'elapsed':
        if (T(0) !== 'int') fail(L(`${M()}.elapsed(desde) recebe um valor de ${M()}.millis()`, `${M()}.elapsed(since) takes a value from ${M()}.millis()`), e.line)
        return 'int'
      case 'poll':
      case 'yield':
      case 'reset':
        return 'void'
      case 'every':
        if (T(0) !== 'dur') fail(`${M()}.every(1s, handler)`, e.line)
        handlerId(A(1), e.line)
        return 'void'
      case 'temperature':
        return 'int'
      case 'resetReason':
        return 'str'
      case 'adc':
      case 'analog': {
        if (A(0)?.k === 'str' && ['temp', 'vref'].includes(A(0).v)) return 'adc'
        if (A(0)?.k !== 'str' && T(0) !== 'pin') fail(L(`${M()}.${c}(pino) recebe um pin ou o nome do pino`, `${M()}.${c}(pin) takes a pin or the pin name`), e.line)
        const n = A(0)?.k === 'str' ? board_().pinNum(A(0).v, e.line) : pinConst(A(0))
        if (n != null && !board_().adcPins.includes(n)) fail(L(`${board_().nameOf(n)} não tem ADC no ${board_().prof.mcu} (pinos com ADC: ${board_().adcList})`, `${board_().nameOf(n)} has no ADC on the ${board_().prof.mcu} (ADC pins: ${board_().adcList})`), e.line)
        return 'adc'
      }
      case 'pwm': {
        if (T(0) !== 'pin') fail(L(`${M()}.pwm(pino, { freq: 1000 })`, `${M()}.pwm(pin, { freq: 1000 })`), e.line)
        const n = pinConst(A(0))
        if (n != null && !board_().pwmOk(n)) fail(L(`${board_().nameOf(n)} não tem PWM no ${board_().prof.mcu} (pinos PWM: ${board_().pwmList})`, `${board_().nameOf(n)} has no PWM on the ${board_().prof.mcu} (PWM pins: ${board_().pwmList})`), e.line)
        return 'pwm'
      }
      case 'i2c':
        return 'i2c'
      case 'bytes':
        if (T(0) !== 'int') fail(`${M()}.bytes(n)`, e.line)
        return 'bytes'
      case 'crc16':
        if (T(0) !== 'bytes') fail(`${M()}.crc16(bytes)`, e.line)
        return 'int'
      case 'serial.print':
      case 'serial.write':
        e.args.forEach((_, i) => T(i))
        return 'void'
      case 'serial.read':
        return 'int'
      case 'serial.available':
        return 'bool'
      case 'serial.flush':
        return 'void'
      case 'serial.readLine':
        return 'str'
      case 'serial.readBytes':
        return 'bytes'
      case 'serial.onReceive':
        handlerId(A(0), e.line)
        return 'void'
    }
    fail(L(`${M()}.${c}() não existe na biblioteca mcu`, `${M()}.${c}() does not exist in the mcu library`), e.line)
  }

  function inferRet(f) {
    const prev = curFn
    const saved = scopes
    curFn = f
    f.busy = true
    scopes = [{ ...globalTypes }, {}]
    f.node.params.forEach((p, i) => declare(p.name, f.params[i], 'let', f.node.line))
    let t = null
    const walk = (body) => {
      scopes.push({})
      for (const s of body) {
        if (s.k === 'return') {
          const rt = s.value ? typeOf(s.value) : 'void'
          if (t && t !== rt) fail(L(`${f.node.name} devolve ${t} e ${rt}`, `${f.node.name} returns ${t} and ${rt}`), s.line)
          t = rt
        } else if (s.k === 'var') visitVar(s)
        else if (s.k === 'if') walk(s.then), s.else && walk(s.else)
        else if (s.k === 'while' || s.k === 'loop') walk(s.body)
        else if (s.k === 'for') {
          scopes.push({})
          forDecl(s)
          walk(s.body)
          scopes.pop()
        }
      }
      scopes.pop()
    }
    walk(f.node.body)
    f.ret = t || 'void'
    f.busy = false
    scopes = saved
    curFn = prev
  }

  function visitVar(s) {
    const ann = annT(s.type, s.line)
    let t = s.init ? typeOf(s.init) : null
    if (ann && t && ann !== t) fail(L(`"${s.name}" é ${s.type.name} mas o valor é ${t}`, `"${s.name}" is ${s.type.name} but the value is ${t}`), s.line)
    t = ann || t
    if (!t) fail(L(`dê um valor ou um tipo a "${s.name}" (let ${s.name}: int = 0)`, `give "${s.name}" a value or a type (let ${s.name}: int = 0)`), s.line)
    if (t === 'void') fail(L(`o valor de "${s.name}" não devolve nada`, `the value of "${s.name}" returns nothing`), s.line)
    s.t = t
    s.sized = SIZED[s.type?.name]
    declare(s.name, t, s.kind, s.line)
    return t
  }
  function forDecl(s) {
    if (s.iter.k === 'range') {
      if (s.b) fail(L('for i in a..b tem uma só variável', 'for i in a..b has a single variable'), s.line)
      if (typeOf(s.iter.a) !== 'int' || typeOf(s.iter.b) !== 'int') fail(L('os limites do for são ints', 'the for bounds are ints'), s.line)
      declare(s.a, 'int', 'const')
      s.kind_ = 'range'
      return
    }
    const t = typeOf(s.iter)
    if (t === 'bytes' || t === 'str') {
      if (s.b) declare(s.a, 'int', 'const'), declare(s.b, t === 'bytes' ? 'int' : 'str', 'const')
      else declare(s.a, t === 'bytes' ? 'int' : 'str', 'const')
      s.kind_ = t
      return
    }
    fail(L(`for … in: intervalos (0..10), bytes ou str — não ${t}`, `for … in: ranges (0..10), bytes or str — not ${t}`), s.line)
  }

  // ---------- emissão ----------
  const strLit = (s) => JSON.stringify(s).replace(/[]/g, '')
  const ind = (n) => '  '.repeat(n)

  // valor → String, como o print do Fogu (bool: true/false; duração: 500ms; bytes: [1, 2])
  function asText(e) {
    const t = typeOf(e)
    if (t === 'bool') return `String(${E(e)} ? "true" : "false")`
    if (t === 'dur') return `(String(${E(e)}) + "ms")`
    if (t === 'bytes') return `${E(e)}.show()`
    return `String(${E(e)})`
  }

  function E(e) {
    switch (e.k) {
      case 'num':
        return e.raw && /^0x/i.test(e.raw) ? e.raw : String(e.v)
      case 'dur':
        return `${e.ms}L`
      case 'str':
        return `String(${strLit(e.v)})`
      case 'tmpl':
        return e.parts.length ? `(${e.parts.map((x) => (typeof x === 'string' ? `String(${strLit(x)})` : asText(x))).join(' + ')})` : 'String("")'
      case 'bool':
        return e.v ? 'true' : 'false'
      case 'paren':
        return `(${E(e.e)})`
      case 'id':
        return e.n
      case 'list':
        return `__fg_b(${e.items.length}${e.items.map((x) => `, ${E(x)}`).join('')})`
      case 'un':
        return `${e.op}${E(e.e)}`
      case 'bin':
        if (e.op === '**') return `__fg_pow(${E(e.a)}, ${E(e.b)})`
        // divisão inteira (como no Fogu) e divisão por zero = erro com a linha
        if (e.op === '/') return `__fg_div(${E(e.a)}, ${E(e.b)}, ${e.line})`
        if (e.op === '%') return `__fg_mod(${E(e.a)}, ${E(e.b)}, ${e.line})`
        return `(${E(e.a)} ${e.op} ${E(e.b)})`
      case 'idx':
        return typeOf(e.o) === 'str' ? `String(${E(e.o)}.charAt(${E(e.i)}))` : `${E(e.o)}.at(${E(e.i)})`
      case 'call':
        return callE(e)
    }
    fail(L(`expressão não suportada (${e.k})`, `unsupported expression (${e.k})`), e.line)
  }

  function callE(e) {
    const c = mcuCall(e)
    if (c != null) return mcuE(c, e)
    const a = e.args.map((x) => (x.k === 'arrow' || x.k === 'map' || (x.k === 'id' && fns[x.n] && !lookup(x.n)) ? null : E(x)))
    if (e.f.k === 'id') {
      const n = e.f.n
      if (fns[n] && !lookup(n)) return `${n}(${a.join(', ')})`
      switch (n) {
        case 'str':
          return asText(e.args[0])
        case 'len':
          return typeOf(e.args[0]) === 'str' ? `((long)${a[0]}.length())` : `${a[0]}.len()`
        case 'int': {
          const t = typeOf(e.args[0])
          return t === 'str' ? `__fg_int(${a[0]}, ${e.line})` : t === 'bool' ? `(${a[0]} ? 1L : 0L)` : `((long)${a[0]})`
        }
        case 'char':
          return typeOf(e.args[0]) === 'int' ? `String((char)(${a[0]}))` : `__fg_char(${a[0]}, ${e.line})`
        case 'bool':
          return `(${a[0]})`
        case 'typeof':
          return `String(${strLit({ dur: 'duration' }[typeOf(e.args[0])] || typeOf(e.args[0]))})`
        case 'panic':
          return `__fg_panic(${e.args.length ? asText(e.args[0]) : 'String("panic")'}, ${e.line})`
      }
      if (SIZED[n]) return `((long)(${SIZED[n][0]})(${a[0]}))`
    }
    if (e.f.k === 'mem') {
      const o = E(e.f.o)
      const t = typeOf(e.f.o)
      const m = e.f.n
      if (t === 'pin') {
        const hArg = e.args.find((x) => x.k === 'arrow' || (x.k === 'id' && fns[x.n] && !lookup(x.n)))
        const h = () => handlerId(hArg, e.line)
        const opts = e.args.find((x) => x.k === 'map')
        const deb = (d) => {
          const v = optOf(opts, 'debounce')
          return v ? (v.k === 'bool' ? (v.v ? 20 : 0) : v.k === 'dur' ? v.ms : d) : d
        }
        switch (m) {
          case 'onPress':
            return `__fg_on(${o}.n, 0, ${h()}, 30)`
          case 'onRelease':
            return `__fg_on(${o}.n, 1, ${h()}, 30)`
          case 'onEdge': {
            const mode = e.args[0]?.k === 'str' ? e.args[0].v : 'both'
            if (!['rising', 'falling', 'both'].includes(mode)) fail('onEdge("rising" | "falling" | "both", handler)', e.line)
            return `__fg_on(${o}.n, ${{ rising: 2, falling: 3, both: 4 }[mode]}, ${h()}, 0)`
          }
          case 'onChange':
            return `__fg_on(${o}.n, 4, ${h()}, ${deb(0)})`
          case 'onClick':
            return `__fg_on(${o}.n, 5, ${h()}, ${deb(20)})`
          case 'onDblClick': {
            const w = optOf(opts, 'window')
            return `__fg_on2(${o}.n, 6, ${h()}, 20, ${w?.k === 'dur' ? w.ms : 400})`
          }
          case 'onInterrupt': {
            const mode = e.args[0]?.k === 'str' ? e.args[0].v : 'change'
            const k = { rising: 2, falling: 3, change: 4, low: 7, high: 8 }[mode]
            if (k == null) fail('onInterrupt("rising" | "falling" | "change" | "low" | "high", handler)', e.line)
            return `__fg_on(${o}.n, ${k}, ${h()}, ${deb(0)})`
          }
          case 'pulseCount':
            return `__fg_pulses(${o}.n)`
          case 'resetPulseCount':
            return `__fg_pulsesReset(${o}.n)`
        }
        return `${o}.${m}(${a.filter((x) => x != null).join(', ')})`
      }
      if (t === 'adc' && /^on/.test(m)) fail(L(`adc.${m}() ainda não é simulado no adjeltron (leia adc.read() no ciclo)`, `adc.${m}() is not simulated in adjeltron yet (read adc.read() in the loop)`), e.line)
      if (t === 'str') {
        switch (m) {
          case 'len':
            return `((long)${o}.length())`
          case 'isEmpty':
            return `(${o}.length() == 0)`
          case 'startsWith':
          case 'endsWith':
            return `${o}.${m}(${a[0]})`
          case 'contains':
            return `(${o}.indexOf(${a[0]}) >= 0)`
          case 'indexOf':
            return `((long)${o}.indexOf(${a[0]}))`
          case 'slice':
            return a.length > 1 ? `${o}.substring(${a[0]}, ${a[1]})` : `${o}.substring(${a[0]})`
          case 'trim':
          case 'toUpperCase':
          case 'toLowerCase':
            return `__fg_${m}(${o})`
          case 'code':
            return `((long)(uint8_t)${o}.charAt(0))`
          case 'bytes':
            return `__fg_strBytes(${o})`
        }
      }
      return `${o}.${m}(${a.filter((x) => x != null).join(', ')})`
    }
    fail(L('chamada não suportada', 'unsupported call'), e.line)
  }

  function mcuE(c, e) {
    const a = e.args.map((x) => (x.k === 'arrow' || x.k === 'map' || (x.k === 'id' && fns[x.n] && !lookup(x.n)) ? null : E(x)))
    const opts = e.args.find((x) => x.k === 'map')
    switch (c) {
      case 'pin':
        return `FgPin(${board_().pinNum(e.args[0].v, e.line)})`
      case 'led':
        return `FgPin(${board_().LED})`
      case 'button':
        return `FgPin(${board_().BUTTON})`
      case 'delay':
      case 'delayMs':
        return `__fg_delay(${a[0]})`
      case 'delayUs':
      case 'delayMicros':
        return `delayMicroseconds(${a[0]})`
      case 'delayUntil':
        return `__fg_delay(${a[0]} - (long)millis())`
      case 'millis':
        return '((long)millis())'
      case 'micros':
        return '((long)micros())'
      case 'elapsed':
        return `((long)millis() - ${a[0]})`
      case 'poll':
      case 'yield':
        return '__fg_poll()'
      case 'reset':
        return '__fg_panic(String("reset"), 0)'
      case 'every':
        return `__fg_every(${a[0]}, ${handlerId(e.args[1], e.line)})`
      case 'temperature': {
        const off = optOf(opts, 'offset')
        const gain = optOf(opts, 'gain')
        return `__fg_temperature(${off ? E(off) : 0}, ${gain ? E(gain) : 1000})`
      }
      case 'resetReason':
        return 'String("power-on")'
      case 'adc':
      case 'analog': {
        const { adc } = board_()
        if (e.args[0]?.k === 'str' && ['temp', 'vref'].includes(e.args[0].v)) return `FgAdc(${e.args[0].v === 'temp' ? -2 : -3}, ${adc.mv}, ${adc.bits}, ${adc.scale})`
        const pin = e.args[0]?.k === 'str' ? board_().pinNum(e.args[0].v, e.line) : `${E(e.args[0])}.n`
        return `FgAdc(${pin}, ${adc.mv}, ${adc.bits}, ${adc.scale})`
      }
      case 'pwm': {
        const f = optOf(opts, 'freq')
        return `FgPwm(${E(e.args[0])}.n, ${f ? E(f) : 1000})`
      }
      case 'i2c': {
        const f = optOf(opts, 'freq')
        return `FgI2c(${f ? E(f) : 100000})`
      }
      case 'bytes':
        return `__fg_bzero(${a[0]})`
      case 'crc16':
        return `__fg_crc16(${a[0]})`
      case 'serial.print':
        return printE(e.args, true)
      case 'serial.write':
        return printE(e.args, false)
      case 'serial.read':
        return '((long)Serial.read())'
      case 'serial.available':
        return '(Serial.available() > 0)'
      case 'serial.flush':
        return 'Serial.flush()'
      case 'serial.readLine':
        return '__fg_readLine()'
      case 'serial.readBytes':
        return '__fg_readBytes()'
      case 'serial.onReceive':
        return `__fg_onSerial(${handlerId(e.args[0], e.line)})`
    }
    fail(L(`${M()}.${c}() não existe`, `${M()}.${c}() does not exist`), e.line)
  }

  // print(a, b, …): valores separados por espaços e fim de linha CR LF
  function printE(args, nl) {
    const parts = args.map(asText)
    const body = parts.length ? parts.join(' + String(" ") + ') : 'String("")'
    return nl ? `__fg_print(${body})` : `Serial.print(${body})`
  }

  function cond(e, what) {
    const t = typeOf(e)
    if (t !== 'bool') fail(L(`a condição de '${what}' tem de ser bool, não ${t} (escreva ex.: x != 0)`, `the condition of '${what}' must be a bool, not ${t} (write e.g. x != 0)`), e.line)
    return E(e)
  }

  function S(s, d) {
    switch (s.k) {
      case 'var': {
        visitVar(s)
        let init = s.init ? E(s.init) : { int: '0', bool: 'false', dur: '0', str: 'String("")', bytes: 'FgBytes()', pin: 'FgPin()', adc: 'FgAdc()', pwm: 'FgPwm()', i2c: 'FgI2c()' }[s.t]
        if (s.sized && s.sized[1] != null) init = `__fg_range(${init}, ${s.sized[1]}, ${s.sized[2]}, ${s.line})`
        if (s.top) return `${ind(d)}${s.name} = ${init};` // global: declarada lá em cima
        return `${ind(d)}${CT[s.t]} ${s.name} = ${init};`
      }
      case 'assign': {
        const tt = typeOf(s.target)
        const vt = typeOf(s.value)
        if (s.target.k === 'id' && lookup(s.target.n)?.kind === 'const') fail(L(`"${s.target.n}" é const: não se pode mudar`, `"${s.target.n}" is const: it cannot be changed`), s.line)
        if (s.op === '=' && tt !== vt) fail(L(`não se pode atribuir ${vt} a ${tt}`, `cannot assign ${vt} to ${tt}`), s.line)
        if (s.op === '+=' && tt === 'str' && vt !== 'str') fail(L("não se pode aplicar '+' a str e int (use str(x))", "cannot apply '+' to str and int (use str(x))"), s.line)
        if (s.op !== '=' && tt !== 'str' && !['int', 'dur'].includes(tt)) fail(L(`'${s.op}' não se aplica a ${tt}`, `'${s.op}' does not apply to ${tt}`), s.line)
        if (s.target.k === 'idx') {
          if (typeOf(s.target.o) !== 'bytes') fail(L('só se pode mudar b[i] num bytes', 'you can only change b[i] in a bytes value'), s.line)
          const v = s.op === '=' ? E(s.value) : `${E(s.target)} ${s.op.slice(0, -1)} ${E(s.value)}`
          return `${ind(d)}${E(s.target.o)}.set(${E(s.target.i)}, ${v});`
        }
        if (s.op === '/=' || s.op === '%=') return `${ind(d)}${E(s.target)} = __fg_${s.op === '/=' ? 'div' : 'mod'}(${E(s.target)}, ${E(s.value)}, ${s.line});`
        return `${ind(d)}${E(s.target)} ${s.op} ${E(s.value)};`
      }
      case 'expr': {
        const e = s.e
        if (e.k === 'call' && e.f.k === 'id' && e.f.n === 'print' && !fns.print) {
          e.args.forEach((x) => typeOf(x))
          return `${ind(d)}${printE(e.args, true)};`
        }
        typeOf(e)
        return `${ind(d)}${E(e)};`
      }
      case 'if': {
        let out = `${ind(d)}if (${cond(s.cond, 'if')}) {\n${blockS(s.then, d + 1)}\n${ind(d)}}`
        if (s.else) {
          if (s.else.length === 1 && s.else[0].k === 'if') out += ` else ${S(s.else[0], d).trimStart()}`
          else out += ` else {\n${blockS(s.else, d + 1)}\n${ind(d)}}`
        }
        return out
      }
      // cada volta de um ciclo corre os handlers (como na biblioteca)
      case 'while':
        return `${ind(d)}while (${cond(s.cond, 'while')}) {\n${ind(d + 1)}__fg_poll();\n${blockS(s.body, d + 1)}\n${ind(d)}}`
      case 'loop':
        return `${ind(d)}while (true) {\n${ind(d + 1)}__fg_poll();\n${blockS(s.body, d + 1)}\n${ind(d)}}`
      case 'for': {
        scopes.push({})
        forDecl(s)
        let head
        let pre = ''
        if (s.kind_ === 'range') head = `for (long ${s.a} = ${E(s.iter.a)}; ${s.a} < ${E(s.iter.b)}; ${s.a}++)`
        else {
          const v = `__it${d}`
          const i = s.b ? s.a : `__i${d}`
          const x = s.b || s.a
          if (s.kind_ === 'bytes') {
            head = `FgBytes ${v} = ${E(s.iter)};\n${ind(d)}for (long ${i} = 0; ${i} < ${v}.len(); ${i}++)`
            pre = `${ind(d + 1)}long ${x} = ${v}.at(${i});\n`
          } else {
            head = `String ${v} = ${E(s.iter)};\n${ind(d)}for (long ${i} = 0; ${i} < (long)${v}.length(); ${i}++)`
            pre = `${ind(d + 1)}String ${x} = String(${v}.charAt(${i}));\n`
          }
        }
        const body = blockS(s.body, d + 1, false)
        scopes.pop()
        return `${ind(d)}${head} {\n${ind(d + 1)}__fg_poll();\n${pre}${body}\n${ind(d)}}`
      }
      case 'break':
      case 'continue':
        return `${ind(d)}${s.k};`
      case 'return':
        if (!curFn && !inHandler) fail(L('return fora de uma função', 'return outside a function'), s.line)
        return `${ind(d)}return${s.value ? ` ${E(s.value)}` : ''};`
      case 'fn':
      case 'import':
        return ''
    }
    fail(L(`instrução não suportada (${s.k})`, `unsupported statement (${s.k})`), s.line)
  }
  function blockS(body, d, newScope = true) {
    if (newScope) scopes.push({})
    const out = body.map((x) => S(x, d)).filter(Boolean).join('\n')
    if (newScope) scopes.pop()
    return out || `${ind(d)};`
  }

  // ---------- globais primeiro (visíveis nas funções, mesmo as declaradas depois) ----------
  scopes = [{}]
  const globals = prog.filter((s) => s.k === 'var')
  let globalTypes = {}
  for (const s of globals) {
    visitVar(s)
    globalTypes = { ...scopes[0] }
    if (s.t === 'pin' && s.kind === 'const') {
      const n = pinConst(s.init)
      if (n != null) constPins[s.name] = n
    }
  }
  globalTypes = { ...scopes[0] }

  // ---------- funções ----------
  const fnNodes = prog.filter((x) => x.k === 'fn')
  for (const s of fnNodes) if (!fns[s.name].ret) inferRet(fns[s.name])
  const sig = (s, f) => `${CT[f.ret]} ${s.name}(${s.params.map((p, i) => `${CT[f.params[i]]} ${p.name}`).join(', ')})`
  const fnText = fnNodes.map((s) => {
    const f = fns[s.name]
    curFn = f
    scopes = [{ ...globalTypes }, {}]
    s.params.forEach((p, i) => declare(p.name, f.params[i], 'let', s.line))
    const t = `${sig(s, f)} {\n${blockS(s.body, 1, false)}\n}`
    curFn = null
    return t
  })

  // ---------- código do topo → setup() (pela ordem do ficheiro) ----------
  scopes = [{}]
  const topLines = prog.filter((s) => s.k !== 'fn' && s.k !== 'import').map((s) => S(s, 1))

  // ---------- handlers () => { … } ----------
  const hText = []
  for (let i = 0; i < handlers.length; i++) {
    const h = handlers[i]
    if (!h.node) continue
    scopes = [{ ...globalTypes }, {}]
    inHandler = true
    hText.push(`void ${h.name}() {\n${blockS(h.node.body, 1, false)}\n}`)
    inHandler = false
  }
  const runText = `void __fg_run(long id) {\n  switch (id) {\n${handlers.map((h, i) => `    case ${i}: ${h.name}(); break;`).join('\n')}\n  }\n}`

  const info = board_()
  return [
    `// Gerado a partir de Fogu (biblioteca mcu) pelo adjeltron — placa: ${DEFS[info.type]?.name || info.type}`,
    '#include <Wire.h>',
    // o AVR não tem pull-downs internos (o compilador do Fogu já recusa inputPullDown nele)
    info.avr ? RUNTIME.replace(/\n  FgPin inputPullDown\(\)[^\n]*/, '') : RUNTIME,
    '',
    '// variáveis globais do programa',
    ...globals.map((s) => `${CT[s.t]} ${s.name};`),
    '',
    ...fnNodes.map((s) => `${sig(s, fns[s.name])};`),
    ...handlers.filter((h) => h.node).map((h) => `void ${h.name}();`),
    '',
    ...fnText,
    '',
    ...hText,
    '',
    runText,
    '',
    `void setup() {\n  Serial.begin(115200);\n${info.fam === 'pico' ? '  analogReadResolution(12);\n' : ''}${topLines.filter(Boolean).join('\n')}\n}`,
    '',
    '// o código do topo acabou: os handlers continuam a correr',
    'void loop() {\n  __fg_delay(10);\n}',
    '',
  ].join('\n')
}

// mesmo resultado que o compilador (código C++ ou erro com a linha) — para o editor
export function compileFogu(src, opts = {}) {
  try {
    return { ok: true, cpp: foguToCpp(src, opts), diagnostics: [] }
  } catch (e) {
    if (e instanceof FoguError) return { ok: false, cpp: null, diagnostics: [{ line: e.line, col: 0, severity: 'error', message: `Fogu: ${e.fogu}` }] }
    return { ok: false, cpp: null, diagnostics: [{ line: 0, col: 0, severity: 'error', message: L(`Fogu: erro interno do compilador (${e.message})`, `Fogu: internal compiler error (${e.message})`) }] }
  }
}
