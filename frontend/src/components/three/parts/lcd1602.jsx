// LCD 16×2 com módulo I2C. O texto vem do backend (biblioteca LiquidCrystal_I2C).
import { Box, PITCH, useFrame, useMemo, useRef, THREE, liveOf, HeaderPins, geo, mat, mergedGeo, METAL } from '../kit.jsx'
import { pinOrientMode } from '@shared/components.js'
import def from '@shared/parts/lcd1602.js'
import { plainLine, CgOverlay, paintLcd, lcdBackground, LcdModule } from './_lcdGlyph.jsx'

// área visível do vidro (cm, referencial local)
const GLASS = { x: [-3.3, 3.3], z: [-0.78, 0.78] }
// margens da área de caracteres (56,2 × 11,5 mm) dentro da janela do 1602A
const INSET = [0.075, 0.17]
// 16 almofadas do conector paralelo (o módulo I2C está soldado por trás)
const PADS = Array.from({ length: 16 }, (_, i) => [-3.2 + i * PITCH, -1.6])
const HOLES = [[-3.75, -1.55], [3.75, -1.55], [-3.75, 1.55], [3.75, 1.55]]

function drawLcd(ctx, w, h, L) {
  const on = L?.powered
  const bl = on && L.backlight
  lcdBackground(ctx, w, h, bl, on)
  // matriz de pontos 5×8 (fonte da ROM do HD44780 e carateres da CGRAM)
  paintLcd(ctx, w, h, { cols: 16, rows: 2, inset: INSET, L, show: on && L.display !== false, ink: bl ? '16,36,10' : '10,22,6', dotA: bl ? 0.07 : 0.14 })
}

function Model({ part }) {
  const canvas = useMemo(() => Object.assign(document.createElement('canvas'), { width: 768, height: 192 }), [])
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  }, [canvas])
  const last = useRef('')
  useFrame(() => {
    const L = liveOf(part.id)
    const key = JSON.stringify(L || null)
    if (key === last.current) return
    last.current = key
    drawLcd(canvas.getContext('2d'), canvas.width, canvas.height, L)
    tex.needsUpdate = true
  })
  return (
    <group>
      <LcdModule pcb={[8.0, 0.16, 3.6]} frame={[7.1, 2.45]} frameH={0.72} glass={GLASS} tex={tex} holes={HOLES} pads={PADS} model="1602A" />
      {/* módulo I2C (PCF8574) por trás: a barra de 4 pinos em ângulo reto sai pela esquerda */}
      {pinOrientMode(part) === 'tras' ? (
        <>
          <Box size={[0.25, 0.25, 4 * PITCH]} pos={[-4.075, 0.3, 0]} color="#111" rough={0.5} />
          <mesh
            geometry={mergedGeo('lcd1602i2cPins', () => def.pins.flatMap((p) => [[geo('gull', () => new THREE.BoxGeometry(1, 1, 1)), [-4.375, 0.3, p.pos[2]], [0, 0, 0], [0.95, 0.064, 0.064]]]))}
            material={mat(METAL.gold, 1, 0.25)}
            castShadow
          />
        </>
      ) : (
        // orientação dos pinos mudada no painel (config.pinosDir): barra genérica
        <HeaderPins pins={def.pins} part={part} />
      )}
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered) return null
  const [x0, y0] = info.project([GLASS.x[0], 0, GLASS.z[0]])
  const [x1, y1] = info.project([GLASS.x[1], 0, GLASS.z[1]])
  const w = x1 - x0
  const h = y1 - y0
  const bl = live.backlight
  const lines = live.lines || []
  return (
    <g pointerEvents="none">
      <rect x={x0} y={y0} width={w} height={h} fill={bl ? '#7ec636' : '#3f5a22'} />
      {lines.slice(0, 2).map((l, r) => (
        <text key={r} x={x0 + 4} y={y0 + (h / 2) * (r + 0.72)} fontFamily='"Courier New", monospace' fontWeight="700" fontSize={h * 0.36} fill="#10240a" textLength={w - 8} lengthAdjust="spacingAndGlyphs" xmlSpace="preserve">
          {live.display === false ? '' : plainLine(l, 16)}
        </text>
      ))}
      {live.display !== false && <CgOverlay L={live} x={x0 + 4} y={y0} w={w - 8} h={h} cols={16} rows={2} fill="#10240a" />}
    </g>
  )
}

export default { type: 'lcd1602', Model, Overlay2D }
