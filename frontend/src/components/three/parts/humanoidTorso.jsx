// Tronco do humanoide impresso em PLA: concha do peito branca com as arestas verticais
// chanfradas e as camadas de 0,2 mm da impressora visíveis, bacia em PETG escuro por baixo (onde
// aparafusam os servos laterais das ancas), cinta escura, painel do peito com a grelha de
// ventilação e 4 parafusos, ombreiras de alumínio com a furação das abas dos servos dos ombros
// e as placas laterais escuras. Tudo dentro dos colisores (shared/parts/humanoidTorso.js).
import { Box, mat, THREE } from '../kit.jsx'
import { TORSO, SHOULDER_PLATE as SP } from '@shared/parts/humanoidTorso.js'
import { extrudeXY, holeCircle, holeSlot, rrect } from './_mdfKit.jsx'
import { bevelPlateXZ, ScrewHeads } from './_matKit.jsx'

const { X, Z, H, shX, shT } = TORSO
const SHELL = '#eceff1'
const DARK = '#263238'
const PELVIS = 0.9
const CH = 0.5 // chanfro das arestas verticais

// camadas da impressão FDM (riscas horizontais finas): nas paredes extrudidas o v é a altura
let LAYER_TEX
function layerTexture() {
  if (LAYER_TEX || typeof document === 'undefined') return LAYER_TEX
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 64
  const x = c.getContext('2d')
  for (let i = 0; i < 64; i++) {
    const v = i % 2 ? 236 : 214
    x.fillStyle = `rgb(${v},${v},${v})`
    x.fillRect(0, i, 4, 1)
  }
  LAYER_TEX = new THREE.CanvasTexture(c)
  LAYER_TEX.wrapS = LAYER_TEX.wrapT = THREE.RepeatWrapping
  LAYER_TEX.repeat.set(1, 1 / 0.64) // 32 pares de camadas por 6,4 mm → 0,2 mm por camada
  LAYER_TEX.colorSpace = THREE.SRGBColorSpace
  return LAYER_TEX
}
const PLA_M = new Map()
function printedMats(color) {
  let m = PLA_M.get(color)
  if (!m) {
    const t = layerTexture()
    const side = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, bumpMap: t, bumpScale: 0.002, envMapIntensity: 0.7 })
    PLA_M.set(color, (m = [mat(color, 0, 0.5), side]))
  }
  return m
}

// secção do peito (x, −z): retângulo com as arestas verticais chanfradas
function chestShape(x, z, ch) {
  const s = new THREE.Shape()
  s.moveTo(-x + ch, -z)
  s.lineTo(x - ch, -z)
  s.lineTo(x, -z + ch)
  s.lineTo(x, z - ch)
  s.lineTo(x - ch, z)
  s.lineTo(-x + ch, z)
  s.lineTo(-x, z - ch)
  s.lineTo(-x, -z + ch)
  s.lineTo(-x + ch, -z)
  return s
}

// painel do peito (plano zy, espessura x): rasgos da grelha de ventilação
function chestPanel() {
  return extrudeXY('torsoPanel', 0.06, () => {
    const s = rrect(new THREE.Shape(), -2.6, -1.9, 2.6, 1.9, 0.3)
    for (let i = 0; i < 5; i++) holeSlot(s, -1.6, 1.6, -1.0 + i * 0.5, 0.18)
    return s
  })
}

// ombreira (x, −z): chapa de alumínio com os furos das abas do servo do ombro
function shoulderShape() {
  const hx = SP.x / 2
  const s = rrect(new THREE.Shape(), -hx, -(SP.z1 - SP.z0) / 2, hx, (SP.z1 - SP.z0) / 2, 0.3)
  for (const dx of [-0.75, 0.75]) for (const dz of [-0.5, 0.5]) holeCircle(s, dx, dz, 0.1)
  return s
}

function HumanoidTorsoModel() {
  const shellM = printedMats(SHELL)
  const darkM = printedMats(DARK)
  const chest = bevelPlateXZ('torsoChest', H - PELVIS - 0.005, () => chestShape(X, Z, CH), 0.12, 4)
  const pelvis = bevelPlateXZ('torsoPelvis', PELVIS, () => chestShape(X, Z, CH), 0.06, 4)
  const belt = bevelPlateXZ('torsoBelt', 0.35, () => chestShape(X + 0.01, Z + 0.01, CH), 0.04, 4)
  const shoulder = bevelPlateXZ('torsoShoulder', shT, shoulderShape, 0.03, 8)
  return (
    <group>
      {/* bacia escura e peito branco por cima (0,05 mm abaixo do topo: sem faces coincidentes com as ombreiras) */}
      <mesh geometry={pelvis} material={darkM} castShadow receiveShadow />
      <mesh geometry={chest} material={shellM} position={[0, PELVIS, 0]} castShadow receiveShadow />
      {/* cinta escura */}
      <mesh geometry={belt} material={darkM} position={[0, 3.2 - 0.175, 0]} castShadow receiveShadow />
      {/* painel do peito com a grelha e os 4 parafusos */}
      <mesh geometry={chestPanel()} material={mat(DARK, 0, 0.5)} position={[X + 0.03, 6.1, 0]} rotation={[0, Math.PI / 2, 0]} castShadow />
      <ScrewHeads rot={[0, 0, -Math.PI / 2]} r={0.16} pts={[-2.25, 2.25].flatMap((z) => [[-(6.1 - 1.55), X + 0.06, z], [-(6.1 + 1.55), X + 0.06, z]])} color="#b0b6ba" metal={0.9} rough={0.3} />
      {/* parafusos que fecham a bacia (de lado) */}
      <ScrewHeads rot={[Math.PI / 2, 0, 0]} r={0.16} pts={[-1.5, 1.5].map((x) => [x, Z, -0.45])} color="#b0b6ba" metal={0.9} rough={0.3} />
      <ScrewHeads rot={[-Math.PI / 2, 0, 0]} r={0.16} pts={[-1.5, 1.5].map((x) => [x, Z, 0.45])} color="#b0b6ba" metal={0.9} rough={0.3} />
      {/* ombreiras (por cima dos servos dos ombros) e as placas laterais escuras */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh geometry={shoulder} material={mat('#90a4ae', 0.6, 0.35)} position={[shX, H - shT, (s * (SP.z0 + SP.z1)) / 2]} castShadow receiveShadow />
          <Box size={[2 * X - 1.2, 1.4, 0.06]} pos={[0, H - 0.9, s * (Z + 0.01)]} color={DARK} rough={0.5} />
        </group>
      ))}
      <ScrewHeads r={0.15} pts={[-1, 1].flatMap((s) => [-0.75, 0.75].flatMap((dx) => [-0.5, 0.5].map((dz) => [shX + dx, H, (s * (SP.z0 + SP.z1)) / 2 + dz])))} color="#b0b6ba" metal={0.9} rough={0.3} />
    </group>
  )
}

export default { type: 'humanoidTorso', Model: HumanoidTorsoModel }
