// Interruptor deslizante SPDT (SS12D00, 8,6 × 3,6 mm): base preta, tampa de chapa niquelada com a
// ranhura e as duas patilhas das pontas, alavanca preta com estrias e 3 pernas de chapa.
import { Box, geo, mat, mergedGeo, METAL, THREE, PITCH, inputOf, useFrame, useRef } from '../kit.jsx'

const leverX = (on) => (on ? 0.13 : -0.13)
const isOn = (part) => !!(inputOf(part.id).on ?? part.config?.on)
const unit = () => geo('gull', () => new THREE.BoxGeometry(1, 1, 1))

// pernas de chapa (0,5 × 0,3 mm) e patilhas de fixação da tampa nas pontas
const legs = () =>
  mergedGeo('ssLegs', () => [
    ...[-PITCH, 0, PITCH].map((x) => [unit(), [x, 0.16, 0], [0, 0, 0], [0.06, 0.32, 0.03]]),
    ...[-1, 1].map((s) => [unit(), [s * 0.44, 0.33, 0], [0, 0, 0], [0.02, 0.26, 0.14]]),
  ])
// tampa: chapa com a ranhura da alavanca (aberta no meio)
const cover = () =>
  geo('ssCover', () => {
    const s = new THREE.Shape()
    s.moveTo(-0.435, -0.185)
    s.lineTo(0.435, -0.185)
    s.lineTo(0.435, 0.185)
    s.lineTo(-0.435, 0.185)
    s.lineTo(-0.435, -0.185)
    const h = new THREE.Path()
    h.moveTo(-0.26, -0.085)
    h.lineTo(-0.26, 0.085)
    h.lineTo(0.26, 0.085)
    h.lineTo(0.26, -0.085)
    h.lineTo(-0.26, -0.085)
    s.holes.push(h)
    return new THREE.ExtrudeGeometry(s, { depth: 0.17, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 1 }).rotateX(-Math.PI / 2).translate(0, -0.085, 0)
  })
// estrias da alavanca
const ribs = () => mergedGeo('ssRibs', () => [-0.045, 0, 0.045].map((x) => [unit(), [x, 0.965, 0], [0, 0, 0], [0.018, 0.012, 0.14]]))

function Model({ part }) {
  const lever = useRef()
  useFrame(() => {
    if (lever.current) lever.current.position.x = leverX(isOn(part))
  })
  return (
    <group>
      <mesh geometry={legs()} material={mat(METAL.tin, 1, 0.3)} castShadow />
      <Box size={[0.86, 0.2, 0.36]} pos={[0, 0.38, 0]} color="#1b1b1b" rough={0.55} />
      <mesh position={[0, 0.565, 0]} geometry={cover()} material={mat(METAL.nickel, 1, 0.3)} castShadow />
      {/* fundo da ranhura (corpo de plástico por baixo) */}
      <Box size={[0.52, 0.01, 0.17]} pos={[0, 0.5, 0]} color="#151515" />
      <group ref={lever} position={[leverX(!!part.config?.on), 0, 0]}>
        <Box size={[0.15, 0.4, 0.13]} pos={[0, 0.76, 0]} color="#111" rough={0.5} />
        <mesh geometry={ribs()} material={mat('#1d1d1d', 0, 0.5)} />
      </group>
    </group>
  )
}

// a imagem 2D é estática: desenha a alavanca na posição atual
function Overlay2D({ part, info, input }) {
  const on = !!(input?.on ?? part.config?.on)
  const [x0, y0] = info.project([-0.27, 0, -0.09])
  const [x1, y1] = info.project([0.27, 0, 0.09])
  const [lx, ly] = info.project([leverX(on), 0, 0])
  const s = info.project([0.08, 0, 0.07])[0] - info.project([0, 0, 0])[0]
  return (
    <g pointerEvents="none">
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx={2} fill="#2a2a2a" />
      <rect x={lx - s} y={ly - s} width={2 * s} height={2 * s} rx={1.5} fill="#0d0d0d" stroke="#777" strokeWidth={0.8} />
    </g>
  )
}

export default { type: 'slideSwitch', Model, Overlay2D }
