// Módulo semáforo: placa preta com a "haste" (pinos e dois furos de fixação) e a cabeça com os
// LEDs difusos de 8 mm verde, amarelo e vermelho, que acendem com a corrente da simulação.
import { Box, Pcb, HeaderPins, Halo, liveOf, geo, useFrame, useMemo, useRef, THREE } from '../kit.jsx'
import { MountHoles, SmdParts, PinColumn } from './_gDisplays.jsx'
import def, { SEMAFORO_LEDS } from '@shared/parts/semaforo.js'

const T = 0.16

// LED difuso de 8 mm numa só peça torneada (rebordo Ø 9 mm, cilindro Ø 8 mm e cúpula) com o lado
// plano do cátodo; acende com o brilho da simulação (live[k])
const lens8 = () =>
  geo('led8Lens', () => {
    const pts = [[0.0001, 0], [0.45, 0], [0.45, 0.1], [0.4, 0.1], [0.4, 0.62]]
    for (let k = 1; k <= 8; k++) {
      const a = (k / 8) * (Math.PI / 2)
      pts.push([Math.max(0.0001, 0.4 * Math.cos(a)), 0.62 + 0.4 * Math.sin(a)])
    }
    const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 32)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) if (p.getY(i) <= 0.1 + 1e-6 && p.getX(i) < -0.4) p.setX(i, -0.4)
    g.computeVertexNormals()
    return g
  })
function Led({ x, color, k, part }) {
  const m = useRef()
  const light = useRef()
  const c = useMemo(() => new THREE.Color(color), [color])
  useFrame(() => {
    const v = liveOf(part.id)?.[k] || 0
    if (m.current) m.current.emissiveIntensity = v > 0.02 ? 0.6 + v * 2.6 : 0
    if (light.current) light.current.intensity = v * 4
  })
  return (
    <group position={[x, T, 0]}>
      {/* pernas curtas até à placa e a armação vista através da resina */}
      <Box size={[0.05, 0.3, 0.05]} pos={[-0.13, 0.15, 0]} color="#ccc" metal={0.8} />
      <Box size={[0.05, 0.3, 0.05]} pos={[0.13, 0.15, 0]} color="#ccc" metal={0.8} />
      <Box size={[0.05, 0.25, 0.03]} pos={[-0.1, 0.42, 0]} color="#b9bec4" metal={0.8} rough={0.35} />
      <Box size={[0.08, 0.3, 0.03]} pos={[0.1, 0.44, 0]} color="#b9bec4" metal={0.8} rough={0.35} />
      <mesh position={[0, 0.3, 0]} geometry={lens8()}>
        <meshStandardMaterial ref={m} color={c.clone().multiplyScalar(0.75)} emissive={c} emissiveIntensity={0} transparent opacity={0.88} roughness={0.35} toneMapped={false} />
      </mesh>
      <pointLight ref={light} color={color} position={[0, 1.4, 0]} intensity={0} distance={6} />
      <Halo pos={[0, 0.8, 0]} size={2.6} color={color} read={() => liveOf(part.id)?.[k] || 0} />
    </group>
  )
}

// placa preta: "haste" com os pinos e dois furos de fixação, cabeça com os 3 LEDs, as
// resistências de 270 Ω (271) de cada LED e a serigrafia dos pinos
const RES = SEMAFORO_LEDS.map(([, , , , x]) => [x + 0.48, 0.5, Math.PI / 2, 'R'])
function Model({ part }) {
  return (
    <group>
      <Pcb size={[1.9, T, 1.1]} pos={[-1.75, 0, 0]} color="#151515" holes={false} />
      <Pcb size={[3.5, T, 1.3]} pos={[0.95, 0, 0]} color="#151515" holes={false} />
      <MountHoles pts={[[-1.35, -0.32], [-1.35, 0.32]]} y={T} r={0.13} ring={0.2} />
      <SmdParts list={RES} y={T} />
      <PinColumn zs={def.pins.map((p) => p.pos[2])} names={def.pins.map((p) => p.id)} x={-1.82} y={T + 0.002} w={0.34} h={0.1} />
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
