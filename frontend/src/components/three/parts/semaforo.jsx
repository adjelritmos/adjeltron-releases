// Módulo semáforo: placa preta com a "haste" (pinos e dois furos de fixação) e a cabeça com os
// LEDs difusos de 8 mm verde, amarelo e vermelho, que acendem com a corrente da simulação.
import { Box, Cyl, Pcb, HeaderPins, Halo, liveOf, useFrame, useRef, THREE } from '../kit.jsx'
import def, { SEMAFORO_LEDS } from '@shared/parts/semaforo.js'

const T = 0.16

// LED difuso de 8 mm: corpo + cúpula acendem com o brilho da simulação (live[k])
function Led({ x, color, k, part }) {
  const g = useRef()
  const light = useRef()
  const c = new THREE.Color(color)
  useFrame(() => {
    const v = liveOf(part.id)?.[k] || 0
    g.current?.traverse((o) => {
      if (o.material?.emissive) o.material.emissiveIntensity = v > 0.02 ? 0.6 + v * 2.6 : 0
    })
    if (light.current) light.current.intensity = v * 4
  })
  const lens = <meshStandardMaterial color={c.clone().multiplyScalar(0.75)} emissive={c} emissiveIntensity={0} transparent opacity={0.88} roughness={0.35} toneMapped={false} />
  return (
    <group position={[x, T, 0]}>
      <group ref={g}>
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.45, 0.45, 0.1, 24]} />
          {lens}
        </mesh>
        <mesh position={[0, 0.67, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.55, 24]} />
          {lens}
        </mesh>
        <mesh position={[0, 0.945, 0]}>
          <sphereGeometry args={[0.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          {lens}
        </mesh>
      </group>
      {/* pernas curtas até à placa */}
      <Box size={[0.05, 0.3, 0.05]} pos={[-0.13, 0.15, 0]} color="#ccc" metal={0.8} />
      <Box size={[0.05, 0.3, 0.05]} pos={[0.13, 0.15, 0]} color="#ccc" metal={0.8} />
      <pointLight ref={light} color={color} position={[0, 1.4, 0]} intensity={0} distance={6} />
      <Halo pos={[0, 0.8, 0]} size={2.6} color={color} read={() => liveOf(part.id)?.[k] || 0} />
    </group>
  )
}

function Model({ part }) {
  return (
    <group>
      <Pcb size={[1.9, T, 1.1]} pos={[-1.75, 0, 0]} color="#151515" holes={false} />
      <Pcb size={[3.5, T, 1.3]} pos={[0.95, 0, 0]} color="#151515" holes={false} />
      {/* furos de fixação da haste */}
      {[-0.32, 0.32].map((z) => (
        <Cyl key={z} r={0.14} h={T + 0.01} pos={[-1.35, T / 2, z]} color="#d9d9d9" metal={0.8} rough={0.3} seg={16} />
      ))}
      {/* serigrafia: pistas e etiquetas (riscas brancas finas) */}
      <Box size={[1.6, 0.005, 0.03]} pos={[0.95, T + 0.003, 0.58]} color="#e0e0e0" />
      <HeaderPins pins={def.pins} base={0} />
      {SEMAFORO_LEDS.map(([k, , color, , x]) => (
        <Led key={k} x={x} color={color} k={k} part={part} />
      ))}
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  return (
    <g pointerEvents="none">
      {SEMAFORO_LEDS.map(([k, , color, , x]) => {
        const v = live[k] || 0
        if (v < 0.02) return null
        const [px, py] = info.project([x, 0, 0])
        return <circle key={k} cx={px} cy={py} r={10 + v * 10} fill={color} opacity={Math.min(0.85, 0.3 + v * 0.55)} filter="url(#glow)" />
      })}
    </g>
  )
}

export default { type: 'semaforo', Model, Overlay2D }
