// Caixa preta para 4 pilhas AA em 2 camadas (2 × 2), aberta em cima, como a "4 AA battery case
// with lead" de ABS: vêem-se as duas pilhas de cima (e as de baixo pelas janelas laterais), as
// molas achatadas no polo −, as patilhas niqueladas no +, as pontes em série nos topos e os
// fios vermelho e preto a sair de uma ponta.
import { Box, RBox, Cyl, METAL } from '../kit.jsx'
import def, { AAB } from '@shared/parts/aaBox4.js'
import { LeadPair } from './battery9v.jsx'
import { AACell, Spring, PlusTab, cellTone } from './aaPack.jsx'
import { Badge, fmt } from './group-c-ui.jsx'

const { L, W, H } = AAB
const ZS = [-0.75, 0.75]
const YS = [0.85, 2.3]
const PLASTIC = '#151515'

function Model({ part }) {
  const color = part?.config?.color || def.config.color
  const wall = 0.12
  const end = 0.25
  const inner = L / 2 - end
  return (
    <group>
      {/* fundo, paredes laterais (com janela para a camada de baixo) e topos (aberta em cima) */}
      <RBox size={[L, 0.15, W]} r={0.05} pos={[0, 0.075, 0]} color={PLASTIC} rough={0.55} />
      {[-1, 1].map((s) => (
        <group key={`z${s}`}>
          <RBox size={[L, 0.5, wall]} r={0.04} pos={[0, 0.25, s * (W / 2 - wall / 2)]} color={PLASTIC} rough={0.55} />
          <RBox size={[L, H - 0.35 - 1.3, wall]} r={0.04} pos={[0, 1.3 + (H - 0.35 - 1.3) / 2, s * (W / 2 - wall / 2)]} color={PLASTIC} rough={0.55} />
          {[-1, 1].map((k) => (
            <Box key={k} size={[0.7, 0.85, wall]} pos={[k * (L / 2 - 0.35), 0.9, s * (W / 2 - wall / 2)]} color={PLASTIC} rough={0.55} />
          ))}
        </group>
      ))}
      {[-1, 1].map((s) => (
        <RBox key={`x${s}`} size={[end, H, W]} r={0.06} pos={[s * (L / 2 - end / 2), H / 2, 0]} color={PLASTIC} rough={0.55} />
      ))}
      {/* divisória entre as duas camadas, com o berço curvo */}
      <Box size={[L - 0.5, 0.08, W - 0.3]} pos={[0, 1.58, 0]} color="#1c1c1c" rough={0.6} />
      <Box size={[L - 0.5, 0.2, 0.08]} pos={[0, 1.66, 0]} color="#1c1c1c" rough={0.6} />
      {YS.flatMap((y, row) =>
        ZS.map((z, col) => {
          const dir = (row + col) % 2 ? -1 : 1 // pilhas alternadas: ligadas em série
          return (
            <group key={`${row}${col}`}>
              <AACell pos={[-0.075 * dir, y, z]} dir={dir} color={cellTone(color, row ? 0 : 1)} />
              <Spring pos={[-dir * inner, y, z]} dir={dir} len={0.13} />
              <PlusTab wallX={dir * inner} y={y} z={z} dir={dir} tip={2.49} />
            </group>
          )
        }),
      )}
      {/* pontes em série por cima dos topos e polaridades em relevo */}
      {[-1, 1].map((s) => (
        <group key={`b${s}`}>
          <Box size={[0.2, 0.03, 1.6]} pos={[s * (L / 2 - end / 2), H + 0.015, 0]} color={METAL.nickel} metal={1} rough={0.35} />
          <Box size={[0.02, 0.06, 0.3]} pos={[s * (L / 2 + 0.001), H - 0.45, -0.75]} color="#2c2c2c" />
          <Box size={[0.02, 0.06, 0.3]} pos={[s * (L / 2 + 0.001), H - 0.45, 0.75]} color="#2c2c2c" />
          <Box size={[0.02, 0.3, 0.06]} pos={[s * (L / 2 + 0.001), H - 0.45, s * 0.75]} color="#2c2c2c" />
        </group>
      ))}
      {/* saída dos fios: casquilho de alívio de tensão no topo +x */}
      {[-0.25, 0.25].map((z) => (
        <Cyl key={z} r={0.11} h={0.12} pos={[L / 2 + 0.05, 0.5, z]} rot={[0, 0, Math.PI / 2]} color="#0d0d0d" rough={0.5} seg={12} />
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
