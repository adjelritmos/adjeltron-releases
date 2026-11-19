// Garra metálica para MG996R, como as garras de alumínio dos kits de braço robótico: base em
// chapa recortada, duas engrenagens de chapa que engrenam entre si (rodam com as maxilas), cada
// maxila em duas camadas de chapa unidas por espaçadores e parafusos Phillips, com as pontas
// serrilhadas por dentro. A rotação das maxilas é a da física (clawJawAngle): a abertura entre
// as pontas segue a usada para agarrar cubos.
import { Box, Cyl, Leg, RBox, jawDeg, useFrame, useRef, THREE, mat } from '../kit.jsx'
import { DEFS } from '@shared/components.js'
import { CLAW, clawJawAngle, clawOpening } from '@shared/parts/garraMetal.js'
import { extrudeXZ, holeCircle, holeSlot, rrect, mdfMats, Phillips } from './_mdfKit.jsx'
import { gearGeo } from './_mechKit.jsx'

const T = 0.18 // espessura da chapa
const PAD = { x0: CLAW.jaw - 1.3, x1: CLAW.jaw + 0.1, zIn: 0.37 }
const GEAR_Z = 14
const GEAR_M = (2 * CLAW.pivotZ) / GEAR_Z // as duas engrenagens encostam a meio

// perfil de uma maxila (lado +z; no plano da forma, y = −z → o lado de dentro é +y)
function jawShape() {
  const s = new THREE.Shape()
  s.moveTo(0, 0.5)
  s.absarc(0, 0, 0.5, Math.PI / 2, (3 * Math.PI) / 2, false)
  s.lineTo(2.4, -0.36)
  s.lineTo(CLAW.jaw - 1.5, -0.46)
  s.lineTo(PAD.x1, -0.22)
  s.lineTo(PAD.x1, PAD.zIn)
  // dentes serrilhados ao longo da face de dentro (da ponta para trás)
  let up = true
  for (let x = PAD.x1 - 0.16; x > PAD.x0; x -= 0.16) {
    s.lineTo(x, up ? PAD.zIn - 0.12 : PAD.zIn)
    up = !up
  }
  s.lineTo(PAD.x0, PAD.zIn)
  s.lineTo(2.4, 0.36)
  s.lineTo(0.3, 0.5)
  s.lineTo(0, 0.5)
  holeCircle(s, 0, 0, 0.17)
  holeCircle(s, 2.4, 0, 0.14)
  holeCircle(s, CLAW.jaw - 1.0, 0.05, 0.14)
  holeSlot(s, 0.9, 1.7, 0, 0.22)
  return s
}
// base: chapa com os cantos boleados, furos dos pivôs, rasgos e furação de fixação
function baseShape() {
  const [bx, , bz] = CLAW.base
  const s = rrect(new THREE.Shape(), 0, -bz / 2, bx, bz / 2, 0.3)
  for (const sz of [-1, 1]) holeCircle(s, CLAW.pivotX, -sz * CLAW.pivotZ, 0.17)
  for (const z of [-1.4, 1.4]) holeCircle(s, 0.45, z, 0.16)
  holeSlot(s, 1.2, 3.6, 1.55, 0.3)
  holeSlot(s, 1.2, 3.6, -1.55, 0.3)
  return s
}

function Model({ part }) {
  const ALU = part.config?.color || '#c9ccd1'
  // chapas: alumínio, MDF (face clara e arestas queimadas pelo laser) ou acrílico amarelo
  const claw = part.config?.claw || 'alu'
  const alu = claw === 'mdf' ? mdfMats({ material: 'mdf' }) : claw === 'acrilico' ? mat('#e2b13c', 0, 0.2, { transparent: true, opacity: 0.88 }) : mat(ALU, 0.85, 0.34)
  const jaws = [useRef(), useRef()]
  useFrame(() => {
    // face de dentro das pontas a ±abertura/2 (no ponto mais chegado ao meio)
    const a = clawJawAngle(clawOpening(jawDeg(part.id)))
    if (jaws[0].current) jaws[0].current.rotation.y = a
    if (jaws[1].current) jaws[1].current.rotation.y = -a
  })
  const [, by] = CLAW.base
  const pins = DEFS.garraMetal.pins
  const cy = pins[0].pos[1]
  const jawG = extrudeXZ('garraMetalJaw', T, jawShape)
  const baseG = extrudeXZ('garraMetalBase', by, baseShape)
  const gearG = gearGeo(GEAR_Z, GEAR_M, 0.25, 0.17)
  const Y = by + 0.6 // altura dos pivôs
  return (
    <group>
      <mesh geometry={baseG} material={alu} castShadow receiveShadow />
      {/* servo MG996R de pé sobre a base */}
      <RBox size={[4.07, 3.75, 1.98]} r={0.06} pos={[2.4, by + 1.875, 0]} color="#151515" rough={0.4} />
      <RBox size={[5.07, 0.25, 1.98]} r={0.04} pos={[2.4, by + 2.75, 0]} color="#151515" rough={0.4} />
      <Cyl r={0.95} h={0.35} pos={[3.4, by + 3.92, 0]} color="#151515" rough={0.4} seg={24} />
      {[-1, 1].map((s) => (
        <Phillips key={s} pos={[2.4 + s * 2.3, by + 2.88, 0]} />
      ))}
      {/* eixos dos pivôs (casquilhos) */}
      {[-1, 1].map((sz) => (
        <Cyl key={sz} r={0.17} h={1.2} pos={[CLAW.pivotX, Y, sz * CLAW.pivotZ]} color="#b8bcc0" metal={0.9} rough={0.3} seg={14} />
      ))}
      {[-1, 1].map((sz, i) => (
        <group key={sz} ref={jaws[i]} position={[CLAW.pivotX, Y, sz * CLAW.pivotZ]}>
          {/* engrenagem de chapa (as duas encostam a meio: rodam ao contrário uma da outra) */}
          <mesh geometry={gearG} position={[0, -0.12, 0]} rotation={[0, sz > 0 ? Math.PI / GEAR_Z : 0, 0]} material={alu} castShadow receiveShadow />
          <group scale={[1, 1, sz]}>
            {/* camada de cima e camada de baixo da maxila */}
            <mesh geometry={jawG} position={[0, 0.32, 0]} material={alu} castShadow receiveShadow />
            <mesh geometry={jawG} position={[0, -0.5, 0]} material={alu} castShadow receiveShadow />
            {/* espaçadores entre as camadas e almofada serrilhada na ponta */}
            <Cyl r={0.16} h={0.82} pos={[2.4, -0.09, 0]} color="#b8bcc0" metal={0.9} rough={0.3} seg={12} />
            <Cyl r={0.16} h={0.82} pos={[CLAW.jaw - 1.0, -0.09, -0.05]} color="#b8bcc0" metal={0.9} rough={0.3} seg={12} />
            <Box size={[PAD.x1 - PAD.x0, 0.82, 0.12]} pos={[(PAD.x0 + PAD.x1) / 2, -0.09, -(PAD.zIn - 0.06)]} color={claw === 'mdf' ? '#c9a06a' : claw === 'acrilico' ? '#e2b13c' : '#a9adb1'} metal={claw === 'alu' ? 0.85 : 0} rough={0.4} />
          </group>
          {/* parafusos nos pivôs e nas juntas */}
          <Phillips pos={[0, 0.5, 0]} />
          <Phillips pos={[2.4, 0.5, 0]} />
          <Phillips pos={[CLAW.jaw - 1.0, 0.5, -sz * 0.05]} />
          <Phillips pos={[2.4, -0.5, 0]} flip />
        </group>
      ))}
      {/* cabo do servo até à ficha */}
      {pins.map((p, i) => (
        <Leg key={p.id} from={[0.4, by + 0.45, (i - 1) * 0.1]} to={[p.pos[0] + 0.42, cy, p.pos[2]]} r={0.05} color={['#6d4c41', '#e53935', '#fb8c00'][i]} />
      ))}
      <RBox size={[0.42, 0.26, 0.78]} r={0.02} pos={[pins[0].pos[0] + 0.21, cy, 0]} color="#111" />
    </group>
  )
}

export default { type: 'garraMetal', Model }
