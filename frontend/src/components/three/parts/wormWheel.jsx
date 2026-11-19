// Coroa do sem-fim: roda dentada com os dentes inclinados (hélice do ângulo de avanço do
// sem-fim) e a orla côncava (garganta onde o sem-fim encaixa), alma com furos de alívio e cubo
// de alumínio com parafuso de aperto.
import { geo, mat, THREE } from '../kit.jsx'
import { gearShape, addHole } from './_mechKit.jsx'
import { gearR, GEAR_M } from '@shared/parts/_mech.js'
import { COROA } from '@shared/parts/wormWheel.js'
import { GEAR_WHITE } from '@shared/parts/spurGear.js'
import { WORM } from '@shared/parts/wormGear.js'

// dentes: perfil extrudido em fatias, torcido em hélice (ângulo de avanço do sem-fim de 1
// entrada) e com a cabeça rebaixada a meio da largura (garganta do raio do sem-fim)
function crownGeo(z, w, bore) {
  return geo(`wormCrown${z},${w},${bore}`, () => {
    const m = GEAR_M
    const rp = gearR(z)
    const sh = gearShape(z, m, bore)
    // furos de alívio entre o cubo e a coroa (só nas coroas com espaço para eles)
    const rimIn = rp - 1.25 * m - 0.15
    if (rimIn > 0.95) {
      const nh = rimIn > 2 ? 6 : 4
      const rc = (0.5 + rimIn) / 2
      const hr = Math.min((rimIn - 0.5) * 0.36, ((Math.PI * rc) / nh) * 0.4)
      for (let k = 0; k < nh; k++) addHole(sh, Math.cos((k / nh) * Math.PI * 2 + 0.4) * rc, Math.sin((k / nh) * Math.PI * 2 + 0.4) * rc, hr)
    }
    const g = new THREE.ExtrudeGeometry(sh, { depth: w, steps: 6, bevelEnabled: false, curveSegments: 12 })
    g.rotateX(-Math.PI / 2)
    const lead = Math.atan((Math.PI * m) / (2 * Math.PI * WORM.r)) // ângulo de avanço
    const twist = (w * Math.tan(lead)) / rp
    const p = g.attributes.position
    const Rw = WORM.r + m // raio de cabeça do sem-fim (garganta)
    const s0 = Rw - Math.sqrt(Rw * Rw - (w / 2) ** 2) // rebaixo máximo (a meio da largura)
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      const y = p.getY(i)
      const zz = p.getZ(i)
      const r = Math.hypot(x, zz)
      const u = y / w - 0.5 // −0,5..0,5 ao longo da largura
      // garganta: a cabeça dos dentes desce a meio (arco de raio Rw); nas faces fica inteira
      const dy = u * w
      const sag = r > rp - 1.25 * m ? s0 - (Rw - Math.sqrt(Math.max(0, Rw * Rw - dy * dy))) : 0
      const k = r > 1e-6 ? (r - sag * ((r - (rp - 1.25 * m)) / (2.25 * m))) / r : 1
      const a = u * twist
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      p.setXYZ(i, (x * ca - zz * sa) * k, y, (x * sa + zz * ca) * k)
    }
    g.computeVertexNormals()
    return g
  })
}
function hubGeo(R, h) {
  return geo(`wwHub${R},${h}`, () => {
    const c = 0.03
    const p = [[0.2, 0], [R, 0], [R, h - c], [R - c, h], [0.2, h], [0.2, 0]].map(([a, b]) => new THREE.Vector2(a, b))
    return new THREE.LatheGeometry(p, 28)
  })
}

function Model({ part }) {
  const z = part.config?.teeth ?? 30
  const col = part.config?.color || GEAR_WHITE
  const r = gearR(z)
  const hubR = Math.max(0.32, Math.min(0.55, r - 0.3))
  return (
    <group>
      <mesh geometry={crownGeo(z, COROA.W, 0.2)} material={mat(col, 0, 0.42)} castShadow receiveShadow />
      <mesh geometry={hubGeo(hubR, COROA.HUB)} position={[0, COROA.W, 0]} material={mat('#b9c3c9', 0.85, 0.28)} castShadow receiveShadow />
      <mesh position={[hubR + 0.002, COROA.W + COROA.HUB / 2, 0]} rotation={[0, 0, Math.PI / 2]} geometry={geo('spurSet', () => new THREE.CylinderGeometry(0.08, 0.08, 0.01, 12))} material={mat('#2a2c2f', 0.7, 0.4)} />
    </group>
  )
}

export default { type: 'wormWheel', Model }
