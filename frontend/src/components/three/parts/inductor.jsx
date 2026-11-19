// Bobina radial de núcleo de ferrite ("drum core", 8 × 10 mm): carretel de ferrite
// cinzento-escuro mate (flanges com as arestas boleadas) e o enrolamento de fio de cobre
// esmaltado à vista, espira a espira; o valor impresso no topo da flange de cima.
import { THREE, geo, mat, PITCH } from '../kit.jsx'
import { Mark, Wires } from './_dip.jsx'
import { indSpec } from '@shared/parts/inductor.js'
import { Badge, fmt } from './group-c-ui.jsx'

const Y0 = 0.12

// carretel de ferrite: flange de baixo, núcleo, flange de cima (perfil de revolução)
const drumGeo = (r) =>
  geo(`drum${r}`, () => {
    const c = r * 0.55
    const p = [
      [0.001, 0], [r - 0.03, 0], [r, 0.03], [r, 0.08], [r - 0.03, 0.11], [c, 0.11],
      [c, 0.71], [r - 0.03, 0.71], [r, 0.74], [r, 0.79], [r - 0.03, 0.82], [0.001, 0.82],
    ]
    const g = new THREE.LatheGeometry(p.map(([a, b]) => new THREE.Vector2(a, b)), 32)
    g.computeVertexNormals()
    return g
  })
// textura do enrolamento: espiras de cobre esmaltado com brilho e sombra entre elas
let WIND
function windMat() {
  if (!WIND) {
    const c = document.createElement('canvas')
    c.width = 64
    c.height = 256
    const x = c.getContext('2d')
    const n = 24
    for (let i = 0; i < n; i++) {
      const y = (i * 256) / n
      const g = x.createLinearGradient(0, y, 0, y + 256 / n)
      g.addColorStop(0, '#5a2a0e')
      g.addColorStop(0.35, '#d8894a')
      g.addColorStop(0.55, '#f1b07a')
      g.addColorStop(1, '#6a3412')
      x.fillStyle = g
      x.fillRect(0, y, 64, 256 / n)
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(6, 1)
    t.anisotropy = 4
    WIND = new THREE.MeshStandardMaterial({ map: t, metalness: 0.75, roughness: 0.3, color: '#ffffff' })
  }
  return WIND
}

function Model({ part }) {
  const spec = indSpec(part.config?.uH ?? 1000)
  const r = spec[0] >= 10000 ? 0.45 : 0.4
  const rw = r * 0.88 // raio exterior do enrolamento (um pouco abaixo da flange)
  return (
    <group>
      <Wires id="indLegs" r={0.03} lines={[-PITCH, PITCH].map((x) => [[x, 0, 0], [x, Y0 + 0.02, 0]])} />
      <group position={[0, Y0, 0]}>
        <mesh geometry={drumGeo(r)} material={mat('#3a3a3c', 0, 0.85)} castShadow receiveShadow />
        <mesh position={[0, 0.41, 0]} geometry={geo(`indWind${rw}`, () => new THREE.CylinderGeometry(rw, rw, 0.6, 32, 1, true))} material={windMat()} castShadow />
        {/* fios de saída do enrolamento a descer junto à flange */}
        <mesh position={[r * 0.75, 0.06, 0]} geometry={geo('indTail', () => new THREE.CylinderGeometry(0.018, 0.018, 0.12, 6))} material={mat('#c97a3e', 0.8, 0.3)} />
        <Mark lines={[{ text: spec[3].replace(' ', ''), font: 'bold 64px Arial', y: 70 }, { text: '347', font: '34px Arial', y: 130 }]} px={[256, 180]} pos={[0, 0.822, 0]} rot={[-Math.PI / 2, 0, 0]} w={r * 1.3} h={r * 0.91} color="#e6e6e6" />
      </group>
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live || Math.abs(live.i) < 0.0005) return null
  return <Badge info={info} text={`${fmt(live.i * 1000, 0)} mA`} color={live.sat ? '#f59e0b' : '#f5f5f5'} />
}

export default { type: 'inductor', Model, Overlay2D }
