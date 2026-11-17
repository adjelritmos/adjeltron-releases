// Amortecedor com mola: corpo e olhal de baixo fixos; haste, olhal e prato de cima deslizam
// com o mount "top"; a mola estica entre os dois pratos.
import { Cyl, useFrame, useRef, geo, mat, THREE } from '../kit.jsx'
import { slideNow } from '../../../functions/mechLive.js'
import { rotZ } from './_mechKit.jsx'
import { SHOCK } from '@shared/parts/shockAbsorber.js'
import { scaleOf } from '@shared/components.js'

// hélice de altura 1 (escala em y)
function coilGeo(H) {
  return geo(`shockCoil${H}`, () => {
    const pts = []
    const turns = Math.round(H * 1.6)
    for (let i = 0; i <= turns * 24; i++) {
      const t = i / (turns * 24)
      const a = t * turns * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * 0.62, t * H, Math.sin(a) * 0.62))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 24, 0.07, 6, false)
  })
}

function Model({ part }) {
  const L = part.config?.length ?? 7
  const up = useRef()
  const coil = useRef()
  const y0 = 0.9 // prato de baixo
  const H = L - 0.9 - y0 // comprimento livre da mola
  useFrame(() => {
    const d = slideNow(part.id, 'top', [0, 1, 0]) / scaleOf(part)[1] // o grupo do modelo já está escalado
    if (up.current) up.current.position.y = d
    if (coil.current) coil.current.scale.y = Math.max(0.2, (H + d) / H)
  })
  return (
    <group>
      {/* olhal de baixo + corpo */}
      <Cyl r={0.35} h={0.5} pos={[0, 0, 0]} rot={rotZ} color="#263238" metal={0.6} rough={0.4} seg={16} />
      <Cyl r={SHOCK.R} h={L * 0.55 - 0.3} pos={[0, 0.3 + (L * 0.55 - 0.3) / 2, 0]} color="#c62828" metal={0.75} rough={0.3} seg={24} />
      <Cyl r={0.8} h={0.12} pos={[0, y0, 0]} color="#263238" metal={0.6} rough={0.4} seg={24} />
      <mesh ref={coil} position={[0, y0, 0]} geometry={coilGeo(H)} material={mat('#fdd835', 0.5, 0.35)} castShadow />
      <group ref={up}>
        <Cyl r={0.2} h={L * 0.5} pos={[0, L - L * 0.25 - 0.2, 0]} color="#e6e8ea" metal={0.95} rough={0.15} seg={14} />
        <Cyl r={0.8} h={0.12} pos={[0, L - 0.9, 0]} color="#263238" metal={0.6} rough={0.4} seg={24} />
        <Cyl r={0.35} h={0.5} pos={[0, L, 0]} rot={rotZ} color="#263238" metal={0.6} rough={0.4} seg={16} />
      </group>
    </group>
  )
}

export default { type: 'shockAbsorber', Model }
