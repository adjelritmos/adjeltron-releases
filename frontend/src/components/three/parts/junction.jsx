// Junção de fios: um ponto de solda — filete côncavo de estanho com a superfície brilhante e
// ligeiramente irregular, como uma soldadura real.
import { THREE, geo, mat } from '../kit.jsx'

const blobGeo = () =>
  geo('junctionBlob', () => {
    const p = [[0.001, 0.07], [0.03, 0.068], [0.055, 0.058], [0.07, 0.04], [0.085, 0.018], [0.105, 0.006], [0.11, 0.0]]
    const g = new THREE.LatheGeometry(p.map(([a, b]) => new THREE.Vector2(a, b)).reverse(), 24)
    // pequenas irregularidades (a solda nunca é um sólido de revolução perfeito)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const k = 1 + 0.05 * Math.sin(Math.atan2(z, x) * 3 + 0.7)
      pos.setX(i, x * k)
      pos.setZ(i, z * k)
    }
    g.computeVertexNormals()
    return g
  })

function Model() {
  return <mesh geometry={blobGeo()} material={mat('#d4d7da', 1, 0.22)} castShadow />
}

export default { type: 'junction', Model }
