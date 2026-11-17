// Material escolhido no painel para uma peça mecânica (config.material, ver genericMaterial em
// shared/components.js): troca o material da parte PRINCIPAL do modelo 3D — o grupo de malhas
// com a mesma cor que ocupa mais volume — e deixa os pormenores (parafusos, pneus, rolamentos…)
// como estão. Sem escolha, repõe os materiais originais.
import * as THREE from 'three'
import { MATERIALS } from '@shared/parts/_materials.js'
import { mat } from '../components/three/kit.jsx'

const _b = new THREE.Box3()
const _s = new THREE.Vector3()

const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b

// baseKey: material de origem da peça; se for claro, as malhas quase pretas (pneus, borrachas,
// parafusos) nunca contam como parte principal
export function applyMaterial(root, matKey, color, baseKey) {
  if (!root) return
  const meshes = []
  root.traverse((o) => {
    if (o.isMesh && !o.userData.noSwap) meshes.push(o)
  })
  // repõe primeiro (para recalcular a parte principal sobre os materiais de origem)
  for (const m of meshes) if (m.userData.origMat) m.material = m.userData.origMat
  if (!matKey) {
    for (const m of meshes) delete m.userData.origMat
    return
  }
  const darkSkip = baseKey && lum(new THREE.Color(MATERIALS[baseKey]?.color || '#888')) > 0.05
  const vol = new Map()
  for (const m of meshes) {
    const mt = m.material
    if (!mt?.color || Array.isArray(mt)) continue
    if (darkSkip && lum(mt.color) < 0.02) continue
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox()
    _b.copy(m.geometry.boundingBox).getSize(_s)
    const sc = m.getWorldScale(new THREE.Vector3())
    const v = Math.abs(_s.x * _s.y * _s.z * sc.x * sc.y * sc.z)
    const k = mt.color.getHexString() + (mt.transparent ? 't' : '')
    vol.set(k, (vol.get(k) || 0) + v)
  }
  let main = null
  for (const [k, v] of vol) if (!main || v > vol.get(main)) main = k
  if (!main) return
  const M = MATERIALS[matKey]
  const nm = mat(color || M.color, M.metal, M.rough, M.opacity ? { transparent: true, opacity: M.opacity, depthWrite: false } : undefined)
  for (const m of meshes) {
    const mt = m.material
    if (!mt?.color || Array.isArray(mt)) continue
    if (mt.color.getHexString() + (mt.transparent ? 't' : '') !== main) continue
    m.userData.origMat = mt
    m.material = nm
  }
}
