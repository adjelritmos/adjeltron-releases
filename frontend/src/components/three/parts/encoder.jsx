// Codificador rotativo KY-040: placa azul de 26 × 19 mm com 2 furos metalizados, as 3
// resistências de pull-up de 10 kΩ, a serigrafia dos pinos e o EC11 (base de plástico preto,
// tampa de chapa niquelada com as patilhas dobradas e as abas de fixação, casquilho roscado M7)
// com o botão de plástico estriado e a marca branca. O botão roda com a posição (20 passos/volta)
// e desce ao premir. No 2D: clicar no botão prime SW; a roda do rato sobre o botão roda um passo.
import { RBox, HeaderPins, inputOf, useFrame, useRef, geo, mat, mergedGeo, METAL, THREE } from '../kit.jsx'
import { setInput } from '../../../services/simControl.js'
import def from '@shared/parts/encoder.js'
import { ShapedPcb, Art, SmdField } from './mq2.jsx'

const K = [0.3, 0, 0] // eixo do botão
const STEP = (2 * Math.PI) / 20
const T = 0.16
const BX = 0.05 // centro da placa (x)
const HOLES = [
  [1.15 - BX, -0.72, 0.15],
  [1.15 - BX, 0.72, 0.15],
] // relativos ao centro da placa
const unit = () => geo('sb:unitBox', () => new THREE.BoxGeometry(1, 1, 1))
const v2 = (pts) => pts.map(([r, y]) => new THREE.Vector2(r, y))

// tampa de chapa: patilhas dobradas nos 4 lados e as 2 abas de fixação que descem à placa
const tabsGeo = () =>
  mergedGeo('enc:tabs', () => [
    ...[-1, 1].map((s) => [unit(), [K[0] + s * 0.635, T + 0.42, 0], [0, 0, 0], [0.02, 0.22, 0.3]]),
    ...[-1, 1].map((s) => [unit(), [K[0], T + 0.42, s * 0.635], [0, 0, 0], [0.3, 0.22, 0.02]]),
    ...[-1, 1].map((s) => [unit(), [K[0], T + 0.2, s * 0.64], [0, 0, 0], [0.22, 0.4, 0.025]]),
  ])
// rosca do casquilho (anéis)
const threadGeo = () => mergedGeo('enc:thread', () => Array.from({ length: 5 }, (_, i) => [new THREE.TorusGeometry(0.345, 0.018, 4, 24).rotateX(Math.PI / 2), [K[0], T + 0.72 + i * 0.05, 0]]))
// botão: corpo ligeiramente cónico com a aresta de cima boleada e as estrias
const knobGeo = () =>
  geo('enc:knob', () => new THREE.LatheGeometry(v2([[0.3, 0], [0.72, 0], [0.72, 0.05], [0.7, 1.12], [0.67, 1.19], [0.6, 1.21], [0, 1.21]]), 40))
const ribsGeo = () =>
  mergedGeo('enc:ribs', () =>
    Array.from({ length: 30 }, (_, i) => {
      const a = (i / 30) * Math.PI * 2
      return [unit(), [Math.cos(a) * 0.715, 0.58, Math.sin(a) * 0.715], [0, -a, 0], [0.05, 0.95, 0.045]]
    }),
  )

function draw(p) {
  for (const [x, z] of HOLES) p.ring(x + BX, z, 0.15, 0.26)
  for (const pin of def.pins) p.text(pin.id, -0.85, pin.pos[2], 0.11)
  p.rect(K[0], 0, 1.35, 1.35, { lw: 0.014 })
  p.text('KY-040', K[0] + 0.85, 0, 0.12, { rot: -Math.PI / 2 })
}

function Model({ part }) {
  const knob = useRef()
  useFrame(() => {
    const i = inputOf(part.id)
    if (!knob.current) return
    knob.current.rotation.y = -(Math.round(+i.value || 0) * STEP)
    knob.current.position.y = i.pressed ? 1.12 : 1.2
  })
  return (
    <group>
      <ShapedPcb id="enc" pos={[BX, 0, 0]} w={2.6} d={1.9} t={T} r={0.08} holes={HOLES} color="#1a3a9c" />
      <Art id="enc" w={2.6} d={1.9} pos={[BX, T + 0.0015, 0]} draw={draw} origin={[BX, 0]} />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
      <SmdField
        id="enc"
        y={T}
        items={[
          [-0.48, -0.35, 0, 'R'],
          [-0.48, 0, 0, 'R'],
          [-0.48, 0.35, 0, 'R'],
        ]}
      />
      {/* EC11: base de plástico, tampa niquelada e patilhas */}
      <RBox size={[1.22, 0.3, 1.22]} r={0.03} pos={[K[0], T + 0.15, 0]} color="#1b1b1b" rough={0.6} />
      <RBox size={[1.25, 0.35, 1.25]} r={0.02} pos={[K[0], T + 0.475, 0]} color={METAL.nickel} metal={1} rough={0.35} />
      <mesh geometry={tabsGeo()} material={mat('#b8bcc0', 1, 0.3)} />
      {/* casquilho roscado M7 (latão niquelado) */}
      <mesh position={[K[0], T + 0.79, 0]} geometry={geo('enc:bush', () => new THREE.CylinderGeometry(0.34, 0.34, 0.28, 24))} material={mat('#c8b27a', 1, 0.3)} castShadow />
      <mesh geometry={threadGeo()} material={mat('#c8b27a', 1, 0.3)} />
      <group ref={knob} position={[K[0], 1.2, 0]}>
        <mesh geometry={knobGeo()} material={mat('#262626', 0, 0.5)} castShadow />
        <mesh geometry={ribsGeo()} material={mat('#262626', 0, 0.5)} />
        <mesh position={[0, 1.212, -0.33]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('plane1', () => new THREE.PlaneGeometry(1, 1))} scale={[0.07, 0.45, 1]} material={mat('#f4f4f4', 0, 0.5)} />
      </group>
    </group>
  )
}

function Overlay2D({ part, info, input }) {
  const [cx, cy] = info.project(K)
  const r = info.project([K[0] + 0.75, 0, 0])[0] - cx
  const a = Math.round(+input?.value || 0) * STEP
  const turn = (d) => {
    const ia = def.interactive
    const v = Math.max(ia.min, Math.min(ia.max, Math.round(+input?.value || 0) + d))
    setInput(part.id, { value: v })
  }
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={input?.pressed ? '#6b5a22' : '#2a2a2a'}
        stroke="#444"
        strokeWidth={1}
        style={{ cursor: 'pointer' }}
        onPointerDown={(e) => {
          e.stopPropagation()
          setInput(part.id, { pressed: true })
        }}
        onPointerUp={() => setInput(part.id, { pressed: false })}
        onWheel={(e) => {
          e.stopPropagation()
          turn(e.deltaY < 0 ? 1 : -1)
        }}
      />
      {/* marca branca do botão (rodado como no 3D, visto de cima) */}
      <line x1={cx} y1={cy} x2={cx + Math.sin(a) * r * 0.85} y2={cy - Math.cos(a) * r * 0.85} stroke="#fff" strokeWidth={3} strokeLinecap="round" pointerEvents="none" />
    </g>
  )
}

export default { type: 'encoder', Model, Overlay2D }
