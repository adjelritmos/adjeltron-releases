// PIR HC-SR501: placa verde com cúpula de Fresnel branca. A cúpula ganha um tom quente com OUT = HIGH.
import { Box, Pcb, HeaderPins, liveOf, useFrame, useRef } from '../kit.jsx'
import def from '@shared/parts/pir.js'

function Model({ part }) {
  const dome = useRef()
  useFrame(() => {
    const L = liveOf(part.id)
    if (dome.current) dome.current.emissiveIntensity = L?.out ? 0.35 : 0
  })
  return (
    <group>
      <Pcb size={[3.2, 0.16, 2.4]} pos={[0, 0, 0]} color="#1f6f2a" />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
      <Box size={[2.35, 0.3, 2.35]} pos={[0.15, 0.31, 0]} color="#f2f2ee" rough={0.7} />
      <mesh position={[0.15, 0.46, 0]} castShadow>
        <sphereGeometry args={[1.12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial ref={dome} color="#f7f7f3" emissive="#ff8a65" emissiveIntensity={0} roughness={0.5} flatShading transparent opacity={0.95} />
      </mesh>
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered) return null
  const [x, y] = info.project([0.15, 0, 0])
  const r = info.project([1.3, 0, 0])[0] - x
  return (
    <g pointerEvents="none">
      {live.out && <circle cx={x} cy={y} r={r} fill="#ff7043" opacity={0.35} filter="url(#glow)" />}
      <text x={x} y={y + r + 12} textAnchor="middle" fontSize={10} fill={live.out ? '#ffab91' : '#9ca3af'} fontFamily="monospace">
        {!live.ready ? 'a arrancar…' : live.out ? 'OUT HIGH' : 'OUT LOW'}
      </text>
    </g>
  )
}

export default { type: 'pir', Model, Overlay2D }
