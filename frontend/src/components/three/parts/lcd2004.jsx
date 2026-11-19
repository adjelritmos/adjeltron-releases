// LCD 20×4 com módulo I2C (PCF8574) na traseira. O texto vem do backend (LiquidCrystal_I2C).
import { Pcb, HeaderPins, PITCH } from '../kit.jsx'
import def from '@shared/parts/lcd2004.js'
import { plainLine, CgOverlay, paintLcd, lcdBackground, LcdModule } from './_lcdGlyph.jsx'
import { useLiveTexture, rectOf } from './_groupA.jsx'

// área visível do vidro (cm, referencial local)
const GLASS = { x: [-3.85, 3.85], z: [-1.3, 1.3] }
const COLS = 20
const ROWS = 4

// margens da área de caracteres (70,4 × 20,8 mm) dentro da janela do 2004A
const INSET = [0.045, 0.1]
const PADS = Array.from({ length: 16 }, (_, i) => [-4.15 + i * PITCH, -2.75])
const HOLES = [[-4.65, -2.75], [4.65, -2.75], [-4.65, 2.75], [4.65, 2.75]]

function drawLcd(ctx, w, h, L) {
  const on = L?.powered
  const bl = on && L.backlight
  lcdBackground(ctx, w, h, bl, on)
  paintLcd(ctx, w, h, { cols: COLS, rows: ROWS, inset: INSET, L, show: on && L.display !== false, ink: bl ? '16,36,10' : '10,22,6', dotA: bl ? 0.07 : 0.14 })
}

function Model({ part }) {
  const tex = useLiveTexture(part.id, 1000, 340, drawLcd)
  return (
    <group>
      <LcdModule pcb={[9.8, 0.16, 6.0]} frame={[9.7, 4.0]} frameH={0.8} glass={GLASS} tex={tex} holes={HOLES} pads={PADS} model="2004A" />
      {/* borda do módulo I2C (PCF8574, placa preta) que sai pela esquerda, com a barra de pinos */}
      <Pcb size={[0.45, 0.16, 1.45]} pos={[-5.13, 0, 0]} color="#151515" holes={false} />
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
