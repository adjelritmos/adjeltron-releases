// Circuito integrado DIP genérico (não é um componente): corpo preto, entalhe e ponto do
// pino 1 à esquerda (−x), pernas nas posições do catálogo e marcação no topo.
import { Box, Cyl, Leg, useLabel } from '../kit.jsx'

const Y0 = 0.12 // o corpo fica ~1,2 mm acima da breadboard
const H = 0.33

export function Dip({ pins, len, text, sub, color = '#1a1a1a', ink = '#d8d8d8', w = 0.65 }) {
  const lines = [{ text, font: `bold ${sub ? 84 : 92}px Arial`, y: sub ? 52 : 64 }]
  if (sub) lines.push({ text: sub, font: 'bold 42px Arial', y: 106 })
  const label = useLabel(lines, 512, 128)
  const top = Y0 + H
  return (
    <group>
      {pins.map((p) => {
        const s = Math.sign(p.pos[2])
        return (
          <group key={p.id}>
            <Leg from={p.pos} to={[p.pos[0], Y0 + 0.12, p.pos[2]]} r={0.025} />
            <Box size={[0.1, 0.03, 0.08]} pos={[p.pos[0], Y0 + 0.12, s * (w / 2 + 0.03)]} color="#c9c9c9" metal={0.8} rough={0.3} />
          </group>
        )
      })}
      <Box size={[len, H, w]} pos={[0, Y0 + H / 2, 0]} color={color} rough={0.55} />
      <Cyl r={Math.min(0.1, len / 6)} h={0.02} pos={[-len / 2 + 0.02, top + 0.001, 0]} color={color === '#1a1a1a' ? '#050505' : '#bdbdbd'} seg={20} />
      <Cyl r={0.045} h={0.01} pos={[-len / 2 + 0.16, top + 0.001, 0.18]} color={color === '#1a1a1a' ? '#3a3a3a' : '#9e9e9e'} seg={16} />
      <mesh position={[0.06, top + 0.003, -0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[Math.min(len * 0.78, 1.4), Math.min(len * 0.78, 1.4) / 4]} />
        <meshBasicMaterial map={label} transparent color={ink} />
      </mesh>
    </group>
  )
}
