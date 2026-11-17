// Caixa preta para 4 pilhas AA em 2 camadas (2 × 2), aberta em cima: vêem-se as duas pilhas de
// cima, as molas e os contactos nas pontas; fios vermelho e preto a sair de uma ponta.
import { Box, Cyl } from '../kit.jsx'
import def, { AAB } from '@shared/parts/aaBox4.js'
import { LeadPair } from './battery9v.jsx'
import { Badge, fmt } from './group-c-ui.jsx'

const { L, W, H } = AAB
const R = 0.7 // raio de uma AA
const ZS = [-0.75, 0.75]
const YS = [0.85, 2.3]

function Model() {
  const wall = 0.12
  return (
    <group>
      {/* fundo, paredes laterais e topos (aberta em cima) */}
      <Box size={[L, 0.15, W]} pos={[0, 0.075, 0]} color="#141414" rough={0.6} />
      {[-1, 1].map((s) => (
        <Box key={`z${s}`} size={[L, H - 0.35, wall]} pos={[0, (H - 0.35) / 2, s * (W / 2 - wall / 2)]} color="#141414" rough={0.6} />
      ))}
      {[-1, 1].map((s) => (
        <Box key={`x${s}`} size={[0.25, H, W]} pos={[s * (L / 2 - 0.125), H / 2, 0]} color="#141414" rough={0.6} />
      ))}
      {/* divisória entre as duas camadas */}
      <Box size={[L - 0.5, 0.08, W - 0.3]} pos={[0, 1.58, 0]} color="#1c1c1c" />
      {YS.flatMap((y, row) =>
        ZS.map((z, col) => {
          const dir = (row + col) % 2 ? -1 : 1 // pilhas alternadas: ligadas em série
          return (
            <group key={`${row}${col}`}>
              <Cyl r={R} h={4.9} pos={[0, y, z]} rot={[0, 0, Math.PI / 2]} color={row ? '#2e7d32' : '#1f5e24'} rough={0.35} />
              <Cyl r={R + 0.01} h={1.2} pos={[dir * -1.85, y, z]} rot={[0, 0, Math.PI / 2]} color="#c9a227" metal={0.5} rough={0.35} />
              <Cyl r={0.25} h={0.15} pos={[dir * 2.5, y, z]} rot={[0, 0, Math.PI / 2]} color="#d9dde2" metal={0.9} />
              {/* mola no polo negativo */}
              <Cyl r={0.42} h={0.3} pos={[-dir * 2.7, y, z]} rot={[0, 0, Math.PI / 2]} color="#b0b4ba" metal={0.9} rough={0.3} seg={10} />
            </group>
          )
        }),
      )}
      {/* contactos dourados na ponta dos fios */}
      {[-0.6, 0.6].map((z) => (
        <Cyl key={z} r={0.22} h={0.05} pos={[L / 2 + 0.01, 0.6, z]} rot={[0, 0, Math.PI / 2]} color="#c9a227" metal={0.8} rough={0.3} seg={14} />
      ))}
      <LeadPair from={[L / 2, 0.5, 0]} pins={def.pins} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  return <Badge info={info} text={`${fmt(live.v, 2)} V`} />
}

export default { type: 'aaBox4', Model, Overlay2D }
