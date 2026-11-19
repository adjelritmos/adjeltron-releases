// Pico4Drive: placa verde de 77 × 55 mm. Borne verde de 10 vias na borda esquerda (GND, VBAT e as
// saídas dos 4 drivers), soquete 2 × 20 para a Pico ao centro (USB da Pico virada para a direita),
// conectores dos 13 GPIO em cima (GND preto, alimentação vermelho, sinais brancos; divisores e
// alimentação à esquerda), 8 entradas analógicas em baixo à direita, botões ON / OFF e LED.
import { Box, Cyl, Glow, GlowLed, HeaderPins, FemaleHeader, useCanvasTexture, useFrame, useRef, liveOf, inputOf, PITCH, Chip, ECap } from '../kit.jsx'
import { PcbPlate, ScrewTerminal, Smds, Inductor, Sot23 } from './_boardKit.jsx'
import def, { P4D, TERMINAL } from '@shared/parts/pico4drive.js'

const { W, D, PCB_Y, TOP, HY } = P4D
const PX = 120
const X = (x) => (x + W / 2) * PX
const Z = (z) => (z + D / 2) * PX
const male = def.pins.filter((p) => !p.conn)
const byRow = (re) => male.filter((p) => re.test(p.id))
const DRV_Z = [-1.2, -0.35, 0.5, 1.35]
const MOUNT = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => [a * (W / 2 - 0.35), b * (D / 2 - 0.35), 0.16])
// condensadores dos drivers (1206), resistências de corrente e passivos do regulador
const SMDS = [
  ...DRV_Z.flatMap((z) => [[-2.75, z + 0.32, 0, 'K'], [-2.4, z, 1, 'r'], [-2.4, z + 0.3, 1, 'c']]),
  [-1.3, -1.1, 1, 'c'], [-1.75, -0.45, 0, 'C'], [-1.45, -0.45, 0, 'C'], [-1.6, -1.4, 0, 'r'], [-2.0, 2.3, 0, 'r'],
  [3.35, 1.25, 0, 'r'], [-0.4, 2.1, 1, 'c'], [0.45, 2.1, 1, 'r'],
]

function drawSilk(ctx) {
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // números das colunas dos GPIO e nomes da coluna da esquerda
  ctx.font = 'bold 13px Arial'
  for (const g of P4D.GPIO) {
    const p = def.pins.find((q) => q.id === `GP${g}.G`)
    ctx.fillText(String(g), X(p.pos[0]), Z(p.pos[2] + 0.27))
  }
  ctx.font = 'bold 10px Arial'
  ;[['VB', 'J.GND1'], ['DV1', 'J.GND2'], ['DV2', 'J.GND3'], ['3V3', 'J.GND4']].forEach(([t, id]) => {
    const p = def.pins.find((q) => q.id === id)
    ctx.fillText(t, X(p.pos[0]), Z(p.pos[2] + 0.27))
  })
  // filas: S, S, V, G
  ctx.font = 'bold 11px Arial'
  ctx.textAlign = 'right'
  for (const [t, z] of [['S', P4D.ROWS.S2], ['S', P4D.ROWS.S1], ['V', P4D.ROWS.V], ['G', P4D.ROWS.G]]) ctx.fillText(t, X(-2.9), Z(z))
  // entradas analógicas
  ctx.textAlign = 'center'
  ctx.font = 'bold 12px Arial'
  for (let k = 0; k < 8; k++) ctx.fillText(String(k), X(P4D.AN_X + k * PITCH), Z(P4D.AN_ROWS.AN - 0.27))
  ctx.textAlign = 'right'
  ctx.font = 'bold 11px Arial'
  for (const [t, z] of [['AN', P4D.AN_ROWS.AN], ['3V3', P4D.AN_ROWS.V], ['G', P4D.AN_ROWS.G]]) ctx.fillText(t, X(P4D.AN_X - 0.2), Z(z))
  // borne
  ctx.textAlign = 'left'
  ctx.font = 'bold 12px Arial'
  const tl = { GND: 'GND', VBAT: 'Vbat', M4B: '4B', M4A: '4A', M3B: '3B', M3A: '3A', M2B: '2B', M2A: '2A', M1B: '1B', M1A: '1A' }
  TERMINAL.forEach((id, i) => ctx.fillText(tl[id], X(P4D.TERM_X + 0.45), Z(2.25 - i * 0.5)))
  // contorno da Pico e da USB
  ctx.lineWidth = 2
  const [sx, sz] = P4D.SOCK
  ctx.strokeRect(X(sx - 2.55), Z(sz - 1.05), 5.1 * PX, 2.1 * PX)
  ctx.strokeRect(X(sx + 2.55) - 0.55 * PX, Z(sz) - 0.4 * PX, 0.55 * PX, 0.8 * PX)
  ctx.textAlign = 'center'
  ctx.font = 'bold 14px Arial'
  ctx.fillText('USB', X(sx + 2.55) - 0.27 * PX, Z(sz) + 0.62 * PX)
  // botões e título
  ctx.font = 'bold 15px Arial'
  ctx.fillText('ON', X(P4D.ON[0]), Z(P4D.ON[1] - 0.48))
  ctx.fillText('OFF', X(P4D.OFF[0]), Z(P4D.OFF[1] - 0.48))
  ctx.font = 'bold 22px Arial'
  ctx.fillText('PICO4DRIVE', X(-0.9), Z(1.45))
  ctx.font = '12px Arial'
  ctx.fillText('4 × DRV8212P · 5–11 V', X(-0.9), Z(1.72))
}

// botão tátil 6 × 6 mm THT com capa redonda colorida (desce quando premido)
function Button({ x, z, cap, read }) {
  const g = useRef()
  useFrame(() => {
    if (g.current) g.current.position.y = read() ? -0.05 : 0
  })
  return (
    <group position={[x, TOP, z]}>
      <Box size={[0.6, 0.35, 0.6]} pos={[0, 0.175, 0]} color="#1e1e1e" rough={0.5} />
      <Box size={[0.6, 0.02, 0.6]} pos={[0, 0.355, 0]} color="#c9cdd2" metal={1} rough={0.3} />
      {[-1, 1].map((sx) => [-1, 1].map((sz) => <Box key={`${sx}${sz}`} size={[0.06, 0.04, 0.12]} pos={[sx * 0.32, 0.02, sz * 0.22]} color="#c9cdd2" metal={1} rough={0.3} />))}
      <Cyl r={0.13} h={0.06} pos={[0, 0.39, 0]} color="#151515" seg={16} />
      <group ref={g}>
        <Cyl r={0.2} r2={0.22} h={0.2} pos={[0, 0.48, 0]} color={cap} rough={0.45} seg={20} />
      </group>
    </group>
  )
}

function Model({ part }) {
  const silk = useCanvasTexture(drawSilk, ['p4d-2'], Math.round(W * PX), Math.round(D * PX))
  const id = part?.id
  const [sx, sz] = P4D.SOCK
  return (
    <group>
      {/* espaçadores de nylon e placa com os 4 furos metalizados (dourados, ENIG) */}
      {MOUNT.map(([x, z], i) => (
        <Cyl key={i} r={0.25} h={PCB_Y} pos={[x, PCB_Y / 2, z]} color="#e8e8e8" seg={12} />
      ))}
      <PcbPlate id="p4d" w={W} d={D} t={TOP - PCB_Y} y={PCB_Y} r={0.1} holes={MOUNT} color="#1e6b34" ringColor="#d4b04a" />
      <mesh position={[0, TOP + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshBasicMaterial map={silk} transparent />
      </mesh>
      {/* borne de parafuso verde, 10 vias de 5 mm (entrada dos fios pela esquerda) */}
      <ScrewTerminal n={TERMINAL.length} pitch={0.5} pos={[P4D.TERM_X, TOP, 0]} rotY={Math.PI / 2} color="#3fae49" h={0.85} d={0.75} />
      {/* soquete da Pico: 2 conectores fêmea de 20 vias */}
      {[-0.889, 0.889].map((dz) => (
        <FemaleHeader key={dz} n={20} x={sx} z={sz + dz} top={HY} h={P4D.HDR_H} />
      ))}
      {/* conectores machos: GND preto, alimentação vermelho, sinais brancos, divisores/energia coloridos */}
      <HeaderPins pins={byRow(/^GP\d+\.G$/)} base={TOP} plastic="#111" />
      <HeaderPins pins={byRow(/^GP\d+\.V$/)} base={TOP} plastic="#c62828" />
      <HeaderPins pins={byRow(/^GP\d+\.[ab]$/)} base={TOP} plastic="#eeeeee" />
      <HeaderPins pins={byRow(/^J\.(VBUS|VBAT|5V|GND1)$/)} base={TOP} plastic="#1565c0" />
      <HeaderPins pins={byRow(/^(D1\.|J\.GND2)/)} base={TOP} plastic="#26a69a" />
      <HeaderPins pins={byRow(/^(D2\.|J\.GND3)/)} base={TOP} plastic="#fbc02d" />
      <HeaderPins pins={byRow(/^J\.(3V3a|3V3b|VIN|GND4)$/)} base={TOP} plastic="#1565c0" />
      <HeaderPins pins={byRow(/^AN\d$/)} base={TOP} plastic="#eeeeee" />
      <HeaderPins pins={byRow(/^AN\d\.V$/)} base={TOP} plastic="#c62828" />
      <HeaderPins pins={byRow(/^AN\d\.G$/)} base={TOP} plastic="#111" />
      {/* 4 × DRV8212P (WSON 2 × 2 mm) com os condensadores, junto ao borne */}
      {DRV_Z.map((z, i) => (
        <Chip key={i} pos={[-2.75, TOP, z]} size={[0.2, 0.06, 0.2]} pkg="qfn" n={4} />
      ))}
      <Smds id="p4d" y={TOP} items={SMDS} />
      {/* regulador AP62200 (SOT-563) + bobina de 4,7 µH, condensador de entrada, MOSFETs de proteção
          (SOT-23) e ATtiny412 (SOIC-8) */}
      <Inductor pos={[-2.02, TOP, -0.95]} size={0.45} h={0.3} label="4R7" />
      <Chip pos={[-1.55, TOP, -1.15]} size={[0.16, 0.06, 0.12]} n={3} />
      <ECap pos={[-1.0, TOP, -0.2]} r={0.25} h={0.55} color="#1b1b1b" stripe="#cfd3d8" />
      <Sot23 pos={[-2.25, TOP, 2.0]} rotY={Math.PI / 2} label="A09T" />
      <Sot23 pos={[-2.25, TOP, 2.45]} rotY={Math.PI / 2} label="A09T" />
      <Chip pos={[0.1, TOP, 2.1]} size={[0.49, 0.15, 0.39]} n={4} label="T412" />
      {/* 74HC4051 (SOIC-16) entre as filas do soquete, por baixo da Pico */}
      <Chip pos={[sx + 0.6, TOP, sz]} size={[1.0, 0.15, 0.39]} n={8} label="HC4051" />
      {/* botões e LED de alimentação */}
      <Button x={P4D.ON[0]} z={P4D.ON[1]} cap="#3ddc64" read={() => !!(id && inputOf(id).pressed)} />
      <Button x={P4D.OFF[0]} z={P4D.OFF[1]} cap="#e53935" read={() => !!(id && inputOf(id).off)} />
      <GlowLed pos={[-2.0, TOP + 0.03, 2.55]} size={[0.16, 0.06, 0.1]} color="#33ff66" read={() => (id && liveOf(id)?.pwr ? 1 : 0)} />
      <Glow pos={[3.35, TOP + 0.03, 1.45]} color="#ff3030" read={() => (id && liveOf(id)?.out?.some((o) => o.ocp) ? 1 : 0)}>
        <boxGeometry args={[0.16, 0.06, 0.1]} />
      </Glow>
    </group>
  )
}

function Overlay2D({ part, info, live }) {
  if (!live) return null
  const [x, y] = info.project([-2.0, 0, 2.55])
  const [tx, ty] = info.project([P4D.TERM_X + 0.9, 0, -2.6])
  return (
    <g pointerEvents="none">
      {live.pwr && <circle cx={x} cy={y} r={6} fill="#33ff66" opacity={0.85} filter="url(#glow)" />}
      <text x={tx} y={ty} fontSize={11} fill="#fff" stroke="#000" strokeWidth={3} paintOrder="stroke">
        {live.pwr ? `${(live.vbat ?? 0).toFixed(2).replace('.', ',')} V` : 'desligada'}
      </text>
      {(live.out || []).map((o, k) => {
        const [ox, oy] = info.project([P4D.TERM_X - 0.6, 0, -2.0 + k * 1.0])
        return Math.abs(o.v) > 0.05 ? (
          <text key={k} x={ox} y={oy} fontSize={10} textAnchor="end" fill={o.ocp ? '#ff5252' : '#9ef0b0'} stroke="#000" strokeWidth={3} paintOrder="stroke">
            {`M${k + 1} ${o.v.toFixed(1).replace('.', ',')} V`}
          </text>
        ) : null
      })}
      {void part}
    </g>
  )
}

export default { type: 'pico4drive', Model, Overlay2D }
