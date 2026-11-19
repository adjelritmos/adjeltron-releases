// Parafuso sem-fim de latão (módulo 1, 1 entrada): cubo com parafuso de aperto e rosca de
// perfil trapezoidal (flancos de 20°, passo = π × módulo) talhada no núcleo, com as pontas da
// rosca chanfradas — como os sem-fins torneados dos redutores.
import * as THREE from 'three'
import { geo, mat } from '../kit.jsx'
import { WORM } from '@shared/parts/wormGear.js'
import { GEAR_M } from '@shared/parts/_mech.js'

const LEAD = Math.PI * GEAR_M // avanço por volta (1 entrada)
const R_ROOT = WORM.r - 1.25 * GEAR_M
const R_TIP = WORM.r + GEAR_M

// perfil da rosca ao longo do passo (0..1 → 0 no fundo, 1 na crista)
function profile(t) {
  if (t < 0.17) return t / 0.17
  if (t < 0.33) return 1
  if (t < 0.5) return (0.5 - t) / 0.17
  return 0
}
// superfície da rosca: grelha (ângulo × altura) com o raio dado pela fase da hélice
function threadGeo() {
  return geo('wormThread2', () => {
    const L = WORM.len
    const NA = 40
    const NY = Math.round((L / LEAD) * 22)
    const pos = []
    const idx = []
    for (let j = 0; j <= NY; j++) {
      const y = (j / NY) * L
      // chanfro das pontas: a crista desce até ao fundo nos últimos 0,6 mm
      const cap = Math.min(1, Math.min(y, L - y) / 0.06)
      for (let i = 0; i <= NA; i++) {
        const a = (i / NA) * Math.PI * 2
        let t = (y - (a / (Math.PI * 2)) * LEAD) / LEAD
        t -= Math.floor(t)
        const r = R_ROOT + (R_TIP - R_ROOT) * profile(t) * cap
        pos.push(Math.cos(a) * r, y, -Math.sin(a) * r)
      }
    }
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NA; i++) {
        const a = j * (NA + 1) + i
        const b = a + NA + 1
        idx.push(a, a + 1, b, a + 1, b + 1, b)
      }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  })
}
// cubo: anel com chanfros e furo de 4 mm (eixo y, de 0 a h)
function hubGeo(R, h) {
  return geo(`wormHub${R},${h}`, () => {
    const c = 0.03
    const p = [[0.2, 0], [R - c, 0], [R, c], [R, h - c], [R - c, h], [0.2, h], [0.2, 0]].map(([a, b]) => new THREE.Vector2(a, b))
    return new THREE.LatheGeometry(p, 28)
  })
}

function Model({ part }) {
  const col = part.config?.color || '#c9a227'
  const metal = /^#c9a227$/i.test(col) ? 0.85 : 0
  const M = mat(col, metal, 0.3)
  return (
    <group>
      {/* cubo com parafuso de aperto */}
      <mesh geometry={hubGeo(0.42, WORM.hub)} material={M} castShadow receiveShadow />
      <mesh position={[0.422, WORM.hub / 2, 0]} rotation={[0, 0, Math.PI / 2]} geometry={geo('wormSet', () => new THREE.CylinderGeometry(0.08, 0.08, 0.01, 12))} material={mat('#2a2c2f', 0.7, 0.4)} />
      {/* rosca e topos (anéis à volta do furo) */}
      <mesh position={[0, WORM.hub, 0]} geometry={threadGeo()} material={M} castShadow receiveShadow />
      <mesh position={[0, WORM.hub + WORM.len, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('wormCap', () => new THREE.RingGeometry(0.2, R_ROOT + 0.002, 28))} material={M} />
      {/* furo do veio */}
      <mesh position={[0, (WORM.hub + WORM.len) / 2, 0]} geometry={geo(`wormBore${WORM.hub + WORM.len}`, () => new THREE.CylinderGeometry(0.2, 0.2, WORM.hub + WORM.len, 14, 1, true))} material={mat('#3a3020', 0.6, 0.5, { side: THREE.BackSide })} />
    </group>
  )
}

export default { type: 'wormGear', Model }
