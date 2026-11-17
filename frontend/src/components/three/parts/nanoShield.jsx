// Placa de expansão do Arduino Nano: placa preta com o soquete 2 × 15 ao centro, filas G/V/S
// (preto, vermelho, azul) para D13…D2 em cima e A0…A7 em baixo, conector série amarelo e I2C
// branco à direita, pinos de 3V3/GND, ficha DC de 7–12 V e interruptor à esquerda, reguladores,
// condensadores, botão RESET e LED POWER.
import { Box, Cyl, RBox, GlowLed, HeaderPins, FemaleHeader, useCanvasTexture, liveOf, PITCH } from '../kit.jsx'
import def, { NS, DIGITAL, digX, anaX, rightX } from '@shared/parts/nanoShield.js'

const { W, D, PCB_Y, TOP, HY } = NS
const PX = 120
const X = (x) => (x + W / 2) * PX
const Z = (z) => (z + D / 2) * PX
const male = def.pins.filter((p) => !p.conn)
const byRe = (re) => male.filter((p) => re.test(p.id))

function drawSilk(ctx) {
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // números das colunas digitais (por baixo dos S) e letras G/V/S de cada grupo
  ctx.font = 'bold 12px Arial'
  DIGITAL.forEach((d, k) => ctx.fillText(String(d), X(digX(k)), Z(NS.DIG.S + 0.3)))
  ctx.font = 'bold 11px Arial'
  for (const g of [0, 4, 8]) for (const [t, z] of [['G', NS.DIG.G], ['V', NS.DIG.V], ['S', NS.DIG.S]]) ctx.fillText(t, X(digX(g) - 0.22), Z(z))
  for (const [t, z] of [['G', NS.ANA.G], ['V', NS.ANA.V], ['S', NS.ANA.S]]) ctx.fillText(t, X(anaX(0) - 0.22), Z(z))
  for (let k = 0; k < 8; k++) ctx.fillText(`A${k}`, X(anaX(k)), Z(NS.ANA.S + 0.3))
  // conectores da direita
  ctx.font = 'bold 10px Arial'
  ;['TX', 'RX', 'GND', '5V'].forEach((t, k) => ctx.fillText(t, X(rightX(k)), Z(NS.UART_Z + 0.24)))
  ;['SCL', 'SDA', '5V', 'GND'].forEach((t, k) => ctx.fillText(t, X(rightX(k)), Z(NS.I2C_Z + 0.24)))
  // 3V3 / GND: rótulo na coluna livre à esquerda dos 3 pinos
  ctx.fillText('3V3', X(rightX(0)), Z(NS.V33_Z))
  ctx.fillText('GND', X(rightX(0)), Z(NS.GND_Z))
  ctx.textAlign = 'left'
  // energia
  ctx.font = 'bold 12px Arial'
  ctx.fillText('Power_Switch', X(NS.SWITCH[0] - 0.4), Z(NS.SWITCH[1] + 0.55))
  ctx.fillText('DC 7~12V', X(NS.JACK[0] - 0.35), Z(NS.JACK[1] - 0.6))
  ctx.font = 'bold 11px Arial'
  ctx.fillText('RESET', X(NS.RESET[0] - 0.3), Z(NS.RESET[1] - 0.32))
  ctx.fillText('POWER', X(NS.LED[0] - 0.3), Z(NS.LED[1] + 0.25))
  // contorno do Nano
  ctx.lineWidth = 2
  const [sx, sz] = NS.SOCK
  ctx.strokeRect(X(sx - 2.05), Z(sz - 0.88), 4.1 * PX, 1.76 * PX)
}

function Electrolytic({ x, z, r = 0.32, h = 0.55 }) {
  return (
    <group position={[x, TOP, z]}>
      <Box size={[r * 2.1, 0.05, r * 2.1]} pos={[0, 0.025, 0]} color="#222" />
      <Cyl r={r} h={h} pos={[0, h / 2 + 0.05, 0]} color="#c7c9cc" metal={0.6} rough={0.35} seg={20} />
      <Cyl r={r * 0.9} h={0.01} pos={[0, h + 0.055, 0]} color="#9ea2a6" metal={0.7} seg={20} />
    </group>
  )
}

function Model({ part }) {
  const silk = useCanvasTexture(drawSilk, ['ns-2'], Math.round(W * PX), Math.round(D * PX))
  const id = part?.id
  const [sx, sz] = NS.SOCK
  return (
    <group>
      {/* espaçadores e placa preta */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => (
        <Cyl key={i} r={0.22} h={PCB_Y} pos={[a * (W / 2 - 0.3), PCB_Y / 2, b * (D / 2 - 0.3)]} color="#e8e8e8" seg={12} />
      ))}
      <RBox size={[W, TOP - PCB_Y, D]} r={0.05} pos={[0, (PCB_Y + TOP) / 2, 0]} color="#151515" rough={0.55} />
      <mesh position={[0, TOP + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshBasicMaterial map={silk} transparent />
      </mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => (
        <Cyl key={`h${i}`} r={0.26} h={0.01} pos={[a * (W / 2 - 0.3), TOP + 0.004, b * (D / 2 - 0.3)]} color="#e9e9e9" metal={0.7} rough={0.3} seg={16} />
      ))}
      {/* soquete do Nano: 2 conectores fêmea de 15 vias */}
      {[-0.762, 0.762].map((dz) => (
        <FemaleHeader key={dz} n={15} x={sx} z={sz + dz} top={HY} h={NS.HDR_H} />
      ))}
      {/* reguladores e condensadores (entre as filas do soquete, visíveis sem o Nano) */}
      <Box size={[0.65, 0.22, 0.6]} pos={[sx + 1.1, TOP + 0.11, sz]} color="#2a2a2a" rough={0.4} />
      <Box size={[0.42, 0.04, 0.3]} pos={[sx + 1.1, TOP + 0.24, sz - 0.15]} color="#c9ccd0" metal={0.8} />
      <Box size={[0.5, 0.14, 0.3]} pos={[sx - 1.2, TOP + 0.07, sz]} color="#1a1a1a" />
      <Electrolytic x={sx - 0.15} z={sz} r={0.28} h={0.5} />
      <Electrolytic x={NS.JACK[0] + 1.0} z={NS.JACK[1] - 0.5} r={0.3} h={0.55} />
      <Box size={[0.22, 0.1, 0.12]} pos={[NS.JACK[0] + 1.55, TOP + 0.05, NS.JACK[1] + 0.05]} color="#1a1a1a" />
      {/* conectores machos */}
      <HeaderPins pins={byRe(/^[DA]\d+\.G$/)} base={TOP} plastic="#111" />
      <HeaderPins pins={byRe(/^[DA]\d+\.V$/)} base={TOP} plastic="#d32f2f" />
      <HeaderPins pins={byRe(/^[DA]\d+\.S$/)} base={TOP} plastic={part?.config?.sinal === 'amarelo' ? '#f2c21b' : '#1e4fd8'} />
      <HeaderPins pins={byRe(/^(TX|RX|U\.GND|U\.5V)$/)} base={TOP} plastic="#f5b301" />
      <HeaderPins pins={byRe(/^(SCL|SDA|I\.5V|I\.GND)$/)} base={TOP} plastic="#f2f2f2" />
      <HeaderPins pins={byRe(/^(3V3|GND)\.\d$/)} base={TOP} plastic="#111" />
      {/* ficha DC (abertura para a esquerda) */}
      <group position={[NS.JACK[0], TOP, NS.JACK[1]]}>
        <Box size={[1.35, 1.05, 0.9]} pos={[-0.1, 0.525, 0]} color="#121212" rough={0.5} />
        <Cyl r={0.3} h={0.06} pos={[-0.78, 0.5, 0]} rot={[0, 0, Math.PI / 2]} color="#000" seg={20} />
        <Cyl r={0.08} h={0.5} pos={[-0.6, 0.5, 0]} rot={[0, 0, Math.PI / 2]} color="#c9ccd0" metal={0.9} seg={12} />
      </group>
      {/* interruptor (Power_Switch): corpo cinzento com tecla branca */}
      <group position={[NS.SWITCH[0], TOP, NS.SWITCH[1]]}>
        <Box size={[0.8, 0.55, 0.8]} pos={[0, 0.275, 0]} color="#a9adb1" rough={0.45} />
        <Box size={[0.42, 0.12, 0.42]} pos={[0, 0.6 + (liveOf(id)?.on === false ? 0.04 : -0.02), 0]} color="#f5f5f5" rough={0.4} />
      </group>
      {/* botão RESET */}
      <group position={[NS.RESET[0], TOP, NS.RESET[1]]}>
        <Box size={[0.6, 0.18, 0.35]} pos={[0, 0.09, 0]} color="#d8d8d8" metal={0.4} />
        <Box size={[0.28, 0.08, 0.16]} pos={[0, 0.22, 0]} color="#f0eadf" />
      </group>
      {/* LED POWER */}
      <GlowLed pos={[NS.LED[0], TOP + 0.03, NS.LED[1]]} size={[0.16, 0.06, 0.1]} color="#ff3030" read={() => (id && liveOf(id)?.pwr ? 1 : 0)} />
      <Box size={[0.03, 0.01, 0.03]} pos={[NS.LED[0] + PITCH, TOP + 0.01, NS.LED[1]]} color="#151515" />
    </group>
  )
}

function Overlay2D({ part, info, live }) {
  if (!live) return null
  const [x, y] = info.project([NS.LED[0], 0, NS.LED[1]])
  const [tx, ty] = info.project([NS.JACK[0] - 0.2, 0, NS.JACK[1] + 0.85])
  return (
    <g pointerEvents="none">
      {live.pwr && <circle cx={x} cy={y} r={5} fill="#ff3030" opacity={0.85} filter="url(#glow)" />}
      {live.vin > 0.5 && (
        <text x={tx} y={ty} fontSize={10} fill="#fff" stroke="#000" strokeWidth={3} paintOrder="stroke">
          {`${live.vin.toFixed(1).replace('.', ',')} V · ${live.on ? 'ON' : 'OFF'}`}
        </text>
      )}
      {void part}
    </g>
  )
}

export default { type: 'nanoShield', Model, Overlay2D }
