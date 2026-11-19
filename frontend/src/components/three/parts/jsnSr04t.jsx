// JSN-SR04T-2.0: placa de comando verde (41 × 28 mm, 4 furos Ø 3 mm) com o LM324, o
// microcontrolador SOIC-8, o transformador de ferrite T1, o cristal HC-49S, a ficha XH branca
// da sonda e a serigrafia real; a sonda selada preta (Ø 20 mm) fica de pé, ligada pelo cabo.
import { Chip, Crystal, ECap, RBox, HeaderPins, geo, mat, THREE } from '../kit.jsx'
import def from '@shared/parts/jsnSr04t.js'
import { ShapedPcb, Art, SmdField } from './mq2.jsx'

const T = 0.16
const HOLES = [
  [-1.75, -1.1, 0.16],
  [-1.75, 1.1, 0.16],
  [1.75, -1.1, 0.16],
  [1.75, 1.1, 0.16],
]
const SOCK = [1.62, -0.6] // ficha XH da sonda
const PROBE_X = 3.75

// transformador de ferrite (T1): carcaça preta com a bobina de fio esmaltado à vista
function Transformer({ pos }) {
  return (
    <group position={pos}>
      <RBox size={[0.8, 0.12, 0.8]} r={0.02} pos={[0, 0.06, 0]} color="#e9e4d4" rough={0.55} />
      <RBox size={[0.74, 0.56, 0.6]} r={0.04} pos={[0, 0.4, 0]} color="#1b1b1b" rough={0.5} />
      <mesh position={[0, 0.4, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={geo('jsn:coil', () => new THREE.CylinderGeometry(0.27, 0.27, 0.64, 20))} material={mat('#b4642c', 1, 0.35)} />
    </group>
  )
}

// sonda: corpo torneado com degrau, chanfro e face do transdutor ligeiramente rebaixada
const probeGeo = () =>
  geo('jsn:probe', () =>
    new THREE.LatheGeometry(
      [[0, 0], [0.92, 0], [1.0, 0.04], [1.0, 0.32], [0.92, 0.36], [0.92, 1.3], [0.88, 1.42], [0.82, 1.47], [0.74, 1.47], [0.72, 1.44], [0, 1.44]].map(([r, y]) => new THREE.Vector2(r, y)),
      48,
    ),
  )
const cableGeo = () =>
  geo('jsn:cable', () => {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(SOCK[0] + 0.3, 0.62, SOCK[1]), new THREE.Vector3(2.1, 0.58, -0.62), new THREE.Vector3(2.45, 0.4, -0.45), new THREE.Vector3(PROBE_X - 1.1, 0.2, -0.12), new THREE.Vector3(PROBE_X - 0.95, 0.2, 0)])
    return new THREE.TubeGeometry(c, 24, 0.12, 10, false)
  })

const draw = (p) => {
  for (const [x, z] of HOLES) p.ring(x, z, 0.16, 0.3)
  // pistas sob a máscara (cobre um pouco mais claro)
  const tr = { lw: 0.035, stroke: '#2f7a37' }
  p.line([[-1.85, -0.38], [-1.3, -0.38], [-1.1, -0.6], [-0.85, -0.6]], tr)
  p.line([[-1.85, -0.13], [-1.2, -0.13], [-1.0, 0.25], [-0.98, 0.3]], tr)
  p.line([[-1.85, 0.13], [-1.35, 0.13], [-1.2, -0.3], [-0.85, -0.3]], tr)
  p.line([[-0.1, 0.45], [0.3, 0.45], [0.6, 0.2], [0.8, 0.2]], tr)
  p.line([[-0.25, -0.45], [0.0, -0.2], [1.0, -0.2], [1.4, -0.45]], tr)
  // serigrafia
  for (const [i, n] of ['5V', 'Trig', 'Echo', 'GND'].entries()) p.text(n, -1.47, def.pins[i].pos[2], 0.11, { align: 'left' })
  p.text('JSN-SR04T-2.0', 0.15, 1.12, 0.16)
  p.rect(1.1, 0.55, 0.92, 0.92, { lw: 0.014 })
  p.text('T1', 1.1, -0.02, 0.1)
  p.text('Y1', 0.4, -1.08, 0.1)
  p.text('IC1', -0.55, 0.95, 0.09)
  p.text('IC2', -0.55, -0.95, 0.09)
  p.rect(SOCK[0], SOCK[1], 0.68, 0.84, { lw: 0.014 })
  p.text('J1', SOCK[0] - 0.45, SOCK[1], 0.1)
}

function Model() {
  return (
    <group>
      <ShapedPcb id="jsn" w={4.1} d={2.8} t={T} r={0.1} holes={HOLES} color="#1c6b28" />
      <Art id="jsn" w={4.1} d={2.8} pos={[0, T + 0.0015, 0]} draw={draw} />
      <Chip pos={[-0.55, T, 0.45]} size={[0.87, 0.15, 0.39]} n={7} label="LM324" />
      <Chip pos={[-0.55, T, -0.45]} size={[0.49, 0.15, 0.39]} n={4} />
      <Crystal pos={[0.4, T, -0.75]} l={1.1} h={0.35} d={0.45} />
      <Transformer pos={[1.1, T, 0.55]} />
      <ECap pos={[0.35, T, 0.62]} r={0.25} h={0.5} color="#151515" stripe="#9aa0a6" />
      <SmdField
        id="jsn"
        y={T}
        items={[
          [0.15, -0.2, 0],
          [-1.1, 0.5, Math.PI / 2],
          [-1.1, -0.5, Math.PI / 2],
          [0.15, 0.2, 0, 'c'],
          [-0.1, -0.05, 0],
          [0.6, -0.15, 0, 'c'],
          [0.95, -0.35, Math.PI / 2],
          [-1.0, 0.95, 0, 'C'],
          [1.1, -1.1, 0, 'c'],
          [-0.05, 0.95, 0],
        ]}
      />
      {/* ficha XH de 2 vias (base + ficha fêmea do cabo) */}
      <RBox size={[0.58, 0.32, 0.74]} r={0.02} pos={[SOCK[0], T + 0.16, SOCK[1]]} color="#f1efe6" rough={0.55} />
      <RBox size={[0.5, 0.4, 0.66]} r={0.03} pos={[SOCK[0] + 0.02, T + 0.52, SOCK[1]]} color="#ece8dc" rough={0.55} />
      <mesh geometry={cableGeo()} material={mat('#121212', 0, 0.55)} castShadow />
      {/* sonda (transdutor selado), face para cima */}
      <group position={[PROBE_X, 0, 0]}>
        <mesh geometry={probeGeo()} material={mat('#161616', 0, 0.5)} castShadow receiveShadow />
        <mesh position={[0, 1.442, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('jsn:face', () => new THREE.RingGeometry(0.35, 0.7, 40))} material={mat('#232323', 0, 0.75)} />
        {/* bucim do cabo */}
        <mesh position={[-0.98, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} geometry={geo('jsn:gland', () => new THREE.CylinderGeometry(0.17, 0.2, 0.18, 14))} material={mat('#0f0f0f', 0, 0.6)} />
        <mesh position={[0, 0.34, 0]} geometry={geo('jsn:seam', () => new THREE.TorusGeometry(0.97, 0.012, 4, 48).rotateX(Math.PI / 2))} material={mat('#2a2a2a', 0, 0.6)} />
      </group>
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

export default { type: 'jsnSr04t', Model }
