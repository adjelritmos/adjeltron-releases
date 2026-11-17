// LCD 16×2 com módulo I2C. O texto vem do backend (biblioteca LiquidCrystal_I2C).
import { Box, RBox, Cyl, Pcb, PITCH, useFrame, useMemo, useRef, THREE, liveOf, HeaderPins } from '../kit.jsx'
import { pinOrientMode } from '@shared/components.js'
import def from '@shared/parts/lcd1602.js'
import { drawCg, plainLine, CgOverlay } from './_lcdGlyph.jsx'

// área visível do vidro (cm, referencial local)
const GLASS = { x: [-3.3, 3.3], z: [-0.78, 0.78] }

function drawLcd(ctx, w, h, L) {
  const on = L?.powered
  const bl = on && L.backlight
  ctx.fillStyle = bl ? '#7ec636' : on ? '#3f5a22' : '#2b3a1c'
  ctx.fillRect(0, 0, w, h)
  const cols = 16
  const rows = 2
  const cw = w / cols
  const ch = h / rows
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // células de 5×8 pontos, ligeiramente visíveis
      ctx.fillStyle = bl ? 'rgba(0,0,0,0.07)' : 'rgba(0,0,0,0.15)'
      ctx.fillRect(c * cw + 2, r * ch + 3, cw - 4, ch - 6)
      const t = on && L.display !== false && L.lines?.[r]?.[c]
      if (t && t !== ' ') {
        ctx.fillStyle = bl ? '#10240a' : '#0d1a06'
        if (drawCg(ctx, L, t, c * cw + 4, r * ch + 6, cw - 8, ch - 12)) continue
        ctx.font = `bold ${Math.round(ch * 0.78)}px "Courier New", monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(t, c * cw + cw / 2, r * ch + ch / 2 + 1)
      }
    }
  }
}

function Model({ part }) {
  const canvas = useMemo(() => Object.assign(document.createElement('canvas'), { width: 512, height: 128 }), [])
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
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
  const gw = GLASS.x[1] - GLASS.x[0]
  const gd = GLASS.z[1] - GLASS.z[0]
  return (
    <group>
      <Pcb size={[8.0, 0.16, 3.6]} color="#1f6f2a" />
      {/* 16 furos do conector paralelo (ligados por trás ao módulo I2C) */}
      {Array.from({ length: 16 }).map((_, i) => (
        <Cyl key={i} r={0.07} h={0.02} pos={[-3.2 + i * PITCH, 0.165, -1.6]} color="#d4af37" metal={0.8} rough={0.3} seg={10} />
      ))}
      {/* moldura metálica e vidro */}
      <RBox size={[7.1, 0.72, 2.45]} r={0.05} pos={[0, 0.16 + 0.36, 0]} color="#1a1a1a" rough={0.45} />
      <Box size={[6.75, 0.02, 1.9]} pos={[0, 0.885, 0]} color="#0e0e0e" />
      <mesh position={[0, 0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[gw, gd]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* módulo I2C (PCF8574): potenciómetro de contraste e conector de 4 pinos em ângulo reto */}
      <Box size={[0.55, 0.12, 1.4]} pos={[-3.75, 0.22, 0]} color="#1b1b1b" />
      {pinOrientMode(part) === 'tras' ? (
        <>
          <Box size={[0.25, 0.25, 4 * PITCH]} pos={[-4.075, 0.3, 0]} color="#111" rough={0.5} />
          {def.pins.map((p) => (
            <group key={p.id}>
              <Box size={[0.95, 0.064, 0.064]} pos={[-3.9 - 0.475, 0.3, p.pos[2]]} color="#d4af37" metal={0.9} rough={0.25} />
            </group>
          ))}
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
