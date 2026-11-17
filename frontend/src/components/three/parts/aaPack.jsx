// Suporte preto para 4 pilhas AA lado a lado (alternadas), com fios até aos pinos.
import { Box, Cyl } from '../kit.jsx'
import def from '@shared/parts/aaPack.js'
import { LeadPair } from './battery9v.jsx'
import { Badge, fmt } from './group-c-ui.jsx'

const LX = 6.4
const LZ = 6.2
const ZS = [-2.2, -0.73, 0.73, 2.2]

function Model() {
  return (
    <group>
      <Box size={[LX, 0.2, LZ]} pos={[0, 0.1, 0]} color="#151515" />
      {[-1, 1].map((s) => (
        <Box key={`x${s}`} size={[0.2, 1.2, LZ]} pos={[s * (LX / 2 - 0.1), 0.6, 0]} color="#151515" />
      ))}
      {[-1, 1].map((s) => (
        <Box key={`z${s}`} size={[LX, 1.2, 0.15]} pos={[0, 0.6, s * (LZ / 2 - 0.075)]} color="#151515" />
      ))}
      {ZS.map((z, i) => {
        const dir = i % 2 ? -1 : 1
        return (
          <group key={z}>
            <Cyl r={0.7} h={4.9} pos={[0, 0.9, z]} rot={[0, 0, Math.PI / 2]} color="#2e7d32" rough={0.35} />
            <Cyl r={0.71} h={1.2} pos={[dir * -1.85, 0.9, z]} rot={[0, 0, Math.PI / 2]} color="#c9a227" metal={0.5} rough={0.35} />
            <Cyl r={0.25} h={0.15} pos={[dir * 2.5, 0.9, z]} rot={[0, 0, Math.PI / 2]} color="#d9dde2" metal={0.9} />
            <Cyl r={0.4} h={0.25} pos={[-dir * 2.85, 0.9, z]} rot={[0, 0, Math.PI / 2]} color="#b0b4ba" metal={0.9} />
          </group>
        )
      })}
      <LeadPair from={[LX / 2, 0.5, 0]} pins={def.pins} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  return <Badge info={info} text={`${fmt(live.v, 2)} V`} />
}

export default { type: 'aaPack', Model, Overlay2D }
