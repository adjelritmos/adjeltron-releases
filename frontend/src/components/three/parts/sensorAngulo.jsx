// Sensor de ângulo AS5600: caixa de alumínio anodizado preto com flange e 4 parafusos, rolamento
// de esferas à vista, eixo em D (comprimento e diâmetro configuráveis, roda com o mount "eixo"),
// colar com parafuso de aperto e, por baixo, a placa verde com o chip e a ficha JST de 3 vias.
import { Box, Cyl, RBox } from '../kit.jsx'
import { Badge } from './group-c-ui.jsx'
import def, { SA, saDims } from '@shared/parts/sensorAngulo.js'

const ALU = { color: '#1d1f22', metal: 0.75, rough: 0.38 }
const STEEL = { color: '#d5d9dc', metal: 1, rough: 0.22 }

function Model({ part }) {
  const { axle, shaftD, axisY } = saDims(part?.config)
  const r = shaftD / 2
  const collarH = Math.min(0.35, axle * 0.4)
  return (
    <group>
      {/* placa de circuito (por baixo) com o chip e a ficha */}
      <RBox size={[2.5, 0.16, 2.3]} r={0.05} pos={[-0.05, 0.08, 0]} color="#1f6b35" rough={0.42} />
      <Box size={[0.5, 0.06, 0.4]} pos={[0.55, 0.19, 0.6]} color="#141414" rough={0.4} />
      {/* corpo: cilindro com flange e 4 parafusos sextavados interiores */}
      <Cyl r={SA.R} h={0.18} pos={[0, 0.25, 0]} seg={48} {...ALU} />
      <Cyl r={SA.R * 0.86} h={SA.H - 0.34} pos={[0, 0.34 + (SA.H - 0.34) / 2, 0]} seg={48} {...ALU} />
      <Cyl r={SA.R * 0.9} h={0.04} pos={[0, SA.H - 0.01, 0]} color="#2a2d31" metal={0.6} rough={0.3} seg={48} />
      {[0, 1, 2, 3].map((k) => {
        const a = (k * Math.PI) / 2 + Math.PI / 4
        const x = Math.cos(a) * 1.08
        const z = Math.sin(a) * 1.08
        return (
          <group key={k}>
            <Cyl r={0.13} h={0.08} pos={[x, 0.38, z]} seg={16} {...STEEL} />
            <Cyl r={0.055} h={0.02} pos={[x, 0.425, z]} color="#111" seg={6} />
          </group>
        )
      })}
      {/* rolamento: anel exterior, esferas (sugestão) e anel interior */}
      <Cyl r={Math.max(r + 0.25, 0.55)} h={0.12} pos={[0, SA.H + 0.04, 0]} seg={36} {...STEEL} />
      <Cyl r={Math.max(r + 0.16, 0.45)} h={0.13} pos={[0, SA.H + 0.045, 0]} color="#3c3f43" metal={0.6} rough={0.4} seg={36} />
      <Cyl r={r + 0.08} h={0.14} pos={[0, SA.H + 0.05, 0]} seg={28} {...STEEL} />
      {/* eixo em D */}
      <Cyl r={r} h={axle + 0.1} pos={[0, SA.H + (axle + 0.1) / 2 - 0.05, 0]} seg={24} {...STEEL} />
      <Box size={[r * 0.35, axle * 0.7, shaftD * 0.98]} pos={[r * 0.84, SA.H + axle * 0.62, 0]} color="#b9bec2" metal={1} rough={0.3} />
      {/* colar com parafuso de aperto junto ao rolamento */}
      <Cyl r={r + 0.22} h={collarH} pos={[0, SA.H + 0.12 + collarH / 2, 0]} seg={28} color="#c7ccd0" metal={1} rough={0.28} />
      <Cyl r={0.06} h={0.12} pos={[r + 0.24, SA.H + 0.12 + collarH / 2, 0]} rot={[0, 0, Math.PI / 2]} color="#222" metal={0.8} rough={0.4} seg={8} />
      {/* ponta chanfrada */}
      <Cyl r={r * 0.85} r2={r} h={0.06} pos={[0, axisY + 0.02, 0]} seg={24} {...STEEL} />
      {/* ficha JST de 3 vias e cabos */}
      <RBox size={[0.42, 0.5, 1.0]} r={0.04} pos={[-1.15, 0.4, 0]} color="#f0ede4" rough={0.5} />
      {def.pins.map((p, i) => (
        <Box key={p.id} size={[0.14, 0.08, 0.08]} pos={[p.pos[0] + 0.02, p.pos[1], p.pos[2]]} color={['#e53935', '#212121', '#fdd835'][i]} />
      ))}
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered) return null
  return <Badge info={info} text={`θ = ${(live.angle ?? 0).toFixed(1)}°`} color="#f5f5f5" />
}

export default { type: 'sensorAngulo', Model, Overlay2D }
