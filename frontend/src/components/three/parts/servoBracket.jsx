// Suporte em U de alumínio: base aparafusada ao braço do servo (na origem), alma ao
// longo de x com abas laterais, e na ponta uma forquilha onde prende o servo seguinte.
import { Box, Cyl } from '../kit.jsx'

const ALU = '#cfd8dc'

function ServoBracketModel({ part }) {
  const L = part.config?.length ?? 4.5
  return (
    <group>
      {/* disco de fixação ao braço do servo */}
      <Cyl r={0.95} h={0.3} pos={[0, 0.15, 0]} color={ALU} metal={0.85} rough={0.3} seg={28} />
      {[0, 1, 2, 3].map((k) => (
        <Cyl key={k} r={0.1} h={0.32} pos={[Math.cos((k * Math.PI) / 2) * 0.6, 0.15, Math.sin((k * Math.PI) / 2) * 0.6]} color="#37474f" seg={8} />
      ))}
      {/* alma */}
      <Box size={[L + 0.8, 0.3, 1.8]} pos={[L / 2 - 0.1, 0.15, 0]} color={ALU} metal={0.85} rough={0.3} />
      {/* abas (perfil em U) */}
      {[-1, 1].map((sz) => (
        <Box key={sz} size={[L - 0.6, 0.7, 0.2]} pos={[L / 2, -0.2, sz * 0.9]} color={ALU} metal={0.85} rough={0.3} />
      ))}
      {/* forquilha da ponta */}
      <Box size={[0.25, 0.3, 2.4]} pos={[L + 0.3, 0.15, 0]} color={ALU} metal={0.85} rough={0.3} />
      {[-1, 1].map((sz) => (
        <Box key={`e${sz}`} size={[0.8, 0.3, 0.25]} pos={[L, 0.15, sz * 1.15]} color={ALU} metal={0.85} rough={0.3} />
      ))}
      <Cyl r={0.12} h={0.32} pos={[L, 0.15, 0]} color="#37474f" seg={10} />
    </group>
  )
}

export default { type: 'servoBracket', Model: ServoBracketModel }
