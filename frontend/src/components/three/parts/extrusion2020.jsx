// Perfil de alumínio 2020 (tipo B, ranhura de 6 mm): secção real extrudida ao longo de x —
// quadrado de 20 mm com cantos boleados, ranhura em T a meio de cada face (abertura de 6,2 mm,
// lábios de 1,8 mm, câmara de 11 mm), furo central de 4,2 mm (para roscar M5) e anodizado
// natural escovado; as pontas cortadas têm um chanfro pequeno.
import { geo, THREE } from '../kit.jsx'
import { brushedMat } from './_mechKit.jsx'
import { EXT } from '@shared/parts/extrusion2020.js'

// secção do perfil centrada na origem (plano xy da forma)
function sectionShape() {
  const h = EXT.S / 2
  const rc = 0.05 // raio dos cantos
  const s = new THREE.Shape()
  // ranhura (deslocamento ao longo da face a partir do meio, profundidade para dentro)
  const slot = [
    [-0.31, 0],
    [-0.31, 0.18],
    [-0.55, 0.18],
    [-0.55, 0.27],
    [-0.29, 0.61],
    [0.29, 0.61],
    [0.55, 0.27],
    [0.55, 0.18],
    [0.31, 0.18],
    [0.31, 0],
  ]
  // faces percorridas no sentido anti-horário: [canto inicial, direção ao longo, normal para fora]
  const faces = [
    [[-h, -h], [1, 0], [0, -1]],
    [[h, -h], [0, 1], [1, 0]],
    [[h, h], [-1, 0], [0, 1]],
    [[-h, h], [0, -1], [-1, 0]],
  ]
  let first = true
  const P = (x, y) => {
    if (first) {
      s.moveTo(x, y)
      first = false
    } else s.lineTo(x, y)
  }
  for (const [[ax, ay], [tx, ty], [nx, ny]] of faces) {
    // canto boleado: arco de 3 pontos entre a face anterior e esta
    for (let k = 0; k <= 3; k++) {
      const a = (k / 3) * (Math.PI / 2)
      // do lado da face anterior (−t) para o lado desta (+t), à volta do centro do arco
      const cx = ax + tx * rc - nx * rc
      const cy = ay + ty * rc - ny * rc
      P(cx - tx * rc * Math.cos(a) + nx * rc * Math.sin(a), cy - ty * rc * Math.cos(a) + ny * rc * Math.sin(a))
    }
    const mx = ax + tx * h
    const my = ay + ty * h
    for (const [o, d] of slot) P(mx + tx * o - nx * d, my + ty * o - ny * d)
  }
  s.closePath()
  const hole = new THREE.Path()
  hole.absarc(0, 0, 0.21, 0, Math.PI * 2, true)
  s.holes.push(hole)
  return s
}

function profileGeo(L) {
  return geo(`ext2020b_${L}`, () => {
    const h = EXT.S / 2
    const b = 0.015
    const g = new THREE.ExtrudeGeometry(sectionShape(), { depth: L - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: 1, curveSegments: 12 })
    g.translate(0, 0, -L / 2 + b)
    g.rotateY(Math.PI / 2) // extrusão ao longo de x
    g.translate(0, h, 0)
    g.computeVertexNormals()
    return g
  })
}

function Model({ part }) {
  const L = part.config?.length ?? 20
  return <mesh geometry={profileGeo(L)} material={brushedMat('#c5ccd1', 0.8, 0.4, true)} castShadow receiveShadow />
}

export default { type: 'extrusion2020', Model }
