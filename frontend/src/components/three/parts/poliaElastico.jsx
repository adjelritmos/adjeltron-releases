// Polia de plástico injetado (amarela por omissão): aro com gola em V para o elástico, 4 raios
// largos com furos nos braços e cubo com furo do veio — como as polias dos kits de brinquedo.
import { THREE, geo, mat } from '../kit.jsx'
import { extrudeXZ, holeCircle } from './_mdfKit.jsx'
import { poliaDims } from '@shared/parts/poliaElastico.js'

// aro com gola: perfil (raio, altura) girado à volta do eixo
function rimGeo(R, r, w) {
  return geo(`poliaRim${R},${r}`, () => {
    const t = R * 0.16
    const pts = [
      [R - t, 0],
      [R, 0],
      [R, w * 0.28],
      [r, w * 0.5],
      [R, w * 0.72],
      [R, w],
      [R - t, w],
      [R - t, 0],
    ].map(([a, b]) => new THREE.Vector2(a, b))
    return new THREE.LatheGeometry(pts, 64)
  })
}
// disco central: raios largos com janelas entre eles e furos nos braços
function webShape(R) {
  const s = new THREE.Shape()
  s.absarc(0, 0, R * 0.86, 0, Math.PI * 2, false)
  for (let k = 0; k < 4; k++) {
    const a0 = (k / 4) * Math.PI * 2 + 0.32
    const a1 = a0 + Math.PI / 2 - 0.64
    const h = new THREE.Path()
    h.absarc(0, 0, R * 0.78, a0, a1, false)
    h.absarc(0, 0, R * 0.3, a1, a0, true)
    s.holes.push(h)
    const am = (k / 4) * Math.PI * 2
    for (const f of [0.42, 0.62]) if (R > 1.2) holeCircle(s, Math.cos(am) * R * f, Math.sin(am) * R * f, R * 0.06)
  }
  holeCircle(s, 0, 0, 0.17)
  return s
}

function Model({ part }) {
  const { R, r, w } = poliaDims(part.config || {})
  const col = part.config?.color || '#ffd21f'
  const m = mat(col, 0, 0.5)
  return (
    <group>
      <mesh geometry={rimGeo(R, r, w)} material={m} castShadow receiveShadow />
      <mesh geometry={extrudeXZ(`poliaWeb${R}`, w * 0.4, () => webShape(R))} position={[0, w * 0.3, 0]} material={m} castShadow receiveShadow />
      {/* cubo com o furo do veio passante (arestas boleadas da injeção) */}
      <mesh geometry={geo(`poliaHub${w}`, () => {
        const h = w + 0.2
        const p = [[0.17, 0], [0.38, 0], [0.42, 0.04], [0.42, h - 0.04], [0.38, h], [0.17, h], [0.17, 0]].map(([a, b]) => new THREE.Vector2(a, b))
        return new THREE.LatheGeometry(p, 24)
      })} material={m} castShadow receiveShadow />
    </group>
  )
}

export default { type: 'poliaElastico', Model }
