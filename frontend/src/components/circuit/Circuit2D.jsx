// Editor de circuito 2D (estilo Wokwi). As imagens das peças são renders
// ortográficos dos próprios modelos 3D, à mesma escala dos pinos.
import { startJoystickDrag } from '../../functions/joystickDrag.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ZoomIn, ZoomOut, Scan } from 'lucide-react'
import { Button, ButtonGroup, Tooltip } from '@heroui/react'
import { useStore } from '../../contexts/store.js'
import { controlUnder, startControl, wheelControl } from '../../functions/partControls.js'
import { DEFS, PITCH_PX, S2D, view2dInfo, pins2dLocal, pin2dWorld, rot2d, pinLabel, shortName, fmtOhms } from '@shared/components.js'
import { BOARD_BUTTONS, boardButtonAt, boardButtonInput } from '@shared/boardButtons.js'
import { plugOverlaps } from '@shared/netlist.js'
import { physicalPlugs } from '@shared/seating.js'
import { resistorBands } from '../three/models.jsx'
import { simRef } from '../../contexts/simRef.js'
import { pressButton, releaseButtons, setPot, setInput } from '../../services/simControl.js'
import { PART_UI } from '../three/parts/index.js'
import { LedImage, LED_HIT, ServoImage, hasServoImage } from './parts2d.jsx'
import { useT } from '../../i18n/index.js'
import { wirePolyline, roundedPath, previewPolyline, commitWaypoints, nearestSegment, dragSegment, polylineToPts, snap } from '../../functions/wires.js'

// contorno escuro sob o fio (claro para fios pretos, para não desaparecerem no fundo)
const outlineOf = (c) => (/^#(1a|21|00|0a)/i.test(c) ? '#6b6b6b' : '#000000')

function PartImage({ part, info, thumb }) {
  const { w, h } = info
  if (part.type === 'resistor') {
    const bands = resistorBands(part.config?.ohms ?? 220)
    return (
      <g>
        <line x1={-w / 2 + 6} y1={0} x2={w / 2 - 6} y2={0} stroke="#bdbdbd" strokeWidth={2.2} />
        <rect x={-13} y={-5} width={26} height={10} rx={4} fill="#e8d3a6" stroke="#b49a6a" strokeWidth={0.6} />
        {bands.map((c, i) => (
          <rect key={i} x={-9 + i * 5 + (i === 3 ? 2.5 : 0)} y={-5} width={2.2} height={10} fill={c} />
        ))}
      </g>
    )
  }
  if (part.type === 'led') return <LedImage part={part} />
  if (hasServoImage(part.type)) return <ServoImage part={part} />
  if (!thumb?.plan) return <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={6} fill="#1f1f1f" stroke="#333" />
  return <image href={thumb.plan} x={-w / 2} y={-h / 2} width={w} height={h} style={{ imageRendering: 'auto' }} />
}

function LiveOverlay({ part, info, tele }) {
  if (!tele) return null
  const UI = PART_UI[part.type]
  if (UI) {
    const ia = DEFS[part.type].interactive
    const inp = simRef.inputs[part.id] || {}
    return (
      <>
        {UI.Overlay2D && <UI.Overlay2D part={part} info={info} live={tele.live?.[part.id]} input={inp} />}
        {ia?.kind === 'toggle' && <InputBadge info={info} text={inp.on ? 'LIGADO' : 'desligado'} dark={!inp.on} />}
        {ia?.kind === 'press' && inp.pressed && <InputBadge info={info} text={ia.label || 'ATIVO'} />}
        {ia?.off && inp.off && <InputBadge info={info} text={ia.off} />}
        {ia?.kind === 'slider' && <InputBadge info={info} text={`${fmtInput(ia, inp.value)}`} />}
      </>
    )
  }
  const { w, h } = info
  if (part.type === 'led') return null // o brilho está no próprio desenho (parts2d.jsx)
  if (part.type === 'arduino') {
    const p = tele.pins[13]
    const on = tele.arduino && p.mode === 'OUTPUT' && (p.pwm ? p.duty : p.out) > 0.05
    return (
      <g pointerEvents="none">
        {tele.arduino && <circle cx={(-1.0 + 0.2) * 40 + 0} cy={(-1.2) * 40} r={6} fill="#33ff66" opacity={0.7} filter="url(#glow)" />}
        {on && <circle cx={(-0.6 + 0.2) * 40} cy={-1.75 * 40} r={6} fill="#ffaa00" opacity={0.85} filter="url(#glow)" />}
      </g>
    )
  }
  const badge = (txt, color = '#f5f5f5') => (
    <g transform={`translate(0, ${-h / 2 - 12})`} pointerEvents="none">
      <rect x={-34} y={-9} width={68} height={17} rx={8} fill={color} opacity={0.94} />
      <text textAnchor="middle" y={4} fontSize={11} fill={color === '#f5f5f5' ? '#0a0a0a' : '#fff'} fontWeight="700">
        {txt}
      </text>
    </g>
  )
  if (DEFS[part.type].servo) {
    const s = tele.servos.find((x) => x.id === part.id)
    return s ? badge(`${Math.round(s.angle)}°${s.stalled ? ' ⚠' : ''}`, s.stalled ? '#f59e0b' : '#f5f5f5') : null
  }
  if (part.type === 'motor') {
    const m = tele.motors.find((x) => x.id === part.id)
    return m ? badge(`${Math.round(m.rpm)} rpm`, Math.abs(m.rpm) > 1 ? '#f5f5f5' : '#404040') : null
  }
  if (part.type === 'ir') {
    const s = tele.irs.find((x) => x.id === part.id)
    return s ? badge(s.do ? 'PRETO' : 'branco', s.do ? '#000' : '#525252') : null
  }
  if (part.type === 'hcsr04') {
    const s = tele.sonars.find((x) => x.id === part.id)
    return s ? badge(`${s.dist.toFixed(0)} cm`) : null
  }
  if (part.type === 'buzzer') {
    const b = tele.buzzers?.find((x) => x.id === part.id)
    return b?.on ? badge('♪ BEEP', '#db2777') : null
  }
  if (part.type === 'pot') return badge(`${Math.round((simRef.inputs[part.id]?.value ?? part.config.value) * 100)}%`)
  if (part.type === 'button') return simRef.inputs[part.id]?.pressed ? badge('PREMIDO', '#dc2626') : null
  return w ? null : null
}

const fmtInput = (ia, v) => `${Math.round((v ?? ia.default ?? 0) * 100) / 100}${ia.unit ? ` ${ia.unit}` : ''}`
function InputBadge({ info, text, dark }) {
  const w = Math.max(56, text.length * 6.5 + 14)
  return (
    <g transform={`translate(0, ${-info.h / 2 - 12})`} pointerEvents="none">
      <rect x={-w / 2} y={-9} width={w} height={17} rx={8} fill={dark ? '#404040' : '#f5f5f5'} opacity={0.94} />
      <text textAnchor="middle" y={4} fontSize={11} fill={dark ? '#fff' : '#0a0a0a'} fontWeight="700">
        {text}
      </text>
    </g>
  )
}

export function Circuit2D() {
  const t = useT()
  const parts = useStore((s) => s.parts)
  const wires = useStore((s) => s.wires)
  const view = useStore((s) => s.view2d)
  const pending = useStore((s) => s.pendingPin)
  const selected = useStore((s) => s.selected)
  const wirePt2d = useStore((s) => s.wirePt2d)
  const mode = useStore((s) => s.mode)
  const thumbs = useStore((s) => s.thumbs)
  const tele = useStore((s) => s.telemetry)
  const set = useStore((s) => s.set)
  const svg = useRef()
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [cursor, setCursor] = useState(null)
  const [hoverPin, setHoverPin] = useState(null)
  const [hoverWire, setHoverWire] = useState(null)
  const [dragPoly, setDragPoly] = useState(null) // {id, poly} durante o arraste de um segmento
  const drag = useRef(null)

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(svg.current)
    return () => ro.disconnect()
  }, [])

  // enquadra o circuito ao abrir um projeto
  const projectName = useStore((s) => s.projectName)
  const fit = () => {
    const ps = useStore.getState().parts.filter((p) => p.sch && view2dInfo(p.type))
    if (!ps.length || !svg.current) return
    const r = svg.current.getBoundingClientRect()
    const xs = ps.flatMap((p) => [p.sch.x - view2dInfo(p.type).w / 2, p.sch.x + view2dInfo(p.type).w / 2])
    const ys = ps.flatMap((p) => [p.sch.y - view2dInfo(p.type).h / 2 - 20, p.sch.y + view2dInfo(p.type).h / 2 + 20])
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    const zoom = Math.min(2.5, Math.min(r.width / (x1 - x0 + 80), r.height / (y1 - y0 + 80)))
    set({ view2d: { x: (x0 + x1) / 2, y: (y0 + y1) / 2, zoom } })
  }
  const tab = useStore((s) => s.tab)
  useEffect(() => {
    const tm = setTimeout(fit, 50)
    return () => clearTimeout(tm)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectName, tab])

  const toWorld = (cx, cy) => {
    const r = svg.current.getBoundingClientRect()
    return [(cx - r.left - size.w / 2) / view.zoom + view.x, (cy - r.top - size.h / 2) / view.zoom + view.y]
  }

  // pinos encaixados (cinzento) e pinos sobre furos de uma peça desencaixada no 3D (âmbar: sem
  // ligação — levantada, pinos para cima…; shared/seating.js)
  const { plugged, loose } = useMemo(() => {
    const r = physicalPlugs(parts, plugOverlaps(parts))
    return { plugged: new Set(r.plugs.flat()), loose: new Set((r.dropped || []).flat()) }
  }, [parts])
  const drawable = parts.filter((p) => p.sch && view2dInfo(p.type))
  // por baixo: breadboards e placas com soquete (a Pico encaixada na Pico4Drive fica por cima)
  const under = (p) => DEFS[p.type]?.breadboard || Object.values(DEFS[p.type]?.mounts || {}).some((m) => m.socket)
  const ordered = [...drawable.filter(under), ...drawable.filter((p) => !under(p))]

  // ponto do ecrã → controlo da peça (x, z no referencial da peça, nas vistas de cima)
  const controlUnder2D = (part, cx, cy) => {
    const info = view2dInfo(part.type)
    if (info?.view !== 'top') return controlUnder(part, NaN, NaN)
    const [wx, wy] = toWorld(cx, cy)
    const [lx, ly] = rot2d([wx - part.sch.x, wy - part.sch.y], -(part.sch.rot || 0))
    return controlUnder(part, lx / S2D + info.center[0], ly / S2D + info.center[2])
  }
  const onWheel = (e) => {
    // simulação: a roda sobre um manípulo regula-o em vez de fazer zoom
    const pid = mode === 'sim' && e.target.closest?.('[data-pid]')?.dataset.pid
    const wp = pid && parts.find((q) => q.id === pid)
    if (wp && wheelControl(wp, controlUnder2D(wp, e.clientX, e.clientY), e)) return
    const [wx, wy] = toWorld(e.clientX, e.clientY)
    const z = Math.min(4, Math.max(0.2, view.zoom * Math.pow(1.0015, -e.deltaY)))
    // mantém o ponto sob o cursor
    const r = svg.current.getBoundingClientRect()
    const sx = e.clientX - r.left - size.w / 2
    const sy = e.clientY - r.top - size.h / 2
    set({ view2d: { zoom: z, x: wx - sx / z, y: wy - sy / z } })
  }

  const onBgDown = (e) => {
    if (e.button !== 0 && e.button !== 1) return
    const st = useStore.getState()
    if (st.pendingPin && e.button === 0) {
      const [x, y] = toWorld(e.clientX, e.clientY)
      // fixa o canto tal como aparece na pré-visualização
      if (!pendingStart) return st.addWaypoint(snap(x), snap(y))
      const poly = previewPolyline(pendingStart, st.pendingPin.pts, [snap(x), snap(y)])
      st.set({ pendingPin: { ...st.pendingPin, pts: poly.slice(1) } })
      return
    }
    if (e.button === 0) set({ selected: null })
    drag.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y }
    svg.current.setPointerCapture(e.pointerId)
  }
  const onMove = (e) => {
    const d = drag.current
    const [wx, wy] = toWorld(e.clientX, e.clientY)
    if (useStore.getState().pendingPin) setCursor([wx, wy])
    if (!d) return
    if (d.kind === 'pan') set({ view2d: { ...view, x: d.vx - (e.clientX - d.sx) / view.zoom, y: d.vy - (e.clientY - d.sy) / view.zoom } })
    if (d.kind === 'part') {
      d.moved = true
      useStore.getState().moveSch(d.id, wx - d.ox, wy - d.oy)
    }
    if (d.kind === 'seg') {
      d.moved = true
      d.last = dragSegment(d.poly, d.index, [wx, wy])
      setDragPoly({ id: d.id, poly: d.last })
    }
    if (d.kind === 'pot') {
      const v = Math.max(0, Math.min(1, d.v0 - (e.clientY - d.sy) / 150))
      setPot(d.id, v)
    }
  }
  const onUp = () => {
    const d = drag.current
    drag.current = null
    if (d?.kind === 'part' && d.moved) useStore.getState().finishMoves(d.id)
    if (d?.kind === 'seg') {
      if (d.moved && d.last) {
        const st = useStore.getState()
        st.set({ wires: st.wires.map((w) => (w.id === d.id ? { ...w, pts: polylineToPts(d.last) } : w)) })
      }
      setDragPoly(null)
    }
    releaseButtons()
  }

  const onPartDown = (e, part) => {
    if (e.button !== 0) return
    e.stopPropagation()
    if (mode === 'sim') {
      // botões da placa (RESET/EN, BOOT, BOOTSEL): clique no sítio do botão na imagem da placa
      const info = BOARD_BUTTONS[part.type] && view2dInfo(part.type)
      if (info?.view === 'top') {
        const [wx, wy] = toWorld(e.clientX, e.clientY)
        const [lx, ly] = rot2d([wx - part.sch.x, wy - part.sch.y], -(part.sch.rot || 0))
        const b = boardButtonAt(part.type, lx / S2D + info.center[0], ly / S2D + info.center[2])
        if (b) {
          setInput(part.id, boardButtonInput(b))
          svg.current.setPointerCapture(e.pointerId)
          return
        }
      }
      // manípulos e teclas (fonte, gerador, potenciómetros…): functions/partControls.js
      const c = controlUnder2D(part, e.clientX, e.clientY)
      if (c) {
        startControl(part, c, e)
        return
      }
      if (part.type === 'button') pressButton(part.id)
      const ia = DEFS[part.type].interactive
      if (ia?.kind === 'press' && !info) pressButton(part.id)
      if (ia?.kind === 'toggle') setInput(part.id, { on: !simRef.inputs[part.id]?.on })
      if (ia?.kind === 'joystick') {
        // manípulo: arrastar inclina (no referencial da peça, que pode estar rodada); premir = SW
        const a = (-(part.sch.rot || 0) * Math.PI) / 180
        const sx = e.clientX
        const sy = e.clientY
        const R = 40 * Math.max(0.5, view.zoom) // píxeis até ao fim de curso
        startJoystickDrag(part.id, e, (ev) => {
          const dx = ev.clientX - sx
          const dy = ev.clientY - sy
          return { dx: (dx * Math.cos(a) - dy * Math.sin(a)) / R, dy: (dx * Math.sin(a) + dy * Math.cos(a)) / R }
        })
        return
      }
      svg.current.setPointerCapture(e.pointerId)
      return
    }
    if (useStore.getState().pendingPin) return
    const [wx, wy] = toWorld(e.clientX, e.clientY)
    set({ selected: { kind: 'part', id: part.id }, leftTab: 'props' })
    drag.current = { kind: 'part', id: part.id, ox: wx - part.sch.x, oy: wy - part.sch.y }
    svg.current.setPointerCapture(e.pointerId)
  }

  const onDrop = (e) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/x-part')
    if (!type || mode !== 'build') return
    const [x, y] = toWorld(e.clientX, e.clientY)
    useStore.getState().addPart(type, { sch: { x, y } })
  }

  const pendingStart = pending && (() => {
    const p = parts.find((x) => x.id === pending.part)
    return p && pin2dWorld(p, pending.pin)
  })()

  const pinsVisible = (p) => !DEFS[p.type]?.breadboard || !!pending || hoverPin?.part === p.id || selected?.id === p.id

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0d0d0d]" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <svg
        ref={(el) => {
          svg.current = el
          simRef.svg2d = el // para exportar a imagem (ui/exportImage.js)
        }}
        className="w-full h-full select-none"
        onWheel={onWheel}
        onPointerDown={onBgDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onContextMenu={(e) => {
          e.preventDefault()
          // botão direito cancela o fio em construção (como no Wokwi)
          if (useStore.getState().pendingPin) set({ pendingPin: null })
        }}
      >
        <defs>
          <pattern id="grid" width={PITCH_PX * 2} height={PITCH_PX * 2} patternUnits="userSpaceOnUse">
            <circle cx={1} cy={1} r={0.9} fill="#2a2a2a" />
          </pattern>
          <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.45" />
          </filter>
        </defs>
        <g data-export="root" transform={`translate(${size.w / 2},${size.h / 2}) scale(${view.zoom}) translate(${-view.x},${-view.y})`}>
          <rect data-export="skip" x={view.x - size.w / view.zoom} y={view.y - size.h / view.zoom} width={(size.w / view.zoom) * 2} height={(size.h / view.zoom) * 2} fill="url(#grid)" />

          {/* peças */}
          {ordered.map((p) => {
            const info = view2dInfo(p.type)
            const sel = selected?.kind === 'part' && selected.id === p.id
            const hit = p.type === 'led' ? LED_HIT : { x: -info.w / 2, y: -info.h / 2, w: info.w, h: info.h }
            return (
              <g key={p.id} transform={`translate(${p.sch.x},${p.sch.y}) rotate(${p.sch.rot || 0})`}>
                <g data-pid={p.id} onPointerDown={(e) => onPartDown(e, p)} style={{ cursor: mode === 'sim' ? (p.type === 'button' || p.type === 'pot' || DEFS[p.type]?.controls || DEFS[p.type]?.interactive ? 'pointer' : 'default') : 'move' }} filter={DEFS[p.type]?.breadboard ? undefined : 'url(#shadow)'}>
                  <PartImage part={p} info={info} thumb={thumbs[p.type]} />
                  <rect x={hit.x} y={hit.y} width={hit.w} height={hit.h} fill="transparent" />
                </g>
                {sel && <rect data-export="skip" x={hit.x - 4} y={hit.y - 4} width={hit.w + 8} height={hit.h + 8} rx={6} fill="none" stroke="#fff" strokeWidth={1.5 / view.zoom} strokeDasharray="5 4" />}
                {mode === 'sim' && <LiveOverlay part={p} info={info} tele={tele} />}
              </g>
            )
          })}

          {/* fios */}
          {wires.map((wr) => {
            const pa = parts.find((p) => p.id === wr.a.part)
            const pb = parts.find((p) => p.id === wr.b.part)
            const a = pa && pin2dWorld(pa, wr.a.pin)
            const b = pb && pin2dWorld(pb, wr.b.pin)
            if (!a || !b) return null
            const poly = dragPoly?.id === wr.id ? dragPoly.poly : wirePolyline(a, wr.pts || [], b)
            const d = roundedPath(poly)
            const sel = selected?.kind === 'wire' && selected.id === wr.id
            const hov = hoverWire === wr.id && !sel
            return (
              <g
                key={wr.id}
                onPointerEnter={() => setHoverWire(wr.id)}
                onPointerLeave={() => setHoverWire(null)}
                onPointerDown={(e) => {
                  if (mode !== 'build' || useStore.getState().pendingPin || e.button !== 0) return
                  e.stopPropagation()
                  set({ selected: { kind: 'wire', id: wr.id }, leftTab: 'props', ...(sel ? {} : { wirePt2d: null }) })
                  // arrastar um segmento redesenha o percurso do fio
                  const seg = nearestSegment(poly, toWorld(e.clientX, e.clientY))
                  if (seg.index >= 0) {
                    drag.current = { kind: 'seg', id: wr.id, index: seg.index, poly }
                    svg.current.setPointerCapture(e.pointerId)
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  if (mode === 'build') set({ wires: useStore.getState().wires.map((x) => (x.id === wr.id ? { ...x, pts: [] } : x)) })
                }}
                style={{ cursor: sel ? 'move' : 'pointer' }}
              >
                <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
                <path d={d} fill="none" stroke={outlineOf(wr.color)} strokeWidth={sel ? 6 : 5} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
                {hov && <path d={d} fill="none" stroke="#fff" strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" opacity={0.18} />}
                <path d={d} fill="none" stroke={wr.color} strokeWidth={sel ? 3 : 2.4} strokeLinejoin="round" strokeLinecap="round" />
                {sel && <path d={d} fill="none" stroke="#fff" strokeWidth={1.2} strokeDasharray="6 4" opacity={0.7} pointerEvents="none" />}
                {/* canto escolhido no painel (sliders X/Y) */}
                {sel && wirePt2d != null && poly[wirePt2d + 1] && wirePt2d + 1 < poly.length - 1 && (
                  <circle cx={poly[wirePt2d + 1][0]} cy={poly[wirePt2d + 1][1]} r={4.5} fill="#4fc3f7" stroke="#fff" strokeWidth={1.2} pointerEvents="none" />
                )}
                {sel &&
                  poly.slice(0, -1).map((p, i) => {
                    const q = poly[i + 1]
                    if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 14) return null
                    const horiz = p[1] === q[1]
                    return (
                      <rect
                        key={i}
                        x={(p[0] + q[0]) / 2 - (horiz ? 5 : 2.5)}
                        y={(p[1] + q[1]) / 2 - (horiz ? 2.5 : 5)}
                        width={horiz ? 10 : 5}
                        height={horiz ? 5 : 10}
                        rx={1.5}
                        fill="#fff"
                        stroke="#000"
                        strokeWidth={0.6}
                        style={{ cursor: horiz ? 'ns-resize' : 'ew-resize' }}
                        pointerEvents="none"
                      />
                    )
                  })}
                <circle cx={a[0]} cy={a[1]} r={2.8} fill={wr.color} stroke="#000" strokeWidth={0.8} />
                <circle cx={b[0]} cy={b[1]} r={2.8} fill={wr.color} stroke="#000" strokeWidth={0.8} />
              </g>
            )
          })}

          {/* fio em construção */}
          {pendingStart &&
            (() => {
              const wc = useStore.getState().wireColor
              const end = hoverPin ? [hoverPin.x, hoverPin.y] : cursor ? [snap(cursor[0]), snap(cursor[1])] : null
              const poly = end ? previewPolyline(pendingStart, pending.pts, end) : [pendingStart, ...pending.pts]
              const d = roundedPath(poly)
              return (
                <g pointerEvents="none">
                  <path d={d} fill="none" stroke={outlineOf(wc)} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
                  <path d={d} fill="none" stroke={wc} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
                  <path d={d} fill="none" stroke="#fff" strokeWidth={1.2} strokeDasharray="6 4" opacity={0.5} />
                  <circle cx={pendingStart[0]} cy={pendingStart[1]} r={4} fill={wc} stroke="#fff" strokeWidth={1.2} />
                  {pending.pts.map((p, i) => (
                    <circle key={i} cx={p[0]} cy={p[1]} r={3} fill={wc} stroke="#fff" strokeWidth={1} />
                  ))}
                  {end && <circle cx={end[0]} cy={end[1]} r={4} fill={wc} stroke="#fff" strokeWidth={1.2} opacity={0.75} />}
                </g>
              )
            })()}

          {/* pinos */}
          {ordered.map((p) => {
            if (!pinsVisible(p) && DEFS[p.type]?.breadboard) {
              return (
                <rect
                  key={`${p.id}-hit`}
                  x={p.sch.x - view2dInfo(p.type).w / 2}
                  y={p.sch.y - view2dInfo(p.type).h / 2}
                  width={view2dInfo(p.type).w}
                  height={view2dInfo(p.type).h}
                  fill="transparent"
                  pointerEvents="none"
                />
              )
            }
            return pins2dLocal(p.type).map((lp) => {
              const [rx, ry] = rot2d(lp.xy, p.sch.rot || 0)
              const x = p.sch.x + rx
              const y = p.sch.y + ry
              const k = `${p.id}:${lp.id}`
              const isPending = pending?.part === p.id && pending?.pin === lp.id
              const isHover = hoverPin?.part === p.id && hoverPin?.pin === lp.id
              const isPlugged = plugged.has(k)
              const isLoose = loose.has(k)
              const isWired = wires.some((w) => (w.a.part === p.id && w.a.pin === lp.id) || (w.b.part === p.id && w.b.pin === lp.id))
              const bb = !!DEFS[p.type]?.breadboard
              const r = bb ? 3.2 : 3.4
              return (
                <rect
                  key={k}
                  x={x - r}
                  y={y - r}
                  width={r * 2}
                  height={r * 2}
                  rx={1}
                  fill={isPending ? '#fff' : isHover ? '#fff' : isLoose ? '#f59e0b' : isPlugged ? '#9ca3af' : isWired ? '#d4d4d4' : bb ? 'transparent' : '#f5c84b'}
                  fillOpacity={bb && !isHover && !isPending && !isPlugged && !isLoose ? 0 : 0.95}
                  stroke={isHover && pending ? '#22c55e' : bb && !isHover ? 'transparent' : '#0007'}
                  strokeWidth={isHover && pending ? 2 : 0.6}
                  style={{ cursor: 'crosshair' }}
                  onPointerEnter={() => setHoverPin({ part: p.id, pin: lp.id, x, y })}
                  onPointerLeave={() => setHoverPin(null)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (mode !== 'build') return
                    const st = useStore.getState()
                    const pts = st.pendingPin && pendingStart ? commitWaypoints(pendingStart, st.pendingPin.pts, [x, y]) : undefined
                    st.clickPin(p.id, lp.id, pts)
                  }}
                />
              )
            })
          })}

          {/* dica do pino */}
          {hoverPin &&
            (() => {
              const p = parts.find((x) => x.id === hoverPin.part)
              if (!p) return null
              const v = mode === 'sim' && simRef.engine ? simRef.engine.pinVoltage(p.id, hoverPin.pin) : undefined
              const txt = `${pinLabel(p.type, hoverPin.pin)} · ${shortName(p, parts)}${v === undefined ? '' : v === null ? ` · ${t({ pt: 'flutuante', en: 'floating' })}` : ` · ${v.toFixed(2)} V`}`
              const wpx = txt.length * 6.4 + 14
              return (
                <g transform={`translate(${hoverPin.x},${hoverPin.y - 14}) scale(${1 / Math.max(0.6, view.zoom)})`} pointerEvents="none">
                  <rect x={-wpx / 2} y={-18} width={wpx} height={20} rx={5} fill="#000" stroke="#fff" strokeOpacity={0.6} />
                  <text textAnchor="middle" y={-4} fontSize={12} fill="#fff" fontFamily="system-ui">
                    {txt}
                  </text>
                </g>
              )
            })()}

          {/* rótulos */}
          {ordered.map((p) => {
            const info = view2dInfo(p.type)
            const [ox, oy] = [0, info.h / 2 + 12]
            return (
              <text key={`${p.id}-l`} x={p.sch.x + ox} y={p.sch.y + oy} textAnchor="middle" fontSize={10} fill="#8a8a8a" pointerEvents="none" fontFamily="system-ui">
                {p.type === 'resistor' && !p.label ? fmtOhms(p.config?.ohms ?? 220) : shortName(p, parts)}
              </text>
            )
          })}
        </g>
      </svg>
      {!drawable.length && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none text-neutral-500 text-sm">{t('wb.circuit.empty')}</div>
      )}
      <ButtonGroup size="sm" variant="bordered" className="absolute right-2 bottom-2 bg-black/70 rounded-lg">
        <Tooltip content={t('wb.circuit.zoomIn')} delay={400} closeDelay={0}>
          <Button isIconOnly aria-label={t('wb.circuit.zoomIn')} onPress={() => set({ view2d: { ...view, zoom: Math.min(4, view.zoom * 1.2) } })}>
            <ZoomIn size={14} />
          </Button>
        </Tooltip>
        <Tooltip content={t('wb.circuit.zoomOut')} delay={400} closeDelay={0}>
          <Button isIconOnly aria-label={t('wb.circuit.zoomOut')} onPress={() => set({ view2d: { ...view, zoom: Math.max(0.2, view.zoom / 1.2) } })}>
            <ZoomOut size={14} />
          </Button>
        </Tooltip>
        <Tooltip content={t('wb.circuit.fitAll')} delay={400} closeDelay={0}>
          <Button isIconOnly aria-label={t('wb.circuit.fitAll')} onPress={fit}>
            <Scan size={14} />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </div>
  )
}
