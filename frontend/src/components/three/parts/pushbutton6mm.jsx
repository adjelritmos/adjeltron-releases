// Botão tátil 6 × 6 × 5 mm (THT): corpo preto, tampa de chapa niquelada com as patilhas dobradas
// pelos lados, 4 pinos de plástico nos cantos, atuador redondo Ø 3,5 mm que desce ao premir e as
// 4 pernas de chapa (saem do corpo, dobram para baixo e têm o "joelho" de encaixe).
import { Box, Cyl, geo, mat, mergedGeo, METAL, THREE, inputOf, useFrame, useRef } from '../kit.jsx'
import def from '@shared/parts/pushbutton6mm.js'

const unit = () => geo('gull', () => new THREE.BoxGeometry(1, 1, 1))
// pernas: troço horizontal a sair do corpo, descida até à placa e o joelho de encaixe
const legs = () =>
  mergedGeo('pb6Legs', () =>
    def.pins.flatMap((p) => {
      const s = Math.sign(p.pos[0])
      return [
        [unit(), [s * 0.33, 0.23, p.pos[2]], [0, 0, 0], [0.1, 0.03, 0.07]],
        [unit(), [s * 0.381, 0.12, p.pos[2]], [0, 0, 0], [0.025, 0.24, 0.07]],
        [unit(), [s * 0.395, 0.1, p.pos[2]], [0, 0, 0.5 * s], [0.025, 0.08, 0.07]],
      ]
    }),
  )
// patilhas da tampa dobradas sobre os lados ±z
const tabs = () => mergedGeo('pb6Tabs', () => [-1, 1].flatMap((sz) => [-1, 1].map((sx) => [unit(), [sx * 0.16, 0.47, sz * 0.305], [0, 0, 0], [0.13, 0.2, 0.012]])))
// pinos de plástico dos cantos que prendem a tampa
const posts = () => mergedGeo('pb6Posts', () => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => [geo('pb6Post', () => new THREE.CylinderGeometry(0.035, 0.045, 0.04, 10)), [sx * 0.23, 0.6, sz * 0.23]]))

function Model({ part }) {
  const cap = useRef()
  useFrame(() => {
    if (cap.current) cap.current.position.y = inputOf(part.id).pressed ? 0.58 : 0.64
  })
  const color = part.config?.color || '#212121'
  return (
    <group>
      <mesh geometry={legs()} material={mat(METAL.tin, 1, 0.3)} castShadow />
      <Box size={[0.6, 0.35, 0.6]} pos={[0, 0.2 + 0.175, 0]} color="#1b1b1b" rough={0.6} />
      {/* tampa de chapa com o furo do atuador */}
      <mesh position={[0, 0.565, 0]} geometry={geo('pb6Cover', () => {
        const s = new THREE.Shape()
        s.moveTo(-0.31, -0.31)
        s.lineTo(0.31, -0.31)
        s.lineTo(0.31, 0.31)
        s.lineTo(-0.31, 0.31)
        s.lineTo(-0.31, -0.31)
        const h = new THREE.Path()
        h.absarc(0, 0, 0.2, 0, Math.PI * 2, true)
        s.holes.push(h)
        return new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false, curveSegments: 24 }).rotateX(-Math.PI / 2).translate(0, -0.015, 0)
      })} material={mat(METAL.nickel, 1, 0.3)} castShadow />
      <mesh geometry={tabs()} material={mat(METAL.nickel, 1, 0.32)} />
      <mesh geometry={posts()} material={mat('#141414', 0, 0.5)} />
      <group ref={cap} position={[0, 0.64, 0]}>
        {/* atuador: veio e topo com a aresta boleada */}
        <Cyl r={0.175} h={0.14} pos={[0, -0.01, 0]} color={color} rough={0.45} seg={24} />
        <Cyl r={0.16} r2={0.175} h={0.03} pos={[0, 0.075, 0]} color={color} rough={0.4} seg={24} />
      </group>
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.pressed) return null
  const [x, y] = info.project([0, 0, 0])
  return <circle cx={x} cy={y} r={8} fill="none" stroke="#ffb300" strokeWidth={2.5} pointerEvents="none" />
}

export default { type: 'pushbutton6mm', Model, Overlay2D }
