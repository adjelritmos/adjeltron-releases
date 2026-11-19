// Transístores do grupo F: BC547/BC557/2N3906 em TO-92 e 2N3055 em TO-3 (caixa metálica),
// com as dimensões e a marcação dos componentes reais.
import BJT_DEFS from '@shared/parts/bjtF.js'
import { THREE, geo, mat, mergedGeo, METAL } from '../kit.jsx'
import { Mark, Wires } from './_dip.jsx'
import { To92F } from './_groupF.jsx'
import { Badge, Boom, fmt } from './group-c-ui.jsx'


// TO-3 (JEDEC TO-204AA): flange de aço niquelado em losango de pontas redondas (39 × 26 mm,
// 1,5 mm) com os furos de 4,1 mm a 30,2 mm, cúpula de 22 mm × 8 mm com aba de cravação na base,
// 2 pernas de 1 mm (B, E) isoladas por pérolas de vidro e a patilha de solda do coletor (a caixa)
const unitBox = () => geo('gull', () => new THREE.BoxGeometry(1, 1, 1))
const Y3 = 0.3 // base da flange
// invólucro convexo de 3 círculos (centro e pontas) — contorno da flange
function hull(pts) {
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lo = []
  const up = []
  for (const p of pts) {
    while (lo.length >= 2 && cr(lo.at(-2), lo.at(-1), p) <= 0) lo.pop()
    lo.push(p)
  }
  for (const p of [...pts].reverse()) {
    while (up.length >= 2 && cr(up.at(-2), up.at(-1), p) <= 0) up.pop()
    up.push(p)
  }
  return lo.slice(0, -1).concat(up.slice(0, -1))
}
const flangeGeo = () =>
  geo('to3Flange', () => {
    const pts = []
    const circ = (cx, r, n) => {
      for (let i = 0; i < n; i++) pts.push([cx + r * Math.cos((i / n) * Math.PI * 2), r * Math.sin((i / n) * Math.PI * 2)])
    }
    circ(0, 1.26, 64)
    circ(-1.51, 0.43, 24)
    circ(1.51, 0.43, 24)
    const h = hull(pts)
    const s = new THREE.Shape()
    h.forEach(([x, z], i) => (i ? s.lineTo(x, z) : s.moveTo(x, z)))
    s.closePath()
    for (const sx of [-1.51, 1.51]) {
      const ho = new THREE.Path()
      ho.absarc(sx, 0, 0.205, 0, Math.PI * 2, true)
      s.holes.push(ho)
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.13, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1, curveSegments: 16 })
    g.rotateX(-Math.PI / 2)
    g.translate(0, Y3 + 0.01, 0)
    g.computeVertexNormals()
    return g
  })
const domeGeo = () =>
  geo('to3Dome', () => {
    const p = [[0, 0.15], [1.13, 0.15], [1.13, 0.2], [1.1, 0.22], [1.04, 0.24], [1.02, 0.3], [1.0, 0.74], [0.98, 0.8], [0.93, 0.835], [0.85, 0.845], [0, 0.85]]
    const g = new THREE.LatheGeometry(p.map(([r, y]) => new THREE.Vector2(r, Y3 + y)), 48)
    g.computeVertexNormals()
    return g
  })
const sinkGeo = () =>
  mergedGeo('to3Sink', () => [
    [unitBox(), [0, Y3 - 0.03, 0], [0, 0, 0], [4.6, 0.06, 3.2]],
    ...[-2.1, -1.4, -0.7, 0.7, 1.4, 2.1].map((x) => [unitBox(), [x, (Y3 - 0.06) / 2, 0], [0, 0, 0], [0.08, Y3 - 0.06, 3.2]]),
  ])

function To3({ def, heatsink }) {
  const pins = Object.fromEntries(def.pins.map((p) => [p.id, p.pos]))
  const lug = pins.C
  return (
    <group>
      <Wires id="to3Pins" r={0.05} lines={[[pins.B, [pins.B[0], Y3 + 0.02, pins.B[2]]], [pins.E, [pins.E[0], Y3 + 0.02, pins.E[2]]], [lug, [lug[0], Y3 - 0.05, lug[2]]]]} />
      {/* pérolas de vidro à volta das pernas (por baixo da flange) */}
      <mesh geometry={mergedGeo('to3Glass', () => [pins.B, pins.E].map((p) => [geo('to3Bead', () => new THREE.CylinderGeometry(0.12, 0.1, 0.05, 14)), [p[0], Y3 - 0.02, p[2]]]))} material={mat('#3d5246', 0.1, 0.15)} />
      {/* patilha de solda do coletor (presa à caixa) */}
      <mesh position={[lug[0], Y3 - 0.035, lug[2] - 0.2]} geometry={unitBox()} scale={[0.3, 0.03, 0.55]} material={mat(METAL.brass, 1, 0.35)} />
      <mesh geometry={flangeGeo()} material={mat('#c7cbd1', 1, 0.32)} castShadow receiveShadow />
      <mesh geometry={domeGeo()} material={mat('#d6d9de', 1, 0.26)} castShadow />
      <Mark lines={[{ text: def.bjt.mark, font: 'bold 66px Arial', y: 70 }, { text: 'NPN  8347', font: 'bold 38px Arial', y: 140 }]} px={[256, 192]} pos={[0, Y3 + 0.852, 0]} rot={[-Math.PI / 2, 0, 0]} w={1.2} h={0.9} color="#1d1d1d" />
      {heatsink && (
        <group>
          <mesh geometry={sinkGeo()} material={mat('#24262a', 0.6, 0.45)} castShadow receiveShadow />
          {/* parafusos M4 de fixação nos furos da flange */}
          {[-1.51, 1.51].map((x) => (
            <mesh key={x} position={[x, Y3 + 0.15, 0]} geometry={geo('to3Screw', () => new THREE.CylinderGeometry(0.3, 0.3, 0.12, 16))} material={mat(METAL.nickel, 1, 0.3)} castShadow />
          ))}
        </group>
      )}
    </group>
  )
}

function make(def) {
  const pnp = def.bjt.pol === 'pnp'
  function Model({ part }) {
    if (def.bjt.pkg === 'TO-3') return <To3 def={def} heatsink={!!part.config?.heatsink} />
    // marcação real em 2 linhas: referência com o grupo de ganho e o código de data
    return <To92F line1={def.bjt.mark.startsWith('BC') ? `${def.bjt.mark}B` : def.bjt.mark} line2={pnp ? 'P 331' : 'C 331'} />
  }
  function Overlay2D({ info, live }) {
    if (!live) return null
    if (live.burned) return <Boom info={info} />
    if (!live.ic || live.ic < 0.0005) return null
    const hot = (live.tj ?? 25) > 100
    return <Badge info={info} text={`${live.ic >= 1 ? `${fmt(live.ic, 2)} A` : `${fmt(live.ic * 1000, 0)} mA`}${hot ? ` · ${live.tj} °C` : ''}`} color={hot ? '#dc2626' : live.mode === 'ativo' ? '#f59e0b' : '#f5f5f5'} />
  }
  return { type: def.type, Model, Overlay2D }
}

export default BJT_DEFS.map(make)
