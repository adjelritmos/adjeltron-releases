// Solenoide JF-0530B (estrutura de aço zincado, bobina com fita amarela, êmbolo com mola e
// freio em E que recolhe com live.x) e motor de vibração de moeda 1027 (treme com live.rpm).
import { Leg, THREE, geo, mat, mergedGeo, useFrame, useRef, liveOf } from '../kit.jsx'
import solDef from '@shared/parts/solenoid.js'
import vibDef from '@shared/parts/vibrationMotor.js'

const unitBox = () => geo('gull', () => new THREE.BoxGeometry(1, 1, 1))
const Y = 0.65 // eixo da bobina/êmbolo
const STROKE = 0.5 // curso do êmbolo (cm) com live.x = 1 (até a mola ficar em espiras juntas)
const XF = 1.0 // face da frente da estrutura

// estrutura em "D" de chapa de aço zincada (base, topo e as duas placas das pontas) com os
// furos roscados M3 de fixação e o furo do êmbolo
const frameGeo = () =>
  mergedGeo('solFrame', () => [
    [unitBox(), [0, 0.04, 0], [0, 0, 0], [2.0, 0.08, 1.25]],
    [unitBox(), [0, 1.21, 0], [0, 0, 0], [2.0, 0.08, 1.25]],
    [unitBox(), [-0.96, 0.625, 0], [0, 0, 0], [0.08, 1.25, 1.25]],
    [unitBox(), [0.96, 0.625, 0], [0, 0, 0], [0.08, 1.25, 1.25]],
  ])
const holesGeo = () =>
  mergedGeo('solHoles', () => {
    const d = geo('solHole', () => new THREE.CircleGeometry(0.12, 14))
    const out = []
    // furos no topo e na base (vistos de cima) e furo do êmbolo na placa da frente
    for (const x of [-0.6, 0.6]) out.push([d, [x, 1.252, 0], [-Math.PI / 2, 0, 0]])
    out.push([geo('solBore', () => new THREE.RingGeometry(0.205, 0.27, 20)), [XF + 0.002, Y, 0], [0, Math.PI / 2, 0]])
    return out
  })
// bobina: carretel de plástico preto com o enrolamento coberto por fita amarela translúcida
const coilGeo = () =>
  geo('solCoil', () => {
    const p = [[0.22, -0.88], [0.56, -0.88], [0.56, -0.8], [0.5, -0.78], [0.5, 0.78], [0.56, 0.8], [0.56, 0.88], [0.22, 0.88]]
    const g = new THREE.LatheGeometry(p.map(([r, y]) => new THREE.Vector2(r, y)), 32)
    g.rotateZ(Math.PI / 2)
    g.computeVertexNormals()
    return g
  })
// mola helicoidal unitária ao longo de +x (comprimento 1), escalada com o curso
const springGeo = () =>
  geo('solSpring', () => {
    const pts = []
    for (let i = 0; i <= 120; i++) {
      const t = i / 120
      const a = t * 7 * Math.PI * 2
      pts.push(new THREE.Vector3(t, 0.29 * Math.sin(a), 0.29 * Math.cos(a)))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.022, 6, false)
  })
// êmbolo de aço: haste, ranhura do freio, anilha + freio em E na ponta e furo transversal
const plungerGeo = () =>
  mergedGeo('solPlunger', () => {
    const c = (r, h, seg = 20) => geo(`solC${r},${h},${seg}`, () => new THREE.CylinderGeometry(r, r, h, seg))
    const z = [0, 0, Math.PI / 2]
    return [
      [c(0.2, 1.9), [-0.45, 0, 0], z],
      [c(0.2, 0.18), [0.62, 0, 0], z],
      [c(0.16, 0.08), [0.49, 0, 0], z],
    ]
  })

function SolenoidModel({ part }) {
  const plunger = useRef()
  const spring = useRef()
  useFrame(() => {
    const x = liveOf(part.id)?.x || 0
    const px = 1.25 - x * STROKE
    if (plunger.current) plunger.current.position.x = px
    // a mola vai da placa da frente à anilha do êmbolo e encolhe com ele
    if (spring.current) spring.current.scale.x = Math.max(0.12, px + 0.44 - 0.03 - XF)
  })
  return (
    <group>
      <mesh geometry={frameGeo()} material={mat('#c3c8cd', 1, 0.36)} castShadow receiveShadow />
      <mesh geometry={holesGeo()} material={mat('#121212', 0, 0.8)} />
      <group position={[0, Y, 0]}>
        <mesh geometry={coilGeo()} material={mat('#121212', 0, 0.5)} castShadow />
        <mesh rotation={[0, 0, Math.PI / 2]} geometry={geo('solTape', () => new THREE.CylinderGeometry(0.505, 0.505, 1.56, 32, 1, true))} material={mat('#d8a43a', 0.35, 0.28)} castShadow />
        <mesh rotation={[0, 0, Math.PI / 2]} geometry={geo('solTapeSeam', () => new THREE.CylinderGeometry(0.508, 0.508, 1.56, 32, 1, true, 2.4, 0.05))} material={mat('#b7832a', 0.35, 0.3)} />
      </group>
      {/* êmbolo (sai pela frente, +x) com mola */}
      <group ref={plunger} position={[1.25, Y, 0]}>
        <mesh geometry={plungerGeo()} material={mat('#d8dadd', 1, 0.24)} castShadow />
        <mesh position={[0.43, 0, 0]} rotation={[0, 0, Math.PI / 2]} geometry={geo('solWasher', () => new THREE.CylinderGeometry(0.34, 0.34, 0.03, 24))} material={mat('#9ea3a8', 1, 0.35)} />
        <mesh position={[0.66, 0, 0]} geometry={geo('solPinHole', () => new THREE.CylinderGeometry(0.05, 0.05, 0.42, 10))} material={mat('#1a1a1a', 0, 0.8)} />
      </group>
      <mesh ref={spring} position={[XF + 0.01, Y, 0]} scale={[0.66, 1, 1]} geometry={springGeo()} material={mat('#9aa0a6', 1, 0.3)} castShadow />
      {/* fios */}
      {solDef.pins.map((p, i) => (
        <Leg key={p.id} from={[-0.95, 0.3, (i - 0.5) * 0.3]} to={p.pos} r={0.04} color={i ? '#1a1a1a' : '#e53935'} />
      ))}
    </group>
  )
}

// motor de vibração 1027 (Ø 10 × 2,7 mm): lata de aço inox com a aresta de cima boleada,
// almofada adesiva por baixo e a fita flexível de onde saem os fios vermelho e azul
const canGeo = () =>
  geo('vibCan', () => {
    const p = [[0.001, 0.03], [0.48, 0.03], [0.5, 0.05], [0.5, 0.24], [0.485, 0.27], [0.45, 0.28], [0.001, 0.28]]
    const g = new THREE.LatheGeometry(p.map(([r, y]) => new THREE.Vector2(r, y)), 36)
    g.computeVertexNormals()
    return g
  })
function VibModel({ part }) {
  const body = useRef()
  useFrame(({ clock }) => {
    const rpm = liveOf(part.id)?.rpm || 0
    const a = Math.min(1, rpm / 12000) * 0.025
    if (body.current) body.current.position.set(Math.sin(clock.elapsedTime * 377) * a, 0, Math.cos(clock.elapsedTime * 311) * a)
  })
  return (
    <group>
      <group ref={body}>
        <mesh position={[0, 0.015, 0]} geometry={geo('vibFoam', () => new THREE.CylinderGeometry(0.49, 0.49, 0.03, 32))} material={mat('#e9e6df', 0, 0.9)} />
        <mesh geometry={canGeo()} material={mat('#c9ccd0', 1, 0.3)} castShadow />
        {/* anel estampado na tampa */}
        <mesh position={[0, 0.2805, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('vibRing', () => new THREE.RingGeometry(0.3, 0.32, 32))} material={mat('#a9adb2', 1, 0.4)} />
        <mesh position={[-0.55, 0.03, 0]} geometry={unitBox()} scale={[0.25, 0.02, 0.22]} material={mat('#c8822a', 0.2, 0.4)} />
      </group>
      {vibDef.pins.map((p, i) => (
        <Leg key={p.id} from={[-0.62, 0.05, (i - 0.5) * 0.12]} to={p.pos} r={0.025} color={i ? '#1e63d6' : '#e53935'} />
      ))}
    </group>
  )
}

const badge = (info, text, on) => {
  const [x, y] = info.project([0, 0, 0])
  return (
    <text x={x} y={y - 18} textAnchor="middle" fontSize={10} fontWeight="700" fill={on ? '#22c55e' : '#9ca3af'} stroke="#000" strokeWidth={2.5} paintOrder="stroke" pointerEvents="none">
      {text}
    </text>
  )
}

export default [
  { type: 'solenoid', Model: SolenoidModel, Overlay2D: ({ info, live }) => (live ? badge(info, live.pulled ? `recolhido ${(live.i * 1000).toFixed(0)} mA` : 'solto', live.pulled) : null) },
  { type: 'vibrationMotor', Model: VibModel, Overlay2D: ({ info, live }) => (live?.rpm > 100 ? badge(info, `${Math.round(live.rpm)} rpm`, true) : null) },
]
