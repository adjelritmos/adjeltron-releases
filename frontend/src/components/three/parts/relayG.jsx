// Relés do grupo G: KS2E-M-DC5 (caixa selada DIP) e placas de 2/4/8 relés SRD-05VDC.
import { Box, Cyl, Leg, Pcb, HeaderPins, GlowLed, useFrame, useRef, useLabel, liveOf } from '../kit.jsx'
import ks2eDef from '@shared/parts/ks2eRelay.js'
import boards, { RELAY_BOARD, relayX } from '@shared/parts/relayModule.js'

// ---------- KS2E-M-DC5 ----------
function KsModel({ part }) {
  const label = useLabel([{ text: 'KS2E-M-DC5', font: 'bold 62px Arial' }, { text: '2A 30VDC', font: '40px Arial', y: 190 }], 512, 256)
  const tick = useRef()
  useFrame(() => {
    if (tick.current) tick.current.position.x = liveOf(part.id)?.closed ? 0.55 : 0.75
  })
  return (
    <group>
      {ks2eDef.pins.map((p) => (
        <Leg key={p.id} from={p.pos} to={[p.pos[0], 0.12, p.pos[2] * 0.9]} r={0.025} />
      ))}
      <Box size={[2.0, 1.0, 1.0]} pos={[0, 0.62, 0]} color="#eae6da" rough={0.45} />
      <mesh position={[0, 1.125, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.8, 0.8]} />
        <meshBasicMaterial map={label} transparent color="#333" />
      </mesh>
      {/* "janela" com a armadura (indicador) */}
      <Box size={[0.5, 0.02, 0.2]} pos={[0.65, 1.13, 0.35]} color="#222" />
      <group ref={tick}>
        <Box size={[0.08, 0.025, 0.16]} pos={[0, 1.14, 0.35]} color="#d4af37" metal={0.8} />
      </group>
    </group>
  )
}
function KsOverlay({ info, live }) {
  if (!live) return null
  const [x, y] = info.project([0, 0, 0])
  return (
    <text x={x} y={y + 4} textAnchor="middle" fontSize={10} fontWeight="700" fill={live.closed ? '#16a34a' : '#555'} pointerEvents="none">
      {live.closed ? 'NO' : 'NC'}
    </text>
  )
}

// ---------- placas de relés ----------
function makeBoard(def) {
  const g = RELAY_BOARD[def.type]
  const zR = -g.d / 2 + 1.8 // centro dos relés (logo atrás dos bornes)
  const zLed = g.d / 2 - 0.95
  const header = def.pins.filter((p) => !/^(NO|COM|NC)\d/.test(p.id))
  function Model({ part }) {
    const label = useLabel([{ text: 'SRD-05VDC-SL-C', font: 'bold 54px Arial' }, { text: '10A 250VAC', font: '44px Arial', y: 180 }], 512, 256)
    const title = useLabel([{ text: `${g.n} Relay Module`, font: 'bold 60px Arial' }], 512, 96)
    return (
      <group>
        <Pcb size={[g.w, 0.16, g.d]} color="#1f5f9f" />
        {Array.from({ length: g.n }, (_, k) => {
          const x = relayX(g, k)
          return (
            <group key={k}>
              <Box size={[1.5, 1.55, 1.9]} pos={[x, 0.16 + 0.775, zR]} color="#1f6fd1" rough={0.4} />
              <mesh position={[x, 1.715, zR]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                <planeGeometry args={[1.7, 0.85]} />
                <meshBasicMaterial map={label} transparent />
              </mesh>
              {/* borne de 3 parafusos (NO, COM, NC) */}
              <Box size={[1.5, 0.9, 0.75]} pos={[x, 0.16 + 0.45, -g.d / 2 + 0.45]} color="#1a5fb4" />
              {[-0.5, 0, 0.5].map((dx) => (
                <Cyl key={dx} r={0.17} h={0.06} pos={[x + dx, 1.05, -g.d / 2 + 0.45]} color="#cfcfcf" metal={0.9} rough={0.3} />
              ))}
              {/* optoacoplador, transístor, LED do canal */}
              <Box size={[0.45, 0.3, 0.6]} pos={[x - 0.3, 0.31, zLed + 0.2]} color="#111" />
              <GlowLed pos={[x + 0.4, 0.21, zLed + 0.35]} color="#ff3030" read={() => (liveOf(part.id)?.coils?.[k] ? 1 : 0)} />
            </group>
          )
        })}
        <GlowLed pos={[-g.w / 2 + 0.45, 0.21, g.d / 2 - 0.9]} color="#ff3030" read={() => (liveOf(part.id)?.powered ? 1 : 0)} />
        {/* jumper JD-VCC */}
        <Box size={[0.5, 0.35, 0.25]} pos={[g.w / 2 - 0.55, 0.33, g.d / 2 - 0.35]} color="#ffd600" />
        <mesh position={[0, 0.165, g.d / 2 - 0.8]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[Math.min(3.2, g.w * 0.45), 0.3]} />
          <meshBasicMaterial map={title} transparent />
        </mesh>
        <HeaderPins pins={header} base={0} up={0.45} />
      </group>
    )
  }
  function Overlay2D({ info, live }) {
    if (!live) return null
    return (
      <g pointerEvents="none">
        {Array.from({ length: g.n }, (_, k) => {
          const x = relayX(g, k)
          const [lx, ly] = info.project([x + 0.4, 0, zLed + 0.35])
          const [tx, ty] = info.project([x, 0, zR])
          const c = live.closed?.[k]
          return (
            <g key={k}>
              {live.coils?.[k] && <circle cx={lx} cy={ly} r={5} fill="#ff3030" opacity={0.9} filter="url(#glow)" />}
              <rect x={tx - 15} y={ty - 8} width={30} height={16} rx={4} fill={c ? '#16a34a' : '#0f172a'} opacity={0.9} />
              <text x={tx} y={ty + 4} textAnchor="middle" fontSize={10} fontWeight="700" fill="#fff">
                {c ? 'NO' : 'NC'}
              </text>
            </g>
          )
        })}
        {live.powered && (() => {
          const [px, py] = info.project([-g.w / 2 + 0.45, 0, g.d / 2 - 0.9])
          return <circle cx={px} cy={py} r={5} fill="#ff3030" opacity={0.85} filter="url(#glow)" />
        })()}
      </g>
    )
  }
  return { type: def.type, Model, Overlay2D }
}

export default [{ type: 'ks2eRelay', Model: KsModel, Overlay2D: KsOverlay }, ...boards.map(makeBoard)]
