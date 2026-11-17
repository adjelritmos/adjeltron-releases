// Classes e estruturas do próprio sketch (C++): class / struct (com métodos, construtores, lista
// de inicialização, herança, membros static, métodos definidos fora da classe — Classe::metodo),
// enum / enum class, typedef, ponteiros (->, new, delete) e cópia de estruturas por valor.
//
// Cada classe vira uma classe JavaScript cujo corpo é só um "esqueleto": os métodos verdadeiros
// passam a funções livres do sketch (Classe__metodo(__this, …)) e seguem pelo resto do tradutor
// como qualquer outra função (tipos, casts, laços, delay… e sobrecarga). O esqueleto chama-as:
//    class Led { *trocar(...a) { return yield* Led__trocar(this, ...a) } }
// Os métodos são generators (podem ter delay()), por isso as chamadas obj.metodo(…) ficam
// (yield* __cv(obj.metodo(…))). O construtor corre a função Classe__new até ao fim (__sync).
import { matchClose, splitArgs } from './compiler-extras.js'
import * as i18n from '../../../../shared/i18n.js'

const SPEC = /\b(?:virtual|override|final|explicit|inline|constexpr|mutable|noexcept)\b/g

function skipStr(s, i) {
  const q = s[i]
  let j = i + 1
  while (j < s.length && s[j] !== q) j += s[j] === '\\' ? 2 : 1
  return j
}

// aplica fn ao texto fora de strings
function outsideStrings(s, fn) {
  let out = ''
  let last = 0
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '"' || s[i] === "'") {
      out += fn(s.slice(last, i))
      const j = skipStr(s, i)
      out += s.slice(i, j + 1)
      last = j + 1
      i = j
    }
  }
  return out + fn(s.slice(last))
}

// primeiro índice (profundidade 0, fora de strings) de um dos caracteres em `chars`
function findTop(s, from, chars) {
  let depth = 0
  for (let i = from; i < s.length; i++) {
    const c = s[i]
    if (c === '"' || c === "'") {
      i = skipStr(s, i)
      continue
    }
    if (depth === 0 && chars.includes(c)) return i
    if (c === '(' || c === '[') depth++
    else if (c === ')' || c === ']') depth--
  }
  return -1
}

// substitui cada ocorrência de re (que acaba num '{') e o bloco { … } que se lhe segue
function replaceWithBlock(s, re, fn) {
  let m
  re.lastIndex = 0
  while ((m = re.exec(s))) {
    const open = m.index + m[0].length - 1
    const close = matchClose(s, open)
    if (close < 0) break
    const rep = fn(m, s.slice(open, close + 1))
    s = s.slice(0, m.index) + rep + s.slice(close + 1)
    re.lastIndex = m.index + rep.length
  }
  return s
}

const err = (msg) => {
  throw new Error(msg)
}

// ---------------- enum ----------------
function enumConsts(body, owner) {
  let prev = null
  let n = 0
  const out = []
  const names = []
  for (const it of splitArgs(body)) {
    const t = it.trim()
    if (!t) continue
    const m = t.match(/^([A-Za-z_]\w*)\s*(?:=\s*([\s\S]+))?$/)
    if (!m) err(i18n.m(`enum: não percebi "${t}"`, `enum: could not understand "${t}"`))
    let v
    if (m[2] != null) v = `(${m[2].trim()})`
    else v = prev == null ? '0' : `(${prev}) + 1`
    out.push(`const ${m[1]} = ${v};`)
    names.push(m[1])
    prev = m[1]
    n++
  }
  if (owner) out.push(`const ${owner} = { ${names.join(', ')} };`)
  return { text: out.join(' '), names }
}

function enums(s, aliases) {
  const re = /\benum\s+(class\s+|struct\s+)?([A-Za-z_]\w*)?\s*(?::\s*[\w\s]+?)?\s*\{/g
  let m
  while ((m = re.exec(s))) {
    const open = m.index + m[0].length - 1
    const close = matchClose(s, open)
    if (close < 0) break
    let end = close + 1
    // declaradores depois do fecho: enum Estado { A, B } estado = A;
    const semi = findTop(s, end, ';')
    const decl = semi >= 0 ? s.slice(end, semi).trim() : ''
    const name = m[2]
    const { text } = enumConsts(s.slice(open + 1, close), name)
    if (name) aliases[name] = 'int'
    const tail = decl ? ` int ${decl};` : ''
    s = s.slice(0, m.index) + text + tail + s.slice(semi >= 0 ? semi + 1 : end)
    re.lastIndex = m.index + 1
  }
  return s
}

// ---------------- typedef ----------------
function typedefs(s, aliases) {
  // typedef struct [Tag] { … } Nome;  → struct Nome { … };
  s = s.replace(/\btypedef\s+(struct|class)\s*([A-Za-z_]\w*)?\s*\{/g, (all, kw, tag) => `${kw} __TYPEDEF_${tag || ''}__ {`)
  let m
  const re = /\b(struct|class)\s+__TYPEDEF_(\w*)__\s*\{/g
  while ((m = re.exec(s))) {
    const open = m.index + m[0].length - 1
    const close = matchClose(s, open)
    const semi = findTop(s, close + 1, ';')
    const names = s.slice(close + 1, semi).split(',').map((x) => x.trim()).filter(Boolean)
    const name = names.find((n) => /^\w+$/.test(n)) || m[2]
    if (m[2] && m[2] !== name) aliases[m[2]] = name
    s = s.slice(0, m.index) + `${m[1]} ${name} ${s.slice(open, close + 1)};` + s.slice(semi + 1)
  }
  // typedef void (*Callback)(int);  → ponteiro para função: qualquer valor
  s = s.replace(/\btypedef\s+[^;()]*\(\s*\*\s*(\w+)\s*\)\s*\([^)]*\)\s*;/g, (_, n) => ((aliases[n] = 'auto'), ''))
  // typedef unsigned long tempo_t;
  s = s.replace(/\btypedef\s+([^;{}]+?)\s+(\w+)\s*;/g, (_, t, n) => ((aliases[n] = t.trim()), ''))
  return s
}

// ---------------- leitura de uma classe ----------------
// devolve { fields: [{type, decl, isStatic, name, dims, init}], methods: [...], ctors: [...], pre }
function parseFieldDecl(text) {
  // tipo (pode ter várias palavras e <…>) e declaradores separados por vírgulas
  const t = text.replace(SPEC, ' ').trim()
  const isStatic = /^\s*static\b/.test(t)
  const isConst = /\bconst\b/.test(t)
  const rest = t.replace(/^\s*(?:static\s+|const\s+|volatile\s+)+/, '')
  const m = rest.match(/^((?:unsigned\s+|signed\s+|long\s+|short\s+)*[A-Za-z_][\w:]*(?:\s*<[^;]*?>)?)\s*([\s\S]*)$/)
  if (!m) err(i18n.m(`membro da classe não reconhecido: "${t}"`, `unrecognized class member: "${t}"`))
  let type = m[1].replace(/\s+/g, ' ')
  let rest2 = m[2]
  // "unsigned long a, b": a última palavra apanhada como tipo era afinal o nome
  if (/^\s*([,=[({]|$)/.test(rest2) && /\s/.test(type)) {
    const k = type.lastIndexOf(' ')
    rest2 = type.slice(k + 1) + rest2
    type = type.slice(0, k)
  }
  const decls = splitArgs(rest2).map((d) => d.trim()).filter(Boolean)
  return decls.map((d) => {
    const dm = d.match(/^([*&\s]*)([A-Za-z_]\w*)\s*((?:\[[^\]]*\]\s*)*)([\s\S]*)$/)
    if (!dm) err(i18n.m(`membro da classe não reconhecido: "${d}"`, `unrecognized class member: "${d}"`))
    let init = dm[4].trim()
    // int x{5};  Led l{3};  → = 5 / (3)
    if (init.startsWith('{') && !dm[3]) init = `(${init.slice(1, -1)})`
    return { type, ptr: dm[1].includes('*'), ref: dm[1].includes('&'), name: dm[2], dims: dm[3].trim(), init, isStatic, isConst }
  })
}

function parseParams(params) {
  return splitArgs(params)
    .map((p) => p.trim())
    .filter((p) => p && p !== 'void')
    .map((p) => {
      const eq = findTop(p, 0, '=')
      const decl = eq >= 0 ? p.slice(0, eq).trim() : p
      const dflt = eq >= 0 ? p.slice(eq + 1).trim() : null
      const name = (decl.replace(/\[[^\]]*\]/g, ' ').match(/(\w+)\s*$/) || [, ''])[1]
      return { decl, dflt, name }
    })
}
const paramsText = (ps, defaults = []) => ps.map((p, i) => (p.dflt ?? defaults[i]) != null ? `${p.decl} = ${p.dflt ?? defaults[i]}` : p.decl).join(', ')

// cabeçalho de função: … nome(params) qualificadores [: init] {  ou  ;
function parseFunctionAt(text, parenIdx) {
  const before = text.slice(0, parenIdx).trimEnd()
  const nm = before.match(/(~?\s*[A-Za-z_]\w*|operator\s*\S+)$/)
  if (!nm) err(i18n.m(`declaração não reconhecida: "${text.slice(0, 60)}"`, `unrecognized declaration: "${text.slice(0, 60)}"`))
  const name = nm[1].replace(/\s+/g, '')
  const prefix = before.slice(0, before.length - nm[1].length)
  const close = matchClose(text, parenIdx)
  if (close < 0) err(i18n.m('parêntese por fechar', 'unclosed parenthesis'))
  return { name, prefix, params: text.slice(parenIdx + 1, close), after: close + 1 }
}

function parseClassBody(cls, body, pre) {
  const fields = []
  const methods = []
  let i = 0
  while (i < body.length) {
    while (i < body.length && /\s/.test(body[i])) i++
    if (i >= body.length) break
    const rest = body.slice(i)
    let m
    if ((m = rest.match(/^(public|private|protected)\s*:(?!:)/))) {
      i += m[0].length
      continue
    }
    if (/^;/.test(rest)) {
      i++
      continue
    }
    if (/^template\b/.test(rest)) err(i18n.m(`templates dentro da classe ${cls.name} não são suportados pelo simulador`, `templates inside class ${cls.name} are not supported by the simulator`))
    if (/^(friend|using)\b/.test(rest)) {
      const e = findTop(body, i, ';{')
      i = body[e] === '{' ? matchClose(body, e) + 1 : e + 1
      continue
    }
    if (/^enum\b/.test(rest)) {
      const open = body.indexOf('{', i)
      const close = matchClose(body, open)
      const semi = findTop(body, close + 1, ';')
      const head = body.slice(i, open).match(/\benum\s+(?:class\s+|struct\s+)?(\w+)?/)
      const { text, names } = enumConsts(body.slice(open + 1, close), head?.[1])
      pre.push(text)
      if (head?.[1]) cls.aliases[head[1]] = 'int'
      cls.enumNames.push(...names)
      i = semi + 1
      continue
    }
    if (/^(struct|class)\s+\w+\s*[:{]/.test(rest)) err(i18n.m(`classes dentro da classe ${cls.name} não são suportadas pelo simulador: declare-a fora`, `classes inside class ${cls.name} are not supported by the simulator: declare it outside`))
    const stop = findTop(body, i, '(;{=')
    if (stop < 0) err(i18n.m(`fim inesperado na classe ${cls.name}`, `unexpected end in class ${cls.name}`))
    if (body[stop] === '(') {
      // função (método, construtor, destrutor) — com corpo ou só declarada
      const f = parseFunctionAt(body.slice(i), stop - i)
      let k = i + f.after
      const q = body.slice(k).match(/^\s*((?:const|override|final|noexcept|volatile|&|\s)*)/)
      k += q[0].length
      let init = null
      let bodyText = null
      let pure = false
      if (body[k] === ':') {
        const open = findTop(body, k + 1, '{;')
        // lista de inicialização: nome(expr) / nome{expr}, …
        init = []
        let j = k + 1
        while (j < body.length) {
          while (/\s|,/.test(body[j])) j++
          const im = body.slice(j).match(/^([A-Za-z_][\w:]*)\s*([({])/)
          if (!im) break
          const o = j + im[0].length - 1
          const c = matchClose(body, o)
          init.push({ name: im[1], args: body.slice(o + 1, c) })
          j = c + 1
          while (/\s/.test(body[j])) j++
          if (body[j] !== ',') break
        }
        k = j
        if (body[k] !== '{') k = open
      }
      if (body[k] === '{') {
        const c = matchClose(body, k)
        bodyText = body.slice(k + 1, c)
        i = c + 1
      } else {
        const semi = findTop(body, k, ';')
        pure = /=\s*0\s*$/.test(body.slice(k, semi))
        i = semi + 1
      }
      if (f.name.startsWith('operator')) err(i18n.m(`a classe ${cls.name} sobrecarrega operadores (${f.name}): o simulador ainda não suporta isso — use um método com nome`, `class ${cls.name} overloads operators (${f.name}): the simulator does not support that yet — use a named method`))
      if (f.name.startsWith('~')) continue // destrutor: não há memória a libertar
      const isStatic = /\bstatic\b/.test(f.prefix)
      const ps = parseParams(f.params)
      if (f.name === cls.name) cls.ctors.push({ params: ps, init: init || [], body: bodyText, declared: bodyText == null })
      else methods.push({ name: f.name, params: ps, body: bodyText, isStatic, pure, ret: f.prefix.replace(SPEC, ' ').replace(/\bstatic\b/, '').trim() })
      continue
    }
    // campo: até ao ';' (pode ter { } de inicialização)
    let e = i
    for (;;) {
      e = findTop(body, e, ';{')
      if (e < 0) err(i18n.m(`campo por terminar na classe ${cls.name}`, `unterminated field in class ${cls.name}`))
      if (body[e] === '{') e = matchClose(body, e) + 1
      else break
    }
    fields.push(...parseFieldDecl(body.slice(i, e)))
    i = e + 1
  }
  cls.fields = fields
  cls.methods = methods
}

// ---------------- conversão principal ----------------
export function classTransforms(src, { TYPES, libClasses = [] }) {
  if (!/\b(class|struct|enum|typedef)\b/.test(src) && !src.includes('->')) return { s: src, classes: [] }
  let s = src
  const aliases = {}
  s = typedefs(s, aliases)
  s = enums(s, aliases)

  // ---- classes declaradas ----
  const classes = []
  const byName = {}
  const reCls = /(^|[;}\s])(class|struct)\s+([A-Za-z_]\w*)\s*(?:final\s*)?(?::\s*([^{;]+))?\{/g
  let m
  while ((m = reCls.exec(s))) {
    const start = m.index + m[1].length
    const open = m.index + m[0].length - 1
    const close = matchClose(s, open)
    if (close < 0) err(i18n.m(`a classe ${m[3]} não tem a chaveta de fecho`, `class ${m[3]} is missing its closing brace`))
    const semi = findTop(s, close + 1, ';')
    const tailDecl = s.slice(close + 1, semi).trim()
    const baseText = (m[4] || '').trim()
    if (baseText.includes(',')) err(i18n.m(`a classe ${m[3]} tem herança múltipla: o simulador só suporta uma classe base`, `class ${m[3]} uses multiple inheritance: the simulator only supports one base class`))
    const base = baseText.replace(/\b(public|private|protected|virtual)\b/g, '').trim() || null
    const cls = { name: m[3], kind: m[2], base, ctors: [], aliases: {}, enumNames: [], idx: classes.length, external: [] }
    const pre = []
    parseClassBody(cls, s.slice(open + 1, close), pre)
    classes.push(cls)
    byName[cls.name] = cls
    const marker = `${pre.join('\n')}\n__CLASS_${cls.idx}__;\n__CLASSBODY_${cls.idx}__\n${tailDecl ? `${cls.name} ${tailDecl};` : ''}`
    s = s.slice(0, start) + marker + s.slice(semi + 1)
    reCls.lastIndex = start + marker.length
  }
  // declarações antecipadas: class Led;
  s = s.replace(/(^|[;}\n])\s*(?:class|struct)\s+[A-Za-z_]\w*\s*;/g, '$1')
  for (const c of classes) Object.assign(aliases, c.aliases)

  const U = classes.map((c) => c.name)
  const Ure = U.length ? U.join('|') : '(?!x)x'

  // ---- métodos / construtores definidos fora: Tipo Classe::nome(…) { … } ----
  if (U.length) {
    const reOut = new RegExp(`\\b(${Ure})::(~?[A-Za-z_]\\w*)\\s*\\(`, 'g')
    while ((m = reOut.exec(s))) {
      const cls = byName[m[1]]
      // início da instrução (tipo de retorno)
      let st = m.index
      while (st > 0 && !/[;}\n]/.test(s[st - 1])) st--
      const header = s.slice(st, m.index)
      if (/[=(]/.test(header) || /\breturn\b/.test(header)) continue // é uma chamada: x = Led::f(…)
      const paren = m.index + m[0].length - 1
      const close = matchClose(s, paren)
      let k = close + 1
      const q = s.slice(k).match(/^\s*((?:const|override|final|noexcept|volatile|&|\s)*)/)
      k += q[0].length
      let init = []
      if (s[k] === ':') {
        let j = k + 1
        while (j < s.length) {
          while (/\s|,/.test(s[j])) j++
          const im = s.slice(j).match(/^([A-Za-z_][\w:]*)\s*([({])/)
          if (!im) break
          const o = j + im[0].length - 1
          const c = matchClose(s, o)
          init.push({ name: im[1], args: s.slice(o + 1, c) })
          j = c + 1
          while (/\s/.test(s[j])) j++
          if (s[j] !== ',') break
        }
        k = j
      }
      if (s[k] !== '{') continue
      const bc = matchClose(s, k)
      const name = m[2]
      const ps = parseParams(s.slice(paren + 1, close))
      const body = s.slice(k + 1, bc)
      if (!name.startsWith('~')) {
        if (name === cls.name) {
          const decl = cls.ctors.find((c) => c.declared && c.params.length === ps.length && !c.used)
          if (decl) decl.used = true
          cls.ctors.push({ params: ps, init, body, defaults: decl?.params.map((p) => p.dflt) })
        } else {
          const decl = cls.methods.find((x) => x.name === name && x.body == null && x.params.length === ps.length && !x.used)
          if (decl) decl.used = true
          if (!decl) err(i18n.m(`${cls.name}::${name} está definido mas não foi declarado na classe ${cls.name}`, `${cls.name}::${name} is defined but was not declared in class ${cls.name}`))
          cls.external.push({ name, params: ps, body, isStatic: decl.isStatic, defaults: decl.params.map((p) => p.dflt) })
        }
      }
      s = s.slice(0, st) + `\n__OUTDEF_${cls.idx}__\n` + s.slice(bc + 1)
      reOut.lastIndex = st
    }
    // membros static definidos fora: int Led::contador = 0;  →  Led.contador = 0;
    s = s.replace(new RegExp(`(^|[;}\\n])\\s*(?:static\\s+|const\\s+|volatile\\s+)*[A-Za-z_][\\w \\t<>]*?[ \\t*&]+(${Ure})::(\\w+)\\s*(=|;)`, 'g'), (all, b, c, n, op) => (op === ';' ? b : `${b}\n${c}.${n} =`))
  }

  // ---- funções livres de cada classe ----
  const allFields = (c) => (c ? [...(byName[c.base] ? allFields(byName[c.base]) : []), ...c.fields] : [])
  const allMethods = (c) => (c ? [...(byName[c.base] ? allMethods(byName[c.base]) : []), ...c.methods, ...c.external] : [])
  const typeRe = new RegExp(`(?:\\b(?:${TYPES.slice(3, -1)}|${Ure}|${libClasses.join('|') || '(?!x)x'}|auto|String)\\b)(?:\\s*<[^>]*>)?\\s*[*&]*\\s+([A-Za-z_]\\w*)`, 'g')
  const isClassType = (t) => byName[t] || libClasses.includes(t)

  function memberize(body, cls, exclude) {
    const inst = new Set()
    const stat = new Map()
    let c = cls
    while (c) {
      for (const f of c.fields) (f.isStatic ? stat.set(f.name, c.name) : inst.add(f.name))
      for (const x of [...c.methods, ...c.external]) (x.isStatic ? stat.set(x.name, c.name) : inst.add(x.name))
      c = byName[c.base]
    }
    const locals = new Set(exclude)
    for (const mm of body.matchAll(typeRe)) locals.add(mm[1])
    const names = [...inst, ...stat.keys()].filter((n) => !locals.has(n))
    let out = body
    // Base::metodo(…)  → chamada explícita da versão da classe base
    out = out.replace(new RegExp(`\\b(${Ure})::(\\w+)\\s*\\(`, 'g'), (all, b, n) => (byName[b] && allMethods(byName[b]).some((x) => x.name === n && !x.isStatic) ? `${b}__${n}(__this, ` : all))
    out = out.replace(/,\s*\)/g, (x, off, str) => (str.slice(Math.max(0, off - 9), off).endsWith('__this') ? ')' : x))
    out = outsideStrings(out, (t) => {
      t = t.replace(/\bthis\s*->\s*/g, '__this.').replace(/\(\s*\*\s*this\s*\)\s*\./g, '__this.').replace(/\*\s*this\b/g, '__this').replace(/\bthis\b/g, '__this')
      // Classe::campo dentro de um método (MiniKame::pinBuzzer) = o campo do próprio objeto
      t = t.replace(new RegExp(`\\b(?:${Ure})\\s*::\\s*(\\w+)\\b(?!\\s*\\()`, 'g'), (all, n) => (inst.has(n) && !stat.has(n) ? `__this.${n}` : all))
      if (names.length) t = t.replace(new RegExp(`(?<![\\w$.]|->)(${names.join('|')})(?![\\w$])(?!\\s*::)`, 'g'), (n) => (stat.has(n) ? `${stat.get(n)}.${n}` : `__this.${n}`))
      return t
    })
    return out
  }

  // cópia dos parâmetros de estrutura passados por valor
  const cloneParams = (ps) => ps.filter((p) => new RegExp(`^(?:const\\s+)?(${Ure})\\s+\\w+$`).test(p.decl.trim())).map((p) => `${p.name} = __clone(${p.name});`).join(' ')

  function fieldInit(cls, f) {
    // declaração local com o tipo C++ (para passar por todo o tradutor) e cópia para o objeto
    const v = `__f_${f.name}`
    if (f.ptr) return `${f.init ? `__this.${f.name} ${f.init.replace(/^=\s*&?/, '= ')};` : `__this.${f.name} = null;`}`
    let init = f.init
    if (init.startsWith('=')) init = ' ' + init
    return `${f.isConst ? 'const ' : ''}${f.type} ${v}${f.dims}${init}; __this.${f.name} = ${v};`
  }

  function emitClass(cls) {
    const out = []
    const n = cls.name
    const inst = cls.fields.filter((f) => !f.isStatic)
    const base = byName[cls.base]
    // membros static (depois de a classe JS existir)
    for (const f of cls.fields.filter((x) => x.isStatic)) {
      const v = `__s_${n}_${f.name}`
      out.push(`${f.isConst ? 'const ' : ''}${f.type} ${v}${f.dims}${f.init && !f.init.startsWith('=') ? f.init : f.init ? ' ' + f.init : ''}; ${n}.${f.name} = ${v};`)
    }
    for (const e of cls.enumNames) out.push(`${n}.${e} = ${e};`)
    // construtores
    const ctors = cls.ctors.filter((c) => c.body != null)
    const defaults = memberize(inst.map((f) => fieldInit(cls, f)).join(' '), cls, [])
    const baseInit = (init, ps) => {
      const bi = init.find((x) => x.name === cls.base)
      if (base) return `${cls.base}__new(__this${bi && bi.args.trim() ? `, ${memberize(bi.args, cls, ps.map((p) => p.name))}` : ''});`
      return ''
    }
    if (!ctors.length) {
      // construtor implícito / inicialização agregada: Ponto p = {1, 2};
      const ps = inst.map((f, i) => `__Any __a${i} = undefined`)
      const sets = inst.map((f, i) => `if (__a${i} !== undefined) __this.${f.name} = __agg(${byName[f.type] ? f.type : 'null'}, __a${i});`).join(' ')
      out.push(`void ${n}__new(__Obj __this${ps.length ? ', ' + ps.join(', ') : ''}) { ${baseInit([], [])} ${defaults} ${sets} }`)
    }
    for (const c of ctors) {
      const pnames = c.params.map((p) => p.name)
      const inits = c.init
        .filter((x) => x.name !== cls.base)
        .map((x) => {
          const f = allFields(cls).find((y) => y.name === x.name)
          if (!f) err(i18n.m(`${n}: "${x.name}" na lista de inicialização não é membro da classe`, `${n}: "${x.name}" in the initializer list is not a member of the class`))
          const a = memberize(x.args, cls, pnames)
          return isClassType(f.type) && !f.ptr ? `__this.${f.name} = new ${f.type}(${a});` : `__this.${f.name} = ${f.dims ? `[${a}]` : `(${a})`};`
        })
        .join(' ')
      out.push(`void ${n}__new(__Obj __this${c.params.length ? ', ' + paramsText(c.params, c.defaults) : ''}) { ${cloneParams(c.params)} ${baseInit(c.init, c.params)} ${defaults} ${inits} ${memberize(c.body, cls, pnames)} }`)
    }
    // métodos
    for (const x of [...cls.methods.filter((y) => y.body != null), ...cls.external]) {
      const pnames = x.params.map((p) => p.name)
      const self = x.isStatic ? '' : '__Obj __this'
      const ps = paramsText(x.params, x.defaults)
      out.push(`void ${n}__${x.name}(${[self, ps].filter(Boolean).join(', ')}) { ${cloneParams(x.params)} ${memberize(x.body, cls, pnames)} }`)
    }
    return out.join('\n')
  }

  for (const c of classes) {
    s = s.replace(`__CLASSBODY_${c.idx}__`, emitClass(c))
    s = s.split(`__OUTDEF_${c.idx}__`).join('')
  }

  // ---- uso dos tipos das classes ----
  s = outsideStrings(s, (t) => t.replace(/\s*->\s*/g, '.'))
  if (U.length) {
    // struct Ponto p;  (estilo C)
    s = s.replace(new RegExp(`\\b(?:struct|class)\\s+(${Ure})\\b(?!\\s*\\{)`, 'g'), '$1')
    // funções que devolvem um objeto: Ponto meio(Ponto a, Ponto b) {  → void meio(…) {
    s = s.replace(new RegExp(`(^|[;}\\n])(\\s*)(?:static\\s+|inline\\s+|const\\s+)*(${Ure})\\s*[*&]?\\s+([A-Za-z_]\\w*)\\s*\\(`, 'g'), (all, b, sp, T, name, off, str) => {
      const open = off + all.length - 1
      const close = matchClose(str, open)
      const after = str.slice(close + 1).match(/^\s*(const\s*)?([{;])/)
      if (!after) return all
      const inner = str.slice(open + 1, close)
      if (after[2] === '{') return `${b}${sp}void ${name}(`
      // protótipo (parâmetros com tipo) ou declaração de objeto Led l(13);
      const isProto = !inner.trim() || splitArgs(inner).every((a) => /^\s*(const\s+)?[A-Za-z_][\w:<>]*[\s*&]+[A-Za-z_]\w*(\s*=.*)?\s*$/.test(a))
      return isProto ? `${b}${sp}void ${name}(` : all
    })
    // Ponto *p = &q;  Ponto *p;  Ponto &r = q;  → objetos JS (são sempre referências)
    s = s.replace(new RegExp(`\\b(const\\s+)?(${Ure})\\s*[*&]\\s*([A-Za-z_]\\w*)\\s*=\\s*&?`, 'g'), 'let $3 = ')
    s = s.replace(new RegExp(`\\b(const\\s+)?(${Ure})\\s*\\*\\s*([A-Za-z_]\\w*)\\s*;`, 'g'), 'let $3 = null;')
    s = s.replace(new RegExp(`\\b(const\\s+)?(${Ure})\\s*\\*\\s*([A-Za-z_]\\w*)\\s*([,)])`, 'g'), '$2 $3$4')
    // new Ponto[n] / delete
    s = s.replace(new RegExp(`\\bnew\\s+(${Ure})\\s*\\[([^\\]]+)\\]`, 'g'), 'Array.from({ length: $2 }, () => new $1())')
    s = s.replace(/(^|[;{}\n])\s*delete\s*(\[\s*\])?\s*[^;]+;/g, '$1')
    // vetor de objetos com inicializador: Ponto v[2] = {{1, 2}, {3, 4}};
    const braces = (t) => t.replace(/\{/g, '[').replace(/\}/g, ']')
    s = replaceWithBlock(s, new RegExp(`\\b(const\\s+)?(${Ure})\\s+([A-Za-z_]\\w*)\\s*\\[([^\\]]*)\\]\\s*=\\s*\\{`, 'g'), (mm, block) => `let ${mm[3]} = __aggArr(${mm[2]}, ${mm[4].trim() || 0}, ${braces(block)})`)
    // Ponto p = {1, 2};  Led l{3};  → construtor
    s = replaceWithBlock(s, new RegExp(`\\b(${Ure})\\s+([A-Za-z_]\\w*)\\s*(=\\s*)?\\{`, 'g'), (mm, block) => `${mm[1]} ${mm[2]}(${braces(block.slice(1, -1))})`)
    // Ponto{1, 2} temporário → Ponto(1, 2)
    s = replaceWithBlock(s, new RegExp(`(?<![\\w$.])(${Ure})\\s*\\{`, 'g'), (mm, block) => `${mm[1]}(${braces(block.slice(1, -1))})`)
    // objetos temporários: Ponto(1, 2) / Ponto{1, 2}  → new Ponto(…)
    s = s.replace(new RegExp(`(?<![\\w$.])(?<!new\\s+)(${Ure})\\s*\\(`, 'g'), (all, T, off, str) => {
      const before = str.slice(Math.max(0, off - 12), off)
      if (/\b(class|struct|function\*?)\s*$/.test(before)) return all
      return `new ${T}(`
    })
    // cópia por valor: Ponto b = a;
    s = s.replace(new RegExp(`\\b(const\\s+)?(${Ure})\\s+([A-Za-z_]\\w*)\\s*=(?!=)\\s*(?!new\\b|__aggArr|__clone)`, 'g'), '$2 $3 = __clone')
    s = s.replace(/__clone([^;]*);/g, (all, e) => (e.trim().startsWith('(') && matchClose(e.trim(), 0) === e.trim().length - 1 ? `__clone${e.trim()};` : `__clone(${e.trim()});`))
    // parâmetros de estrutura por valor em funções normais
    s = s.replace(new RegExp(`\\b(${TYPES.slice(3, -1)})\\s*[*&]?\\s+([A-Za-z_]\\w*)\\s*\\(([^()]*)\\)\\s*(const\\s*)?\\{`, 'g'), (all, t, name, params) => {
      if (name.includes('__')) return all
      const cp = cloneParams(parseParams(params))
      return cp ? `${all} ${cp}` : all
    })
  }
  // aliases de tipos (typedef / enum): só onde são usados como tipo
  for (const [a, t] of Object.entries(aliases)) {
    if (byName[a]) continue
    s = s.replace(new RegExp(`(?<![\\w$.])${a}(?=\\s*[*&]?\\s+[A-Za-z_]|\\s*\\))`, 'g'), t)
  }
  return { s, classes }
}

// esqueleto JS das classes (inserido no fim, depois de o resto do tradutor correr)
export function classSkeletons(s, classes, libClasses = []) {
  if (!classes.length) return s
  const byName = Object.fromEntries(classes.map((c) => [c.name, c]))
  const methodNames = new Set()
  for (const c of classes) for (const x of [...c.methods, ...c.external]) methodNames.add(x.name)
  // obj.metodo(…) → (yield* __cv(obj.metodo(…)))
  if (methodNames.size) s = wrapMethodCalls(s, [...methodNames])
  const prelude = `
const __NOINIT = Symbol('noinit');
function __sync(g) { let r = g.next(); while (!r.done) r = g.next(); return r.value }
function* __cv(v) { if (v && typeof v.next === 'function' && typeof v[Symbol.iterator] === 'function' && !Array.isArray(v)) return yield* v; return v }
function __agg(C, v) { return C && Array.isArray(v) ? new C(...v) : v }
function __aggArr(C, n, list) { return Array.from({ length: Math.max(n, list.length) }, (_, i) => (i < list.length ? __agg(C, list[i]) : new C())) }
function __clone(v) {
  if (Array.isArray(v)) return v.map(__clone)
  if (v && typeof v === 'object' && v.constructor && v.constructor.__user) { const o = Object.create(Object.getPrototypeOf(v)); for (const k of Object.keys(v)) o[k] = __clone(v[k]); return o }
  return v
}
`
  classes.forEach((c, i) => {
    const base = c.base ? (byName[c.base] ? c.base : libClasses.includes(c.base) ? c.base : null) : null
    if (c.base && !base) throw new Error(i18n.m(`a classe ${c.name} herda de ${c.base}, que não existe no sketch nem nas bibliotecas do simulador`, `class ${c.name} inherits from ${c.base}, which does not exist in the sketch or in the simulator's libraries`))
    const userBase = base && byName[base]
    const ctor = base
      ? userBase
        ? `constructor(...a) { super(__NOINIT); if (a[0] === __NOINIT) return; __sync(${c.name}__new(this, ...a)) }`
        : `constructor(...a) { super(...a); __sync(${c.name}__new(this)) }`
      : `constructor(...a) { if (a[0] === __NOINIT) return; __sync(${c.name}__new(this, ...a)) }`
    const ms = [...c.methods.filter((x) => x.body != null), ...c.external]
      .filter((x, k, arr) => arr.findIndex((y) => y.name === x.name) === k)
      .map((x) => (x.isStatic ? `static *${x.name}(...a) { return yield* ${c.name}__${x.name}(...a) }` : `*${x.name}(...a) { return yield* ${c.name}__${x.name}(this, ...a) }`))
    const js = `${i === 0 ? prelude : ''}class ${c.name}${base ? ` extends ${base}` : ''} {\n  static __user = true\n  ${ctor}\n  ${ms.join('\n  ')}\n}`
    s = s.replace(`__CLASS_${i}__;`, js)
  })
  return s
}

// recua sobre o "recetor" de uma chamada (a.b[i].c, f(x).g, (yield* x)…)
function receiverStart(s, dot) {
  const st = receiverStart0(s, dot)
  // new Classe(…).metodo() — o "new" faz parte do recetor
  const m = s.slice(Math.max(0, st - 8), st).match(/(?<![\w$])new\s+$/)
  return m ? st - m[0].length : st
}
function receiverStart0(s, dot) {
  let i = dot
  for (;;) {
    let j = i - 1
    while (j >= 0 && /\s/.test(s[j])) j--
    if (j < 0) return i
    if (s[j] === ')' || s[j] === ']') {
      const o = s[j] === ')' ? '(' : '['
      let depth = 0
      let k = j
      for (; k >= 0; k--) {
        if (s[k] === s[j]) depth++
        else if (s[k] === o && --depth === 0) break
      }
      j = k - 1
      // nome antes de ( ou [
      while (j >= 0 && /[\w$]/.test(s[j])) j--
    } else if (/[\w$]/.test(s[j])) {
      while (j >= 0 && /[\w$]/.test(s[j])) j--
    } else return i
    i = j + 1
    let k = j
    while (k >= 0 && /\s/.test(s[k])) k--
    if (s[k] === '.') i = k
    else return i
  }
}

function wrapMethodCalls(s, names) {
  const re = new RegExp(`\\.\\s*(${names.join('|')})\\s*\\(`, 'g')
  let m
  const hits = []
  while ((m = re.exec(s))) hits.push({ dot: m.index, open: m.index + m[0].length - 1 })
  for (const h of hits.reverse()) {
    const close = matchClose(s, h.open)
    if (close < 0) continue
    const st = receiverStart(s, h.dot)
    if (st === h.dot) continue
    s = s.slice(0, st) + `(yield* __cv(${s.slice(st, close + 1)}))` + s.slice(close + 1)
  }
  return s
}
