// Pré-processador do C/C++ (antes do tradutor): #include das bibliotecas do utilizador (o .h e
// o .cpp com o mesmo nome entram no sítio do #include, uma só vez), #if / #ifdef / #ifndef /
// #elif / #else / #endif, #define (macros simples e com parâmetros, com # e ##), #undef,
// #error e #pragma once. As macros são expandidas no texto (como no compilador verdadeiro).
// Os #include de cabeçalhos que não são do utilizador ficam (as bibliotecas simuladas tratam deles).

import * as i18n from '../../../../shared/i18n.js'
function skipStr(s, i) {
  const q = s[i]
  let j = i + 1
  while (j < s.length && s[j] !== q && s[j] !== '\n') j += s[j] === '\\' ? 2 : 1
  return j
}

// comentários fora (para o texto das bibliotecas: o do sketch já vem sem eles)
export function stripCComments(src) {
  let out = ''
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (c === '"' || c === "'") {
      const j = skipStr(src, i)
      out += src.slice(i, j + 1)
      i = j
    } else if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++
      out += '\n'
    } else if (c === '/' && src[i + 1] === '*') {
      const j = src.indexOf('*/', i + 2)
      const e = j < 0 ? src.length : j + 2
      out += src.slice(i, e).replace(/[^\n]/g, '')
      i = e - 1
    } else out += c
  }
  return out
}

// defines da placa (como o arduino-cli: ARDUINO, arquitetura, modelo)
export function boardDefines(prof) {
  const d = ['ARDUINO=10819', ...(prof?.defines || [])]
  if (!d.some((x) => /ARDUINO_ARCH_/.test(x))) {
    d.push('ARDUINO_ARCH_AVR', '__AVR__')
    const mcu = prof?.mcu || 'ATmega328P'
    d.push(`__AVR_${mcu.replace(/^ATmega/i, 'ATmega')}__`)
    if (prof?.id === 'nano') d.push('ARDUINO_AVR_NANO') // (as variantes do Nano usam o perfil do Uno, como o próprio Nano)
    else if (!d.some((x) => /ARDUINO_AVR_/.test(x))) d.push('ARDUINO_AVR_UNO')
    d.push('F_CPU=16000000L')
  }
  if (d.includes('ESP32')) d.push('F_CPU=240000000L', 'ARDUINO_ESP32_DEV')
  return d
}

function matchParen(s, open) {
  let depth = 0
  for (let i = open; i < s.length; i++) {
    const c = s[i]
    if (c === '"' || c === "'") {
      i = skipStr(s, i)
      continue
    }
    if (c === '(') depth++
    else if (c === ')' && --depth === 0) return i
  }
  return -1
}
function splitTop(inner) {
  const out = []
  let depth = 0
  let cur = ''
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i]
    if (c === '"' || c === "'") {
      const j = skipStr(inner, i)
      cur += inner.slice(i, j + 1)
      i = j
      continue
    }
    if ('([{'.includes(c)) depth++
    else if (')]}'.includes(c)) depth--
    if (c === ',' && depth === 0) {
      out.push(cur.trim())
      cur = ''
    } else cur += c
  }
  out.push(cur.trim())
  return out
}

// expande as macros no texto (fora de strings); `off` = nomes em expansão (evita recursão)
export function expandMacros(text, defs, off = new Set(), depth = 0) {
  if (!defs.size || depth > 30) return text
  let out = ''
  let i = 0
  while (i < text.length) {
    const c = text[i]
    if (c === '"' || c === "'") {
      const j = skipStr(text, i)
      out += text.slice(i, j + 1)
      i = j + 1
      continue
    }
    if (/[A-Za-z_]/.test(c) && !/[\w$]/.test(text[i - 1] || '')) {
      let j = i
      while (j < text.length && /[\w$]/.test(text[j])) j++
      const name = text.slice(i, j)
      const d = defs.get(name)
      if (d && !off.has(name)) {
        if (!d.params) {
          out += expandMacros(d.body, defs, new Set([...off, name]), depth + 1)
          i = j
          continue
        }
        let k = j
        while (/\s/.test(text[k] || '')) k++
        if (text[k] === '(') {
          const close = matchParen(text, k)
          if (close > 0) {
            const raw = d.params.length || d.variadic ? splitTop(text.slice(k + 1, close)) : []
            const args = raw.map((a) => expandMacros(a, defs, off, depth + 1))
            let body = d.body
            const map = {}
            d.params.forEach((p, n) => (map[p] = n))
            const va = d.variadic ? raw.slice(d.params.length).join(', ') : ''
            // # (texto) e ## (colar)
            body = body.replace(/#\s*([A-Za-z_]\w*)/g, (all, p) => (p in map ? JSON.stringify(raw[map[p]] ?? '') : p === '__VA_ARGS__' ? JSON.stringify(va) : all))
            body = body.replace(/([A-Za-z_]\w*)?\s*##\s*([A-Za-z_]\w*)?/g, (all, a, b) => `${a ? (a in map ? raw[map[a]] : a) : ''}${b ? (b in map ? raw[map[b]] : b) : ''}`)
            body = body.replace(/(?<![\w$"])([A-Za-z_]\w*)(?![\w$])/g, (all, p) => (p in map ? args[map[p]] ?? '' : p === '__VA_ARGS__' ? va : all))
            out += expandMacros(body, defs, new Set([...off, name]), depth + 1)
            i = close + 1
            continue
          }
        }
      }
      out += name
      i = j
      continue
    }
    out += c
    i++
  }
  return out
}

function evalCond(expr, defs) {
  let e = expr.replace(/\bdefined\s*\(\s*(\w+)\s*\)|\bdefined\s+(\w+)/g, (_, a, b) => (defs.has(a || b) ? ' 1 ' : ' 0 '))
  e = expandMacros(e, defs)
  e = e.replace(/\bdefined\s*\(\s*(\w+)\s*\)|\bdefined\s+(\w+)/g, (_, a, b) => (defs.has(a || b) ? ' 1 ' : ' 0 '))
  e = e.replace(/\btrue\b/g, '1').replace(/\bfalse\b/g, '0')
  e = e.replace(/\b(0x[\da-f]+|\d+)[uUlL]+\b/gi, '$1')
  e = e.replace(/'(\\?.)'/g, (_, ch) => String(ch.length > 1 ? 0 : ch.charCodeAt(0)))
  e = e.replace(/\b[A-Za-z_]\w*\b/g, '0')
  try {
    return !!Function(`"use strict"; return (${e || 0})`)()
  } catch {
    return false
  }
}

// → texto pré-processado. libs: { 'Nome.h': texto, 'Nome.cpp': texto, … } (nomes sem pastas)
export function preprocess(src, { defines = [], libs = {} } = {}) {
  const defs = new Map()
  for (const d of defines) {
    const [k, ...v] = String(d).split('=')
    defs.set(k.trim(), { params: null, body: v.length ? v.join('=') : '1' })
  }
  const lib = {}
  for (const [k, v] of Object.entries(libs || {})) lib[k.split('/').pop()] = v
  const once = new Set()
  const included = new Set()

  function run(text, file, depth) {
    if (depth > 20) throw new Error(i18n.m(`#include demasiado profundo em ${file}`, `#include nested too deep in ${file}`))
    // linhas continuadas com "\"
    const lines = text.replace(/\\\r?\n/g, ' ').split(/\r?\n/)
    const out = []
    const stack = [] // { on, done, parentOn }
    const active = () => stack.every((s) => s.on)
    let code = []
    const flush = () => {
      if (code.length) out.push(expandMacros(code.join('\n'), defs))
      code = []
    }
    for (const line of lines) {
      const m = line.match(/^\s*#\s*(\w+)\s*(.*)$/)
      if (!m) {
        code.push(active() ? line : '')
        continue
      }
      const [, dir, rest0] = m
      const rest = rest0.trim()
      if (dir === 'if' || dir === 'ifdef' || dir === 'ifndef') {
        const parentOn = active()
        let on = false
        if (parentOn) on = dir === 'if' ? evalCond(rest, defs) : dir === 'ifdef' ? defs.has(rest.split(/\s/)[0]) : !defs.has(rest.split(/\s/)[0])
        stack.push({ on, done: on, parentOn })
        code.push('')
        continue
      }
      if (dir === 'elif' || dir === 'else') {
        const top = stack[stack.length - 1]
        if (!top) throw new Error(i18n.m(`#${dir} sem #if em ${file}`, `#${dir} without #if in ${file}`))
        if (top.done || !top.parentOn) top.on = false
        else {
          top.on = dir === 'else' ? true : evalCond(rest, defs)
          top.done = top.on
        }
        code.push('')
        continue
      }
      if (dir === 'endif') {
        if (!stack.length) throw new Error(i18n.m(`#endif sem #if em ${file}`, `#endif without #if in ${file}`))
        stack.pop()
        code.push('')
        continue
      }
      if (!active()) {
        code.push('')
        continue
      }
      if (dir === 'define') {
        const dm = rest.match(/^([A-Za-z_]\w*)(\(([^)]*)\))?\s*([\s\S]*)$/)
        if (dm) {
          let params = null
          let variadic = false
          if (dm[2]) {
            params = dm[3].split(',').map((p) => p.trim()).filter(Boolean)
            if (params.at(-1) === '...') (variadic = true), params.pop()
          }
          defs.set(dm[1], { params, body: dm[4].trim() })
        }
        code.push('')
        continue
      }
      if (dir === 'undef') {
        defs.delete(rest.split(/\s/)[0])
        code.push('')
        continue
      }
      if (dir === 'pragma') {
        if (/^once\b/.test(rest)) once.add(file)
        code.push('')
        continue
      }
      if (dir === 'error') throw new Error(`#error ${rest}`)
      if (dir === 'warning' || dir === 'line') {
        code.push('')
        continue
      }
      if (dir === 'include') {
        const im = rest.match(/^[<"]([^>"]+)[>"]/)
        const name = im?.[1].split('/').pop()
        if (name && lib[name] != null) {
          flush()
          if (!once.has(name) || !included.has(name)) {
            included.add(name)
            out.push(run(stripCComments(lib[name]), name, depth + 1))
            // o .cpp com o mesmo nome (definições da biblioteca) entra logo a seguir
            const cpp = name.replace(/\.(h|hpp|hh)$/i, '')
            for (const ext of ['.cpp', '.cc', '.c']) {
              const f = cpp + ext
              if (lib[f] != null && !included.has(f)) {
                included.add(f)
                out.push(run(stripCComments(lib[f]), f, depth + 1))
              }
            }
          }
          continue
        }
        code.push(line)
        continue
      }
      code.push(line) // outra diretiva: fica
    }
    flush()
    if (stack.length) throw new Error(i18n.m(`falta #endif em ${file}`, `missing #endif in ${file}`))
    return out.join('\n')
  }
  return run(src, 'sketch.ino', 0)
}
