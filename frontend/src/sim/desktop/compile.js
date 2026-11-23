// Compilação com servidor (app desktop: servidor Rust local; site: backend Bun no Render): o
// tradutor C++ → JavaScript corre aqui (browser) e o servidor faz o resto:
//   POST /api/check        verificação com o clang++ contra o core mínimo (backend/arduino)
//   POST /api/compile/real compilação real com o arduino-cli (firmware .hex para o avr8js)
// Mesma interface que backend/compile.js + compile-real.js (usada por plan-engine.js e pelo editor).
import { compileFast, withSourceLibs } from '@engine/compile-fast.js'
import { LIB_HEADERS } from '@engine/sim/libs/index.js'
import { DEFS, boardProfile } from '@shared/components.js'
import { fqbnOf } from '@shared/fqbn.js'
import { apiUrl } from '../../services/apiBase.js'
import { getSharedLang } from '@shared/i18n.js'

// timeoutMs: o site não fica à espera de um servidor lento ou a acordar (Render grátis adormece)
async function post(path, body, timeoutMs = 0) {
  const res = await fetch(apiUrl(path), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, lang: getSharedLang() }), signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// verificação clang++ (se houver compilador) + tradução → { ok, js, diagnostics, compiler, board, ms }
export async function compileSketch(code, { board = 'arduino', libs = [] } = {}) {
  const prof = boardProfile(DEFS[board] ? board : 'arduino')
  const t0 = performance.now()
  let check = { available: false, diagnostics: [] }
  try {
    check = await post('/api/check', { code, defines: prof.defines || [], libHeaders: LIB_HEADERS, userLibs: withSourceLibs(libs, code) }, 8000)
  } catch {
    /* sem verificação: fica só o tradutor */
  }
  const errors = check.diagnostics.some((d) => d.severity === 'error')
  const fast = errors ? null : compileFast(code, { board, libs, lint: !check.available })
  return {
    ok: !!fast?.ok,
    js: fast?.js || null,
    diagnostics: [...check.diagnostics, ...(fast?.diagnostics || [])],
    compiler: check.available ? check.compiler : null,
    board: prof.mcu,
    ms: Math.round(performance.now() - t0),
  }
}

// o servidor tem arduino-cli? (sem resposta em 4 s: não, durante 30 s — sem esperar a cada simulação)
let health = null
export const realCompileAvailable = () =>
  (health ||= fetch(apiUrl('/api/health'), { signal: AbortSignal.timeout(4000) })
    .then((r) => r.json())
    .then((h) => !!h.arduinoCli)
    .catch(() => {
      setTimeout(() => (health = null), 30_000)
      return false
    }))

export const compileReal = (code, { board = 'arduino', libs = [] } = {}) => post('/api/compile/real', { code, fqbn: fqbnOf(board || 'arduino'), libs: withSourceLibs(libs, code) })
// só o que já está em cache; senão a compilação começa em segundo plano e devolve null
export const cachedReal = (code, { board = 'arduino', libs = [] } = {}) => post('/api/compile/real', { code, fqbn: fqbnOf(board || 'arduino'), libs: withSourceLibs(libs, code), cachedOnly: true }, 4000).catch(() => null)
