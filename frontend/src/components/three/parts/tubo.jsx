// Tubo oco com material à escolha (eixo +y).
import { geo, THREE } from '../kit.jsx'
import { partMat } from './_matKit.jsx'

function Model({ part }) {
  const c = part.config || {}
  const r = c.r ?? 1
  const h = c.h ?? 10
  const e = Math.min(c.wall ?? 0.15, r * 0.95)
  const g = geo(`tubo${r},${h},${e}`, () => {
    const s = new THREE.Shape()
    s.absarc(0, 0, r, 0, Math.PI * 2, false)
    const hole = new THREE.Path()
    hole.absarc(0, 0, r - e, 0, Math.PI * 2, true)
    s.holes.push(hole)
    const x = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 32 })
    x.rotateX(-Math.PI / 2)
    return x
  })
  return <mesh geometry={g} material={partMat(c, 'alu')} castShadow receiveShadow />
}

export default { type: 'tubo', Model }
