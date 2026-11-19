// LCD 16×2 paralelo (HD44780, 16 pinos). O conteúdo vem do controlador simulado no backend
// (sim/parts/lcd1602p.js): linhas, CGRAM, cursor, contraste (VDD − V0) e retroiluminação.
import { HeaderPins } from '../kit.jsx'
import { paintLcd, LcdModule } from './_lcdGlyph.jsx'
import { SmdParts } from './_gDisplays.jsx'
import def, { LCDP_PIN_Y } from '@shared/parts/lcd1602p.js'
import { useLiveTexture, rectOf } from './_groupA.jsx'

const clamp = (v) => Math.max(0, Math.min(1, v))

// visibilidade do texto e dos pontos de fundo a partir da tensão de contraste
export function contrastOf(L) {
  const c = L?.contrast ?? 0
  return { text: clamp((c - 3.4) / 0.6), cells: 0.06 + clamp((c - 4.4) / 0.5) * 0.45 }
}

const makeDraw = (COLS, ROWS, INSET) =>
  function drawLcd(ctx, w, h, L) {
    const on = !!L?.powered
    const bl = on ? clamp(L.bl ?? 0) : 0
    // verde-amarelo aceso; sem retroiluminação fica um verde-oliva escuro
    const lit = (a, b) => Math.round(a + (b - a) * bl)
    ctx.fillStyle = `rgb(${lit(52, 134)},${lit(72, 204)},${lit(30, 58)})`
    ctx.fillRect(0, 0, w, h)
    if (bl > 0.05) {
      // a luz dos LEDs da retroiluminação: centro um pouco mais claro, cantos mais escuros
      const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.6)
      g.addColorStop(0, `rgba(255,255,210,${0.12 * bl})`)
      g.addColorStop(1, `rgba(0,30,0,${0.18 * bl})`)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    }
    const k = on ? contrastOf(L) : { text: 0, cells: 0.1 }
    const ink = bl > 0.3 ? '16,36,10' : '10,20,6'
    // sem inicialização (modo de 1 linha) a primeira linha mostra blocos escuros
    const gr = paintLcd(ctx, w, h, {
      cols: COLS,
      rows: ROWS,
      inset: INSET,
      L,
      show: on && L.display !== false && k.text > 0,
      ink,
      dotA: k.cells,
      textA: k.text,
      blockRow: on && !L?.inited ? 0 : -1,
      blockA: Math.min(0.85, k.cells + k.text * 0.6),
    })
    // cursor (sublinhado na 8.ª linha de pontos e/ou bloco a piscar)
    const cur = on && L.display !== false ? L.cursor : null
    if (cur && k.text) {
      const x0 = gr.x0 + cur.c * gr.cw + (gr.cw - 5 * gr.px) / 2
      const y0 = gr.y0 + cur.r * gr.ch + (gr.ch - 8 * gr.py) / 2
      ctx.fillStyle = `rgba(${ink},${k.text})`
      const blink = cur.blink && Math.floor(Date.now() / 500) % 2
      for (let yy = 0; yy < 8; yy++)
        for (let xx = 0; xx < 5; xx++) if (blink || (cur.line && yy === 7)) ctx.fillRect(x0 + xx * gr.px, y0 + yy * gr.py, gr.px * 0.84, gr.py * 0.84)
    }
  }

// fábrica: LCD paralelo de COLS × ROWS (16×2, 20×4) com a placa, a moldura e o vidro dados
// (holes: furos de montagem; inset: margens da área de caracteres; model: serigrafia)
export function makeLcdParallel({ type, def, PIN_Y, COLS, ROWS, pcb, frame, glass, texW, texH, frameH = 0.72, holes, inset = [0.075, 0.17], model = '1602A' }) {
const GLASS = glass
const drawLcd = makeDraw(COLS, ROWS, inset)
const HOLES = holes || [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx * (pcb[0] / 2 - 0.25), sz * (pcb[2] / 2 - 0.25)]))
const PADS = def.pins.map((p) => [p.pos[0], p.pos[2]])
function Model({ part }) {
  const tex = useLiveTexture(part.id, texW, texH, drawLcd, { key: (L) => JSON.stringify(L ?? null) + (L?.cursor?.blink ? Math.floor(Date.now() / 500) % 2 : '') })
  return (
    <group>
      <LcdModule pcb={pcb} frame={frame} frameH={frameH} glass={GLASS} tex={tex} holes={HOLES} pads={PADS} model={model} />
      <HeaderPins pins={def.pins.map((p) => ({ ...p, pos: [p.pos[0], PIN_Y, p.pos[2]] }))} base={0.16} />
      {/* resistência da retroiluminação (R8, 101 = 100 Ω) junto ao pino 16 */}
      {(part.config?.blR ?? 100) > 0 && <SmdParts list={[[def.pins[15].pos[0] + 0.6, def.pins[0].pos[2], 0, 'R']]} y={pcb[1]} />}
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
            {/* eslint-disable-next-line no-control-regex */}
            {live.display === false ? '' : String(lines[row] ?? '').replace(/[\u0000-\u0007]/g, '▓').slice(0, COLS).padEnd(COLS)}
          </text>
        ))}
    </g>
  )
}

return { type, Model, Overlay2D }
}

export default makeLcdParallel({ type: 'lcd1602p', def, PIN_Y: LCDP_PIN_Y, COLS: 16, ROWS: 2, pcb: [8.0, 0.16, 3.6], frame: [7.1, 2.45], glass: { x: [-3.3, 3.3], z: [-0.78, 0.78] }, texW: 768, texH: 192, holes: [[-3.75, -1.55], [3.75, -1.55], [-3.75, 1.55], [3.75, 1.55]] })
