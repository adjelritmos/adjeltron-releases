// Engrenagem dupla (de redutor, plástico injetado numa só peça): roda grande com a alma
// rebaixada e furos de alívio, pinhão por cima com o ombro de reforço e furo do veio no centro
// — como as das caixas redutoras dos servos e dos motores TT.
import { geo, mat, THREE } from '../kit.jsx'
import { Gear, GearWeb } from './_mechKit.jsx'
import { gearR, GEAR_M } from '@shared/parts/_mech.js'
import { DUPLA } from '@shared/parts/compoundGear.js'
import { GEAR_WHITE } from '@shared/parts/spurGear.js'

// ombro cónico entre a roda grande e o pinhão (reforço da injeção)
function shoulderGeo(r0, r1) {
  return geo(`cgShoulder${r0},${r1}`, () => {
    const p = [[0.2, 0], [r0, 0], [r1, 0.1], [0.2, 0.1]].map(([a, b]) => new THREE.Vector2(a, b))
    return new THREE.LatheGeometry(p, 32)
  })
}

function Model({ part }) {
  const c = part.config || {}
  const zb = c.big ?? 40
  const zs = c.small ?? 10
  const col = c.color || GEAR_WHITE
  const rs = gearR(zs) - 1.25 * GEAR_M // pé do pinhão
  return (
    <group>
      <GearWeb z={zb} m={GEAR_M} w={DUPLA.WB} color={col} rough={0.42} bore={0.2} hubR={Math.max(0.45, rs + 0.08)} />
      <mesh geometry={shoulderGeo(rs + 0.12, rs)} position={[0, DUPLA.WB, 0]} material={mat(col, 0, 0.42)} castShadow />
      <Gear z={zs} m={GEAR_M} w={DUPLA.WS} y0={DUPLA.WB} color={col} rough={0.42} bore={0.2} />
    </group>
  )
}

export default { type: 'compoundGear', Model }
