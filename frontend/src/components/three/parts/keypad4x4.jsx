// Teclado de membrana 4×4 com fita e conector de 8 pinos. As teclas do 2D são clicáveis.
import { Box, HeaderPins, inputOf, useCanvasTexture, useFrame, useRef, geo, THREE } from '../kit.jsx'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { setInput, releaseButtons } from '../../../services/simControl.js'
import def, { KEYPAD_KEYS, KEYPAD_GEOM as G } from '@shared/parts/keypad4x4.js'

const PAD = { x: [-3.45, 3.45], z: [-4.6, 3.0] }
const keyColor = (k) => (/[A-D]/.test(k) ? '#e53935' : /[*#]/.test(k) ? '#1e88e5' : '#f2f2f2')

// ---------- teclado de membrana (comum ao 3×4 e ao 4×4) ----------
// Membrana de poliéster preta com as teclas impressas e almofadadas (relevo de ~0,3 mm, com a
// mesma arte por cima), linha de contorno prateada, fita plana transparente com as pistas de
// tinta de prata e a ficha fêmea Dupont preta na ponta.
export function membraneModel({ keys, G, PAD, keyColor, pins, texW, texH, cable }) {
  const PW = PAD.x[1] - PAD.x[0]
  const PD = PAD.z[1] - PAD.z[0]
  const cz = (PAD.z[0] + PAD.z[1]) / 2
  const T = 0.08 // espessura da membrana
  const R = 0.03 // relevo das teclas
  const light = (k) => keyColor(k) === '#f2f2f2'
  function drawPad(ctx, w, h) {
    const sx = w / PW
    const sz = h / PD
    ctx.fillStyle = '#141414'
    ctx.fillRect(0, 0, w, h)
    // linha de contorno prateada à volta das teclas
    ctx.strokeStyle = 'rgba(190,190,190,0.55)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.roundRect(0.18 * sx, 0.18 * sz, w - 0.36 * sx, h - 0.36 * sz, 18)
    ctx.stroke()
    keys.forEach((row, r) =>
      row.forEach((k, c) => {
        const x = (G.colX[c] - G.w / 2 - PAD.x[0]) * sx
        const y = (G.rowZ[r] - G.d / 2 - PAD.z[0]) * sz
        const kw = G.w * sx
        const kh = G.d * sz
        ctx.fillStyle = keyColor(k)
        ctx.beginPath()
        ctx.roundRect(x, y, kw, kh, 12)
        ctx.fill()
        // almofada: luz de cima, sombra em baixo
        const g = ctx.createLinearGradient(0, y, 0, y + kh)
        g.addColorStop(0, 'rgba(255,255,255,0.22)')
        g.addColorStop(0.45, 'rgba(255,255,255,0)')
        g.addColorStop(1, 'rgba(0,0,0,0.2)')
        ctx.fillStyle = g
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.fillStyle = light(k) ? '#111' : '#fff'
        ctx.font = `bold ${Math.round(kh * 0.55)}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(k, x + kw / 2, y + kh / 2 + 2)
      }),
    )
  }
  // almofadas das teclas: caixas boleadas com UV planar (a mesma textura que a membrana)
  const pillows = () =>
    geo(`membrane${PAD.x}|${PAD.z}|${keys.length}x${keys[0].length}`, () => {
      const parts = []
      keys.forEach((row, r) =>
        row.forEach((k, c) => {
          const b = new RoundedBoxGeometry(G.w - 0.04, 2 * R, G.d - 0.04, 2, R * 0.95)
          b.translate(G.colX[c], T, G.rowZ[r])
          parts.push(b)
        }),
      )
      const out = mergeGeometries(parts, false)
      parts.forEach((p) => p.dispose())
      const pos = out.attributes.position
      const uv = out.attributes.uv
      for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - PAD.x[0]) / PW, 1 - (pos.getZ(i) - PAD.z[0]) / PD)
      uv.needsUpdate = true
      return out
    })
  // fita: base translúcida e as pistas de prata (uma por pino)
  const xs = pins.map((p) => p.pos[0])
  const cw = Math.max(...xs) - Math.min(...xs) + 0.3
  function drawCable(ctx, w, h) {
    ctx.fillStyle = 'rgba(232,232,226,0.92)'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#a7aaae'
    xs.forEach((x) => {
      const u = ((x - Math.min(...xs) + 0.15) / cw) * w
      ctx.fillRect(u - w * 0.025, 0, w * 0.05, h)
    })
  }
  return function Model({ part }) {
    const tex = useCanvasTexture(drawPad, [], texW, texH)
    const ctex = useCanvasTexture(drawCable, [], 128, 64)
    const press = useRef()
    useFrame(() => {
      const k = inputOf(part.id).key
      const m = press.current
      if (!m) return
      const r = keys.findIndex((row) => row.includes(k))
      m.visible = r >= 0
      if (r >= 0) m.position.set(G.colX[keys[r].indexOf(k)], T + R + 0.004, G.rowZ[r])
    })
    const z1 = cable.z - 0.22
    return (
      <group>
        <Box size={[PW, T, PD]} pos={[0, T / 2, cz]} color="#121212" rough={0.6} />
        <mesh position={[0, T + 0.001, cz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[PW, PD]} />
          <meshStandardMaterial map={tex} roughness={0.55} />
        </mesh>
        <mesh geometry={pillows()} castShadow receiveShadow>
          <meshStandardMaterial map={tex} roughness={0.45} />
        </mesh>
        <mesh ref={press} visible={false}>
          <boxGeometry args={[G.w, 0.01, G.d]} />
          <meshBasicMaterial color="#000" transparent opacity={0.45} />
        </mesh>
        {/* fita plana com as pistas de prata e a ficha fêmea Dupont */}
        <mesh position={[0, 0.02, (PAD.z[1] + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[cw, z1 - PAD.z[1] + 0.05]} />
          <meshStandardMaterial map={ctex} transparent roughness={0.35} side={THREE.DoubleSide} />
        </mesh>
        <Box size={[cw + 0.25, 0.25, 0.45]} pos={[0, 0.125, cable.z]} color="#111" rough={0.5} />
        <Box size={[cw + 0.1, 0.01, 0.3]} pos={[0, 0.255, cable.z + 0.02]} color="#222" rough={0.6} />
        <HeaderPins pins={pins} base={-0.12} up={0.25} color="#c9a227" />
      </group>
    )
  }
}

const Model = membraneModel({ keys: KEYPAD_KEYS, G, PAD, keyColor, pins: def.pins, texW: 690, texH: 760, cable: { z: 4.65 } })

// teclas clicáveis por cima da imagem 2D
function Overlay2D({ part, info, input }) {
  const down = (k) => (e) => {
    e.stopPropagation()
    setInput(part.id, { key: k })
  }
  const up = () => releaseButtons()
  return (
    <g>
      {KEYPAD_KEYS.map((row, r) =>
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

export default { type: 'keypad4x4', Model, Overlay2D }
