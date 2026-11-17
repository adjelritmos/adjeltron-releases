// Comando IR de 21 teclas (NEC). Sem pinos; as teclas do 2D são clicáveis.
import { Box, Cyl, inputOf, useCanvasTexture, useFrame, useRef } from '../kit.jsx'
import { setInput, releaseButtons } from '../../../services/simControl.js'
import { REMOTE_KEYS, REMOTE_GEOM as G } from '@shared/parts/irRemote.js'

const BODY = { w: 4.0, d: 8.6, h: 0.7 }
// x de cada tecla (a última fila só tem 2 teclas: ficam centradas entre as colunas)
const keyX = (r, c) => (REMOTE_KEYS[r].length === 3 ? G.colX[c] : (G.colX[c] + G.colX[c + 1]) / 2)
const ALL = REMOTE_KEYS.flatMap((row, r) => row.map(([k], c) => ({ k, x: keyX(r, c), z: G.rowZ[r] })))
const short = { POWER: 'PWR', BACK: '↩', PREV: '⏮', PLAY: '⏯', NEXT: '⏭' }

function drawFace(ctx, w, h) {
  const s = w / BODY.w
  ctx.fillStyle = '#1b1b1d'
  ctx.fillRect(0, 0, w, h)
  // janela do LED IR no topo
  ctx.fillStyle = '#3a1015'
  ctx.beginPath()
  ctx.roundRect((BODY.w / 2 - 0.5) * s, 0.15 * s, 1.0 * s, 0.4 * s, 0.15 * s)
  ctx.fill()
  ALL.forEach(({ k, x, z }) => {
    const cx = (x + BODY.w / 2) * s
    const cy = (z + BODY.d / 2) * s
    ctx.beginPath()
    ctx.arc(cx, cy, G.r * s, 0, Math.PI * 2)
    ctx.fillStyle = k === 'POWER' ? '#d32f2f' : /^[0-9]$/.test(k) ? '#3a3a3e' : '#55555b'
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = '#0a0a0a'
    ctx.stroke()
    const t = short[k] || k
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `bold ${Math.round(G.r * s * (t.length > 2 ? 0.5 : 0.8))}px Arial`
    ctx.fillText(t, cx, cy + 2)
  })
}

function Model({ part }) {
  const tex = useCanvasTexture(drawFace, [], 400, 860)
  const press = useRef()
  useFrame(() => {
    const k = inputOf(part.id).key
    const key = ALL.find((a) => a.k === k)
    const m = press.current
    if (!m) return
    m.visible = !!key
    if (key) m.position.set(key.x, BODY.h + 0.006, key.z)
  })
  return (
    <group>
      <Box size={[BODY.w, BODY.h, BODY.d]} pos={[0, BODY.h / 2, 0]} color="#1b1b1d" rough={0.55} />
      <mesh position={[0, BODY.h + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BODY.w, BODY.d]} />
        <meshStandardMaterial map={tex} roughness={0.55} />
      </mesh>
      {/* LED emissor na ponta */}
      <Cyl r={0.15} h={0.3} pos={[0, BODY.h / 2, -BODY.d / 2 - 0.05]} rot={[Math.PI / 2, 0, 0]} color="#3a1015" rough={0.2} />
      <mesh ref={press} visible={false}>
        <cylinderGeometry args={[G.r, G.r, 0.01, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

function Overlay2D({ part, info, input }) {
  const down = (k) => (e) => {
    e.stopPropagation()
    setInput(part.id, { key: k })
  }
  const up = () => releaseButtons()
  const [ox] = info.project([0, 0, 0])
  const [rx] = info.project([G.r, 0, 0])
  const rp = Math.abs(rx - ox)
  return (
    <g>
      {ALL.map(({ k, x, z }) => {
        const [cx, cy] = info.project([x, 0, z])
        const on = input?.key === k
        return (
          <circle key={k} cx={cx} cy={cy} r={rp} fill={on ? '#000' : '#fff'} fillOpacity={on ? 0.45 : 0.001} stroke={on ? '#ffb300' : 'none'} strokeWidth={2} style={{ cursor: 'pointer' }} onPointerDown={down(k)} onPointerUp={up} onPointerLeave={() => on && up()} />
        )
      })}
    </g>
  )
}

export default { type: 'irRemote', Model, Overlay2D }
