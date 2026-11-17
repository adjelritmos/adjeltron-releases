// Cilindro com material à escolha (eixo +y, origem no centro da face de baixo).
import { geo, THREE } from '../kit.jsx'
import { partMat } from './_matKit.jsx'

function Model({ part }) {
  const c = part.config || {}
  const r = c.r ?? 3
  const h = c.h ?? 2
  const g = geo(`cil${r},${h}`, () => new THREE.CylinderGeometry(r, r, h, Math.max(24, Math.min(72, Math.round(r * 12)))))
  return <mesh position={[0, h / 2, 0]} geometry={g} material={partMat(c, 'acrilico')} castShadow receiveShadow />
}

export default { type: 'cilindro', Model }
