// Parafuso sem-fim de latão: cubo com parafuso de aperto e rosca helicoidal (passo = π × módulo,
// 1 entrada) sobre o núcleo.
import * as THREE from 'three'
import { Cyl, geo, mat } from '../kit.jsx'
import { WORM } from '@shared/parts/wormGear.js'
import { GEAR_M } from '@shared/parts/_mech.js'

const LEAD = Math.PI * GEAR_M // avanço por volta (1 entrada)
const DEPTH = 2.25 * GEAR_M // altura do dente

// rosca: perfil trapezoidal varrido ao longo da hélice (tubo achatado)
function threadGeo() {
  return geo('wormThread', () => {
    const turns = WORM.len / LEAD
    const pts = []
    const N = Math.round(turns * 48)
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * turns * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(t) * (WORM.r - 0.02), (i / N) * WORM.len, Math.sin(t) * (WORM.r - 0.02)))
    }
    const curve = new THREE.CatmullRomCurve3(pts)
    const g = new THREE.TubeGeometry(curve, N, DEPTH * 0.42, 6, false)
    return g
  })
}

function Model({ part }) {
  const col = part.config?.color || '#c9a227'
  const metal = /^#c9a227$/i.test(col) ? 0.85 : 0
  return (
    <group>
      {/* cubo com parafuso de aperto */}
      <Cyl r={0.42} h={WORM.hub} pos={[0, WORM.hub / 2, 0]} color={col} metal={metal} rough={0.35} seg={20} />
      <Cyl r={0.07} h={0.12} pos={[0.42, WORM.hub / 2, 0]} rot={[0, 0, Math.PI / 2]} color="#222" seg={6} />
      {/* núcleo e rosca */}
      <Cyl r={WORM.r - DEPTH * 0.55} h={WORM.len} pos={[0, WORM.hub + WORM.len / 2, 0]} color={col} metal={metal} rough={0.35} seg={24} />
      <mesh position={[0, WORM.hub, 0]} geometry={threadGeo()} material={mat(col, metal, 0.35)} castShadow receiveShadow />
      <Cyl r={0.2} h={WORM.hub + WORM.len + 0.02} pos={[0, (WORM.hub + WORM.len) / 2, 0]} color="#111" seg={12} />
    </group>
  )
}

export default { type: 'wormGear', Model }
