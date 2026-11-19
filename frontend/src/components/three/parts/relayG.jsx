// Relés do grupo G: KS2E-M-DC5 (caixa selada DIP) e placas de 2/4/8 relés SRD-05VDC.
import { Box, Leg, Pcb, HeaderPins, GlowLed, SilkText, useFrame, useRef, liveOf, geo, mat, mergedGeo, THREE } from '../kit.jsx'
import { MountHoles, SmdParts, ScrewBlock, SongleRelay, To92, Diode, Dip, Jumper, Batched, roundedBox } from './_gDisplays.jsx'
import ks2eDef from '@shared/parts/ks2eRelay.js'
import boards, { RELAY_BOARD, relayX } from '@shared/parts/relayModule.js'

// ---------- KS2E-M-DC5 ----------
// caixa selada de 20 × 10 × 10 mm em plástico creme, arestas boleadas, marcação gravada e
// pequenos pés por baixo; as 8 pernas (2 filas a 7,62 mm) entram pela base
function KsModel({ part }) {
  const tick = useRef()
  useFrame(() => {
    if (tick.current) tick.current.position.x = liveOf(part.id)?.closed ? 0.55 : 0.75
  })
  return (
    <group>
      {ks2eDef.pins.map((p) => (
        <Leg key={p.id} from={p.pos} to={[p.pos[0], 0.14, p.pos[2] * 0.9]} r={0.025} />
      ))}
      {/* pés de afastamento */}
      <mesh geometry={mergedGeo('ks2eFeet', () => [-0.85, 0.85].map((x) => [geo('gull', () => new THREE.BoxGeometry(1, 1, 1)), [x, 0.1, 0], [0, 0, 0], [0.18, 0.04, 0.8]]))} material={mat('#d8d3c5', 0, 0.5)} />
      <mesh position={[0, 0.12, 0]} geometry={geo('ks2eBody', () => roundedBox(2.0, 1.0, 1.0, 0.06).translate(0, 0.5, 0))} material={mat('#ebe7dc', 0, 0.42)} castShadow receiveShadow />
      <SilkText
        lines={[
          { text: 'KS2E-M-DC5', font: 'bold 60px Arial', y: 70 },
          { text: '2A 30VDC  0.5A 125VAC', font: '34px Arial', y: 140 },
          { text: 'c(UL)us  ⚠  E-232', font: '30px Arial', y: 196 },
        ]}
        px={[512, 240]}
        pos={[-0.12, 1.122, 0]}
        w={1.55}
        d={0.72}
        color="#3a3a3a"
      />
      {/* marca do pino 1 */}
      <mesh position={[-0.88, 1.122, 0.38]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('ksDot', () => new THREE.CircleGeometry(0.04, 12))} material={mat('#3a3a3a', 0, 0.8)} />
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
  const T = 0.16
  const zR = -g.d / 2 + 1.8 // centro dos relés (logo atrás dos bornes)
  const zLed = g.d / 2 - 0.95
  const header = def.pins.filter((p) => !/^(NO|COM|NC)\d/.test(p.id))
  // faixa livre entre os relés e os optoacopladores (nas placas de 4 e 8 relés cabem o
  // transístor e o díodo de roda livre de cada canal; na de 2 ficam por baixo dos relés)
  const zBand = -g.d / 2 + 2.75
  const room = zLed - 0.12 - zBand > 1.0
  const xs = Array.from({ length: g.n }, (_, k) => relayX(g, k))
  const smd = xs.flatMap((x) => [
    [x + 0.4, zLed + 0.05, 0, 'r'],
    [x + 0.2, zLed - 0.2, Math.PI / 2, 'r'],
  ])
  // título na zona livre à esquerda da barra de pinos
  const tx0 = -g.w / 2 + 0.6
  const tx1 = -((header.length - 1) / 2) * 0.254 - 0.25
  const tw = Math.min(3.2, tx1 - tx0)
  const xJ = g.w / 2 - 1.1 // jumper JD-VCC (afastado do furo do canto)
  const holes = [[-g.w / 2 + 0.3, -g.d / 2 + 0.3], [g.w / 2 - 0.3, -g.d / 2 + 0.3], [-g.w / 2 + 0.3, g.d / 2 - 0.3], [g.w / 2 - 0.3, g.d / 2 - 0.3]]
  function Model({ part }) {
    return (
      <group>
        <Pcb size={[g.w, T, g.d]} color="#1f5f9f" holes={false} />
        <MountHoles pts={holes} y={T} r={0.15} ring={0.25} />
        {/* partes iguais de cada canal (relé, borne de 3 parafusos NO/COM/NC, optoacoplador PC817,
            transístor e díodo), juntas numa malha por material */}
        <Batched id={`relayCh|${def.type}`} at={xs.map((x) => [x, 0])}>
          <SongleRelay pos={[0, T, zR]} rotY={Math.PI / 2} />
          <ScrewBlock pos={[0, T, -g.d / 2 + 0.45]} />
          <Dip pos={[-0.3, T, zLed + 0.2]} rotY={Math.PI / 2} label="PC817" color="#1a1a1a" />
          {room && <To92 pos={[0.35, T, zBand + 0.45]} />}
          {room && <Diode pos={[-0.35, T, zBand + 0.5]} rotY={Math.PI / 2} len={0.42} r={0.11} pitch={0.76} />}
        </Batched>
        {xs.map((x, k) => (
          <GlowLed key={k} pos={[x + 0.4, 0.2, zLed + 0.35]} size={[0.2, 0.07, 0.125]} color="#ff3030" read={() => (liveOf(part.id)?.coils?.[k] ? 1 : 0)} />
        ))}
        <SmdParts list={smd} y={T} />
        <GlowLed pos={[-g.w / 2 + 0.45, 0.2, g.d / 2 - 0.9]} size={[0.2, 0.07, 0.125]} color="#ff3030" read={() => (liveOf(part.id)?.powered ? 1 : 0)} />
        {/* jumper JD-VCC ↔ VCC e o terceiro pino (GND) */}
        <Jumper pos={[xJ, T, g.d / 2 - 0.35]} />
        <Box size={[0.25, 0.25, 0.25]} pos={[xJ + 0.381, T + 0.125, g.d / 2 - 0.35]} color="#111" rough={0.5} />
        <Box size={[0.064, 0.6, 0.064]} pos={[xJ + 0.381, T + 0.3, g.d / 2 - 0.35]} color="#d9b44a" metal={1} rough={0.25} />
        <SilkText text="JD-VCC  VCC  GND" pos={[xJ + 0.13, T + 0.002, g.d / 2 - 0.12]} w={0.85} d={0.1} font="bold 40px Arial" px={[440, 48]} />
        <SilkText text={`${g.n} Relay Module`} pos={[(tx0 + tx1) / 2, T + 0.002, g.d / 2 - 0.35]} w={tw} d={tw / 9} font="bold 60px Arial" px={[540, 60]} />
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
