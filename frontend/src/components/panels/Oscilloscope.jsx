// Osciloscópio / analisador lógico: até 4 pinos da placa, base de tempo (µs–ms por divisão),
// disparo na subida do CH1, medida de frequência e duty. O backend só regista os pinos
// enquanto esta janela está aberta (mensagem 'scope' da sessão).
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, CardBody, Chip, Select, SelectItem, Tooltip } from '@heroui/react'
import { Activity, Pause, Play, X } from 'lucide-react'
import { useStore } from '../../contexts/store.js'
import { DEFS } from '@shared/components.js'
import { profileOfDef } from '@shared/boards.js'
import { setScopePins } from '../../services/simControl.js'
import { SERIES_COLORS } from './SerialPlotter.jsx'
import { useT } from '../../i18n/index.js'

const KEEP_US = 2_000_000 // memória: últimos 2 s de tempo simulado
const MAX_EV = 60000
const DIVS = 10
const TIMEBASES = [
  [10, '10 µs'], [20, '20 µs'], [50, '50 µs'], [100, '100 µs'], [200, '200 µs'], [500, '500 µs'],
  [1000, '1 ms'], [2000, '2 ms'], [5000, '5 ms'], [10000, '10 ms'], [20000, '20 ms'], [50000, '50 ms'], [100000, '100 ms'], [200000, '200 ms'],
]
const COLORS = SERIES_COLORS.slice(0, 4)

// ---------- dados recebidos (fora do React) ----------
const buf = { t: 0, vio: 5, ch: [null, null, null, null], version: 0 }
let lastPins = ['', '', '', '']

export function feedScope(msg) {
  buf.t = msg.t
  buf.vio = msg.vio || buf.vio
  msg.ch.forEach((c, i) => {
    if (!c) return (buf.ch[i] = null)
    let b = buf.ch[i]
    if (!b || b.pin !== c.pin) b = buf.ch[i] = { pin: c.pin, name: c.name, ev: [], pwm: null, v: null }
    for (const e of c.ev) b.ev.push(e)
    // descarta o que já saiu da memória
    let cut = 0
    while (cut < b.ev.length - 1 && (b.ev[cut + 1][0] < msg.t - KEEP_US || b.ev.length - cut > MAX_EV)) cut++
    if (cut) b.ev.splice(0, cut)
    b.pwm = c.pwm
    b.v = c.v ?? b.v
  })
  buf.version++
}
const resetBuf = () => {
  buf.ch = [null, null, null, null]
  buf.version++
}

// índice do último evento com t <= x
function lastBefore(ev, x) {
  let lo = 0
  let hi = ev.length - 1
  let r = -1
  while (lo <= hi) {
    const m = (lo + hi) >> 1
    if (ev[m][0] <= x) {
      r = m
      lo = m + 1
    } else hi = m - 1
  }
  return r
}

// frequência e duty a partir das transições registadas (últimos 0,5 s)
function measure(b, vio, now) {
  if (!b) return null
  if (b.pwm) return { f: b.pwm.f, d: b.pwm.d }
  const th = vio / 2
  const t0 = now - 500000
  const rises = []
  let prev = null
  for (const [t, v] of b.ev) {
    if (t >= t0 && prev && prev[1] < th && v >= th) rises.push(t)
    prev = [t, v]
  }
  if (rises.length < 2) return { f: 0, d: 0 }
  // mediana dos períodos e das larguras do impulso (ignora pausas, ex.: tone() intermitente)
  const falls = []
  prev = null
  for (const [t, v] of b.ev) {
    if (t >= t0 && prev && prev[1] >= th && v < th) falls.push(t)
    prev = [t, v]
  }
  const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1]
  const per = med(rises.slice(1).map((t, i) => t - rises[i]))
  const widths = []
  let j = 0
  for (const r of rises) {
    while (j < falls.length && falls[j] <= r) j++
    if (j < falls.length && falls[j] - r < per) widths.push(falls[j] - r)
  }
  return { f: 1e6 / per, d: widths.length ? med(widths) / per : 0 }
}
const fmtF = (f) => (f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 1 : 2)} kHz` : `${f.toFixed(f >= 100 ? 1 : 2)} Hz`)

export function Oscilloscope() {
  const tr = useT() // (t é usado no desenho para o tempo)
  const open = useStore((s) => s.scopeOpen)
  const set = useStore((s) => s.set)
  const parts = useStore((s) => s.parts)
  const running = useStore((s) => s.mode === 'sim')
  const board = parts.find((p) => DEFS[p.type]?.board)
  const prof = profileOfDef(board ? DEFS[board.type] : null)
  const pinOpts = useMemo(() => [{ key: 'none', label: '—' }, ...prof.pins.map((id, n) => (id ? { key: String(n), label: id } : null)).filter(Boolean)], [prof])
  const [pins, setPins] = useState(lastPins)
  const [tb, setTb] = useState(1000)
  const [trig, setTrig] = useState('rise')
  const [hold, setHold] = useState(false)
  const [meas, setMeas] = useState([])
  const canvas = useRef(null)
  const wrap = useRef(null)
  const frozen = useRef(null)

  // envia os pinos ao backend enquanto está aberto
  useEffect(() => {
    if (!open) return
    lastPins = pins
    setScopePins(pins.map((p) => (p === '' ? null : +p)))
    return () => setScopePins([])
  }, [open, pins])
  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setMeas(buf.ch.map((b) => measure(b, buf.vio, buf.t))), 300)
    return () => clearInterval(id)
  }, [open])

  useEffect(() => {
    if (!open) return
    let raf = 0
    let drawn = ''
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const cv = canvas.current
      const el = wrap.current
      if (!cv || !el) return
      const w = el.clientWidth
      const h = el.clientHeight
      const key = `${hold ? 'H' : buf.version}|${w}|${h}|${tb}|${trig}`
      if (key === drawn) return
      drawn = key
      const dpr = window.devicePixelRatio || 1
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr)
        cv.height = Math.round(h * dpr)
      }
      const g = cv.getContext('2d')
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.fillStyle = '#000'
      g.fillRect(0, 0, w, h)
      const W = tb * DIVS
      const vio = buf.vio
      // janela: disparo na subida do CH1 (1 divisão antes), senão os últimos W µs
      let start = buf.t - W
      let trigAt = null
      if (!hold) {
        const c1 = buf.ch[0]
        if (trig === 'rise' && c1) {
          const th = vio / 2
          for (let i = c1.ev.length - 1; i > 0; i--) {
            const t = c1.ev[i][0]
            if (t > buf.t - W * 0.9) continue
            if (c1.ev[i - 1][1] < th && c1.ev[i][1] >= th) {
              trigAt = t
              break
            }
          }
          if (trigAt != null) start = trigAt - tb
        }
        frozen.current = { start, trigAt, t: buf.t }
      } else if (frozen.current) ({ start, trigAt } = frozen.current)
      const L = { l: 30, r: 6, t: 4, b: 16 }
      const pw = w - L.l - L.r
      const ph = h - L.t - L.b
      const X = (t) => L.l + ((t - start) / W) * pw
      // grelha
      g.strokeStyle = 'rgba(255,255,255,0.08)'
      g.lineWidth = 1
      for (let k = 0; k <= DIVS; k++) {
        const x = Math.round(L.l + (k / DIVS) * pw) + 0.5
        g.beginPath()
        g.moveTo(x, L.t)
        g.lineTo(x, L.t + ph)
        g.stroke()
      }
      const lanes = buf.ch.map((b, i) => (pins[i] !== '' ? i : -1)).filter((i) => i >= 0)
      const n = Math.max(1, lanes.length)
      const lh = ph / n
      g.font = '10px ui-monospace, monospace'
      lanes.forEach((ci, li) => {
        const y0 = L.t + li * lh
        const Y = (v) => y0 + 4 + (1 - Math.max(0, Math.min(1, v / vio))) * (lh - 10)
        // separador e referências 0 V / Vcc
        g.strokeStyle = 'rgba(255,255,255,0.12)'
        g.beginPath()
        g.moveTo(L.l, Math.round(y0 + lh) + 0.5)
        g.lineTo(w - L.r, Math.round(y0 + lh) + 0.5)
        g.stroke()
        g.fillStyle = COLORS[ci]
        g.textAlign = 'right'
        g.textBaseline = 'middle'
        g.fillText(`CH${ci + 1}`, L.l - 4, y0 + lh / 2)
        const b = buf.ch[ci]
        if (!b || !b.ev.length) return
        const ev = b.ev
        let i = lastBefore(ev, start)
        let v = i >= 0 ? ev[i][1] : ev[0][1]
        g.save()
        g.beginPath()
        g.rect(L.l, y0, pw, lh)
        g.clip()
        g.strokeStyle = COLORS[ci]
        g.lineWidth = 2
        g.lineJoin = 'round'
        g.beginPath()
        g.moveTo(L.l, Y(v))
        const end = hold && frozen.current ? frozen.current.t : buf.t
        for (i = Math.max(0, i + 1); i < ev.length && ev[i][0] <= start + W; i++) {
          const x = X(ev[i][0])
          g.lineTo(x, Y(v))
          v = ev[i][1]
          g.lineTo(x, Y(v))
        }
        g.lineTo(Math.min(X(end), L.l + pw), Y(v))
        g.stroke()
        g.restore()
      })
      // marca do disparo
      if (trigAt != null) {
        g.fillStyle = '#e5e5e5'
        const x = X(trigAt)
        g.beginPath()
        g.moveTo(x - 4, L.t)
        g.lineTo(x + 4, L.t)
        g.lineTo(x, L.t + 6)
        g.fill()
      }
      // escala de tempo
      g.fillStyle = '#737373'
      g.textAlign = 'center'
      g.textBaseline = 'top'
      const lab = (us) => (Math.abs(us) >= 1000 ? `${+(us / 1000).toFixed(2)} ms` : `${Math.round(us)} µs`)
      for (let k = 0; k <= DIVS; k += 2) g.fillText(trigAt != null ? lab((k - 1) * tb) : lab((k - DIVS) * tb), L.l + (k / DIVS) * pw, L.t + ph + 3)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [open, tb, trig, hold, pins])

  if (!open) return null
  const setPin = (i, k) => {
    const next = pins.slice()
    next[i] = k === 'none' || k == null ? '' : String(k)
    resetBuf()
    setPins(next)
  }
  return (
    <Card className="fixed bottom-4 right-4 z-40 w-[min(640px,calc(100vw-32px))] border border-white/10 bg-black/95 backdrop-blur" shadow="lg" radius="lg">
      <CardBody className="p-2 gap-2 text-neutral-100">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-neutral-400" />
          <span className="text-xs font-medium">{tr('tools.scope.title')}</span>
          {!running && <span className="text-[11px] text-neutral-500">{tr('tools.scope.startHint')}</span>}
          <div className="ml-auto flex items-center gap-1">
            <Tooltip content={hold ? tr('tools.scope.runTip') : tr('tools.scope.stopTip')} size="sm" delay={300} closeDelay={0}>
              <Button size="sm" isIconOnly variant="light" aria-label={hold ? tr('tools.scope.run') : tr('tools.scope.stop')} className="h-6 w-6 min-w-6" onPress={() => setHold(!hold)}>
                {hold ? <Play size={13} /> : <Pause size={13} />}
              </Button>
            </Tooltip>
            <Button size="sm" isIconOnly variant="light" aria-label={tr('tools.scope.close')} className="h-6 w-6 min-w-6" onPress={() => set({ scopeOpen: false })}>
              <X size={14} />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <Select
              key={i}
              size="sm"
              aria-label={tr('tools.scope.channelPin', { n: i + 1 })}
              label={<span style={{ color: COLORS[i] }}>CH{i + 1}</span>}
              labelPlacement="inside"
              selectedKeys={[pins[i] === '' ? 'none' : pins[i]]}
              onSelectionChange={(keys) => setPin(i, [...keys][0])}
              disallowEmptySelection
              classNames={{ trigger: 'min-h-10 h-10', value: 'text-xs font-mono' }}
            >
              {pinOpts.map((o) => (
                <SelectItem key={o.key}>{o.label}</SelectItem>
              ))}
            </Select>
          ))}
          <Select size="sm" label={tr('tools.scope.timeDiv')} aria-label={tr('tools.scope.timebase')} selectedKeys={[String(tb)]} onSelectionChange={(k) => setTb(+[...k][0] || 1000)} disallowEmptySelection classNames={{ trigger: 'min-h-10 h-10', value: 'text-xs' }}>
            {TIMEBASES.map(([us, l]) => (
              <SelectItem key={String(us)}>{l}</SelectItem>
            ))}
          </Select>
          <Select size="sm" label={tr('tools.scope.trigger')} aria-label={tr('tools.scope.trigger')} selectedKeys={[trig]} onSelectionChange={(k) => setTrig([...k][0] || 'rise')} disallowEmptySelection classNames={{ trigger: 'min-h-10 h-10', value: 'text-xs' }}>
            <SelectItem key="rise">↑ CH1</SelectItem>
            <SelectItem key="auto">{tr('tools.scope.free')}</SelectItem>
          </Select>
        </div>
        <div ref={wrap} className="relative h-56 rounded-md border border-white/10 overflow-hidden">
          <canvas ref={canvas} className="absolute inset-0 w-full h-full" />
          {!pins.some((p) => p !== '') && <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-500">Escolha um pino em CH1…CH4</div>}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[0, 1, 2, 3].map((i) =>
            pins[i] === '' ? null : (
              <Chip key={i} size="sm" variant="flat" classNames={{ base: 'h-5 bg-white/[0.06]', content: 'text-[11px] font-mono text-neutral-200 px-1' }} startContent={<span className="w-2 h-2 rounded-full ml-1" style={{ background: COLORS[i] }} />}>
                {prof.pins[+pins[i]]}: {meas[i] ? (meas[i].f > 0 ? `${fmtF(meas[i].f)} · duty ${(meas[i].d * 100).toFixed(1)} %` : buf.ch[i]?.v != null ? `${buf.ch[i].v.toFixed(2)} V` : '—') : '—'}
              </Chip>
            ),
          )}
        </div>
      </CardBody>
    </Card>
  )
}
