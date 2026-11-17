// TTP223: placa vermelha de 15 × 11 mm com o círculo do elétrodo, chip SOT-23-6 e LED.
import { Pcb, HeaderPins, Cyl, liveOf, inputOf, useFrame, useRef } from '../kit.jsx'
import def from '@shared/parts/touchTTP223.js'
import { Smd, Ic, Led, Silk } from './_groupG.jsx'

const T = 0.1

function Model({ part }) {
  const pad = useRef()
  useFrame(() => {
    if (pad.current) pad.current.position.y = T + (inputOf(part.id).pressed ? 0.0 : 0.006)
  })
  return (
    <group>
      <Pcb size={[1.5, T, 1.1]} pos={[0, 0, 0]} color="#c62828" holes={false} />
      {/* elétrodo: anel serigrafado + cobre estanhado */}
      <group ref={pad} position={[0.25, T + 0.006, 0]}>
        <Cyl r={0.42} h={0.01} color="#f2f2f2" seg={40} />
        <Cyl r={0.37} h={0.012} color="#c62828" seg={40} />
        <Cyl r={0.3} h={0.014} color="#d9c27a" metal={0.6} rough={0.35} seg={40} />
      </group>
      <Ic pos={[-0.2, T, -0.35]} size={[0.28, 0.1, 0.16]} />
      <Smd pos={[-0.2, T, 0.38]} />
      <Led pos={[-0.32, T, 0.05]} color="#ff2020" read={() => (liveOf(part.id)?.led ? 1 : 0)} />
      <Silk text="TTP223" pos={[0.25, T + 0.02, 0.48]} w={0.6} h={0.1} />
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
