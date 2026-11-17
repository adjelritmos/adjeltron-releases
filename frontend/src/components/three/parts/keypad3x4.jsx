// Teclado de membrana 3×4 com fita e conector de 7 pinos. As teclas do 2D são clicáveis.
import { Box, HeaderPins, inputOf, useCanvasTexture, useFrame, useRef } from '../kit.jsx'
import { setInput, releaseButtons } from '../../../services/simControl.js'
import def, { KEYPAD3_KEYS as KEYS, KEYPAD3_GEOM as G } from '@shared/parts/keypad3x4.js'

const PAD = { x: [-2.7, 2.7], z: [-4.6, 2.85] }
const PW = PAD.x[1] - PAD.x[0]
const PD = PAD.z[1] - PAD.z[0]
const keyColor = (k) => (/[*#]/.test(k) ? '#1e88e5' : '#f2f2f2')

function drawPad(ctx, w, h) {
  const sx = w / PW
  const sz = h / PD
  ctx.fillStyle = '#121212'
  ctx.fillRect(0, 0, w, h)
  KEYS.forEach((row, r) =>
    row.forEach((k, c) => {
      const x = (G.colX[c] - G.w / 2 - PAD.x[0]) * sx
      const y = (G.rowZ[r] - G.d / 2 - PAD.z[0]) * sz
      ctx.fillStyle = keyColor(k)
      ctx.beginPath()
      ctx.roundRect(x, y, G.w * sx, G.d * sz, 14)
      ctx.fill()
      ctx.fillStyle = /[*#]/.test(k) ? '#fff' : '#111'
      ctx.font = `bold ${Math.round(G.d * sz * 0.55)}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(k, x + (G.w * sx) / 2, y + (G.d * sz) / 2 + 2)
    }),
  )
}

function Model({ part }) {
  const tex = useCanvasTexture(drawPad, [], 540, 745)
  const press = useRef()
  useFrame(() => {
    const k = inputOf(part.id).key
    const m = press.current
    if (!m) return
    const r = KEYS.findIndex((row) => row.includes(k))
    m.visible = r >= 0
    if (r >= 0) m.position.set(G.colX[KEYS[r].indexOf(k)], 0.095, G.rowZ[r])
  })
  const cz = (PAD.z[0] + PAD.z[1]) / 2
  return (
    <group>
      <Box size={[PW, 0.08, PD]} pos={[0, 0.04, cz]} color="#121212" />
      <mesh position={[0, 0.081, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PW, PD]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
      <mesh ref={press} visible={false}>
        <boxGeometry args={[G.w, 0.02, G.d]} />
        <meshBasicMaterial color="#000" transparent opacity={0.45} />
      </mesh>
      {/* fita flexível e conector fêmea de 7 vias */}
      <Box size={[1.85, 0.03, 1.55]} pos={[0, 0.02, 3.62]} color="#d7d7d7" rough={0.4} />
      {def.pins.map((p) => (
        <Box key={p.id} size={[0.08, 0.035, 1.55]} pos={[p.pos[0], 0.025, 3.62]} color="#b08d57" metal={0.7} />
      ))}
      <Box size={[1.9, 0.25, 0.45]} pos={[0, 0.125, 4.65]} color="#111" />
      <HeaderPins pins={def.pins} base={-0.12} up={0.25} color="#c9a227" />
    </group>
  )
}

function Overlay2D({ part, info, input }) {
  const down = (k) => (e) => {
    e.stopPropagation()
    setInput(part.id, { key: k })
  }
  const up = () => releaseButtons()
  return (
    <g>
      {KEYS.map((row, r) =>
        row.map((k, c) => {
          const [x0, y0] = info.project([G.colX[c] - G.w / 2, 0, G.rowZ[r] - G.d / 2])
          const [x1, y1] = info.project([G.colX[c] + G.w / 2, 0, G.rowZ[r] + G.d / 2])
          const on = input?.key === k
          return (
            <rect key={k} x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx={6} fill={on ? '#000' : '#fff'} fillOpacity={on ? 0.45 : 0.001} stroke={on ? '#ffb300' : 'none'} strokeWidth={2} style={{ cursor: 'pointer' }} onPointerDown={down(k)} onPointerUp={up} onPointerLeave={() => on && up()} />
          )
        }),
      )}
    </g>
  )
}

export default { type: 'keypad3x4', Model, Overlay2D }
