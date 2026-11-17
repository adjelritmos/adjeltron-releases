// Escolha do motor de simulação (aqui no worker):
//  - com servidor (app desktop: servidor Rust; site: backend no Render): tradutor aqui + verificação
//    clang++ e arduino-cli no servidor (plan-engine.js: emulação real avr8js no Uno/Nano/Mega);
//  - sem servidor: só o tradutor rápido, também aqui no browser — nunca depende da rede.
import { compileFast } from '../compile-fast.js'
import { desktopNet } from '../../sim/desktop/state.js'
import { makePlanEngine } from './plan-engine.js'
import * as desktop from '../../sim/desktop/compile.js'
import * as i18n from '../../../../shared/i18n.js'


const planDesktop = makePlanEngine(desktop)

export async function planEngine(opts) {
  if (desktopNet()) return planDesktop(opts)
  const { code, board, libs } = opts
  const notes = []
  let compile
  try {
    compile = compileFast(code, { board, libs })
  } catch (e) {
    compile = { ok: false, js: null, diagnostics: [{ line: 0, col: 0, severity: 'error', message: i18n.m(`Não foi possível compilar: ${e.message}`, `Could not compile: ${e.message}`) }] }
  }
  return { engine: 'transpiler', compile, notes, failed: !compile.ok }
}
