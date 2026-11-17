// Sensor de nível de água: placa vermelha com pistas paralelas expostas; a água cobre as
// pistas a partir da ponta (x = +3,1) até ao nível escolhido (0–40 mm).
import { Box, Pcb, HeaderPins, inputOf, useFrame, useRef } from '../kit.jsx'
import def from '@shared/parts/waterLevel.js'
import { Silk, Smd } from './_groupG.jsx'

const T = 0.12
const TIP = 3.1

function Model({ part }) {
  const water = useRef()
  useFrame(() => {
    const mm = inputOf(part.id).value ?? 0
    const L = Math.max(0.001, mm / 10)
    if (water.current) {
      water.current.visible = mm > 0
      water.current.scale.x = L
      water.current.position.x = TIP - L / 2
    }
  })
  return (
    <group>
      <Pcb size={[6.2, T, 2.0]} color="#b71c1c" holes={false} />
      {Array.from({ length: 10 }, (_, i) => (
        <Box key={i} size={[4.2, 0.012, 0.08]} pos={[0.85, T + 0.006, -0.81 + i * 0.18]} color="#d8cf9f" metal={0.7} rough={0.35} />
      ))}
      <mesh ref={water} position={[TIP, T + 0.02, 0]} visible={false}>
        <boxGeometry args={[1, 0.03, 2.02]} />
        <meshStandardMaterial color="#7cc4ff" transparent opacity={0.45} roughness={0.05} />
      </mesh>
      <Smd pos={[-1.9, T, -0.4]} />
      <Smd pos={[-1.9, T, 0.4]} />
      <Box size={[0.35, 0.12, 0.3]} pos={[-2.2, T + 0.06, 0]} color="#151515" />
      <Silk text="WATER SENSOR" pos={[-1.55, T + 0.01, 0]} w={1.4} h={0.18} rot={Math.PI / 2} />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

export default { type: 'waterLevel', Model }
