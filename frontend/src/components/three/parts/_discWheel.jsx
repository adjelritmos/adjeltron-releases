// Roda impressa em 3D tipo disco (como a dos robôs de duas rodas grandes): disco maciço com
// uma coroa de furos redondos, aro um pouco mais grosso e cubo branco. Eixo +y; face de
// dentro em y = 0, a roda cresce para +y (largura W).
import { geo, mat, mergedGeo, THREE } from '../kit.jsx'
import { aroundY } from './_mechKit.jsx'

function discGeo(R, T, holes) {
  return geo(`disc${R},${T},${holes}`, () => {
    const s = new THREE.Shape()
    s.absarc(0, 0, R, 0, Math.PI * 2, false)
    const rr = R * 0.58 // raio da coroa de furos
    const hr = holes ? Math.min(R * 0.17, (Math.PI * rr) / holes / 1.6) : 0
    for (let i = 0; i < holes; i++) {
      const a = (i / holes) * Math.PI * 2
      const h = new THREE.Path()
      h.absarc(Math.cos(a) * rr, Math.sin(a) * rr, hr, 0, Math.PI * 2, true)
      s.holes.push(h)
    }
    const hub = new THREE.Path()
    hub.absarc(0, 0, 0.25, 0, Math.PI * 2, true)
    s.holes.push(hub)
    const g = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, curveSegments: 40 })
    g.rotateX(-Math.PI / 2)
    g.computeVertexNormals()
    return g
  })
}
function rimGeo(R, W) {
  return geo(`discRim${R},${W}`, () => {
    const g = new THREE.CylinderGeometry(R, R, W, 64, 1, true)
    g.translate(0, W / 2, 0)
    return g
  })
}

// pneu de borracha (anel com piso) por fora do aro: o diâmetro total continua a ser 2R
function tireGeo(R, W, t) {
  return geo(`discTire${R},${W},${t}`, () => {
    const pts = []
    const ri = R - t
    const N = 16
    pts.push(new THREE.Vector2(ri, 0.04))
    for (let i = 0; i <= N; i++) {
      const k = i / N
      const y = 0.04 + k * (W - 0.08)
      pts.push(new THREE.Vector2(R - 0.05 + Math.sin(k * Math.PI) * 0.05, y))
    }
    pts.push(new THREE.Vector2(ri, W - 0.04))
    const g = new THREE.LatheGeometry(pts, 64)
    g.computeVertexNormals()
    return g
  })
}

// tacos do piso: blocos à volta do pneu, alternados em V (como os pneus de borracha moldada)
function treadGeo(R, W) {
  return mergedGeo(`discTread${R},${W}`, () => {
    const b = geo('mkUnitBox', () => new THREE.BoxGeometry(1, 1, 1))
    const n = Math.round(R * 6)
    const out = []
    for (let i = 0; i < n; i++) {
      for (const sd of [-1, 1]) {
        const [p, q] = aroundY(-(i / n) * Math.PI * 2 - (sd > 0 ? Math.PI / n : 0), [R - 0.02, W / 2 + sd * W * 0.2, 0], [sd * 0.45, 0, 0])
        out.push([b, p, q, [0.1, W * 0.36, 0.22]])
      }
    }
    return out
  })
}
// parafusos do cubo (cabeça boleada) e a cruz Phillips
function screwGeo(W) {
  return mergedGeo(`discScrews${W}`, () => {
    const h = geo('discScrewHead', () => new THREE.SphereGeometry(0.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 1))
    return [0, 1, 2].map((i) => [h, [Math.cos((i / 3) * Math.PI * 2) * 0.45, W + 0.1, Math.sin((i / 3) * Math.PI * 2) * 0.45]])
  })
}
function crossGeo(W) {
  return mergedGeo(`discCross${W}`, () => {
    const b = geo('mkUnitBox', () => new THREE.BoxGeometry(1, 1, 1))
    return [0, 1, 2].flatMap((i) => {
      const p = [Math.cos((i / 3) * Math.PI * 2) * 0.45, W + 0.145, Math.sin((i / 3) * Math.PI * 2) * 0.45]
      return [[b, p, [0, 0, 0], [0.12, 0.012, 0.025]], [b, p, [0, 0, 0], [0.025, 0.012, 0.12]]]
    })
  })
}

export function DiscWheel({ R, W, color = '#e53935', holes = 8, tire = true }) {
  const T = Math.min(0.5, W * 0.4) // espessura do disco
  const t = tire ? Math.min(0.45, R * 0.12) : 0 // espessura do pneu
  const Rr = R - t // raio do aro (plástico)
  const m = mat(color, 0, 0.5)
  return (
    <group>
      {/* aro (banda à volta) e disco furado no meio da largura */}
      <mesh geometry={rimGeo(Rr, W)} material={mat(color, 0, 0.5, { side: THREE.DoubleSide })} castShadow receiveShadow />
      <mesh geometry={discGeo(Rr - 0.05, T, holes)} material={m} position={[0, (W - T) / 2, 0]} castShadow receiveShadow />
      {tire && (
        <group>
          <mesh geometry={tireGeo(R, W, t)} material={mat('#1b1b1b', 0, 0.92, { side: THREE.DoubleSide })} castShadow receiveShadow />
          {/* tacos do piso (uma só malha) */}
          <mesh geometry={treadGeo(R, W)} material={mat('#121212', 0, 0.95)} castShadow />
        </group>
      )}
      {/* cubo branco com os 3 parafusos de cabeça Phillips (cabeça boleada) */}
      <mesh position={[0, W / 2, 0]} geometry={geo(`discHub${W}`, () => {
        const h = W + 0.2
        const p = [[0.2, -h / 2], [0.72, -h / 2], [0.75, -h / 2 + 0.03], [0.75, h / 2 - 0.03], [0.72, h / 2], [0.2, h / 2], [0.2, -h / 2]].map(([a, b]) => new THREE.Vector2(a, b))
        return new THREE.LatheGeometry(p, 32)
      })} material={mat('#f5f5f5', 0, 0.45)} castShadow />
      <mesh geometry={screwGeo(W)} material={mat('#b4b9bd', 0.85, 0.3)} />
      <mesh geometry={crossGeo(W)} material={mat('#3a3d40', 0.5, 0.5)} />
    </group>
  )
}
