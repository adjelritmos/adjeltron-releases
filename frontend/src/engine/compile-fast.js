// Compilação portátil (sem Bun, sem clang++): traduz o sketch para o programa JavaScript
// que o simulador do browser executa. É o que corre na função /api/compile da Vercel
// (frontend/api/compile.js) e, em desenvolvimento, no middleware do Vite.
// O compile.js (backend Bun) usa isto depois da verificação com o clang++.
import { transpile } from './sim/compiler.js'
import { boardDefines } from './sim/compiler-pre.js'
import { LIB_CLASSES } from './sim/libs/index.js'
import { DEFS, boardProfile } from '../../../shared/components.js'
import * as i18n from '../../../shared/i18n.js'
import { SOURCE_LIBS } from './sim/srclibs/index.js'
import { lintCpp } from './sim/cpp-lint.js'

// hash de texto simples (FNV-1a 32 bits) — só para a cache
function hash(s) {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36) + s.length.toString(36)
}

// "linha 12: ..." nas mensagens do tradutor → posição no editor
function lineOf(msg) {
  const m = String(msg).match(/\blinha\s+(\d+)|\bline\s+(\d+)/i)
  return m ? +(m[1] || m[2]) : 0
}

// tradução + validação (o simulador suporta um subconjunto de C++)
// libs: bibliotecas do utilizador [{ name, files: { 'X.h': texto, 'X.cpp': texto } }]
// + bibliotecas em C++ incluídas no simulador (Otto.h, Oscillator.h, US.h…) quando o sketch as usa;
//   uma biblioteca do utilizador com o mesmo ficheiro tem prioridade
export const libFiles = (libs, code = '', swap = []) => {
  const user = Object.assign({}, ...(Array.isArray(libs) ? libs : []).map((l) => l?.files || {}))
  const used = new Set([...String(code).matchAll(/^\s*#\s*include\s*[<"]([^>"]+)[>"]/gm)].map((m) => m[1]))
  const builtin = SOURCE_LIBS.filter((l) => l.headers.some((h) => used.has(h) || Object.values(user).some((t) => t.includes(h))))
  const out = Object.assign({}, ...builtin.map((l) => l.files), user)
  // swap: cabeçalhos em que a versão incluída substitui a do utilizador (X.h e o seu X.cpp)
  for (const h of swap) {
    delete out[h.replace(/\.h$/, '.cpp')]
    for (const l of builtin) if (h in l.files) out[h] = l.files[h]
  }
  return out
}

// cabeçalhos da biblioteca do utilizador que também existem nas bibliotecas incluídas
const overlapping = (libs) => {
  const user = new Set((Array.isArray(libs) ? libs : []).flatMap((l) => Object.keys(l?.files || {})))
  return SOURCE_LIBS.flatMap((l) => Object.keys(l.files)).filter((h) => user.has(h))
}

// para o servidor (clang++/arduino-cli): acrescenta às bibliotecas do utilizador as bibliotecas em C++
// do simulador que o sketch usa — assim compila mesmo que o servidor não as tenha instaladas
export const withSourceLibs = (libs, code = '') => {
  const list = Array.isArray(libs) ? libs : []
  const user = Object.assign({}, ...list.map((l) => l?.files || {}))
  const used = new Set([...String(code).matchAll(/^\s*#\s*include\s*[<"]([^>"]+)[>"]/gm)].map((m) => m[1]))
  // ficheiros que o utilizador também tem (ex.: o OTTOKame.h/.cpp originais de um firmware) ficam
  // de fora — vale o dele; os restantes (MaxMatrix.h, OttoSerialCommand.h…) continuam a ir
  const extra = SOURCE_LIBS.filter((l) => l.headers.some((h) => used.has(h) || Object.values(user).some((t) => t.includes(h))))
    .map(({ name, files }) => ({ name, files: Object.fromEntries(Object.entries(files).filter(([f]) => !(f in user) && !(f.replace(/\.h$/, '.cpp') in user))) }))
    .filter((l) => Object.keys(l.files).length)
  return extra.length ? [...list, ...extra] : list
}

export function translate(code, diagnostics = [], { prof, libs } = {}) {
  const run = (swap) => {
    const js = transpile(code, { classes: LIB_CLASSES, defines: boardDefines(prof), libs: libFiles(libs, code, swap) })
    new Function(js) // eslint-disable-line no-new-func
    return js
  }
  try {
    return run([])
  } catch (e) {
    // um ficheiro do utilizador com construções que o simulador não tem (ex.: o TimerFreeTone.cpp
    // original escreve nos registos da porta do AVR) e que existe também nas bibliotecas incluídas
    // (com a mesma API): o simulador usa a versão incluída — a compilação real usa a do utilizador
    const over = overlapping(libs)
    for (const swap of [...over.map((h) => [h]), ...(over.length > 1 ? [over] : [])]) {
      try {
        return run(swap)
      } catch {
        /* tenta a seguinte */
      }
    }
    diagnostics.push({ line: lineOf(e.message), col: 0, severity: 'error', message: i18n.m(`O simulador não suporta esta construção de C++: ${e.message}`, `The simulator does not support this C++ construct: ${e.message}`) })
    return null
  }
}

const cache = new Map()

// → { ok, js, diagnostics, compiler, board, ms }
// lint: false quando um compilador C++ verdadeiro (clang++) já verificou o sketch
export function compileFast(code, { board = 'arduino', libs = [], lint = true } = {}) {
  const prof = boardProfile(DEFS[board] ? board : 'arduino')
  const key = `${lint ? 'L' : ''}${i18n.getSharedLang()}:${prof.id}:${hash(code)}:${libs?.length ? hash(JSON.stringify(libs)) : ''}` // mensagens no idioma atual
  if (cache.has(key)) return { ...cache.get(key), cached: true }
  const t0 = performance.now()
  // C++ que o JavaScript deixaria passar (';' em falta, decimais num inteiro): ver sim/cpp-lint.js
  const diagnostics = lint ? lintCpp(code) : []
  const js = diagnostics.some((d) => d.severity === 'error') ? null : translate(code, diagnostics, { prof, libs })
  const result = { ok: !!js, js, diagnostics, compiler: null, board: prof.mcu, ms: Math.round(performance.now() - t0) }
  if (cache.size > 200) cache.clear()
  cache.set(key, result)
  return result
}

// pedido HTTP já lido (JSON) → { status, body }
// lang ('pt' | 'en'): idioma das mensagens deste pedido. Nos servidores (Vercel, Bun, Vite) a
// compilação é síncrona, por isso definir o idioma e compilar logo a seguir não se mistura com outros pedidos.
export function handleCompile(body) {
  const { code, board, libs, lang } = body || {}
  i18n.setSharedLang(lang === 'en' ? 'en' : 'pt') // sem lang: português (não herda o do pedido anterior)
  if (typeof code !== 'string' || code.length > 200_000) return { status: 400, body: { error: i18n.m('código inválido', 'invalid code') } }
  if (libs != null && (!Array.isArray(libs) || JSON.stringify(libs).length > 4_000_000)) return { status: 400, body: { error: i18n.m('bibliotecas inválidas (máximo 4 MB)', 'invalid libraries (max 4 MB)') } }
  return { status: 200, body: compileFast(code, { board, libs }) }
}
