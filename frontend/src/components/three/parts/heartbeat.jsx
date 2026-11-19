// Pulse Sensor: placa redonda de Ø 16 mm (com a língua dos pinos, numa só peça) com o coração
// serigrafado, o LED verde AM2520 ao centro (brilha a cada batimento), o sensor de luz
// APDS-9008 ao lado e os pinos S + −.
import { HeaderPins, Glow, useCanvasTexture, liveOf, THREE, geo, mat, pcbMat, METAL } from '../kit.jsx'
import def from '@shared/parts/heartbeat.js'
import { Silk, Passive } from './_analogModule.jsx'

const T = 0.12
const C = [0.3, 0] // centro da placa redonda
const R = 0.8
const TONGUE = { x0: -1.15, hw: 0.5 } // língua dos pinos: de x0 até ao círculo, meia largura hw

// contorno: círculo + língua retangular de cantos boleados, extrudido para baixo a partir de T
const boardGeo = () =>
  geo('pulseBoard', () => {
    const s = new THREE.Shape()
    const { x0, hw } = TONGUE
    const xc = C[0] - Math.sqrt(R * R - hw * hw)
    const a = Math.atan2(hw, xc - C[0])
    const rr = 0.08
    s.moveTo(x0 + rr, -hw)
    s.lineTo(xc, -hw)
    s.absarc(C[0], C[1], R, -a, a, false)
    s.lineTo(x0 + rr, hw)
    s.quadraticCurveTo(x0, hw, x0, hw - rr)
    s.lineTo(x0, -hw + rr)
    s.quadraticCurveTo(x0, -hw, x0 + rr, -hw)
    return new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: 24 }).rotateX(Math.PI / 2).translate(0, T, 0)
  })

function drawFace(ctx, w, h) {
  // fundo transparente: só a serigrafia (coração e texto) por cima da máscara
  const cx = w / 2
  const cy = h / 2 + 4
  const s = w * 0.36
  ctx.beginPath()
  ctx.moveTo(cx, cy + s * 0.75)
  ctx.bezierCurveTo(cx - s * 1.2, cy - s * 0.05, cx - s * 0.55, cy - s * 0.95, cx, cy - s * 0.35)
  ctx.bezierCurveTo(cx + s * 0.55, cy - s * 0.95, cx + s * 1.2, cy - s * 0.05, cx, cy + s * 0.75)
  ctx.lineWidth = 7
  ctx.strokeStyle = '#f2f2f2'
  ctx.stroke()
  // anel de cobre exposto na borda
  ctx.beginPath()
  ctx.arc(w / 2, h / 2, w / 2 - 5, 0, Math.PI * 2)
  ctx.lineWidth = 5
  ctx.strokeStyle = 'rgba(242,242,242,0.55)'
  ctx.stroke()
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 22px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('PULSE', cx, h * 0.86)
  ctx.font = '14px Arial'
  ctx.fillText('SENSOR', cx, h * 0.93)
}

function Model({ part }) {
  const tex = useCanvasTexture(drawFace, ['pulse2'], 256, 256)
  const beat = () => {
    const L = liveOf(part.id)
    return L?.powered ? 0.25 + 0.9 * (L.beat || 0) : 0
  }
  return (
    <group>
      <mesh castShadow receiveShadow geometry={boardGeo()} material={pcbMat('#6a1b9a')} />
      <mesh position={[C[0], T + 0.001, C[1]]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[R * 0.98, 48]} />
        <meshStandardMaterial map={tex} transparent roughness={0.6} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      {/* LED verde (corpo branco com a lente que brilha) */}
      <mesh position={[C[0], T + 0.025, C[1] - 0.05]} geometry={geo('pulseLedBase', () => new THREE.BoxGeometry(0.22, 0.05, 0.18))} material={mat('#efefea', 0, 0.5)} />
      <Glow pos={[C[0], T + 0.07, C[1] - 0.05]} color="#30ff60" base="#2f5e36" read={beat} light={0.6} halo={0.9}>
        <boxGeometry args={[0.16, 0.04, 0.13]} />
      </Glow>
      {/* sensor de luz APDS-9008: epóxi transparente com o fotodíodo dourado */}
      <mesh position={[C[0], T + 0.028, C[1] + 0.22]} geometry={geo('pulseApds', () => new THREE.BoxGeometry(0.16, 0.055, 0.15))} material={mat('#d9cfa6', 0, 0.12)} />
      <mesh position={[C[0], T + 0.057, C[1] + 0.22]} geometry={geo('pulseDie', () => new THREE.BoxGeometry(0.06, 0.003, 0.06))} material={mat(METAL.gold, 1, 0.3)} />
      {/* passivos do amplificador junto à língua */}
      <Passive pos={[-0.25, T, 0.3]} kind="r" rotY={Math.PI / 2} />
      <Passive pos={[-0.25, T, -0.3]} kind="c" rotY={Math.PI / 2} />
      {['S', '+', '−'].map((t, i) => (
        <Silk key={t} text={t} pos={[-0.68, T + 0.002, def.pins[i].pos[2]]} w={0.14} d={0.14} />
      ))}
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered) return null
  const [x, y] = info.project([C[0], 0.2, C[1] - 0.05])
  const b = live.beat || 0
  return <circle cx={x} cy={y} r={4 + b * 8} fill="#30ff60" opacity={0.35 + b * 0.6} filter="url(#glow)" pointerEvents="none" />
}

export default { type: 'heartbeat', Model, Overlay2D }
