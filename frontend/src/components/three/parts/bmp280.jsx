// Módulo GY-BMP280 (roxo, 15 × 11,5 mm) com o sensor de tampa metálica e 6 pinos.
import { Box, Cyl, Pcb, HeaderPins, useLabel } from '../kit.jsx'
import def from '@shared/parts/bmp280.js'

const T = 0.12

function Model() {
  const label = useLabel([{ text: 'GY-BMP280', font: 'bold 60px Arial' }], 512, 96)
  return (
    <group>
      <Pcb size={[1.5, T, 1.15]} color="#6a1b9a" holes={false} />
      {[-0.55, 0.55].map((x) => (
        <Cyl key={x} r={0.12} h={T + 0.01} pos={[x, T / 2, 0.3]} color="#c9a227" metal={0.8} rough={0.3} seg={14} />
      ))}
      {/* sensor de tampa metálica (2 × 2,5 mm) com o furo de ventilação */}
      <Box size={[0.25, 0.09, 0.2]} pos={[0, T + 0.045, 0.12]} color="#d0d4d8" metal={0.9} rough={0.25} />
      <Cyl r={0.025} h={0.01} pos={[0.07, T + 0.095, 0.08]} color="#222" seg={10} />
      {/* regulador e componentes passivos */}
      <Box size={[0.3, 0.1, 0.16]} pos={[-0.4, T + 0.05, 0.05]} color="#1a1a1a" />
      {[[0.35, 0.05], [0.35, 0.3], [-0.25, 0.32], [0.18, 0.4]].map(([x, z], i) => (
        <Box key={i} size={[0.1, 0.05, 0.06]} pos={[x, T + 0.025, z]} color={i % 2 ? '#c8b089' : '#222'} />
      ))}
      <mesh position={[0, T + 0.002, -0.17]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.0, 0.19]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

export default { type: 'bmp280', Model }
