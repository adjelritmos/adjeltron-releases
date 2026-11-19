// Potenciómetro deslizante num módulo: placa azul com 2 furos metalizados e a serigrafia, o
// potenciómetro com a base de plástico preto, a tampa de chapa niquelada com a ranhura aberta
// (vê-se o interior escuro), as abas de fixação nas pontas, a alavanca metálica e o botão de
// fader preto com as nervuras e a linha branca. O cursor segue o controlo (0–100 %).
import { Box, RBox, HeaderPins, useFrame, useRef, inputOf, geo, mat, mergedGeo, METAL, THREE } from '../kit.jsx'
import def from '@shared/parts/slidePot.js'
import { rectOf } from './_groupA.jsx'
import { ShapedPcb, Art, roundRectShape } from './mq2.jsx'

const T = 0.16
const knobX = (v) => -2.6 + (5.2 * (v ?? 50)) / 100
const KNOB = { w: 0.55, d: 1.0 }
const BX = 0.15 // centro do corpo do potenciómetro (x)
const HOLES = [
  [3.45, -0.5, 0.15],
  [3.45, 0.5, 0.15],
]
const unit = () => geo('sb:unitBox', () => new THREE.BoxGeometry(1, 1, 1))

// tampa de chapa: placa de cima com a ranhura recortada, paredes laterais e abas das pontas
const coverTopGeo = () =>
  geo('slide:coverTop', () => {
    const s = roundRectShape(6.2, 0.9, 0.06)
    s.holes.push(roundRectShape(5.6, 0.16, 0.079))
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false, curveSegments: 6 })
    g.rotateX(-Math.PI / 2)
    return g
  })
const coverSidesGeo = () =>
  mergedGeo('slide:coverSides', () => [
    ...[-1, 1].map((s) => [unit(), [0, -0.15, s * 0.44], [0, 0, 0], [6.2, 0.3, 0.02]]),
    ...[-1, 1].map((s) => [unit(), [s * 3.09, -0.15, 0], [0, 0, 0], [0.02, 0.3, 0.86]]),
    ...[-1, 1].map((s) => [unit(), [s * 3.12, -0.4, 0], [0, 0, 0], [0.03, 0.25, 0.3]]),
  ])
// nervuras do botão de fader
const ridgesGeo = () => mergedGeo('slide:ridges', () => [-0.17, 0.17].map((x) => [unit(), [x, 0.012, 0], [0, 0, 0], [0.06, 0.024, KNOB.d * 0.92]]))

function draw(p) {
  for (const [x, z] of HOLES) p.ring(x, z, 0.15, 0.24)
  for (const pin of def.pins) p.text(pin.id, -3.1, pin.pos[2], 0.1)
  p.rect(BX, 0, 6.35, 1.05, { lw: 0.014 })
  p.text('0', -2.6, -0.65, 0.1)
  p.text('10K', 3.0, -0.65, 0.1)
}

function Model({ part }) {
  const knob = useRef()
  useFrame(() => {
    if (knob.current) knob.current.position.x = knobX(inputOf(part.id).value)
  })
  return (
    <group>
      <ShapedPcb id="slidePot" w={7.4} d={1.6} t={T} r={0.1} holes={HOLES} color="#1d4ed8" />
      <Art id="slidePot" w={7.4} d={1.6} pos={[0, T + 0.0015, 0]} draw={draw} ppc={130} />
      {/* base de plástico preto e o interior escuro visto pela ranhura */}
      <RBox size={[6.2, 0.25, 0.86]} r={0.03} pos={[BX, T + 0.125, 0]} color="#151515" rough={0.6} />
      <Box size={[5.6, 0.02, 0.3]} pos={[BX, T + 0.4, 0]} color="#0a0a0a" rough={0.9} />
      {/* tampa niquelada */}
      <group position={[BX, T + 0.52, 0]}>
        <mesh geometry={coverTopGeo()} material={mat(METAL.nickel, 1, 0.33)} castShadow receiveShadow />
        <mesh geometry={coverSidesGeo()} material={mat('#b9bdc2', 1, 0.35)} />
      </group>
      {/* cursor (alavanca + botão de fader) */}
      <group ref={knob} position={[0, 0, 0]}>
        <Box size={[0.1, 0.4, 0.1]} pos={[0, T + 0.48, 0]} color="#a9aeb3" metal={0.9} rough={0.35} />
        <RBox size={[KNOB.w, 0.4, KNOB.d]} r={0.05} pos={[0, T + 0.82, 0]} color="#1a1a1a" rough={0.5} />
        <group position={[0, T + 1.02, 0]}>
          <mesh geometry={ridgesGeo()} material={mat('#232323', 0, 0.55)} />
          <Box size={[0.07, 0.012, KNOB.d * 0.8]} pos={[0, 0.006, 0]} color="#f5f5f5" />
        </group>
      </group>
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

// a imagem estática tem o cursor a 50 %: tapa-se e desenha-se na posição atual
function Overlay2D({ info, input }) {
  const v = input?.value ?? 50
  if (Math.abs(v - 50) < 0.5) return null
  const old = rectOf(info, -KNOB.w / 2, -KNOB.d / 2, KNOB.w / 2, KNOB.d / 2)
  const x = knobX(v)
  const k = rectOf(info, x - KNOB.w / 2, -KNOB.d / 2, x + KNOB.w / 2, KNOB.d / 2)
  const body = rectOf(info, -2.95, -0.45, 3.25, 0.45)
  const slot = rectOf(info, -2.65, -0.08, 2.95, 0.08)
  return (
    <g pointerEvents="none">
      <rect x={old.x} y={body.y} width={old.w} height={body.h} fill="#b9bdc2" />
      <rect x={old.x} y={old.y} width={old.w} height={body.y - old.y} fill="#1d4ed8" />
      <rect x={old.x} y={body.y + body.h} width={old.w} height={old.y + old.h - body.y - body.h} fill="#1d4ed8" />
      <rect x={old.x} y={slot.y} width={old.w} height={slot.h} fill="#111" />
      <rect x={k.x} y={k.y} width={k.w} height={k.h} rx={2} fill="#1a1a1a" stroke="#000" />
      <rect x={k.x + k.w / 2 - 1} y={k.y + k.h * 0.1} width={2} height={k.h * 0.8} fill="#f5f5f5" />
    </g>
  )
}

export default { type: 'slidePot', Model, Overlay2D }
