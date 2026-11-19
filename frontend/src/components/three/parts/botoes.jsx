// Botões e interruptores de painel: botão tátil 12 mm com capa, interruptores basculantes
// (retangular, redondo e iluminado), interruptor de alavanca e módulo de botão.
import { Box, RBox, Cyl, Leg, Pcb, HeaderPins, Halo, inputOf, liveOf, useFrame, useRef, D2R, geo, mat, mergedGeo, METAL, THREE } from '../kit.jsx'
import { MountHoles, SolderPads, SmdParts } from './_gDisplays.jsx'
import defs from '@shared/parts/botoes.js'
import { Silk } from './_groupG.jsx'

const DEF = Object.fromEntries(defs.map((d) => [d.type, d]))
const isOn = (part) => !!(inputOf(part.id).on ?? part.config?.on)

// ---------- botão tátil 12 × 12 mm com capa redonda ----------
// corpo preto, tampa de chapa niquelada com as covas estampadas e as patilhas dobradas pelos
// lados, 4 pinos de plástico nos cantos, veio quadrado e a capa (Ø 11,5 mm) encaixada nele
const unit = () => geo('gull', () => new THREE.BoxGeometry(1, 1, 1))
const tactMetal = (y0) =>
  mergedGeo(`tact12M${y0}`, () => [
    [unit(), [0, y0 + 0.375, 0], [0, 0, 0], [1.22, 0.03, 1.22]],
    // patilhas dobradas sobre os lados ±x
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => [unit(), [sx * 0.615, y0 + 0.27, sz * 0.32], [0, 0, 0], [0.012, 0.22, 0.22]])),
    // covas estampadas na tampa
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => [geo('tactDimple', () => new THREE.SphereGeometry(0.06, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2)), [sx * 0.3, y0 + 0.39, sz * 0.3], [0, 0, 0], [1, 0.35, 1]]),
  ])
function TactCap({ id, color, y0 = 0.2 }) {
  const cap = useRef()
  const up = y0 + 0.62
  useFrame(() => {
    if (cap.current) cap.current.position.y = inputOf(id).pressed ? up - 0.05 : up
  })
  return (
    <group>
      <Box size={[1.2, 0.36, 1.2]} pos={[0, y0 + 0.18, 0]} color="#1b1b1b" rough={0.6} />
      <mesh geometry={tactMetal(y0)} material={mat(METAL.nickel, 1, 0.3)} castShadow />
      <mesh geometry={mergedGeo(`tact12P${y0}`, () => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => [geo('tactPost', () => new THREE.CylinderGeometry(0.06, 0.075, 0.05, 10)), [sx * 0.48, y0 + 0.41, sz * 0.48]]))} material={mat('#111', 0, 0.5)} />
      <Box size={[0.36, 0.2, 0.36]} pos={[0, y0 + 0.48, 0]} color="#2a2a2a" />
      <group ref={cap} position={[0, up, 0]}>
        {/* capa: saia cilíndrica e topo ligeiramente abaulado */}
        <Cyl r={0.575} h={0.34} pos={[0, 0, 0]} color={color} rough={0.4} seg={40} />
        <Cyl r={0.56} r2={0.575} h={0.06} pos={[0, 0.2, 0]} color={color} rough={0.35} seg={40} />
        <Cyl r={0.5} r2={0.56} h={0.03} pos={[0, 0.245, 0]} color={color} rough={0.3} seg={40} />
      </group>
    </group>
  )
}

// pernas de chapa do botão de 12 mm: saem do corpo, dobram e descem até ao pino
const tactLegs = (pins, y0) =>
  mergedGeo(`tact12L${y0}|${pins.map((p) => p.pos.join(',')).join(';')}`, () =>
    pins.flatMap((p) => {
      const s = Math.sign(p.pos[0])
      const xb = s * 0.6
      return [
        [unit(), [(xb + p.pos[0]) / 2, y0 + 0.05, p.pos[2]], [0, 0, 0], [Math.abs(p.pos[0] - xb) + 0.03, 0.03, 0.08]],
        [unit(), [p.pos[0], (y0 + 0.05) / 2, p.pos[2]], [0, 0, 0], [0.03, y0 + 0.05, 0.08]],
      ]
    }),
  )
function Button12({ part }) {
  const d = DEF.button12mm
  return (
    <group>
      <mesh geometry={tactLegs(d.pins, 0.2)} material={mat(METAL.tin, 1, 0.3)} castShadow />
      <TactCap id={part.id} color={part.config?.color || '#fdd835'} />
    </group>
  )
}

function PressOverlay({ info, live }) {
  if (!live?.pressed) return null
  const [x, y] = info.project([0, 0, 0])
  return <circle cx={x} cy={y} r={12} fill="none" stroke="#ffb300" strokeWidth={2.5} pointerEvents="none" />
}

// ---------- módulo de botão ----------
// placa preta com o botão de 12 mm, a resistência de 10 kΩ (103), dois furos M3 e a serigrafia
function ButtonModule({ part }) {
  const d = DEF.buttonModule
  const T = 0.16
  return (
    <group>
      <Pcb size={[2.4, T, 2.0]} pos={[0, 0, 0]} color="#1c1c1c" holes={false} />
      <MountHoles pts={[[0.95, -0.75], [0.95, 0.75]]} y={T} r={0.15} ring={0.22} />
      <group position={[0.2, T, 0]}>
        <TactCap id={part.id} color={part.config?.color || '#1e88e5'} y0={0} />
      </group>
      <SolderPads pts={[[-0.435, -0.254], [-0.435, 0.254], [0.835, -0.254], [0.835, 0.254]]} y={T} r={0.07} />
      <SmdParts list={[[-0.62, 0.7, 0, 'R']]} y={T} />
      <Silk text="OUT VCC GND" pos={[-0.72, T + 0.01, 0]} w={1.5} h={0.14} rot={Math.PI / 2} />
      <Silk text={part.config?.activeLow ? 'BUTTON  (LOW)' : 'BUTTON'} pos={[0.2, T + 0.01, 0.88]} w={1.1} h={0.14} />
      <HeaderPins pins={d.pins} base={0} up={0.45} />
    </group>
  )
}

// ---------- interruptores basculantes ----------
// a tecla roda ±10° em torno de x (o "I" fica para baixo quando ligado)
const rockerKey = () =>
  geo('rockerKey', () => {
    // perfil em y-z (base plana, topo em sela) extrudido ao longo de x
    const s = new THREE.Shape()
    s.moveTo(-0.8, 0.02)
    s.lineTo(0.8, 0.02)
    s.lineTo(0.8, 0.23)
    s.quadraticCurveTo(0, 0.1, -0.8, 0.23)
    s.lineTo(-0.8, 0.02)
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 12 })
    // forma (z, y) → mundo: x da forma = z, y = y, extrusão ao longo de x
    g.rotateY(-Math.PI / 2)
    g.translate(0.53, 0, 0)
    return g
  })
function Rocker({ part, lighted = false }) {
  const rk = useRef()
  const lampMat = useRef()
  const shape = lighted ? 'rect' : part.config?.shape || 'rect'
  const color = part.config?.color || (lighted ? '#e53935' : '#212121')
  const dims = DEF[part.type]
  useFrame(() => {
    if (rk.current) rk.current.rotation.x = (isOn(part) ? 1 : -1) * 10 * D2R
    if (lampMat.current) lampMat.current.emissiveIntensity = (liveOf(part.id)?.lamp ?? 0) * 2.2
  })
  const H = 1.0 // altura do corpo (abaixo do aro)
  return (
    <group>
      {dims.pins.map((p) => (
        <group key={p.id}>
          <Leg from={p.pos} to={[p.pos[0], 0.25, p.pos[2]]} r={0.03} />
          {/* terminal plano (faston de 4,8 mm) com o furo de soldar */}
          <Box size={[0.05, 0.4, 0.22]} pos={[p.pos[0], 0.35, p.pos[2]]} color="#d8dbde" metal={0.9} rough={0.3} />
          <mesh position={[p.pos[0], 0.36, p.pos[2]]} rotation={[0, 0, Math.PI / 2]} geometry={geo('fastonHole', () => new THREE.CylinderGeometry(0.06, 0.06, 0.052, 12))} material={mat('#1a1a1a', 0, 0.8)} />
        </group>
      ))}
      {shape === 'round' ? (
        <group>
          <Cyl r={0.82} h={H} pos={[0, 0.25 + H / 2, 0]} color="#1a1a1a" seg={40} />
          <Cyl r={1.0} h={0.14} pos={[0, 0.25 + H + 0.07, 0]} color="#1a1a1a" seg={48} rough={0.45} />
        </group>
      ) : (
        <group>
          <RBox size={[1.3, H, 1.9]} r={0.06} pos={[0, 0.25 + H / 2, 0]} color="#1a1a1a" />
          <RBox size={[1.5, 0.14, 2.1]} r={0.05} pos={[0, 0.25 + H + 0.07, 0]} color="#1a1a1a" rough={0.45} />
        </group>
      )}
      <group ref={rk} position={[0, 0.25 + H + 0.1, 0]}>
        {lighted ? (
          <mesh position={[0, 0.13, 0]} castShadow>
            <boxGeometry args={[1.1, 0.22, 1.6]} />
            <meshStandardMaterial ref={lampMat} color={color} emissive={color} emissiveIntensity={0} roughness={0.25} transparent opacity={0.88} />
          </mesh>
        ) : shape === 'round' ? (
          <Box size={[1.05, 0.2, 1.05]} pos={[0, 0.12, 0]} color={color} rough={0.5} />
        ) : (
          // tecla com o topo côncavo (a metade do "I" e a do "O" sobem para os lados)
          <mesh geometry={rockerKey()} material={mat(color, 0, 0.5)} castShadow />
        )}
        {/* marcas "I" (frente) e "O" (trás) */}
        <Box size={[0.06, 0.01, 0.3]} pos={[0, 0.245, 0.45]} color="#f2f2f2" />
        <Cyl r={0.13} h={0.01} pos={[0, 0.245, -0.45]} color="#f2f2f2" seg={20} />
        <Cyl r={0.09} h={0.012} pos={[0, 0.247, -0.45]} color={lighted ? color : color} seg={20} />
      </group>
      {lighted && <Halo pos={[0, 0.25 + H + 0.45, 0]} size={2.2} color={color} read={() => liveOf(part.id)?.lamp ?? 0} />}
    </group>
  )
}

function RockerOverlay({ info, live }) {
  const [x, y] = info.project([0, 0, 0])
  return (
    <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={live?.on ? '#69f0ae' : '#bdbdbd'} pointerEvents="none">
      {live?.on ? 'I' : 'O'}
    </text>
  )
}

// ---------- interruptor de alavanca (MTS-102) ----------
// corpo, armação de chapa, casquilho roscado M6 (filetes), anilha dentada, porca sextavada,
// alavanca cromada em "bastão" e os 3 terminais de soldar com furo
const thread = () => mergedGeo('mtsThread', () => Array.from({ length: 9 }, (_, i) => [geo('mtsRing', () => new THREE.TorusGeometry(0.3, 0.018, 6, 24).rotateX(Math.PI / 2)), [0, 1.36 + i * 0.06, 0]]))
const lugs = (pins) =>
  mergedGeo(`mtsLugs${pins.map((p) => p.pos[0]).join(',')}`, () => pins.map((p) => [geo('gull', () => new THREE.BoxGeometry(1, 1, 1)), [p.pos[0], 0.225, 0], [0, 0, 0], [0.06, 0.45, 0.2]]))
function Toggle({ part }) {
  const lv = useRef()
  const d = DEF.toggleSwitch
  useFrame(() => {
    if (lv.current) lv.current.rotation.z = (isOn(part) ? -1 : 1) * 18 * D2R
  })
  return (
    <group>
      <mesh geometry={lugs(d.pins)} material={mat('#d8dbde', 0.9, 0.3)} castShadow />
      {d.pins.map((p) => (
        <mesh key={p.id} position={[p.pos[0], 0.3, 0]} rotation={[0, 0, Math.PI / 2]} geometry={geo('mtsLugHole', () => new THREE.CylinderGeometry(0.045, 0.045, 0.062, 10))} material={mat('#141414', 0, 0.8)} />
      ))}
      <Box size={[1.3, 0.85, 0.8]} pos={[0, 0.45 + 0.425, 0]} color="#e9e9e9" rough={0.5} />
      <Box size={[1.32, 0.04, 0.82]} pos={[0, 1.3, 0]} color="#c9ccd0" metal={0.85} rough={0.3} />
      {/* casquilho roscado M6 com os filetes, anilha dentada e porca */}
      <Cyl r={0.29} h={0.6} pos={[0, 1.6, 0]} color="#d3d7db" metal={0.9} rough={0.35} seg={24} />
      <mesh geometry={thread()} material={mat('#c6cace', 1, 0.3)} />
      <Cyl r={0.44} h={0.03} pos={[0, 1.335, 0]} color="#b9bdc1" metal={0.9} rough={0.35} seg={12} />
      <Cyl r={0.48} h={0.14} pos={[0, 1.42, 0]} color="#c4c8cc" metal={0.9} rough={0.3} seg={6} />
      <group ref={lv} position={[0, 1.85, 0]}>
        {/* alavanca em bastão: fina na base, mais grossa e boleada na ponta */}
        <Cyl r={0.06} r2={0.1} h={0.9} pos={[0, 0.45, 0]} color="#e0e3e6" metal={0.95} rough={0.2} seg={16} />
        <mesh position={[0, 0.9, 0]} geometry={geo('mtsTip', () => new THREE.SphereGeometry(0.1, 16, 8))} material={mat('#e0e3e6', 0.95, 0.2)} />
      </group>
    </group>
  )
}

function ToggleOverlay({ info, live }) {
  const [x, y] = info.project([0, 0, 0])
  return (
    <text x={x} y={y - 10} textAnchor="middle" fontSize={9} fill="#ffcc80" pointerEvents="none">
      {live?.on ? 'C–2' : 'C–1'}
    </text>
  )
}

export default [
  { type: 'button12mm', Model: Button12, Overlay2D: PressOverlay },
  { type: 'buttonModule', Model: ButtonModule, Overlay2D: PressOverlay },
  { type: 'rockerSwitch', Model: (p) => <Rocker {...p} />, Overlay2D: RockerOverlay },
  { type: 'rockerLighted', Model: (p) => <Rocker {...p} lighted />, Overlay2D: RockerOverlay },
  { type: 'toggleSwitch', Model: Toggle, Overlay2D: ToggleOverlay },
]
