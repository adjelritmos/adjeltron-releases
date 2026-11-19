// TTP223: placa vermelha de 15 × 11 mm com o elétrodo redondo (cobre sob o verniz, anel de
// serigrafia), o TTP223 em SOT-23-6, o LED vermelho, o condensador 0603 e os jumpers A/B de
// solda (almofadas estanhadas).
import { HeaderPins, liveOf, inputOf, useFrame, useRef, geo, mat, THREE } from '../kit.jsx'
import def from '@shared/parts/touchTTP223.js'
import { ShapedPcb, Art, SmdField, SmdLed, Sot23, SILK } from './mq2.jsx'

const T = 0.1
const PAD = [0.25, 0] // centro do elétrodo

function draw(p) {
  // jumpers A (saída ativa a LOW) e B (modo interruptor): 2 almofadas cada
  for (const [x, z, n, dx] of [
    [0.05, -0.45, 'A', 0.13],
    [0.6, -0.42, 'B', -0.13],
  ]) {
    p.pad(x - 0.04, z, 0.06, 0.07)
    p.pad(x + 0.04, z, 0.06, 0.07)
    p.text(n, x + dx, z, 0.07)
  }
  p.text('TTP223', PAD[0], 0.48, 0.09)
}

function Model({ part }) {
  const pad = useRef()
  useFrame(() => {
    if (pad.current) pad.current.position.y = T + (inputOf(part.id).pressed ? 0.0025 : 0.005)
  })
  return (
    <group>
      <ShapedPcb id="ttp223" w={1.5} d={1.1} t={T} r={0.05} color="#c62828" />
      <Art id="ttp223" w={1.5} d={1.1} pos={[0, T + 0.0015, 0]} draw={draw} ppc={400} />
      {/* elétrodo: anel de serigrafia e o cobre sob o verniz (um pouco mais claro e brilhante) */}
      <group ref={pad} position={[PAD[0], T + 0.005, PAD[1]]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={geo('ttp:ring', () => new THREE.RingGeometry(0.37, 0.42, 40))} material={mat(SILK, 0, 0.6)} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={geo('ttp:pad', () => new THREE.CircleGeometry(0.33, 40))} material={mat('#d9433b', 0.15, 0.3)} />
      </group>
      <Sot23 pos={[-0.2, T, -0.35]} n={6} />
      <SmdLed pos={[-0.32, T, 0.05]} rotY={Math.PI / 2} size={[0.16, 0.07, 0.08]} color="#ff2020" read={() => (liveOf(part.id)?.led ? 1 : 0)} halo={0.5} />
      <SmdField
        id="ttp223"
        y={T}
        items={[
          [-0.2, 0.38, 0, 'c'],
          [-0.04, 0.36, 0],
        ]}
      />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

function Overlay2D({ info, live, input }) {
  if (!live?.powered) return null
  const [x, y] = info.project([0.25, 0, 0])
  const [lx, ly] = info.project([-0.32, 0, 0.05])
  return (
    <g pointerEvents="none">
      {input?.pressed && <circle cx={x} cy={y} r={13} fill="#ffe0b2" opacity={0.55} />}
      {live.led && <circle cx={lx} cy={ly} r={5} fill="#ff3030" opacity={0.9} filter="url(#glow)" />}
    </g>
  )
}

export default { type: 'touchTTP223', Model, Overlay2D }
