// Potenciómetro rotativo WH148: lata metálica de 16 mm sobre o anel de baquelite, casquilho
// roscado, veio serrilhado de 6 mm (roda 300° com a posição) e os três terminais de latão.
import { Box, Cyl, Leg, PITCH, inputOf, useFrame, useRef } from '../kit.jsx'

function Model({ part }) {
  const shaft = useRef()
  useFrame(() => {
    const v = inputOf(part.id).value ?? part.config?.value ?? 50
    if (shaft.current) shaft.current.rotation.y = -((Math.max(0, Math.min(100, v)) / 100 - 0.5) * 300 * Math.PI) / 180
  })
  return (
    <group>
      {/* terminais: saem do anel e descem até à breadboard */}
      {[-2, 0, 2].map((k) => (
        <group key={k}>
          <Box size={[0.22, 0.05, 0.55]} pos={[k * PITCH, 0.42, 0.62]} color="#d9a441" metal={0.85} rough={0.3} />
          <Leg from={[k * PITCH, 0.42, 0.889]} to={[k * PITCH, 0, 0.889]} r={0.035} color="#d9a441" />
        </group>
      ))}
      {/* anel de baquelite castanho e lata */}
      <Cyl r={0.8} h={0.12} pos={[0, 0.42, 0]} color="#7a4a24" rough={0.7} seg={36} />
      <Cyl r={0.8} h={0.62} pos={[0, 0.79, 0]} color="#c9ccd1" metal={0.85} rough={0.3} seg={36} />
      <Cyl r={0.82} h={0.05} pos={[0, 1.1, 0]} color="#b0b5ba" metal={0.85} rough={0.35} seg={36} />
      {/* casquilho roscado e porca */}
      <Cyl r={0.36} h={0.75} pos={[0, 1.48, 0]} color="#c8ccd0" metal={0.9} rough={0.3} seg={24} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Cyl key={i} r={0.375} h={0.03} pos={[0, 1.18 + i * 0.12, 0]} color="#9ea5ab" metal={0.9} rough={0.35} seg={24} />
      ))}
      {/* veio serrilhado (roda) */}
      <group ref={shaft} position={[0, 1.85, 0]}>
        <Cyl r={0.3} h={1.35} pos={[0, 0.675, 0]} color="#d5d9dd" metal={0.9} rough={0.28} seg={18} />
        {Array.from({ length: 18 }, (_, i) => {
          const a = (i / 18) * Math.PI * 2
          return <Box key={i} size={[0.05, 0.75, 0.05]} pos={[Math.cos(a) * 0.3, 0.95, Math.sin(a) * 0.3]} rot={[0, -a, 0]} color="#a9afb4" metal={0.9} rough={0.35} />
        })}
        {/* marca da posição */}
        <Box size={[0.06, 0.02, 0.5]} pos={[0, 1.36, 0.0]} color="#333" />
      </group>
    </group>
  )
}

function Overlay2D({ live }) {
  if (live?.pos == null) return null
  return (
    <text textAnchor="middle" y={-38} fontSize={11} fontWeight="700" fill="#f5f5f5" pointerEvents="none">
      {Math.round(live.pos * 100)}%
    </text>
  )
}

export default { type: 'potRotativo', Model, Overlay2D }
