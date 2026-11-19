// Placa de expansão do Arduino Nano: placa preta com o soquete 2 × 15 ao centro, filas G/V/S
// (preto, vermelho, azul) para D13…D2 em cima e A0…A7 em baixo, conector série amarelo e I2C
// branco à direita, pinos de 3V3/GND, ficha DC de 7–12 V e interruptor à esquerda, reguladores,
// condensadores, botão RESET e LED POWER. PCB com os 4 furos de 3 mm metalizados.
import { Box, Cyl, RBox, GlowLed, HeaderPins, FemaleHeader, useCanvasTexture, liveOf, PITCH, ECap, BarrelJack, METAL } from '../kit.jsx'
import { PcbPlate, Smds, Sot223 } from './_boardKit.jsx'
import def, { NS, DIGITAL, digX, anaX, rightX } from '@shared/parts/nanoShield.js'

const { W, D, PCB_Y, TOP, HY } = NS
const PX = 120
const X = (x) => (x + W / 2) * PX
const Z = (z) => (z + D / 2) * PX
const male = def.pins.filter((p) => !p.conn)
const MOUNT = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => [a * (W / 2 - 0.3), b * (D / 2 - 0.3), 0.16])
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

function Model({ part }) {
  const silk = useCanvasTexture(drawSilk, ['ns-2'], Math.round(W * PX), Math.round(D * PX))
  const id = part?.id
  const [sx, sz] = NS.SOCK
  return (
    <group>
      {/* espaçadores de nylon e placa preta com os furos metalizados */}
      {MOUNT.map(([x, z], i) => (
        <Cyl key={i} r={0.22} h={PCB_Y} pos={[x, PCB_Y / 2, z]} color="#e8e8e8" seg={12} />
      ))}
      <PcbPlate id="nanoShield" w={W} d={D} t={TOP - PCB_Y} y={PCB_Y} r={0.08} holes={MOUNT} color="#151515" ringColor="#e3e5e8" />
      <mesh position={[0, TOP + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshBasicMaterial map={silk} transparent />
      </mesh>
      {/* soquete do Nano: 2 conectores fêmea de 15 vias */}
      {[-0.762, 0.762].map((dz) => (
        <FemaleHeader key={dz} n={15} x={sx} z={sz + dz} top={HY} h={NS.HDR_H} />
      ))}
      {/* regulador AMS1117 (SOT-223), díodo de proteção e condensadores (entre as filas do soquete,
          visíveis sem o Nano), eletrolíticos de entrada e polifusível */}
      <Sot223 pos={[sx + 1.1, TOP, sz]} rotY={Math.PI / 2} label="AMS1117" sub="5.0" />
      <Smds id="nanoShield" y={TOP} items={[[sx - 1.2, sz, 0, 'd'], [sx - 0.7, sz + 0.2, 1, 'C'], [sx + 0.45, sz, 1, 'C'], [NS.JACK[0] + 1.55, NS.JACK[1] + 0.05, 0, 'f'], [NS.LED[0] + PITCH, NS.LED[1], 0, 'r']]} />
      <ECap pos={[sx - 0.15, TOP, sz]} r={0.28} h={0.5} />
      <ECap pos={[NS.JACK[0] + 1.0, TOP, NS.JACK[1] - 0.5]} r={0.3} h={0.55} />
      {/* conectores machos */}
      <HeaderPins pins={byRe(/^[DA]\d+\.G$/)} base={TOP} plastic="#111" />
      <HeaderPins pins={byRe(/^[DA]\d+\.V$/)} base={TOP} plastic="#d32f2f" />
      <HeaderPins pins={byRe(/^[DA]\d+\.S$/)} base={TOP} plastic={part?.config?.sinal === 'amarelo' ? '#f2c21b' : '#1e4fd8'} />
      <HeaderPins pins={byRe(/^(TX|RX|U\.GND|U\.5V)$/)} base={TOP} plastic="#f5b301" />
      <HeaderPins pins={byRe(/^(SCL|SDA|I\.5V|I\.GND)$/)} base={TOP} plastic="#f2f2f2" />
      <HeaderPins pins={byRe(/^(3V3|GND)\.\d$/)} base={TOP} plastic="#111" />
      {/* ficha DC 5,5/2,1 mm (abertura para a esquerda) */}
      <BarrelJack pos={[NS.JACK[0] - 0.1, TOP, NS.JACK[1]]} size={[1.35, 1.05, 0.9]} />
      {/* interruptor de encravamento (Power_Switch, 8,5 × 8,5 mm): caixa de chapa niquelada com as
          abas dobradas, base de plástico preto e tecla branca (mais alta quando desligado) */}
      <group position={[NS.SWITCH[0], TOP, NS.SWITCH[1]]}>
        <Box size={[0.85, 0.12, 0.85]} pos={[0, 0.06, 0]} color="#1a1a1a" rough={0.5} />
        <RBox size={[0.82, 0.45, 0.82]} r={0.03} pos={[0, 0.345, 0]} color={METAL.nickel} metal={1} rough={0.35} />
        {[-1, 1].map((sx2) => (
          <Box key={sx2} size={[0.02, 0.3, 0.3]} pos={[sx2 * 0.415, 0.25, 0]} color="#b9bdc2" metal={1} rough={0.35} />
        ))}
        <RBox size={[0.42, 0.14, 0.42]} r={0.04} pos={[0, 0.6 + (liveOf(id)?.on === false ? 0.04 : -0.02), 0]} color="#f5f5f5" rough={0.4} />
      </group>
      {/* botão RESET */}
      <group position={[NS.RESET[0], TOP, NS.RESET[1]]}>
        <Box size={[0.6, 0.18, 0.35]} pos={[0, 0.09, 0]} color="#d8d8d8" metal={0.4} />
        <Box size={[0.28, 0.08, 0.16]} pos={[0, 0.22, 0]} color="#f0eadf" />
      </group>
      {/* LED POWER */}
      <GlowLed pos={[NS.LED[0], TOP + 0.03, NS.LED[1]]} size={[0.16, 0.06, 0.1]} color="#ff3030" read={() => (id && liveOf(id)?.pwr ? 1 : 0)} />
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
