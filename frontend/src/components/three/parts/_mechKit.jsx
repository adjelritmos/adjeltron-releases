// Ajudantes dos modelos 3D do grupo Mecânica: furos instanciados, engrenagens e polias
// dentadas (perfis extrudidos em cache), cores de materiais.
import { useLayoutEffect, useRef } from 'react'
import { geo, mat, THREE } from '../kit.jsx'

export const ALU = '#cfd8dc'
export const ALU_DARK = '#90a4ae'
export const STEEL = '#b0bec5'
export const HOLE_C = '#1b1f22'
export const RUBBER = '#1e1e1e'
export const BRASS = '#c9a227'

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _s = new THREE.Vector3(1, 1, 1)
const _p = new THREE.Vector3()

// furos: cilindros escuros instanciados; axis 'y' | 'x' | 'z'
export function Holes({ pts, r = 0.2, h = 0.32, axis = 'y', color = HOLE_C }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const rot = axis === 'x' ? new THREE.Euler(0, 0, Math.PI / 2) : axis === 'z' ? new THREE.Euler(Math.PI / 2, 0, 0) : new THREE.Euler()
    _q.setFromEuler(rot)
    pts.forEach((p, i) => {
      _m.compose(_p.set(p[0], p[1], p[2]), _q, _s)
      m.setMatrixAt(i, _m)
    })
    m.count = pts.length
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  })
  if (!pts.length) return null
  return <instancedMesh key={pts.length} ref={ref} args={[geo(`hcyl${r},${h}`, () => new THREE.CylinderGeometry(r, r, h, 14)), mat(color, 0, 0.8), pts.length]} />
}

// perfil de engrenagem de dentes retos (aproximação trapezoidal do perfil evolvente)
function gearShape(z, m, bore) {
  const rp = (m * z) / 2
  const ra = rp + m
  const rf = Math.max(bore + 0.05, rp - 1.25 * m)
  const sh = new THREE.Shape()
  const step = (2 * Math.PI) / z
  for (let i = 0; i < z; i++) {
    const a = i * step
    const pts = [
      [rf, a - step * 0.27],
      [rf, a - step * 0.2],
      [ra, a - step * 0.1],
      [ra, a + step * 0.1],
      [rf, a + step * 0.2],
      [rf, a + step * 0.27],
    ]
    pts.forEach(([r, t], k) => {
      const x = r * Math.cos(t)
      const y = r * Math.sin(t)
      if (i === 0 && k === 0) sh.moveTo(x, y)
      else sh.lineTo(x, y)
    })
  }
  sh.closePath()
  if (bore > 0) {
    const h = new THREE.Path()
    h.absarc(0, 0, bore, 0, Math.PI * 2, true)
    sh.holes.push(h)
  }
  return sh
}

// geometria de engrenagem com a espessura segundo +y (de 0 a w)
export function gearGeo(z, m, w, bore = 0.25) {
  return geo(`gear${z},${m},${w},${bore}`, () => {
    const g = new THREE.ExtrudeGeometry(gearShape(z, m, bore), { depth: w, bevelEnabled: false, curveSegments: 8 })
    g.rotateX(-Math.PI / 2) // extrusão (z) → +y
    g.computeVertexNormals()
    return g
  })
}

// polia GT2: dentes pequenos (passo 2 mm) — mesmo perfil com módulo 2/π
export function gt2Geo(z, w) {
  return geo(`gt2${z},${w}`, () => {
    const m = 0.2 / Math.PI
    const g = new THREE.ExtrudeGeometry(gearShape(z, m, 0.25), { depth: w, bevelEnabled: false, curveSegments: 6 })
    g.rotateX(-Math.PI / 2)
    g.computeVertexNormals()
    return g
  })
}

export function Gear({ z, m = 0.1, w, y0 = 0, color = '#eceff1', metal = 0, rough = 0.45, bore = 0.25 }) {
  return <mesh position={[0, y0, 0]} geometry={gearGeo(z, m, w, bore)} material={mat(color, metal, rough)} castShadow receiveShadow />
}

// cilindro deitado ao longo de x
export const rotX = [0, 0, Math.PI / 2]
export const rotZ = [Math.PI / 2, 0, 0]

// furos de uma grelha retangular no plano xz à altura y
export function gridPts(nx, nz, pitch, y, x0 = -((nx - 1) * pitch) / 2, z0 = -((nz - 1) * pitch) / 2) {
  const out = []
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) out.push([x0 + i * pitch, y, z0 + j * pitch])
  return out
}
