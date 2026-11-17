#!/usr/bin/env node
// Imagens .webp leves das montagens dos exemplos, para o site (página inicial, /exemplos e o menu
// Projetos) não ter de desenhar modelos 3D no browser de quem visita:
//   public/previews/examples/<id>.webp        1200×750 (página inicial)
//   public/previews/examples/<id>-sm.webp      480×300 (cartões)
// Fundo transparente: as imagens assentam em qualquer fundo do site.
//
// Precisa do Vite em modo dev (usa a página preview.html) e do cwebp (brew install webp):
//   bun run dev                                   (noutro terminal; ou --url=http://localhost:5199)
//   node scripts/example-shots.mjs                só os que faltam
//   node scripts/example-shots.mjs --force        todos de novo (ex.: depois de mudar modelos 3D)
//   node scripts/example-shots.mjs --only=semaforo,braco6
import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public', 'previews', 'examples')
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]
const URL0 = (arg('url') || 'http://localhost:5173').replace(/\/$/, '')
const FORCE = process.argv.includes('--force')
const ONLY = arg('only')?.split(',').filter(Boolean)
const TABS = +(arg('tabs') || 3)
const W = 1200
const H = 750
const CHROME = process.env.CHROME || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome')
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

execFileSync('cwebp', ['-version'], { stdio: 'ignore' }) // falha cedo se faltar
fs.mkdirSync(OUT, { recursive: true })
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'adjeltron-shots-'))

// Um processo do Chrome por trabalhador: separadores em segundo plano não correm
// requestAnimationFrame, por isso cada um precisa da sua própria janela (à frente).
const chromes = []
process.on('exit', () => chromes.forEach((c) => c.kill()))
async function openTab(n) {
  const port = 9400 + Math.floor(Math.random() * 400) + n * 500
  chromes.push(spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(TMP, `profile${n}`)}`, '--use-angle=metal', '--hide-scrollbars', `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' }))
  let t
  for (let i = 0; i < 80 && !t; i++) {
    try {
      t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page')
    } catch {
      await wait(250)
    }
  }
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pend = {}
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (pend[m.id]) {
      pend[m.id](m.result ?? { error: m.error })
      delete pend[m.id]
    }
  }
  const send = (method, params = {}) => new Promise((r) => ((pend[++id] = r), ws.send(JSON.stringify({ id, method, params }))))
  const ev = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }))?.result?.value
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
  await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
  return { send, ev, close: () => ws.close() }
}

// lista dos exemplos (a mesma da app)
const first = await openTab(0)
await first.send('Page.navigate', { url: `${URL0}/preview.html?type=led` })
await wait(3000)
let ids = await first.ev(`import('/src/sim/localData.js').then((m) => m.examples().map((e) => e.id))`)
if (!Array.isArray(ids)) throw new Error(`não consegui ler os exemplos em ${URL0} (o Vite está a correr?)`)
if (ONLY) ids = ids.filter((id) => ONLY.includes(id))
const todo = ids.filter((id) => FORCE || ['.webp', '-sm.webp'].some((s) => !fs.existsSync(path.join(OUT, `${id}${s}`))))
console.log(`${ids.length} exemplos, ${todo.length} por fotografar → ${path.relative(ROOT, OUT)}`)

// corre na página: lê o canvas WebGL (preserveDrawingBuffer), recorta pelo alfa e devolve dataURLs WebP
function encodePage(sizes) {
  const src = document.querySelector('canvas')
  const w = src.width, h = src.height
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const cx = c.getContext('2d', { willReadFrequently: true })
  cx.drawImage(src, 0, 0)
  const d = cx.getImageData(0, 0, w, h).data
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (d[(y * w + x) * 4 + 3] > 10) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
  if (x1 < 0) return null
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1
  return sizes.map(([W, H]) => {
    const o = document.createElement('canvas')
    o.width = W
    o.height = H
    const ox = o.getContext('2d')
    ox.imageSmoothingQuality = 'high'
    const s = Math.min((W * 0.9) / bw, (H * 0.88) / bh)
    ox.drawImage(c, x0, y0, bw, bh, (W - bw * s) / 2, (H - bh * s) / 2, bw * s, bh * s)
    return o.toDataURL('image/png')
  })
}

const failed = []
let done = 0
async function worker(tab) {
  while (todo.length) {
    const id = todo.shift()
    await tab.send('Page.navigate', { url: `${URL0}/preview.html?example=${encodeURIComponent(id)}&bg=none&dpr=2` })
    let ok = false
    for (let i = 0; i < 240 && !ok; i++) {
      await wait(250)
      ok = (await tab.ev('document.title')) === 'pronto'
    }
    if (!ok) {
      failed.push(id)
      continue
    }
    await wait(400)
    // recorte pelos píxeis visíveis (alfa) + margem igual, centrado → PNG sem perdas → cwebp
    const pngs = (await tab.ev(`(${encodePage})(${JSON.stringify([[W, H], [480, 300]])})`)) || []
    if (pngs.length !== 2 || pngs.some((x) => !x)) {
      failed.push(id)
      continue
    }
    for (const [k, suffix] of [[0, ''], [1, '-sm']]) {
      const png = path.join(TMP, `${id}${suffix}.png`)
      fs.writeFileSync(png, Buffer.from(pngs[k].split(',')[1], 'base64'))
      const base = path.join(OUT, `${id}${suffix}`)
      execFileSync('cwebp', ['-quiet', '-q', '80', '-alpha_q', '85', '-m', '6', png, '-o', `${base}.webp`])
    }
    done++
    process.stdout.write(`\r${done}/${done + todo.length + failed.length} ${id}`.padEnd(60))
  }
}
const tabs = [first, ...(await Promise.all(Array.from({ length: Math.max(0, TABS - 1) }, (_, i) => openTab(i + 1))))]
await Promise.all(tabs.map(worker))
tabs.forEach((t) => t.close())

const kb = (f) => fs.statSync(path.join(OUT, f)).size / 1024
const avg = (re) => {
  const f = fs.readdirSync(OUT).filter((x) => re.test(x))
  return `${f.length} × ${(f.reduce((a, x) => a + kb(x), 0) / (f.length || 1)).toFixed(1)} KB`
}
console.log(`\nfeito: ${done}${failed.length ? ` · falharam: ${failed.join(', ')}` : ''}`)
console.log(`grandes ${avg(/^(?!.*-sm\.)[^.]+\.webp$/)} · pequenas ${avg(/-sm\.webp$/)}`)
fs.rmSync(TMP, { recursive: true, force: true })
process.exit(failed.length ? 1 : 0)
