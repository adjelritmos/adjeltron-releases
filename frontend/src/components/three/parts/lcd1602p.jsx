// LCD 16×2 paralelo (HD44780, 16 pinos). O conteúdo vem do controlador simulado no backend
// (sim/parts/lcd1602p.js): linhas, CGRAM, cursor, contraste (VDD − V0) e retroiluminação.
import { Box, Cyl, Pcb, HeaderPins } from '../kit.jsx'
import def, { LCDP_PIN_Y } from '@shared/parts/lcd1602p.js'
import { useLiveTexture, FacePlane, rectOf } from './_groupA.jsx'

const clamp = (v) => Math.max(0, Math.min(1, v))

// visibilidade do texto e dos pontos de fundo a partir da tensão de contraste
export function contrastOf(L) {
  const c = L?.contrast ?? 0
  return { text: clamp((c - 3.4) / 0.6), cells: 0.06 + clamp((c - 4.4) / 0.5) * 0.45 }
}

// matriz 5×8 de um carácter personalizado (CGRAM) ou null
const glyphRows = (L, ch) => {
  const code = ch.charCodeAt(0)
  if (code > 7) return null
  return Array.from({ length: 8 }, (_, r) => L?.cg?.[code * 8 + r] ?? 0)
}

const makeDraw = (COLS, ROWS) => function drawLcd(ctx, w, h, L) {
  const on = !!L?.powered
  const bl = on ? Math.max(0, Math.min(1, L.bl ?? 0)) : 0
  // verde-amarelo aceso; sem retroiluminação fica um verde-oliva escuro
  const lit = (a, b) => Math.round(a + (b - a) * bl)
  ctx.fillStyle = `rgb(${lit(52, 126)},${lit(72, 198)},${lit(30, 54)})`
  ctx.fillRect(0, 0, w, h)
  const cw = w / COLS
  const ch = h / ROWS
  const k = on ? contrastOf(L) : { text: 0, cells: 0.1 }
  const ink = bl > 0.3 ? '16,36,10' : '10,20,6'
  const px = (cw - 6) / 5
  const py = (ch - 8) / 8
  for (let r = 0; r < ROWS; r++) {
    const line = String(L?.lines?.[r] ?? '')
    for (let c = 0; c < COLS; c++) {
      const x0 = c * cw + 3
      const y0 = r * ch + 4
      // sem inicialização (modo de 1 linha) a primeira linha mostra blocos escuros
      const block = on && !L?.inited && r === 0
      ctx.fillStyle = `rgba(${ink},${block ? Math.min(0.85, k.cells + k.text * 0.6) : k.cells})`
      ctx.fillRect(x0, y0, cw - 6, ch - 8)
      if (!on || L.display === false || !k.text) continue
      const t = line[c]
      if (!t || t === ' ') continue
      ctx.fillStyle = `rgba(${ink},${k.text})`
      const g = glyphRows(L, t)
      if (g) {
        for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 5; xx++) if (g[yy] & (1 << (4 - xx))) ctx.fillRect(x0 + xx * px, y0 + yy * py, px - 1, py - 1)
      } else {
        ctx.font = `bold ${Math.round(ch * 0.74)}px "Courier New", monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(t, c * cw + cw / 2, r * ch + ch / 2 + 1)
      }
    }
  }
  // cursor (sublinhado e/ou bloco a piscar)
  const cur = on && L.display !== false ? L.cursor : null
  if (cur && k.text) {
    const x0 = cur.c * cw + 3
    const y0 = cur.r * ch + 4
    ctx.fillStyle = `rgba(${ink},${k.text})`
    if (cur.line) ctx.fillRect(x0, y0 + ch - 8 - py, cw - 6, py - 1)
    if (cur.blink && Math.floor(Date.now() / 500) % 2) ctx.fillRect(x0, y0, cw - 6, ch - 8)
  }
}

// fábrica: LCD paralelo de COLS × ROWS (16×2, 20×4) com a placa, a moldura e o vidro dados
export function makeLcdParallel({ type, def, PIN_Y, COLS, ROWS, pcb, frame, glass, texW, texH }) {
const GLASS = glass
const drawLcd = makeDraw(COLS, ROWS)
function Model({ part }) {
  const tex = useLiveTexture(part.id, texW, texH, drawLcd, { key: (L) => JSON.stringify(L ?? null) + (L?.cursor?.blink ? Math.floor(Date.now() / 500) % 2 : '') })
  const gw = GLASS.x[1] - GLASS.x[0]
  const gd = GLASS.z[1] - GLASS.z[0]
  return (
    <group>
      <Pcb size={pcb} color="#1f6f2a" />
      {/* moldura metálica e vidro */}
      <Box size={[frame[0], 0.72, frame[1]]} pos={[0, 0.16 + 0.36, 0]} color="#1a1a1a" rough={0.45} />
      <Box size={[frame[0] - 0.35, 0.02, frame[1] - 0.55]} pos={[0, 0.885, 0]} color="#0e0e0e" />
      <FacePlane tex={tex} w={gw} d={gd} pos={[0, 0.9, 0]} />
      {/* 16 pinos macho no bordo de cima (furos com anel dourado) */}
      {def.pins.map((p) => (
        <Cyl key={p.id} r={0.08} h={0.02} pos={[p.pos[0], 0.165, p.pos[2]]} color="#d4af37" metal={0.8} rough={0.3} seg={10} />
      ))}
      <HeaderPins pins={def.pins.map((p) => ({ ...p, pos: [p.pos[0], PIN_Y, p.pos[2]] }))} base={0.16} />
      {/* resistência da retroiluminação (R8) e "gotas" de epóxi dos controladores na traseira */}
      {(part.config?.blR ?? 100) > 0 && <Box size={[0.2, 0.06, 0.1]} pos={[def.pins[15].pos[0] + 0.6, 0.19, def.pins[0].pos[2]]} color="#222" />}
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Cyl key={`${sx}${sz}`} r={0.16} h={0.02} pos={[sx * (pcb[0] / 2 - 0.25), 0.165, sz * (pcb[2] / 2 - 0.25)]} color="#d4af37" metal={0.8} seg={14} />))}
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered) return null
  const r = rectOf(info, GLASS.x[0], GLASS.z[0], GLASS.x[1], GLASS.z[1])
  const bl = Math.max(0, Math.min(1, live.bl ?? 0))
  const k = contrastOf(live)
  const lines = live.lines || []
  const cw = (r.w - 6) / COLS
  return (
    <g pointerEvents="none">
      <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={bl > 0.3 ? '#7ec636' : '#3f5a22'} />
      {!live.inited && (
        <rect x={r.x + 3} y={r.y + 2} width={r.w - 6} height={r.h / ROWS - 4} fill="#10240a" opacity={Math.min(0.85, k.cells + k.text * 0.6)} />
      )}
      {k.text > 0 &&
        Array.from({ length: ROWS }, (_, row) => row).map((row) => (
          <text key={row} x={r.x + 3} y={r.y + (r.h / ROWS) * (row + 0.74)} fontFamily='"Courier New", monospace' fontWeight="700" fontSize={(r.h / ROWS) * 0.72} fill="#10240a" opacity={k.text} textLength={cw * COLS} lengthAdjust="spacingAndGlyphs" xmlSpace="preserve">
            {live.display === false ? '' : String(lines[row] ?? '').replace(/[\u0000-\u0007]/g, '▓').slice(0, COLS).padEnd(COLS)}
          </text>
        ))}
    </g>
  )
}

return { type, Model, Overlay2D }
}

export default makeLcdParallel({ type: 'lcd1602p', def, PIN_Y: LCDP_PIN_Y, COLS: 16, ROWS: 2, pcb: [8.0, 0.16, 3.6], frame: [7.1, 2.45], glass: { x: [-3.3, 3.3], z: [-0.78, 0.78] }, texW: 640, texH: 160 })
