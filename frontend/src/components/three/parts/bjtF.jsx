// Transístores do grupo F: BC547/BC557/2N3906 em TO-92 e 2N3055 em TO-3 (caixa metálica).
import BJT_DEFS from '@shared/parts/bjtF.js'
import { Box, Cyl, Leg, useLabel } from '../kit.jsx'
import { To92F } from './_groupF.jsx'
import { Badge, Boom, fmt } from './group-c-ui.jsx'


// TO-3: flange em losango com pontas arredondadas, cúpula ao centro, 2 pernas (B, E) e a
// patilha de solda do coletor (a caixa) no parafuso de fixação
function To3({ def, heatsink }) {
  const label = useLabel([{ text: def.bjt.mark, font: 'bold 70px Arial', y: 110 }, { text: 'NPN 15A', font: 'bold 40px Arial', y: 175 }], 256, 256)
  const y0 = 0.3
  const pins = Object.fromEntries(def.pins.map((p) => [p.id, p.pos]))
  return (
    <group>
      <Leg from={pins.B} to={[pins.B[0], y0, pins.B[2]]} r={0.05} />
      <Leg from={pins.E} to={[pins.E[0], y0, pins.E[2]]} r={0.05} />
      {/* patilha de solda do coletor presa ao parafuso */}
      <Leg from={pins.C} to={[pins.C[0], y0 - 0.05, pins.C[2]]} r={0.04} />
      <Box size={[0.3, 0.03, 0.55]} pos={[pins.C[0], y0 - 0.04, pins.C[2] - 0.2]} color="#c9a227" metal={0.7} rough={0.35} />
      {/* flange */}
      <Box size={[2.2, 0.15, 2.55]} pos={[0, y0 + 0.075, 0]} color="#c4c8ce" metal={0.85} rough={0.3} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Cyl r={0.85} h={0.15} pos={[s * 1.1, y0 + 0.075, 0]} color="#c4c8ce" metal={0.85} rough={0.3} seg={32} />
          <Box size={[0.5, 0.15, 1.4]} pos={[s * 1.5, y0 + 0.075, 0]} color="#c4c8ce" metal={0.85} rough={0.3} />
          <Cyl r={0.2} h={0.16} pos={[s * 1.51, y0 + 0.08, 0]} color="#2a2a2a" seg={20} />
        </group>
      ))}
      {/* cúpula */}
      <Cyl r={1.1} r2={1.12} h={0.06} pos={[0, y0 + 0.18, 0]} color="#b9bdc3" metal={0.85} rough={0.3} seg={40} />
      <Cyl r={1.0} r2={1.08} h={0.62} pos={[0, y0 + 0.52, 0]} color="#d4d7dc" metal={0.85} rough={0.28} seg={40} />
      <mesh position={[0, y0 + 0.835, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.6, 1.6]} />
        <meshBasicMaterial map={label} transparent color="#1a1a1a" />
      </mesh>
      {heatsink && (
        <group>
          <Box size={[4.6, 0.06, 3.2]} pos={[0, y0 - 0.03, 0]} color="#2a2a2e" metal={0.5} rough={0.5} />
          {[-2.1, -1.4, -0.7, 0.7, 1.4, 2.1].map((x) => (
            <Box key={x} size={[0.08, y0 - 0.08, 3.2]} pos={[x, (y0 - 0.06) / 2, 0]} color="#2a2a2e" metal={0.5} rough={0.5} />
          ))}
        </group>
      )}
    </group>
  )
}

function make(def) {
  const pnp = def.bjt.pol === 'pnp'
  function Model({ part }) {
    if (def.bjt.pkg === 'TO-3') return <To3 def={def} heatsink={!!part.config?.heatsink} />
    return <To92F line1={def.bjt.mark} line2={pnp ? 'PNP' : 'NPN'} />
  }
  function Overlay2D({ info, live }) {
    if (!live) return null
    if (live.burned) return <Boom info={info} />
    if (!live.ic || live.ic < 0.0005) return null
    const hot = (live.tj ?? 25) > 100
    return <Badge info={info} text={`${live.ic >= 1 ? `${fmt(live.ic, 2)} A` : `${fmt(live.ic * 1000, 0)} mA`}${hot ? ` · ${live.tj} °C` : ''}`} color={hot ? '#dc2626' : live.mode === 'ativo' ? '#f59e0b' : '#f5f5f5'} />
  }
  return { type: def.type, Model, Overlay2D }
}

export default BJT_DEFS.map(make)
