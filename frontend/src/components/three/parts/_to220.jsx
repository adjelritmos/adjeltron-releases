// Regulador em TO-220 (não é um componente): corpo preto com a marcação virada para a
// frente (+x), aba metálica atrás com furo, 3 pernas; dissipador opcional.
import { Box, Cyl, Leg, useLabel, PITCH } from '../kit.jsx'

export function To220({ text, sub, heatsink }) {
  const label = useLabel([{ text, font: 'bold 54px Arial', y: 80 }, { text: sub, font: 'bold 34px Arial', y: 150 }, { text: '◦ 1  2  3', font: '28px Arial', y: 215 }], 256, 256)
  return (
    <group>
      {[PITCH, 0, -PITCH].map((z) => (
        <group key={z}>
          <Leg from={[0, 0, z]} to={[0, 0.3, z]} r={0.03} />
          <Box size={[0.05, 0.16, 0.08]} pos={[0, 0.38, z]} color="#cfcfcf" metal={0.85} rough={0.3} />
        </group>
      ))}
      <Box size={[0.45, 0.9, 1.0]} pos={[0, 0.9, 0]} color="#161616" rough={0.55} />
      <mesh position={[0.227, 0.9, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.92, 0.88]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
      {/* aba metálica (ligada ao pino do meio) */}
      <Box size={[0.13, 1.55, 1.0]} pos={[-0.16, 1.225, 0]} color="#c9ccd1" metal={0.9} rough={0.3} />
      <Cyl r={0.18} h={0.15} pos={[-0.16, 1.65, 0]} rot={[0, 0, Math.PI / 2]} color="#1a1a1a" />
      {heatsink && (
        <group position={[-0.32, 1.25, 0]}>
          {/* dissipador de alumínio preto com alhetas, aparafusado à aba */}
          <Box size={[0.12, 1.9, 1.5]} pos={[0, 0, 0]} color="#2a2a2e" metal={0.5} rough={0.5} />
          {[-0.6, -0.3, 0, 0.3, 0.6].map((z) => (
            <Box key={z} size={[0.7, 1.9, 0.07]} pos={[-0.38, 0, z]} color="#2a2a2e" metal={0.5} rough={0.5} />
          ))}
          <Cyl r={0.1} h={0.2} pos={[0.24, 0.4, 0]} rot={[0, 0, Math.PI / 2]} color="#bdbdbd" metal={0.8} />
        </group>
      )}
    </group>
  )
}
