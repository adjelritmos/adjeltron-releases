// Motor JGA25-370 com encoder Hall: suporte em L de alumínio, caixa redutora metálica de Ø25 mm
// (frente com o casquilho e as juntas das placas), motor 370 de lata com lados achatados, tampa
// de plástico, disco magnético (roda com live.motorAngle) e a placa redonda do encoder com os 2
// sensores Hall, os SMD e a ficha XH de 6 vias. O veio D de 4 mm roda com o mount.
// Exporta JgaFront (suporte + redutor + lata) e JgaShaft, usados também pelo motor12v.
import { Box, Cyl, SilkText, Smd, mat, METAL, useFrame, useRef, liveOf, D2R } from '../kit.jsx'
import { mountRotNow } from '../../../functions/mechLive.js'
import { Badge } from './group-c-ui.jsx'
import { Holes, ALU, rotX } from './_mechKit.jsx'
import { canGeo, dShaftGeo } from './nema17.jsx'
import def, { JGA } from '@shared/parts/motorEnc.js'

const AY = JGA.AY
const WIRE = { 'M+': '#e53935', 'M-': '#f5f5f5', GND: '#212121', VCC: '#1e88e5', A: '#fdd835', B: '#43a047' }
const GEAR = '#d6dade'

// suporte em L, caixa redutora (de x = −2,1 a 0) e lata do motor 370 (de −5,2 a −2,1)
export function JgaFront() {
  return (
    <group>
      {/* suporte em L de alumínio com os furos de fixação */}
      <Box size={[2.45, 0.25, 3.0]} pos={[-0.975, 0.125, 0]} color={ALU} metal={0.8} rough={0.35} />
      <Box size={[0.25, 2.8, 3.0]} pos={[0.125, 1.4, 0]} color={ALU} metal={0.8} rough={0.35} />
      <Holes pts={[[-1.8, 0.13, -1.0], [-1.8, 0.13, 1.0], [-0.6, 0.13, -1.0], [-0.6, 0.13, 1.0]]} r={0.15} h={0.27} />
      <Holes pts={[[0.13, AY + 0.85, -0.85], [0.13, AY - 0.85, 0.85], [0.13, AY + 0.85, 0.85], [0.13, AY - 0.85, -0.85]]} r={0.13} h={0.27} axis="x" color="#555" />
      {/* parafusos M3 (cabeça de cruz) que prendem o redutor ao suporte, em dois furos opostos */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0.31, AY + s * 0.85, -s * 0.85]}>
          <Cyl r={0.2} h={0.12} rot={rotX} color={METAL.nickel} metal={1} rough={0.3} seg={16} />
          <Box size={[0.02, 0.24, 0.05]} pos={[0.062, 0, 0]} color="#2a2d30" />
          <Box size={[0.02, 0.05, 0.24]} pos={[0.062, 0, 0]} color="#2a2d30" />
        </group>
      ))}
      {/* caixa redutora: corpo, chanfro da frente, juntas entre placas e anel junto ao motor */}
      <Cyl r={JGA.gearR} h={1.9} pos={[-1.15, AY, 0]} rot={rotX} color={GEAR} metal={0.85} rough={0.32} seg={40} />
      <Cyl r={JGA.gearR - 0.06} r2={JGA.gearR} h={0.2} pos={[-0.1, AY, 0]} rot={[0, 0, -Math.PI / 2]} color={GEAR} metal={0.85} rough={0.3} seg={40} />
      {[-0.55, -1.05, -1.55].map((x) => (
        <Cyl key={x} r={JGA.gearR + 0.008} h={0.035} pos={[x, AY, 0]} rot={rotX} color="#7f878d" metal={0.8} rough={0.45} seg={40} />
      ))}
      <Cyl r={JGA.gearR - 0.02} h={0.1} pos={[-2.08, AY, 0]} rot={rotX} color="#3b3f43" metal={0.6} rough={0.45} seg={40} />
      {/* lata do motor 370 (lados achatados em ±z) com as janelas de ventilação */}
      <mesh position={[-2.12, AY, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={canGeo(1.22, 1.03, 3.08, 0.05)} material={mat('#c4c8cc', 0.8, 0.32)} castShadow receiveShadow />
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.45, 0.04, 0.3]} pos={[-4.6, AY + s * 1.205, 0]} color="#2a2d30" />
      ))}
      <SilkText text="JGA25-370" pos={[-3.6, AY + 1.212, 0]} w={1.6} d={0.3} color="#3a3f44" font="bold 40px Arial" />
    </group>
  )
}

// veio de saída D (4 mm): parte redonda junto ao casquilho e o plano em D até à ponta
export function JgaShaft() {
  return (
    <>
      <Cyl r={JGA.shaftR} h={0.25} pos={[0.375, 0, 0]} rot={rotX} color="#e6e8ea" metal={1} rough={0.2} seg={16} />
      <mesh position={[0.5, 0, 0]} rotation={[Math.PI, 0, -Math.PI / 2]} geometry={dShaftGeo(JGA.shaftR, 0.15, 0.75)} material={mat('#e6e8ea', 1, 0.2)} castShadow />
    </>
  )
}

function Model({ part }) {
  const shaft = useRef()
  const disc = useRef()
  useFrame(() => {
    if (shaft.current) shaft.current.rotation.x = mountRotNow(part.id, 'shaft')
    if (disc.current) disc.current.rotation.x = (liveOf(part.id)?.motorAngle || 0) * D2R
  })
  return (
    <group>
      <JgaFront />
      {/* tampa de plástico do motor */}
      <Cyl r={1.0} h={0.12} pos={[-5.25, AY, 0]} rot={rotX} color="#3a3a3a" seg={28} />
      {/* disco magnético (roda com o rotor): pólos N/S alternados */}
      <group position={[-5.38, AY, 0]} ref={disc}>
        <Cyl r={0.62} h={0.14} rot={rotX} color="#3a3a3a" seg={24} />
        {[0, 1].map((k) => (
          <Box key={k} size={[0.15, 0.6, 0.14]} pos={[0, k ? 0.3 : -0.3, 0]} color={k ? '#c62828' : '#1565c0'} />
        ))}
        <Cyl r={0.12} h={0.16} rot={rotX} color={METAL.nickel} metal={1} rough={0.3} seg={12} />
      </group>
      {/* placa do encoder (verde, Ø25 mm) com os 2 Hall, SMD e a serigrafia */}
      <Cyl r={1.25} h={0.16} pos={[-5.6, AY, 0]} rot={rotX} color="#1b5e20" rough={0.55} seg={36} />
      <Box size={[0.08, 0.3, 0.3]} pos={[-5.5, AY + 0.75, 0.5]} color="#111" />
      <Box size={[0.08, 0.3, 0.3]} pos={[-5.5, AY + 0.75, -0.5]} color="#111" />
      <group position={[-5.681, AY, 0]} rotation={[0, 0, Math.PI / 2]}>
        <Smd pos={[0.75, 0, 0.75]} len={0.16} wid={0.09} h={0.05} />
        <Smd pos={[0.75, 0, -0.75]} len={0.16} wid={0.09} h={0.05} color="#8a6a48" />
        <Smd pos={[-0.75, 0, 0.75]} len={0.16} wid={0.09} h={0.05} color="#8a6a48" />
      </group>
      <group position={[-5.681, AY, 0]} rotation={[0, 0, Math.PI / 2]}>
        <SilkText text="M1  GND  C1  C2  VCC  M2" pos={[-0.65, -0.001, 0]} w={1.9} d={0.18} rotY={Math.PI / 2} font="bold 30px Arial" px={[512, 48]} />
      </group>
      {/* ficha XH de 6 vias (branca, com a parede de guia) e os pinos coloridos */}
      <Box size={[0.4, 0.55, 1.75]} pos={[-5.85, AY, 0]} color="#f2f2ee" rough={0.5} />
      <Box size={[0.3, 0.06, 1.75]} pos={[-5.88, AY + 0.3, 0]} color="#e6e6e0" rough={0.5} />
      {def.pins.map((p) => (
        <group key={p.id}>
          <Box size={[0.1, 0.1, 0.1]} pos={[p.pos[0] + 0.02, p.pos[1], p.pos[2]]} color={WIRE[p.id]} />
        </group>
      ))}
      {/* veio de saída D (4 mm) */}
      <group ref={shaft} position={[0, AY, 0]}>
        <JgaShaft />
      </group>
      <Cyl r={0.45} h={0.12} pos={[0.31, AY, 0]} rot={rotX} color="#d0d4d8" metal={0.85} rough={0.3} seg={24} />
    </group>
  )
}

export function MotorOverlay({ info, live }) {
  if (!live) return null
  const rpm = Math.round(live.rpm || 0)
  return <Badge info={info} text={`${rpm} rpm · ${live.count ?? 0}`} color={Math.abs(rpm) > 2 ? '#f5f5f5' : '#404040'} />
}

export default { type: 'motorEnc', Model, Overlay2D: MotorOverlay }
