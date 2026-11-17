// Plotter Série (como o do Arduino IDE 2): cada linha do Serial com números separados
// por espaços, vírgulas ou tabs é um ponto; "nome:valor" dá nome à série.
//   Serial.print("seno:"); Serial.print(s); Serial.print(","); Serial.print("pot:"); Serial.println(p);
import { useEffect, useRef, useState } from 'react'
import { Button, Chip, Tooltip } from '@heroui/react'
import { Eraser, Pause, Play } from 'lucide-react'
import { t as tGlobal, useT } from '../../i18n/index.js'

const MAX = 500 // pontos visíveis por série
// paleta categórica (validada para fundo preto: banda de luminosidade, daltonismo, contraste)
export const SERIES_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']

// ---------- dados (fora do React: chegam a ~30 Hz mesmo com o separador escondido) ----------
const plot = { n: 0, series: new Map(), order: [], version: 0, paused: false }
const listeners = new Set()
const bump = () => {
  plot.version++
  for (const f of listeners) f()
}

// "1 2 3" | "a:1,b:2" | "t:20.5\tpot:512" -> [[nome, valor]…] (ou null se não houver números)
export function parsePlotLine(text) {
  const toks = String(text).trim().split(/[\s,;]+/).filter(Boolean)
  const out = []
  let k = 0
  let pending = null // "Temp: 23.5" (espaço depois dos dois pontos)
  for (const t of toks) {
    const i = t.lastIndexOf(':')
    const label = i > 0 ? t.slice(0, i) : pending
    const raw = i > 0 ? t.slice(i + 1) : t
    pending = null
    if (i > 0 && raw === '') {
      pending = label
      continue
    }
    const v = Number(raw)
    if (raw === '' || !Number.isFinite(v)) continue // palavra solta: ignorada
    out.push([label ?? tGlobal('tools.plot.value', { n: ++k }), v])
  }
  return out.length ? out : null
}

export function feedPlotter(lines) {
  if (plot.paused) return
  let any = false
  for (const l of lines) {
    if (l.level) continue // mensagens do simulador (avisos, erros…)
    const vals = parsePlotLine(l.text)
    if (!vals) continue
    plot.n++
    for (const [name, v] of vals) {
      if (!plot.series.has(name)) {
        if (plot.series.size >= SERIES_COLORS.length) continue // máx. 8 séries
        plot.series.set(name, [])
        plot.order.push(name)
      }
      const s = plot.series.get(name)
      s.push([plot.n, v])
      while (s.length && s[0][0] <= plot.n - MAX) s.shift()
    }
    any = true
  }
  if (any) bump()
}

export function clearPlotter() {
  plot.n = 0
  plot.series.clear()
  plot.order = []
  bump()
}

// eixo com valores "redondos"
function niceTicks(lo, hi, count = 5) {
  const span = hi - lo || 1
  const step0 = span / count
  const mag = 10 ** Math.floor(Math.log10(step0))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) || step0
  const out = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-6; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v)
  return { ticks: out, step }
}
const fmtNum = (v, step) => (Math.abs(step) >= 1 ? String(Math.round(v)) : v.toFixed(Math.min(4, Math.max(0, -Math.floor(Math.log10(step))))))

export function SerialPlotter() {
  const t = useT()
  const wrap = useRef(null)
  const canvas = useRef(null)
  const [, setTick] = useState(0)
  const [paused, setPaused] = useState(plot.paused)
  const [hidden, setHidden] = useState(() => new Set())
  const [hover, setHover] = useState(null) // { x px, n, vals }
  const geo = useRef(null)

  useEffect(() => {
    let raf = 0
    let drawn = -1
    const f = () => setTick((t) => t + 1)
    listeners.add(f)
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const cv = canvas.current
      const el = wrap.current
      if (!cv || !el) return
      const w = el.clientWidth
      const h = el.clientHeight
      const dpr = window.devicePixelRatio || 1
      const key = `${plot.version}|${w}|${h}|${[...hidden].join()}`
      if (key === drawn) return
      drawn = key
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr)
        cv.height = Math.round(h * dpr)
      }
      const g = cv.getContext('2d')
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, w, h)
      const visible = plot.order.filter((s) => !hidden.has(s))
      let lo = Infinity
      let hi = -Infinity
      for (const s of visible) for (const [, v] of plot.series.get(s)) (lo = Math.min(lo, v)), (hi = Math.max(hi, v))
      if (!Number.isFinite(lo)) {
        lo = -1
        hi = 1
      }
      if (hi - lo < 1e-9) {
        lo -= 1
        hi += 1
      }
      const pad = (hi - lo) * 0.06
      lo -= pad
      hi += pad
      const { ticks, step } = niceTicks(lo, hi)
      g.font = '10px ui-monospace, monospace'
      const left = Math.max(...ticks.map((t) => g.measureText(fmtNum(t, step)).width)) + 10
      const L = { l: left, r: 8, t: 8, b: 18 }
      const pw = w - L.l - L.r
      const ph = h - L.t - L.b
      const n1 = plot.n
      const n0 = n1 - MAX + 1
      const X = (n) => L.l + ((n - n0) / (MAX - 1)) * pw
      const Y = (v) => L.t + (1 - (v - lo) / (hi - lo)) * ph
      geo.current = { L, pw, n0, X }
      // grelha recessiva
      g.strokeStyle = 'rgba(255,255,255,0.07)'
      g.fillStyle = '#737373'
      g.lineWidth = 1
      g.textAlign = 'right'
      g.textBaseline = 'middle'
      for (const t of ticks) {
        const y = Math.round(Y(t)) + 0.5
        g.beginPath()
        g.moveTo(L.l, y)
        g.lineTo(w - L.r, y)
        g.stroke()
        g.fillText(fmtNum(t, step), L.l - 6, y)
      }
      g.textAlign = 'center'
      g.textBaseline = 'top'
      for (let k = 0; k <= 5; k++) {
        const n = Math.round(n0 + (k * (MAX - 1)) / 5)
        if (n < 1) continue
        g.fillText(String(n), X(n), h - L.b + 4)
      }
      // séries (linhas de 2 px)
      g.save()
      g.beginPath()
      g.rect(L.l, L.t, pw, ph)
      g.clip()
      g.lineWidth = 2
      g.lineJoin = 'round'
      for (const s of visible) {
        const pts = plot.series.get(s)
        g.strokeStyle = SERIES_COLORS[plot.order.indexOf(s)]
        g.beginPath()
        pts.forEach(([n, v], i) => (i ? g.lineTo(X(n), Y(v)) : g.moveTo(X(n), Y(v))))
        g.stroke()
        if (pts.length === 1) {
          g.fillStyle = g.strokeStyle
          g.beginPath()
          g.arc(X(pts[0][0]), Y(pts[0][1]), 4, 0, Math.PI * 2)
          g.fill()
        }
      }
      g.restore()
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      listeners.delete(f)
    }
  }, [hidden])

  const onMove = (e) => {
    const G = geo.current
    if (!G || !plot.n) return setHover(null)
    const r = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - r.left
    const n = Math.round(G.n0 + ((x - G.L.l) / G.pw) * (MAX - 1))
    if (n < Math.max(1, G.n0) || n > plot.n) return setHover(null)
    const vals = plot.order
      .filter((s) => !hidden.has(s))
      .map((s) => [s, plot.series.get(s).find((p) => p[0] === n)?.[1]])
      .filter(([, v]) => v != null)
    setHover({ x: G.X(n), n, vals })
  }

  const toggle = (s) =>
    setHidden((h) => {
      const n = new Set(h)
      n.has(s) ? n.delete(s) : n.add(s)
      return n
    })

  return (
    <div className="flex flex-col h-full min-h-0 bg-black">
      <div className="flex items-center gap-1.5 px-2 py-1 border-b border-white/10 shrink-0 flex-wrap">
        {plot.order.length > 1 &&
          plot.order.map((s, i) => (
            <Chip
              key={s}
              size="sm"
              variant="flat"
              onClick={() => toggle(s)}
              className="cursor-pointer"
              classNames={{ base: `h-5 bg-white/[0.06] ${hidden.has(s) ? 'opacity-40' : ''}`, content: 'text-[11px] text-neutral-200 px-1' }}
              startContent={<span className="w-2.5 h-2.5 rounded-full ml-1" style={{ background: SERIES_COLORS[i] }} />}
            >
              {s}
            </Chip>
          ))}
        {plot.order.length === 1 && <span className="text-[11px] text-neutral-300 font-medium">{plot.order[0]}</span>}
        {!plot.order.length && <span className="text-[11px] text-neutral-500">{t('tools.plot.empty')}</span>}
        <div className="ml-auto flex gap-1">
          <Tooltip content={paused ? t('tools.plot.resume') : t('tools.plot.pause')} size="sm" delay={300} closeDelay={0}>
            <Button
              size="sm"
              isIconOnly
              variant="light"
              aria-label={paused ? t('tools.plot.resumeAria') : t('tools.plot.pauseAria')}
              className="h-6 w-6 min-w-6"
              onPress={() => {
                plot.paused = !plot.paused
                setPaused(plot.paused)
              }}
            >
              {paused ? <Play size={13} /> : <Pause size={13} />}
            </Button>
          </Tooltip>
          <Tooltip content={t('tools.plot.clear')} size="sm" delay={300} closeDelay={0}>
            <Button size="sm" isIconOnly variant="light" aria-label={t('tools.plot.clearAria')} className="h-6 w-6 min-w-6" onPress={clearPlotter}>
              <Eraser size={13} />
            </Button>
          </Tooltip>
        </div>
      </div>
      <div ref={wrap} className="relative flex-1 min-h-0" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <canvas ref={canvas} className="absolute inset-0 w-full h-full" />
        {hover && (
          <>
            <div className="absolute top-2 bottom-[18px] w-px bg-white/30 pointer-events-none" style={{ left: hover.x }} />
            {hover.vals.length > 0 && (
              <div
                className="absolute top-2 pointer-events-none rounded-md border border-white/15 bg-neutral-900/95 px-2 py-1 text-[11px] font-mono text-neutral-200 shadow-lg"
                style={hover.x > (wrap.current?.clientWidth ?? 0) / 2 ? { right: (wrap.current?.clientWidth ?? 0) - hover.x + 8 } : { left: hover.x + 8 }}
              >
                <div className="text-neutral-500">#{hover.n}</div>
                {hover.vals.map(([s, v]) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: SERIES_COLORS[plot.order.indexOf(s)] }} />
                    {s}: {v}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {paused && (
          <Chip size="sm" variant="flat" className="absolute top-2 right-2" classNames={{ base: 'h-5 bg-white/10', content: 'text-[10px] text-neutral-300' }}>
            em pausa
          </Chip>
        )}
      </div>
    </div>
  )
}
