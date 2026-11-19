// Engrenagem reta de módulo 1 (POM branco injetado: dentes em evolvente, alma rebaixada com
// furos de alívio) com cubo de alumínio torneado e parafuso sem cabeça de aperto.
import { geo, mat, THREE } from '../kit.jsx'
import { GearWeb } from './_mechKit.jsx'
import { gearR, GEAR_M } from '@shared/parts/_mech.js'
import { SPUR, GEAR_WHITE } from '@shared/parts/spurGear.js'

// cubo de alumínio: anel torneado com chanfros, furo do veio de 4 mm
function hubGeo(R, h) {
  return geo(`spurHub${R},${h}`, () => {
    const c = 0.03
    const r = 0.2
    const p = [[r, 0], [R, 0], [R, h - c], [R - c, h], [r + c, h], [r, h - c], [r, 0]].map(([a, b]) => new THREE.Vector2(a, b))
    return new THREE.LatheGeometry(p, 28)
  })
}

function Model({ part }) {
  const z = part.config?.teeth ?? 20
  const r = gearR(z)
  const hubR = Math.max(0.32, Math.min(0.55, r - 0.25))
  return (
    <group>
      <GearWeb z={z} m={GEAR_M} w={SPUR.W} color={part.config?.color || GEAR_WHITE} rough={0.42} bore={0.2} hubR={Math.max(hubR, 0.45)} />
      <mesh geometry={hubGeo(hubR, SPUR.HUB)} position={[0, SPUR.W, 0]} material={mat('#b9c3c9', 0.85, 0.28)} castShadow receiveShadow />
      {/* parafuso sem cabeça M3 (sextavado interior) rente ao cubo */}
      <mesh position={[hubR + 0.002, SPUR.W + SPUR.HUB / 2, 0]} rotation={[0, 0, Math.PI / 2]} geometry={geo('spurSet', () => new THREE.CylinderGeometry(0.08, 0.08, 0.01, 12))} material={mat('#2a2c2f', 0.7, 0.4)} />
      <mesh position={[hubR + 0.008, SPUR.W + SPUR.HUB / 2, 0]} rotation={[0, 0, Math.PI / 2]} geometry={geo('spurSetHex', () => new THREE.CylinderGeometry(0.04, 0.04, 0.004, 6))} material={mat('#050505', 0, 0.9)} />
    </group>
  )
}

export default { type: 'spurGear', Model }
