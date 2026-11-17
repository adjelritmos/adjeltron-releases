#!/usr/bin/env node
// Teste dos robôs de patas NA APP VERDADEIRA: abre /app num Chrome sem janela, carrega um exemplo
// (ou um projeto exportado .adjel), inicia a simulação e mede a pose da peça-raiz dinâmica
// (posição e inclinação) ao longo do tempo — a mesma física que o utilizador vê (PhysicsWorld.jsx),
// ao contrário de scripts/walk-sim.js, que é uma aproximação.
// Precisa do Vite em modo dev (usa window.__store / window.__simRef):
//   bun run dev                                              (noutro terminal)
//   node scripts/app-walk.mjs ottoDanca 30                   exemplo, 30 s
//   node scripts/app-walk.mjs --project=robo.adjel 30 --trace --url=http://localhost:5199
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const args = process.argv.slice(2)
const arg = (k) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3)
const pos = args.filter((a) => !a.startsWith('--'))
const projectFile = arg('project')
const key = projectFile ? null : pos[0]
const T = +(pos[projectFile ? 0 : 1] || 20)
const URL0 = (arg('url') || 'http://localhost:5173').replace(/\/$/, '')
const TRACE = args.includes('--trace')
const EVERY = +(arg('every') || 500)
const CHROME = process.env.CHROME || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome')
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!key && !projectFile) {
  console.error('uso: node scripts/app-walk.mjs <exemplo>|--project=ficheiro.adjel [segundos] [--trace] [--every=ms] [--url=…]')
  process.exit(2)
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'adjeltron-walk-'))
const port = 9400 + Math.floor(Math.random() * 900)
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${TMP}`, '--use-angle=metal', ...(arg('flags') ? arg('flags').split(' ') : []), `--window-size=${arg('size') || '640,420'}`, 'about:blank'], { stdio: 'ignore' })
process.on('exit', () => chrome.kill())
let tab
for (let i = 0; i < 80 && !tab; i++) {
  try {
    tab = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page')
  } catch {
    await wait(250)
  }
}
const ws = new WebSocket(tab.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pend = {}
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (pend[m.id]) (pend[m.id](m.result ?? { error: m.error }), delete pend[m.id])
}
const send = (method, params = {}) => new Promise((r) => ((pend[++id] = r), ws.send(JSON.stringify({ id, method, params }))))
const ev = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r?.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
  return r?.result?.value
}
await send('Page.enable')
await send('Page.navigate', { url: `${URL0}/app` })
for (let i = 0; i < 120; i++) {
  await wait(250)
  if (await ev('!!(window.__store && window.__simRef)').catch(() => false)) break
}
if (!(await ev('!!window.__store'))) throw new Error(`a app não abriu em ${URL0}/app (o Vite está a correr em modo dev?)`)
// a app carrega um projeto inicial (o guardado ou o exemplo 'seguidor') de forma assíncrona: só depois se troca
for (let i = 0; i < 80; i++) {
  if (await ev('window.__store.getState().parts.length > 0')) break
  await wait(250)
}
await wait(500)

if (projectFile) {
  const p = JSON.parse(fs.readFileSync(projectFile, 'utf8'))
  await ev(`window.__store.getState().set(${JSON.stringify({ parts: p.parts, wires: p.wires, code: p.code, track: p.track || 'mesa', projectName: p.projectName || 'projeto', libs: p.libs || [], lang: p.lang || 'cpp', nvm: null, selected: null, mode: 'build' })})`)
} else await ev(`window.__store.getState().loadPreset(${JSON.stringify(key)})`)
await wait(2500)
const n = await ev('window.__store.getState().parts.length')
if (!n) throw new Error('o projeto ficou vazio (exemplo inexistente?)')
const started = await ev(`import('/src/services/simControl.js').then((m) => m.startSim())`)
if (!started) throw new Error('a simulação não arrancou: ' + (await ev('window.__store.getState().simError')))

// corre na página: pose das peças-raiz dinâmicas (as que a física move)
const sample = `(() => {
  const S = window.__simRef, st = window.__store.getState()
  const out = []
  for (const id of S.physicsOwned) {
    const p = st.parts.find((q) => q.id === id)
    if (!p || p.parent) continue
    const o = S.objects.get(id)
    if (!o) continue
    o.updateWorldMatrix(true, false)
    const e = o.matrixWorld.elements
    // inclinação no referencial do corpo: fwd > 0 = tomba para a frente (x local), side > 0 = para a direita (z local)
    out.push({ id, x: e[12], y: e[13], z: e[14], up: e[5], yaw: Math.atan2(-e[2], e[0]) * 180 / Math.PI, fwd: -e[1], side: -e[9] })
  }
  return { out, mode: st.mode, err: st.simError, serial: st.serial.length, owned: [...S.physicsOwned].slice(0, 8), roots: st.parts.filter((q) => !q.parent).map((q) => q.id) }
})()`
// imagens por segundo da página (a física dá vários subpassos por imagem: com poucas fps os alvos
// dos servos chegam aos saltos e o teste fica mais duro do que num computador normal)
await ev(`(() => { window.__fpsN = 0; const f = () => { window.__fpsN++; requestAnimationFrame(f) }; requestAnimationFrame(f) })()`)
let start = null
let fell = null
let fellAt = null // última linha da série quando caiu
let maxTilt = 0
let last = null
const t0 = Date.now()
while (Date.now() - t0 < T * 1000) {
  await wait(EVERY)
  const s = await ev(sample)
  const t = (Date.now() - t0) / 1000
  if (s.err) throw new Error('erro na simulação: ' + s.err)
  const b = s.out.sort((a, c) => c.y - a.y)[0]
  if (!b) {
    if (TRACE) console.log(`t=${t.toFixed(1)} sem corpo dinâmico: modo ${s.mode}, física ${JSON.stringify(s.owned)}, raízes ${JSON.stringify(s.roots)}`)
    continue
  }
  start ||= b
  last = b
  const tilt = (Math.acos(Math.max(-1, Math.min(1, b.up))) * 180) / Math.PI
  maxTilt = Math.max(maxTilt, tilt)
  if (tilt > 60 && fell == null) {
    fell = +t.toFixed(1)
    fellAt = (await ev(`window.__store.getState().serial.slice(-3).map((l) => l.text).join('')`)).trim().split('\n').at(-1)
  }
  if (TRACE) console.log(`t=${t.toFixed(1)} x=${(b.x - start.x).toFixed(1)} z=${(b.z - start.z).toFixed(1)} y=${b.y.toFixed(2)} incl=${tilt.toFixed(1)}° (frente ${(Math.asin(b.fwd) * 57.3).toFixed(0)}°, direita ${(Math.asin(b.side) * 57.3).toFixed(0)}°) rumo=${b.yaw.toFixed(0)}°`)
}
const serial = await ev(`window.__store.getState().serial.slice(-6).map((l) => l.text).join('')`)
const fps = Math.round((await ev('window.__fpsN')) / ((Date.now() - t0) / 1000))
console.log(JSON.stringify({ key: key || path.basename(projectFile), T, fps, dx: last ? +(last.x - start.x).toFixed(2) : null, dz: last ? +(last.z - start.z).toFixed(2) : null, y: last ? +last.y.toFixed(2) : null, maxTilt: +maxTilt.toFixed(1), fell, fellAt }))
if (serial) console.log(serial.trim())
ws.close()
chrome.kill()
await wait(300)
try {
  fs.rmSync(TMP, { recursive: true, force: true })
} catch {
  /* o Chrome ainda a fechar: fica na pasta temporária do sistema */
}
process.exit(0)
