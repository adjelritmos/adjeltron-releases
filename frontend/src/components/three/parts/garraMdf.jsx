// Garra meArm em MDF: placa de baixo, maxilas em "C" com furos (engrenadas nos pivôs), placa
// de cima e o SG90 de pernas para o ar sobre dois suportes, com o eixo no pivô da maxila −z.
// As maxilas rodam com o ângulo real do servo: a distância entre as pontas é a abertura usada
// pelo backend para agarrar cubos (shared/parts/garraMdf.js).
import { Box, Leg, RBox, THREE, jawDeg, useFrame, useRef } from '../kit.jsx'
import { gearGeo } from './_mechKit.jsx'
import { Mdf, Screw, Sg90Body, extrudeXZ, holeCircle, mdfMats, rrect } from './_mdfKit.jsx'
import { DEFS } from '@shared/components.js'
import { matColor } from '@shared/parts/_materials.js'
import { GMDF, jawAngle, openingOf } from '@shared/parts/garraMdf.js'

const { T, pX, pZ, plateL, plateW, arc, pad } = GMDF
const D2R = Math.PI / 180

// maxila do lado +z, em coordenadas do pivô (u ao longo de x; a forma usa y = −z)
const jawGeo = () =>
  extrudeXZ('garraMdfJaw', T, () => {
    const P = (u, v) => [u, pZ - v] // (u, z absoluto com a garra fechada) → forma
    const s = new THREE.Shape()
    const pt = (a, r) => P(arc.cu + r * Math.cos(a * D2R), r * Math.sin(a * D2R))
    const N = 24
    s.moveTo(...pt(arc.a0, arc.Ro))
    for (let i = 1; i <= N; i++) s.lineTo(...pt(arc.a0 + ((arc.a1 - arc.a0) * i) / N, arc.Ro))
    s.lineTo(...P(pad.u1 - 0.1, pad.vOut))
    s.quadraticCurveTo(...P(pad.u1, pad.vOut), ...P(pad.u1, pad.vOut - 0.1))
    s.lineTo(...P(pad.u1, pad.vIn))
    s.lineTo(...P(pad.u0, pad.vIn))
    for (let i = 0; i <= N; i++) s.lineTo(...pt(arc.a1 + ((arc.a0 - arc.a1) * i) / N, arc.Ri))
    s.closePath()
    const rm = (arc.Ri + arc.Ro) / 2
    for (const a of [135, 95, 55]) holeCircle(s, ...pt(a, rm), 0.15)
    return s
  })

const plateGeo = (x0, key, holes) =>
  extrudeXZ(`garraMdf${key}`, T, () => {
    const s = rrect(new THREE.Shape(), x0, -plateW / 2, plateL, plateW / 2, 0.5)
    for (const [x, z, r] of holes) holeCircle(s, x, -z, r)
    return s
  })
const SPACERS = [[0.9, -1.45], [0.9, 1.45]]

function Model({ part }) {
  const jaws = [useRef(), useRef()]
  useFrame(() => {
    const th = jawAngle(openingOf(jawDeg(part.id)))
    if (jaws[0].current) jaws[0].current.rotation.y = th // maxila −z (roda para −z)
    if (jaws[1].current) jaws[1].current.rotation.y = -th // maxila +z
  })
  const pins = DEFS.garraMdf.pins
  const cy = pins[0].pos[1]
  const { servoTop, servoX } = GMDF
  const tabY = servoTop - 1.725 // face das abas virada para baixo
  // MDF de origem; o mesmo desenho também se corta em acrílico (config.material / color)
  const cfg = part.config?.material ? part.config : { material: 'mdf' }
  const mats = mdfMats(cfg)
  const face = matColor(cfg, 'mdf')
  const bottom = plateGeo(0, 'Bot', [[pX, -pZ, 0.15], [pX, pZ, 0.15], [0.4, -0.6, 0.15], [0.4, 0.6, 0.15], ...SPACERS.map(([x, z]) => [x, z, 0.15])])
  const top = plateGeo(0.2, 'Top', [[pX, -pZ, 0.62], [pX, pZ, 0.15], ...SPACERS.map(([x, z]) => [x, z, 0.15])])
  const fill = extrudeXZ('garraMdfFill', T, () => {
    const sh = rrect(new THREE.Shape(), 0, -plateW / 2, 1.6, plateW / 2, 0.4)
    for (const [x, z] of [...SPACERS, [0.4, -0.6], [0.4, 0.6]]) holeCircle(sh, x, -z, 0.15)
    return sh
  })
  const gear = gearGeo(13, 0.1, T, 0.15)
  return (
    <group>
      <Mdf geometry={bottom} cfg={cfg} />
      {/* enchimento entre as placas, atrás das maxilas */}
      <Mdf geometry={fill} cfg={cfg} pos={[0, T, 0]} />
      <Mdf geometry={top} cfg={cfg} pos={[0, 2 * T, 0]} />
      {/* maxilas com as engrenagens (a −z vai no braço do servo) */}
      {[-1, 1].map((sz, i) => (
        <group key={sz} ref={jaws[i]} position={[pX, T, sz * pZ]}>
          <group scale={[1, 1, sz]}>
            <mesh geometry={jawGeo()} material={mats} castShadow receiveShadow />
            <mesh geometry={gear} material={mats} rotation={[0, sz < 0 ? Math.PI / 13 : 0, 0]} castShadow receiveShadow />
          </group>
        </group>
      ))}
      {/* parafusos de latão: pivô da maxila +z e espaçadores entre as placas */}
      <Screw pos={[pX, 3 * T, pZ]} len={3 * T} />
      {SPACERS.map(([x, z]) => (
        <Screw key={z} pos={[x, 3 * T, z]} len={3 * T} />
      ))}
      {/* suportes do servo (MDF) debaixo das abas */}
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.3, tabY - 3 * T, 1.3]} pos={[servoX + s * 1.42, (tabY + 3 * T) / 2, -pZ]} color={face} rough={0.85} />
      ))}
      {[-1, 1].map((s) => (
        <Screw key={`t${s}`} pos={[servoX + s * 1.42, tabY + 0.25, -pZ]} len={0.5} nut={false} />
      ))}
      {/* SG90 de pernas para o ar: o eixo desce até à engrenagem da maxila −z */}
      <group position={[servoX, servoTop, -pZ]} rotation={[Math.PI, 0, 0]}>
        <Sg90Body />
      </group>
      {/* cabo do servo até à ficha */}
      {pins.map((p, i) => (
        <Leg key={p.id} from={[servoX - 1.1, servoTop - 0.42, -pZ + (i - 1) * 0.1]} to={[p.pos[0] + 0.42, cy, p.pos[2]]} r={0.05} color={['#6d4c41', '#e53935', '#fb8c00'][i]} />
      ))}
      <RBox size={[0.42, 0.26, 0.78]} r={0.02} pos={[pins[0].pos[0] + 0.21, cy, 0]} color="#111" />
    </group>
  )
}

export default { type: 'garraMdf', Model }
