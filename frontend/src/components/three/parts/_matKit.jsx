// Ajudantes dos modelos com material (grupo Materiais): material three.js a partir de
// config.material/config.color e perfis extrudidos (pontas redondas, cantos arredondados) com furos.
import { geo, mat, THREE } from '../kit.jsx'
import { matOf, matColor } from '@shared/parts/_materials.js'

// material three.js da peça (cor do utilizador ou do material; acrílico transparente)
export function partMat(cfg, fallback) {
  const m = matOf(cfg, fallback)
  return mat(matColor(cfg, fallback), m.metal, m.rough, m.opacity ? { transparent: true, opacity: m.opacity, depthWrite: false } : undefined)
}
export const partColor = (cfg, fallback) => matColor(cfg, fallback)

const circle = (path, x, y, r) => {
  const h = new THREE.Path()
  h.absarc(x, y, r, 0, Math.PI * 2, true)
  path.holes.push(h)
}

// perfil extrudido no plano XZ (espessura T segundo +y, face de baixo em y = 0)
function extrudeXZ(shape, T) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false, curveSegments: 18 })
  g.rotateX(-Math.PI / 2) // forma (x, y) → (x, −z); profundidade → +y
  return g
}

// barra de pontas redondas, de x = 0 a x = L, largura W, furos de raio hr nos pontos `holes` (x)
export function stadiumGeo(L, W, T, holes = [0, L], hr = 0.2) {
  return geo(`stad${L},${W},${T},${holes.join(':')},${hr}`, () => {
    const r = W / 2
    const s = new THREE.Shape()
    s.moveTo(0, -r)
    s.lineTo(L, -r)
    s.absarc(L, 0, r, -Math.PI / 2, Math.PI / 2, false)
    s.lineTo(0, r)
    s.absarc(0, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false)
    for (const x of holes) circle(s, x, 0, Math.min(hr, r * 0.7))
    return extrudeXZ(s, T)
  })
}

// retângulo L × W de cantos arredondados (raio rc) centrado na origem, com furos em `holes` [[x, z]]
export function roundRectGeo(L, W, T, rc, holes = [], hr = 0.2) {
  return geo(`rrect${L},${W},${T},${rc},${holes.length},${holes[0] || ''},${hr}`, () => {
    const r = Math.min(rc, L / 2 - 1e-3, W / 2 - 1e-3)
    const x0 = -L / 2
    const y0 = -W / 2
    const s = new THREE.Shape()
    s.moveTo(x0 + r, y0)
    s.lineTo(x0 + L - r, y0)
    s.quadraticCurveTo(x0 + L, y0, x0 + L, y0 + r)
    s.lineTo(x0 + L, y0 + W - r)
    s.quadraticCurveTo(x0 + L, y0 + W, x0 + L - r, y0 + W)
    s.lineTo(x0 + r, y0 + W)
    s.quadraticCurveTo(x0, y0 + W, x0, y0 + W - r)
    s.lineTo(x0, y0 + r)
    s.quadraticCurveTo(x0, y0, x0 + r, y0)
    for (const [x, z] of holes) circle(s, x, -z, hr)
    return extrudeXZ(s, T)
  })
}
