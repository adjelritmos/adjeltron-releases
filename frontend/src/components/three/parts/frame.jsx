// Estrutura (placa base) para robôs livres: placa de fibra de carbono de 4 mm (tecido em sarja
// 3K com verniz), cantos boleados, furos passantes de 3,5 mm com as arestas chanfradas e a seta
// da frente impressa a branco.
import { Box, THREE } from '../kit.jsx'
import { plateGeo, rrectShape, addHole } from './_mechKit.jsx'

const HOLES = (() => {
  const h = []
  for (let x = -6; x <= 6; x += 2) for (const z of [-4, 4]) h.push([x, z])
  for (const z of [-2, 0, 2]) for (const x of [-6, 6]) h.push([x, z])
  return h
})()

// fibra de carbono: textura de sarja 2×2 (1 cm por ladrilho; os UV das faces são em cm),
// verniz brilhante por cima
let CARBON = null
function carbonMat() {
  if (CARBON) return CARBON
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  g.fillStyle = '#121416'
  g.fillRect(0, 0, 128, 128)
  const n = 8
  const k = 128 / n
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const warp = (i + j) % 4 < 2
      const grd = warp ? g.createLinearGradient(i * k, 0, i * k + k, 0) : g.createLinearGradient(0, j * k, 0, j * k + k)
      grd.addColorStop(0, '#1a1c1f')
      grd.addColorStop(0.5, warp ? '#34383d' : '#2a2d31')
      grd.addColorStop(1, '#1a1c1f')
      g.fillStyle = grd
      g.fillRect(i * k + 0.5, j * k + 0.5, k - 1, k - 1)
    }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 4
  CARBON = new THREE.MeshPhysicalMaterial({ map: t, metalness: 0.2, roughness: 0.45, clearcoat: 0.8, clearcoatRoughness: 0.15 })
  return CARBON
}

function FrameModel() {
  const g = plateGeo('frameCF', 0.4, () => {
    const s = rrectShape(-7, -5, 7, 5, 0.6)
    for (const [x, z] of HOLES) addHole(s, x, -z, 0.18)
    return s
  }, 0.03, 14)
  return (
    <group>
      <mesh geometry={g} material={carbonMat()} castShadow receiveShadow />
      {/* seta da frente (+x) impressa */}
      <Box size={[1.6, 0.01, 0.3]} pos={[4.2, 0.405, 0]} color="#e6e6e6" />
      <Box size={[0.7, 0.01, 0.3]} pos={[4.85, 0.405, -0.25]} rot={[0, -Math.PI / 4, 0]} color="#e6e6e6" />
      <Box size={[0.7, 0.01, 0.3]} pos={[4.85, 0.405, 0.25]} rot={[0, Math.PI / 4, 0]} color="#e6e6e6" />
    </group>
  )
}

export default { type: 'frame', Model: FrameModel }
