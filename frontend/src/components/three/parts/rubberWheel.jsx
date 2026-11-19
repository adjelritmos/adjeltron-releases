// Roda com pneu de borracha (eixo +y), como as rodas dos kits de robôs (motor TT, 65 mm):
// pneu de borracha com os ombros boleados e piso de tacos em V moldados, jante de plástico com
// 6 raios, aro com rebordo, cubo com o furo em duplo D do veio do motor TT e parafuso de
// fixação no centro.
import { Cyl, geo, mat, mergedGeo, THREE } from '../kit.jsx'
import { aroundY } from './_mechKit.jsx'
import { wheelDims } from '@shared/parts/rubberWheel.js'
import { DiscWheel } from './_discWheel.jsx'
import { extrudeXZ } from './_mdfKit.jsx'

function tyreGeo(r, w) {
  return geo(`tyre${r},${w}`, () => {
    // perfil (r, y) do pneu girado à volta de y, com sulcos
    const pts = []
    const ri = r * 0.72
    const N = 24
    pts.push(new THREE.Vector2(ri, 0.05))
    for (let i = 0; i <= N; i++) {
      const t = i / N
      const y = 0.05 + t * (w - 0.1)
      const bulge = Math.sin(t * Math.PI) * 0.06
      const groove = i % 6 === 3 ? -0.08 : 0
      pts.push(new THREE.Vector2(r - 0.08 + bulge + groove, y))
    }
    pts.push(new THREE.Vector2(ri, w - 0.05))
    const g = new THREE.LatheGeometry(pts, 48)
    g.computeVertexNormals()
    return g
  })
}

// tacos do piso: n pares de blocos em V à volta do pneu (ângulo `tilt`, altura h·w, largura tw)
function treadGeo(r, w, n, tilt, h, tw, off) {
  return mergedGeo(`rwTread${r},${w},${n},${tilt},${h},${tw},${off}`, () => {
    const b = geo('mkUnitBox', () => new THREE.BoxGeometry(1, 1, 1))
    const out = []
    for (let i = 0; i < n; i++)
      for (const sd of [-1, 1]) {
        const [p, q] = aroundY(-(i / n) * Math.PI * 2, [r - 0.03, w / 2 + sd * w * off, 0], [sd * tilt, 0, 0])
        out.push([b, p, q, [0.1, w * h, tw]])
      }
    return out
  })
}
// raios da jante: placa radial com a aba (perfil em T) virada para fora
function spokeGeo(r, w, n) {
  return mergedGeo(`rwSpokes${r},${w},${n}`, () => {
    const b = geo('mkUnitBox', () => new THREE.BoxGeometry(1, 1, 1))
    const out = []
    for (let i = 0; i < n; i++) {
      const a = -(i / n) * Math.PI * 2
      const L = r * 0.64 - 0.5
      const [p, q] = aroundY(a, [0.5 + L / 2, w * 0.62, 0])
      out.push([b, p, q, [L, w * 0.42, 0.14]])
      const [p2, q2] = aroundY(a, [0.5 + L / 2, w * 0.8, 0])
      out.push([b, p2, q2, [L, 0.08, 0.32]])
    }
    return out
  })
}

// jante de brinquedo: disco com 8 janelas curvas (os raios rodam em espiral) e cubo saliente
function toyRimShape(R) {
  const s = new THREE.Shape()
  s.absarc(0, 0, R, 0, Math.PI * 2, false)
  const n = 8
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2
    const h = new THREE.Path()
    const P = (rr, aa) => [Math.cos(aa) * rr, Math.sin(aa) * rr]
    const twist = 0.35
    const w0 = 0.2
    const w1 = 0.42
    const r0 = R * 0.34
    const r1 = R * 0.86
    h.moveTo(...P(r0, a - w0 / 2))
    h.quadraticCurveTo(...P((r0 + r1) / 2, a + twist - w1 / 2), ...P(r1, a + twist * 1.4 - w1 / 2))
    h.absarc(0, 0, r1, a + twist * 1.4 - w1 / 2, a + twist * 1.4 + w1 / 2, false)
    h.quadraticCurveTo(...P((r0 + r1) / 2, a + twist + w1 / 2), ...P(r0, a + w0 / 2))
    h.absarc(0, 0, r0, a + w0 / 2, a - w0 / 2, true)
    s.holes.push(h)
  }
  return s
}

function ToyWheel({ r, w, rim }) {
  const R = r * 0.7
  return (
    <group>
      <mesh geometry={tyreGeo(r, w)} material={mat('#1c1c1c', 0, 0.92, { side: THREE.DoubleSide })} castShadow receiveShadow />
      {/* piso: blocos em V (como os pneus de brinquedo), numa só malha */}
      <mesh geometry={treadGeo(r, w, 36, 0.5, 0.32, 0.2, 0.2)} material={mat('#141414', 0, 0.95)} castShadow />
      {/* aro interior e jante de raios curvos na face de fora */}
      {/* aro (casca) e fundo escuro recuado: vê-se através das janelas da jante */}
      <mesh geometry={geo(`toyRimShell${R},${w}`, () => new THREE.CylinderGeometry(R, R, w * 0.9, 40, 1, true))} position={[0, w / 2, 0]} material={mat(rim, 0, 0.45, { side: THREE.DoubleSide })} />
      <Cyl r={R} h={0.05} pos={[0, w * 0.25, 0]} color="#151515" rough={0.6} seg={40} />
      <mesh geometry={extrudeXZ(`toyRim${R}`, 0.22, () => toyRimShape(R))} position={[0, w * 0.93 - 0.22, 0]} material={mat(rim, 0, 0.45)} castShadow receiveShadow />
      <Cyl r={R * 0.3} h={w * 0.98} pos={[0, w * 0.49, 0]} color={rim} rough={0.45} seg={24} />
      <Cyl r={0.2} h={w + 0.02} pos={[0, w / 2, 0]} color="#0d0d0d" seg={12} />
    </group>
  )
}

function Model({ part }) {
  const { r, w } = wheelDims(part.config || {})
  if (part.config?.style === 'brinquedo') return <ToyWheel r={r} w={w} rim={part.config?.color && part.config.color !== '#263238' ? part.config.color : '#ff8a1d'} />
  const rim = part.config?.color || '#263238'
  const spokes = 6
  if (part.config?.style === 'disco') return <DiscWheel R={r} W={w} color={part.config?.color && part.config.color !== '#263238' ? part.config.color : '#e53935'} />
  return (
    <group>
      <mesh geometry={tyreGeo(r, w)} material={mat('#1c1c1c', 0, 0.92, { side: THREE.DoubleSide })} castShadow receiveShadow />
      {/* tacos do piso em V, numa só malha */}
      <mesh geometry={treadGeo(r, w, 28, 0.42, 0.36, 0.25, 0.19)} material={mat('#141414', 0, 0.95)} castShadow />
      {/* aro com rebordo (onde assenta o pneu) e fundo escuro recuado entre os raios */}
      <mesh geometry={geo(`rwRim${r},${w}`, () => {
        const R = r * 0.72
        const p = [[r * 0.64, w * 0.2], [R, w * 0.2], [R + 0.04, w * 0.22], [R + 0.04, w * 0.27], [R, w * 0.29], [R, w * 0.71], [R + 0.04, w * 0.73], [R + 0.04, w * 0.78], [R, w * 0.8], [r * 0.64, w * 0.8], [r * 0.64, w * 0.2]].map(([a, b]) => new THREE.Vector2(a, b))
        return new THREE.LatheGeometry(p, 40)
      })} material={mat(rim, 0, 0.45)} castShadow receiveShadow />
      <Cyl r={r * 0.64} h={0.05} pos={[0, w * 0.35, 0]} color="#111" rough={0.6} seg={36} />
      {/* raios (perfil em T, alargam junto ao aro) */}
      <mesh geometry={spokeGeo(r, w, spokes)} material={mat(rim, 0, 0.45)} castShadow receiveShadow />
      {/* cubo com o furo em duplo D e o parafuso de fixação */}
      <mesh position={[0, w / 2, 0]} geometry={geo(`rwHub${w}`, () => {
        const p = [[0.3, -w / 2], [0.55, -w / 2], [0.58, -w / 2 + 0.04], [0.58, w / 2 - 0.04], [0.55, w / 2], [0.3, w / 2], [0.3, -w / 2]].map(([a, b]) => new THREE.Vector2(a, b))
        return new THREE.LatheGeometry(p, 28)
      })} material={mat(rim, 0, 0.45)} castShadow />
      <mesh position={[0, w / 2, 0]} geometry={geo(`rwBoreDD${w}`, () => {
        // furo em duplo D (5,4 × 3,7 mm) do veio do motor TT
        const sh = new THREE.Shape()
        sh.absarc(0, 0, 0.3, 0, Math.PI * 2, false)
        const h = new THREE.Path()
        const a = Math.acos(0.185 / 0.27)
        h.absarc(0, 0, 0.27, a, Math.PI - a, false)
        h.absarc(0, 0, 0.27, Math.PI + a, 2 * Math.PI - a, false)
        h.closePath()
        sh.holes.push(h)
        const g = new THREE.ExtrudeGeometry(sh, { depth: w * 0.98, bevelEnabled: false, curveSegments: 10 })
        g.translate(0, 0, -w * 0.49)
        g.rotateX(-Math.PI / 2)
        return g
      })} material={mat(rim, 0, 0.5)} />
      <mesh position={[0, w * 0.98, 0]} geometry={geo('rwScrew', () => new THREE.SphereGeometry(0.2, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1))} material={mat('#c9ced2', 0.9, 0.3)} />
      <mesh position={[0, w * 0.98 + 0.07, 0]} geometry={geo('rwScrewX', () => new THREE.BoxGeometry(0.24, 0.04, 0.05))} material={mat('#3a3d40', 0.5, 0.5)} />
      <mesh position={[0, w * 0.98 + 0.07, 0]} rotation={[0, Math.PI / 2, 0]} geometry={geo('rwScrewX', () => new THREE.BoxGeometry(0.24, 0.04, 0.05))} material={mat('#3a3d40', 0.5, 0.5)} />
    </group>
  )
}

export default { type: 'rubberWheel', Model }
