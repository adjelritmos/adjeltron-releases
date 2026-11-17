// Botões e interruptores de painel: botão tátil 12 mm com capa, interruptores basculantes
// (retangular, redondo e iluminado), interruptor de alavanca e módulo de botão.
import { Box, RBox, Cyl, Leg, Pcb, HeaderPins, Halo, inputOf, liveOf, useFrame, useRef, D2R } from '../kit.jsx'
import defs from '@shared/parts/botoes.js'
import { Smd, Silk } from './_groupG.jsx'

const DEF = Object.fromEntries(defs.map((d) => [d.type, d]))
const isOn = (part) => !!(inputOf(part.id).on ?? part.config?.on)

// ---------- botão tátil 12 × 12 mm com capa redonda ----------
// corpo preto, tampa metálica com 4 patilhas e a capa (Ø 11,5 mm) encaixada no veio quadrado
function TactCap({ id, color, y0 = 0.2 }) {
  const cap = useRef()
  const up = y0 + 0.62
  useFrame(() => {
    if (cap.current) cap.current.position.y = inputOf(id).pressed ? up - 0.05 : up
  })
  return (
    <group>
      <Box size={[1.2, 0.36, 1.2]} pos={[0, y0 + 0.18, 0]} color="#1b1b1b" rough={0.6} />
      <Box size={[1.22, 0.03, 1.22]} pos={[0, y0 + 0.375, 0]} color="#c9ccd0" metal={0.85} rough={0.3} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <Cyl key={i} r={0.07} h={0.04} pos={[sx * 0.45, y0 + 0.4, sz * 0.45]} color="#111" seg={10} />
      ))}
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

function Button12({ part }) {
  const d = DEF.button12mm
  return (
    <group>
      {d.pins.map((p) => (
        <Leg key={p.id} from={p.pos} to={[Math.sign(p.pos[0]) * 0.56, 0.2, p.pos[2]]} r={0.03} />
      ))}
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
function ButtonModule({ part }) {
  const d = DEF.buttonModule
  const T = 0.16
  return (
    <group>
      <Pcb size={[2.4, T, 2.0]} pos={[0, 0, 0]} color="#1c1c1c" holes={false} />
      {/* furos de fixação M3 */}
      {[[0.95, -0.75], [0.95, 0.75]].map(([x, z], i) => (
        <group key={i}>
          <Cyl r={0.2} h={0.012} pos={[x, T + 0.001, z]} color="#d9c27a" metal={0.6} rough={0.35} seg={24} />
          <Cyl r={0.15} h={0.02} pos={[x, T + 0.003, z]} color="#0b0b0b" seg={24} />
        </group>
      ))}
      <group position={[0.2, T, 0]}>
        <TactCap id={part.id} color={part.config?.color || '#1e88e5'} y0={0} />
      </group>
      <Smd pos={[-0.62, T, 0.7]} />
      <Silk text="OUT VCC GND" pos={[-0.72, T + 0.01, 0]} w={1.5} h={0.14} rot={Math.PI / 2} />
      <Silk text={part.config?.activeLow ? 'BUTTON  (LOW)' : 'BUTTON'} pos={[0.2, T + 0.01, 0.88]} w={1.1} h={0.14} />
      <HeaderPins pins={d.pins} base={0} up={0.45} />
    </group>
  )
}

// ---------- interruptores basculantes ----------
// a tecla roda ±10° em torno de x (o "I" fica para baixo quando ligado)
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
          {/* terminal plano (faston de 4,8 mm) */}
          <Box size={[0.05, 0.4, 0.22]} pos={[p.pos[0], 0.35, p.pos[2]]} color="#d8dbde" metal={0.9} rough={0.3} />
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
          <RBox size={[1.1, 0.22, 1.6]} r={0.05} pos={[0, 0.13, 0]} color={color} rough={0.5} />
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
function Toggle({ part }) {
  const lv = useRef()
  const d = DEF.toggleSwitch
  useFrame(() => {
    if (lv.current) lv.current.rotation.z = (isOn(part) ? -1 : 1) * 18 * D2R
  })
  return (
    <group>
      {d.pins.map((p) => (
        <Box key={p.id} size={[0.06, 0.45, 0.2]} pos={[p.pos[0], 0.22, 0]} color="#d8dbde" metal={0.9} rough={0.3} />
      ))}
      <Box size={[1.3, 0.85, 0.8]} pos={[0, 0.45 + 0.425, 0]} color="#e9e9e9" rough={0.5} />
      <Box size={[1.32, 0.04, 0.82]} pos={[0, 1.3, 0]} color="#c9ccd0" metal={0.85} rough={0.3} />
      {/* casquilho roscado M6 com porca e anilha */}
      <Cyl r={0.3} h={0.6} pos={[0, 1.6, 0]} color="#d3d7db" metal={0.9} rough={0.35} seg={24} />
      <Cyl r={0.48} h={0.14} pos={[0, 1.38, 0]} color="#c4c8cc" metal={0.9} rough={0.3} seg={6} />
      <group ref={lv} position={[0, 1.85, 0]}>
        <Cyl r={0.06} r2={0.1} h={1.0} pos={[0, 0.5, 0]} color="#e0e3e6" metal={0.95} rough={0.2} seg={16} />
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
