// Esfera com material à escolha (origem no ponto de baixo).
import { geo, THREE } from '../kit.jsx'
import { partMat } from './_matKit.jsx'

function Model({ part }) {
  const c = part.config || {}
  const r = c.r ?? 1.5
  return <mesh position={[0, r, 0]} geometry={geo(`esf${r}`, () => new THREE.SphereGeometry(r, 32, 20))} material={partMat(c, 'borracha')} castShadow receiveShadow />
}

export default { type: 'esfera', Model }
