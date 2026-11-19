// Arduino Nano: placa azul de 43,2 × 18,5 mm com os 4 furos de 1,78 mm nas pontas, 2 filas de
// 15 pinos (por baixo), mini-USB à esquerda (−x), ATmega328P (TQFP-32 rodado 45°), ressoador de
// 16 MHz, botão de reset branco, os 4 LEDs (TX, RX, POW e L no pino 13), passivos 0603 e o ICSP
// 2 × 3 na ponta direita. A ponte USB-série e o regulador estão por baixo (não se veem).
import { Box, GlowLed, useCanvasTexture, eng, PITCH, MicroUsb, Chip, TactSwitch } from '../kit.jsx'
import { PcbPlate, PlatedHoles, PinBlocks, PinField, Smds } from './_boardKit.jsx'

import def from '@shared/parts/nano.js'
import { Glow2D } from './group-c-ui.jsx'

const W = 4.32
const D = 1.85
const BY = 0.25 // face de baixo da placa (por cima dos espaçadores dos pinos)
const T = 0.16
const TOP = BY + T
const LED_ON = [-0.95, TOP + 0.04, 0.35]
const LED_L = [-0.95, TOP + 0.04, -0.35]
const PX = 200 // px por cm na textura de serigrafia
const HOLES = def.pins.map((p) => [p.pos[0], p.pos[2]])
const MOUNT = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx * (W / 2 - 0.13), sz * 0.762, 0.089]))
const ICSP = [0, 1, 2].flatMap((i) => [-0.127, 0.127].map((z) => [W / 2 - 0.3 - i * PITCH, z]))
// LEDs TX/RX (apagados), resistências dos LEDs, condensadores de desacoplamento e o ressoador
const SMDS = [
  [-0.95, 0.12, 0, 'l'], [-0.95, -0.12, 0, 'l'], [-0.68, 0.35, 0, 'r'], [-0.68, 0.12, 0, 'r'], [-0.68, -0.12, 0, 'r'],
  [-0.68, -0.35, 0, 'r'], [-0.35, -0.42, 0, 'K'], [0.95, 0.45, 1, 'c'], [0.95, -0.45, 1, 'c'], [-0.25, 0.0, 1, 'c'],
  [1.05, 0.0, 1, 'r'], [-1.2, 0.55, 0, 'C'], [-1.2, -0.55, 0, 'C'], [-1.2, 0.0, 1, 'd'],
]

const pin13 = () => {
  const e = eng()
  if (!e || !e.arduinoRunning()) return 0
  const p = e.pins[13]
  return p.mode === 'OUTPUT' ? (p.pwm ? p.duty : p.out) : 0
}

// modelo do Nano; variantes (ex.: Keyestudio Nano CH340) mudam a cor da placa, o título e o ICSP
export const makeNanoModel = ({ pcb = '#1b5fb8', title = 'NANO', titleFont = 'bold 40px Arial', icsp = 'pins', key = 'nano' } = {}) =>
  function Model() {
  // serigrafia com o nome de cada pino junto ao furo (útil na vista 2D)
  const silk = useCanvasTexture(
    (ctx) => {
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 21px Arial'
      for (const p of def.pins) {
        const x = (p.pos[0] + W / 2) * PX
        const z = (p.pos[2] + D / 2) * PX
        const name = p.id === 'D0' ? 'RX0' : p.id === 'D1' ? 'TX1' : p.id.split('.')[0]
        ctx.fillText(name, x, z + (p.pos[2] > 0 ? -34 : 34))
      }
      ctx.font = titleFont
      ctx.fillText(title, (1.1 + W / 2) * PX, (0.0 + D / 2) * PX)
      ctx.font = 'bold 20px Arial'
      ctx.fillText('ON', (LED_ON[0] - 0.27 + W / 2) * PX, (LED_ON[2] + D / 2) * PX)
      ctx.fillText('L', (LED_L[0] - 0.27 + W / 2) * PX, (LED_L[2] + D / 2) * PX)
    },
    [key],
    Math.round(W * PX),
    Math.round(D * PX),
  )
  return (
    <group>
      {/* barras de pinos por baixo (plástico segmentado) */}
      <PinBlocks id="nano" pts={HOLES} y={0} h={BY} />
      <PcbPlate id="nano" w={W} d={D} t={T} y={BY} r={0.05} holes={MOUNT} color={pcb} />
      <mesh position={[0, TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshBasicMaterial map={silk} transparent />
      </mesh>
      {/* furos metalizados com os pinos soldados */}
      <PlatedHoles id="nano" pts={HOLES} y={TOP} />
      {/* mini-USB */}
      <MicroUsb pos={[-W / 2 + 0.35, TOP, 0]} size={[0.9, 0.4, 0.78]} />
      {/* ATmega328P (TQFP-32, rodado 45°), passivos e LEDs TX/RX */}
      <Chip pos={[0.35, TOP, 0]} size={[0.7, 0.1, 0.7]} pkg="qfp" n={8} rotY={Math.PI / 4} label="MEGA328P" />
      <Smds id={`nano-${key}`} y={TOP} items={SMDS} />
      {/* botão de reset */}
      <TactSwitch pos={[-0.35, TOP, 0.35]} size={0.34} cap="#f2f2f2" />
      {/* ICSP 2×3 (pinos soltos, ou com o plástico amarelo da Keyestudio) */}
      {icsp === 'yellow' ? <Box size={[3 * PITCH, 0.25, 2 * PITCH]} pos={[W / 2 - 0.3 - PITCH, TOP + 0.125, 0]} color="#f2c21b" rough={0.45} /> : <PinBlocks id="nano-icsp" pts={ICSP} y={TOP} />}
      <PinField id="nano-icsp" pts={ICSP.map(([x, z]) => [x, TOP + 0.6, z])} y0={TOP - 0.05} />
      <PlatedHoles id="nano-icsp" pts={ICSP} y={TOP} solder={false} />
      <GlowLed pos={LED_ON} size={[0.12, 0.06, 0.08]} color="#33ff66" read={() => (eng()?.arduinoRunning() ? 1 : 0)} />
      <GlowLed pos={LED_L} size={[0.12, 0.06, 0.08]} color="#ffaa00" read={pin13} />
    </group>
  )
}

function Overlay2D({ info }) {
  const e = eng()
  const running = !!e?.arduinoRunning()
  return (
    <g pointerEvents="none">
      <Glow2D info={info} pos={LED_ON} color="#33ff66" on={running} r={5} />
      <Glow2D info={info} pos={LED_L} color="#ffaa00" on={running && pin13() > 0.05} r={5} />
    </g>
  )
}

export function NanoOverlay2D(props) {
  return Overlay2D(props)
}

export default { type: 'nano', Model: makeNanoModel(), Overlay2D }
