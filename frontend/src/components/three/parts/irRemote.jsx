// Comando IR de 21 teclas (NEC, tipo "Car MP3" de 40 × 86 × 7 mm): caixa preta de cantos
// boleados, teclas de membrana em relevo (cúpulas de borracha por cor), janela do LED IR na
// ponta e gaveta da pilha CR2025 atrás. Sem pinos; as teclas do 2D são clicáveis.
import { Cyl, inputOf, useCanvasTexture, useFrame, useRef, THREE, geo, mergedGeo, mat } from '../kit.jsx'
import { setInput, releaseButtons } from '../../../services/simControl.js'
import { REMOTE_KEYS, REMOTE_GEOM as G } from '@shared/parts/irRemote.js'

const BODY = { w: 4.0, d: 8.6, h: 0.62 }
const KEY_H = 0.1 // relevo das teclas acima da face
// x de cada tecla (a última fila só tem 2 teclas: ficam centradas entre as colunas)
const keyX = (r, c) => (REMOTE_KEYS[r].length === 3 ? G.colX[c] : (G.colX[c] + G.colX[c + 1]) / 2)
const ALL = REMOTE_KEYS.flatMap((row, r) => row.map(([k], c) => ({ k, x: keyX(r, c), z: G.rowZ[r] })))
const short = { POWER: 'PWR', BACK: '↩', PREV: '⏮', PLAY: '⏯', NEXT: '⏭' }
const keyColor = (k) => (k === 'POWER' ? '#c62828' : /^[0-9]$/.test(k) ? '#2e2e33' : '#4a4a52')
const COLORS = [...new Set(ALL.map((a) => keyColor(a.k)))]

// caixa: retângulo de cantos boleados extrudido com bisel (arestas macias), base em y = 0
const bodyGeo = () =>
  geo('irRemoteBody', () => {
    const b = 0.05
    const w = BODY.w - 2 * b
    const d = BODY.d - 2 * b
    const r = 0.4
    const s = new THREE.Shape()
    s.moveTo(-w / 2 + r, -d / 2)
    s.lineTo(w / 2 - r, -d / 2)
    s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r)
    s.lineTo(w / 2, d / 2 - r)
    s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2)
    s.lineTo(-w / 2 + r, d / 2)
    s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r)
    s.lineTo(-w / 2, -d / 2 + r)
    s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2)
    return new THREE.ExtrudeGeometry(s, { depth: BODY.h - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 8 })
      .rotateX(-Math.PI / 2)
      .translate(0, b, 0)
  })
// tecla: cúpula de borracha (perfil de revolução), r um pouco menor do que a zona de clique
const keyGeo = () =>
  geo('irRemoteKey', () => {
    const r = G.r * 0.9
    const pts = [[0, KEY_H], [r * 0.7, KEY_H * 0.97], [r * 0.92, KEY_H * 0.82], [r, KEY_H * 0.5], [r, 0]]
    return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(Math.max(x, 0.0001), y)), 24)
  })
const keysOf = (color) =>
  mergedGeo(`irRemoteKeys${color}`, () => ALL.filter((a) => keyColor(a.k) === color).map((a) => [keyGeo(), [a.x, BODY.h, a.z]]))

function drawFace(ctx, w, h) {
  const s = w / BODY.w
  // face com os cantos boleados da caixa (fora deles fica transparente)
  ctx.fillStyle = '#18181a'
  ctx.beginPath()
  ctx.roundRect(0.05 * s, 0.05 * s, w - 0.1 * s, h - 0.1 * s, 0.4 * s)
  ctx.fill()
  // janela do LED IR no topo
  ctx.fillStyle = '#3a1015'
  ctx.beginPath()
  ctx.roundRect((BODY.w / 2 - 0.5) * s, 0.15 * s, 1.0 * s, 0.4 * s, 0.15 * s)
  ctx.fill()
  // anel rebaixado à volta de cada tecla (membrana)
  ALL.forEach(({ x, z }) => {
    ctx.beginPath()
    ctx.arc((x + BODY.w / 2) * s, (z + BODY.d / 2) * s, G.r * s * 1.02, 0, Math.PI * 2)
    ctx.fillStyle = '#0c0c0d'
    ctx.fill()
  })
}
// só os rótulos (fundo transparente), num plano por cima das teclas
function drawLabels(ctx, w) {
  const s = w / BODY.w
  ALL.forEach(({ k, x, z }) => {
    const t = short[k] || k
    ctx.fillStyle = '#f2f2f2'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `bold ${Math.round(G.r * s * (t.length > 2 ? 0.5 : 0.8))}px Arial`
    ctx.fillText(t, (x + BODY.w / 2) * s, (z + BODY.d / 2) * s + 2)
  })
}

function Model({ part }) {
  const face = useCanvasTexture(drawFace, ['irRemote2'], 400, 860)
  const labels = useCanvasTexture(drawLabels, ['irRemote2L'], 400, 860)
  const press = useRef()
  useFrame(() => {
    const k = inputOf(part.id).key
    const key = ALL.find((a) => a.k === k)
    const m = press.current
    if (!m) return
    m.visible = !!key
    if (key) m.position.set(key.x, BODY.h + KEY_H + 0.006, key.z)
  })
  return (
    <group>
      <mesh castShadow receiveShadow geometry={bodyGeo()} material={mat('#18181a', 0, 0.5)} />
      <mesh position={[0, BODY.h + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BODY.w, BODY.d]} />
        <meshStandardMaterial map={face} transparent roughness={0.5} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      {COLORS.map((c) => (
        <mesh key={c} castShadow geometry={keysOf(c)} material={mat(c, 0, 0.62)} />
      ))}
      <mesh position={[0, BODY.h + KEY_H + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BODY.w, BODY.d]} />
        <meshBasicMaterial map={labels} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {/* LED emissor na ponta (atrás da janela vermelha escura) */}
      <Cyl r={0.15} h={0.3} pos={[0, BODY.h / 2, -BODY.d / 2 - 0.05]} rot={[Math.PI / 2, 0, 0]} color="#3a1015" rough={0.2} />
      {/* gaveta da pilha CR2025 (ranhura e patilha) na ponta de trás */}
      <mesh position={[0, BODY.h * 0.35, BODY.d / 2 + 0.001]} geometry={geo('irRemoteTray', () => new THREE.PlaneGeometry(2.2, 0.03))} material={mat('#050505', 0, 0.9)} />
      <mesh position={[0.9, BODY.h * 0.2, BODY.d / 2 + 0.001]} geometry={geo('irRemoteTab', () => new THREE.PlaneGeometry(0.4, 0.12))} material={mat('#2a2a2c', 0, 0.6)} />
      <mesh ref={press} visible={false}>
        <cylinderGeometry args={[G.r * 0.9, G.r * 0.9, 0.01, 24]} />
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
