// Pico4Drive: placa verde de 77 × 55 mm. Borne verde de 10 vias na borda esquerda (GND, VBAT e as
// saídas dos 4 drivers), soquete 2 × 20 para a Pico ao centro (USB da Pico virada para a direita),
// conectores dos 13 GPIO em cima (GND preto, alimentação vermelho, sinais brancos; divisores e
// alimentação à esquerda), 8 entradas analógicas em baixo à direita, botões ON / OFF e LED.
import { Box, Cyl, RBox, Glow, GlowLed, HeaderPins, FemaleHeader, useCanvasTexture, useFrame, useRef, liveOf, inputOf, PITCH } from '../kit.jsx'
import def, { P4D, TERMINAL } from '@shared/parts/pico4drive.js'

const { W, D, PCB_Y, TOP, HY } = P4D
const PX = 120
const X = (x) => (x + W / 2) * PX
const Z = (z) => (z + D / 2) * PX
const male = def.pins.filter((p) => !p.conn)
const byRow = (re) => male.filter((p) => re.test(p.id))

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

function Button({ x, z, cap, read }) {
  const g = useRef()
  useFrame(() => {
    if (g.current) g.current.position.y = read() ? -0.05 : 0
  })
  return (
    <group position={[x, TOP, z]}>
      <Box size={[0.6, 0.35, 0.6]} pos={[0, 0.175, 0]} color="#2b2b2b" />
      <Box size={[0.58, 0.02, 0.58]} pos={[0, 0.355, 0]} color="#bfc3c7" metal={0.8} />
      <group ref={g}>
        <Cyl r={0.17} h={0.2} pos={[0, 0.45, 0]} color={cap} />
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
      {/* espaçadores de nylon e placa */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => (
        <Cyl key={i} r={0.25} h={PCB_Y} pos={[a * (W / 2 - 0.35), PCB_Y / 2, b * (D / 2 - 0.35)]} color="#e8e8e8" seg={12} />
      ))}
      <RBox size={[W, TOP - PCB_Y, D]} r={0.04} pos={[0, (PCB_Y + TOP) / 2, 0]} color="#1e6b34" rough={0.55} />
      <mesh position={[0, TOP + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshBasicMaterial map={silk} transparent />
      </mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => (
        <Cyl key={`h${i}`} r={0.3} h={0.01} pos={[a * (W / 2 - 0.35), TOP + 0.004, b * (D / 2 - 0.35)]} color="#c9a227" metal={0.8} rough={0.3} seg={16} />
      ))}
      {/* borne de parafuso verde, 10 vias (entrada dos fios pela esquerda) */}
      <group position={[P4D.TERM_X, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <RBox size={[5.06, 0.85, 0.75]} r={0.03} pos={[0, TOP + 0.425, 0]} color="#3fae49" rough={0.5} />
        {TERMINAL.map((t, i) => {
          const x = (i - 4.5) * 0.5
          return (
            <group key={t}>
              <Cyl r={0.15} h={0.05} pos={[x, TOP + 0.86, 0.12]} color="#cfd2d6" metal={0.9} rough={0.25} seg={16} />
              <Box size={[0.24, 0.02, 0.04]} pos={[x, TOP + 0.89, 0.12]} color="#555" />
              <Box size={[0.3, 0.28, 0.02]} pos={[x, TOP + 0.24, -0.376]} color="#0d0d0d" />
              <Box size={[0.26, 0.04, 0.02]} pos={[x, TOP + 0.13, -0.38]} color="#bfc3c7" metal={0.9} />
            </group>
          )
        })}
      </group>
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
      {/* 4 × DRV8212P (WSON 2 × 2 mm) + condensadores, junto ao borne */}
      {[-1.6, -0.6, 0.4, 1.4].map((z, i) => (
        <group key={i}>
          <Box size={[0.2, 0.06, 0.2]} pos={[-2.75, TOP + 0.03, z]} color="#1a1a1a" />
          <Box size={[0.32, 0.16, 0.16]} pos={[-2.75, TOP + 0.08, z + 0.32]} color="#b08a5a" />
        </group>
      ))}
      {/* regulador AP62200 + bobina 4,7 µH, MOSFETs de proteção, ATtiny412 */}
      <Box size={[0.45, 0.3, 0.45]} pos={[-1.75, TOP + 0.15, -0.95]} color="#3a3a3a" rough={0.4} />
      <Box size={[0.16, 0.06, 0.12]} pos={[-1.3, TOP + 0.03, -0.95]} color="#1a1a1a" />
      <Box size={[0.32, 0.08, 0.32]} pos={[-2.25, TOP + 0.04, 2.0]} color="#1a1a1a" />
      <Box size={[0.32, 0.08, 0.32]} pos={[-2.25, TOP + 0.04, 2.45]} color="#1a1a1a" />
      <Box size={[0.5, 0.12, 0.4]} pos={[0.1, TOP + 0.06, 2.1]} color="#1a1a1a" />
      {/* 74HC4051 (SOIC-16) entre as filas do soquete, por baixo da Pico */}
      <Box size={[1.0, 0.14, 0.4]} pos={[sx + 0.6, TOP + 0.07, sz]} color="#1a1a1a" />
      {/* botões e LED de alimentação */}
      <Button x={P4D.ON[0]} z={P4D.ON[1]} cap="#3ddc64" read={() => !!(id && inputOf(id).pressed)} />
      <Button x={P4D.OFF[0]} z={P4D.OFF[1]} cap="#e53935" read={() => false} />
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
