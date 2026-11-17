// Perfil 2020: secção extrudida (quadrado com ranhuras em T e furo central) ao longo de x.
import { geo, mat, THREE } from '../kit.jsx'
import { EXT } from '@shared/parts/extrusion2020.js'

function profileGeo(L) {
  return geo(`ext2020_${L}`, () => {
    const h = EXT.S / 2
    const s = new THREE.Shape()
    // contorno com uma ranhura de 0,6 cm (6 mm) a meio de cada face, 0,6 de fundo
    const slot = 0.3
    const d = 0.55
    const pts = []
    const face = (ax, ay, bx, by, nx, ny) => {
      // de a para b, com ranhura no meio, para dentro (−n)
      const mx = (ax + bx) / 2
      const my = (ay + by) / 2
      const tx = (bx - ax) / (2 * h)
      const ty = (by - ay) / (2 * h)
      pts.push([ax, ay])
      pts.push([mx - tx * slot, my - ty * slot])
      pts.push([mx - tx * slot - nx * 0.15, my - ty * slot - ny * 0.15])
      pts.push([mx - tx * (slot + 0.25) - nx * 0.2, my - ty * (slot + 0.25) - ny * 0.2])
      pts.push([mx - tx * (slot + 0.25) - nx * d, my - ty * (slot + 0.25) - ny * d])
      pts.push([mx + tx * (slot + 0.25) - nx * d, my + ty * (slot + 0.25) - ny * d])
      pts.push([mx + tx * (slot + 0.25) - nx * 0.2, my + ty * (slot + 0.25) - ny * 0.2])
      pts.push([mx + tx * slot - nx * 0.15, my + ty * slot - ny * 0.15])
      pts.push([mx + tx * slot, my + ty * slot])
    }
    face(-h, -h, h, -h, 0, -1)
    face(h, -h, h, h, 1, 0)
    face(h, h, -h, h, 0, 1)
    face(-h, h, -h, -h, -1, 0)
    pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)))
    s.closePath()
    const hole = new THREE.Path()
    hole.absarc(0, 0, 0.21, 0, Math.PI * 2, true)
    s.holes.push(hole)
    const g = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false, curveSegments: 10 })
    g.translate(0, 0, -L / 2)
    g.rotateY(Math.PI / 2) // extrusão ao longo de x
    g.translate(0, h, 0)
    g.computeVertexNormals()
    return g
  })
}

function Model({ part }) {
  const L = part.config?.length ?? 20
  return <mesh geometry={profileGeo(L)} material={mat('#c5ccd1', 0.75, 0.38)} castShadow receiveShadow />
}

export default { type: 'extrusion2020', Model }
