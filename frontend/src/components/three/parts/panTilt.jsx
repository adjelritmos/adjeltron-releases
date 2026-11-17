// Suporte pan-tilt (plástico preto): disco no braço do servo pan e berço em U que segura
// o SG90 do tilt deitado (o eixo do tilt fica horizontal, por cima do eixo do pan).
import { Box, Cyl } from '../kit.jsx'

const PL = '#212121'

function Model() {
  return (
    <group>
      <Cyl r={1.0} h={0.3} pos={[0, 0.15, 0]} color={PL} rough={0.6} seg={28} />
      {[0, 1, 2, 3].map((k) => (
        <Cyl key={k} r={0.08} h={0.32} pos={[Math.cos((k * Math.PI) / 2) * 0.6, 0.15, Math.sin((k * Math.PI) / 2) * 0.6]} color="#555" seg={8} />
      ))}
      {/* base do berço */}
      <Box size={[2.7, 0.2, 2.9]} pos={[-0.55, 0.4, -0.3]} color={PL} rough={0.6} />
      {/* paredes em x (abraçam o servo pelos topos) */}
      {[-1.85, 0.75].map((x) => (
        <Box key={x} size={[0.2, 2.0, 2.9]} pos={[x, 1.4, -0.3]} color={PL} rough={0.6} />
      ))}
      {/* parede de trás (fundo do servo) */}
      <Box size={[2.7, 2.0, 0.15]} pos={[-0.55, 1.4, -1.75]} color={PL} rough={0.6} />
      {/* abas de aparafusar o servo */}
      {[-1.95, 0.85].map((x) => (
        <Box key={`t${x}`} size={[0.4, 0.15, 0.6]} pos={[x, 1.6, -0.0]} color={PL} rough={0.6} />
      ))}
    </group>
  )
}

export default { type: 'panTilt', Model }
