// Motor DC redondo (Ø24 mm) com encoder magnético: lata prateada com furos de ventilação e,
// atrás, a tampa de plástico preta do encoder (mesmo diâmetro, com duas ranhuras), o conector
// retangular de lado e o feixe de 6 fios coloridos até às pontas (pinos). Veio de 2 mm que
// roda com o mount "shaft". Frente estampada com casquilho de bronze e janelas de ventilação.
import { Box, Cyl, Leg, useFrame, useRef } from '../kit.jsx'
import { mountRotNow } from '../../../functions/mechLive.js'
import { MotorOverlay } from './motorEnc.jsx'
import { rotX } from './_mechKit.jsx'
import def, { MRE } from '@shared/parts/motorRedondoEnc.js'

const { AY, R, canL, coverL } = MRE
const WIRE = { 'M+': '#e53935', 'M-': '#f5f5f5', GND: '#212121', VCC: '#1e88e5', A: '#fdd835', B: '#43a047' }
const X1 = -canL - coverL // traseira da tampa

function Model({ part }) {
  const shaft = useRef()
  useFrame(() => {
    if (shaft.current) shaft.current.rotation.x = mountRotNow(part.id, 'shaft')
  })
  // conector: na lateral da tampa, em baixo, junto à traseira
  const cx = X1 + 0.45
  const cy = AY - R + 0.05
  return (
    <group>
      {/* lata redonda */}
      <Cyl r={R} h={canL - 0.06} pos={[-canL / 2 - 0.03, AY, 0]} rot={rotX} color="#cfd3d7" metal={0.8} rough={0.3} seg={40} />
      <Cyl r={R + 0.015} h={0.08} pos={[-canL + 0.12, AY, 0]} rot={rotX} color="#9aa1a7" metal={0.8} rough={0.4} seg={40} />
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return <Box key={i} size={[0.4, 0.04, 0.22]} pos={[-canL + 0.7, AY + Math.cos(a) * (R - 0.005), Math.sin(a) * (R - 0.005)]} rot={[a, 0, 0]} color="#2a2d30" />
      })}
      {/* frente: tampa estampada com o rebordo, casquilho de bronze, furos de fixação, janelas e veio */}
      <Cyl r={R - 0.08} r2={R} h={0.06} pos={[-0.03, AY, 0]} rot={[0, 0, -Math.PI / 2]} color="#cfd3d7" metal={0.8} rough={0.3} seg={40} />
      <Cyl r={0.62} h={0.04} pos={[0.02, AY, 0]} rot={rotX} color="#c4c9ce" metal={0.8} rough={0.32} seg={32} />
      <Cyl r={0.36} h={0.14} pos={[0.07, AY, 0]} rot={rotX} color="#b9bfc4" metal={0.8} rough={0.35} seg={24} />
      <Cyl r={0.17} h={0.03} pos={[0.15, AY, 0]} rot={rotX} color="#d9a441" metal={0.9} rough={0.3} seg={16} />
      {[-1, 1].map((s) => (
        <Box key={`v${s}`} size={[0.02, 0.3, 0.14]} pos={[0.002, AY, s * 0.85]} color="#1a1c1e" />
      ))}
      {[-1, 1].map((s) => (
        <Cyl key={s} r={0.09} h={0.02} pos={[0.005, AY + s * 0.7, 0]} rot={rotX} color="#222" seg={12} />
      ))}
      <group ref={shaft} position={[0, AY, 0]}>
        <Cyl r={0.1} h={0.9} pos={[0.45, 0, 0]} rot={rotX} color="#e6e8ea" metal={0.95} rough={0.2} seg={12} />
      </group>
      {/* tampa preta do encoder (mesmo diâmetro), com aresta arredondada atrás e duas ranhuras */}
      <Cyl r={R + 0.01} h={coverL - 0.08} pos={[-canL - (coverL - 0.08) / 2, AY, 0]} rot={rotX} color="#16171a" rough={0.5} seg={40} />
      <Cyl r={R - 0.07} h={0.08} pos={[X1 + 0.04, AY, 0]} rot={rotX} color="#16171a" rough={0.5} seg={40} />
      {[-0.32, 0.32].map((z) => (
        <Box key={z} size={[0.5, 0.06, 0.1]} pos={[cx + 0.05, AY - R - 0.005, z]} color="#050505" />
      ))}
      {/* ressalto do casquilho traseiro no centro da tampa */}
      <Cyl r={0.3} h={0.06} pos={[X1 - 0.03, AY, 0]} rot={rotX} color="#0f1012" rough={0.45} seg={20} />
      {/* conector retangular de lado (por baixo da tampa) */}
      <Box size={[0.75, 0.32, 1.7]} pos={[cx, cy - 0.12, 0]} color="#101113" rough={0.45} />
      <Box size={[0.06, 0.24, 1.55]} pos={[cx - 0.39, cy - 0.12, 0]} color="#050505" />
      {/* feixe de fios coloridos até às pontas */}
      {def.pins.map((p) => (
        <group key={p.id}>
          <Leg from={[cx - 0.36, cy - 0.12, p.pos[2]]} to={[p.pos[0] + 0.25, p.pos[1], p.pos[2]]} r={0.055} color={WIRE[p.id]} />
          <Leg from={[p.pos[0] + 0.25, p.pos[1], p.pos[2]]} to={p.pos} r={0.03} color="#c9c9c9" />
        </group>
      ))}
    </group>
  )
}

export default { type: 'motorRedondoEnc', Model, Overlay2D: MotorOverlay }
