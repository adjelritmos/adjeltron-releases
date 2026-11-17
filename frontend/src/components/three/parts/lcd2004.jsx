// LCD 20×4 com módulo I2C (PCF8574) na traseira. O texto vem do backend (LiquidCrystal_I2C).
import { Box, Pcb, HeaderPins, Cyl } from '../kit.jsx'
import def from '@shared/parts/lcd2004.js'
import { drawCg, plainLine, CgOverlay } from './_lcdGlyph.jsx'
import { useLiveTexture, FacePlane, rectOf } from './_groupA.jsx'

// área visível do vidro (cm, referencial local)
const GLASS = { x: [-3.85, 3.85], z: [-1.3, 1.3] }
const COLS = 20
const ROWS = 4

function drawLcd(ctx, w, h, L) {
  const on = L?.powered
  const bl = on && L.backlight
  ctx.fillStyle = bl ? '#7ec636' : on ? '#3f5a22' : '#2b3a1c'
  ctx.fillRect(0, 0, w, h)
  const cw = w / COLS
  const ch = h / ROWS
  ctx.font = `bold ${Math.round(ch * 0.74)}px "Courier New", monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let r = 0; r < ROWS; r++) {
    const line = String(L?.lines?.[r] ?? '').slice(0, COLS)
    for (let c = 0; c < COLS; c++) {
      // células de 5×8 pontos, ligeiramente visíveis
      ctx.fillStyle = bl ? 'rgba(0,0,0,0.07)' : 'rgba(0,0,0,0.15)'
      ctx.fillRect(c * cw + 2, r * ch + 3, cw - 4, ch - 6)
      const t = on && L.display !== false && line[c]
      if (t && t !== ' ') {
        ctx.fillStyle = bl ? '#10240a' : '#0d1a06'
        if (!drawCg(ctx, L, t, c * cw + 4, r * ch + 6, cw - 8, ch - 12)) ctx.fillText(t, c * cw + cw / 2, r * ch + ch / 2 + 1)
      }
    }
  }
}

function Model({ part }) {
  const tex = useLiveTexture(part.id, 800, 270, drawLcd)
  const gw = GLASS.x[1] - GLASS.x[0]
  const gd = GLASS.z[1] - GLASS.z[0]
  return (
    <group>
      <Pcb size={[9.8, 0.16, 6.0]} color="#1f6f2a" />
      {/* moldura metálica e vidro */}
      <Box size={[9.0, 0.8, 4.0]} pos={[0, 0.16 + 0.4, 0]} color="#1a1a1a" />
      <Box size={[8.2, 0.02, 3.0]} pos={[0, 0.97, 0]} color="#0f1a0a" />
      <FacePlane tex={tex} w={gw} d={gd} pos={[0, 0.985, 0]} />
      {/* contactos da fita do LCD (16 vias) ao longo do bordo de cima */}
      {Array.from({ length: 16 }, (_, i) => (
        <Cyl key={i} r={0.07} h={0.17} pos={[-3.6 + i * 0.254, 0.09, -2.65]} color="#c9a227" metal={0.8} rough={0.3} seg={10} />
      ))}
      {/* módulo I2C (PCF8574) e pinos */}
      <Box size={[0.75, 0.14, 2.0]} pos={[-5.05, 0.07, 0]} color="#1b1b1b" />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered) return null
  const r = rectOf(info, GLASS.x[0], GLASS.z[0], GLASS.x[1], GLASS.z[1])
  const bl = live.backlight
  const lines = live.lines || []
  return (
    <g pointerEvents="none">
      <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={bl ? '#7ec636' : '#3f5a22'} />
      {[0, 1, 2, 3].map((k) => (
        <text key={k} x={r.x + 3} y={r.y + (r.h / 4) * (k + 0.75)} fontFamily='"Courier New", monospace' fontWeight="700" fontSize={(r.h / 4) * 0.78} fill="#10240a" textLength={r.w - 6} lengthAdjust="spacingAndGlyphs" xmlSpace="preserve">
          {live.display === false ? '' : plainLine(lines[k], COLS)}
        </text>
      ))}
      {live.display !== false && <CgOverlay L={live} x={r.x + 3} y={r.y} w={r.w - 6} h={r.h} cols={COLS} rows={4} fill="#10240a" />}
    </g>
  )
}

export default { type: 'lcd2004', Model, Overlay2D }
