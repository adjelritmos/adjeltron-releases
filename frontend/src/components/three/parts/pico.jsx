// Raspberry Pi Pico: placa verde de 21 × 51 mm com 40 furos acastelados (2 filas a 0,7"),
// micro-USB à esquerda (−x), botão BOOTSEL, RP2040 (QFN-56) ao centro, flash QSPI,
// LED verde da placa (GP25) e os 3 pinos de depuração SWD na ponta direita.
import { Box, Cyl, GlowLed, useCanvasTexture, eng, PITCH, geo, pcbMat, METAL, MicroUsb, Chip, Crystal, TactSwitch } from '../kit.jsx'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

import def from '@shared/parts/pico.js'
import { Glow2D } from './group-c-ui.jsx'

const W = 5.1
const D = 2.1
const BY = 0.25 // face de baixo da placa (por cima dos espaçadores dos pinos)
const T = 0.1
const TOP = BY + T
const LED = [-1.75, TOP + 0.03, -0.55]
const PX = 200

const gp25 = () => {
  const e = eng()
  if (!e || !e.arduinoRunning()) return 0
  const p = e.pins[25]
  return p?.mode === 'OUTPUT' ? (p.pwm ? p.duty : p.out) : 0
}

function Model() {
  const silk = useCanvasTexture(
    (ctx) => {
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 19px Arial'
      for (const p of def.pins) {
        const x = (p.pos[0] + W / 2) * PX
        const z = (p.pos[2] + D / 2) * PX
        const name = p.id.split('.')[0].replace('3V3_EN', 'EN').replace('ADC_VREF', 'VREF')
        ctx.save()
        ctx.translate(x, z + (p.pos[2] > 0 ? -44 : 44))
        ctx.rotate(-Math.PI / 2)
        ctx.fillText(name, 0, 0)
        ctx.restore()
      }
      ctx.font = 'bold 30px Arial'
      ctx.fillText('Raspberry Pi Pico', (1.15 + W / 2) * PX, (0.0 + D / 2) * PX)
      ctx.font = '18px Arial'
      ctx.fillText('© 2020', (1.15 + W / 2) * PX, (0.2 + D / 2) * PX)
      ctx.fillText('LED', (LED[0] + W / 2) * PX + 30, (LED[2] + D / 2) * PX)
      ctx.fillText('BOOTSEL', (-1.45 + W / 2) * PX, (0.22 + D / 2) * PX + 34)
    },
    ['pico'],
    Math.round(W * PX),
    Math.round(D * PX),
  )
  return (
    <group>
      {/* pinos soldados por baixo, com o espaçador de plástico */}
      {[-0.889, 0.889].map((z) => (
        <Box key={z} size={[20 * PITCH, BY, 0.25]} pos={[0, BY / 2, z]} color="#111" />
      ))}
      <mesh position={[0, BY + T / 2, 0]} castShadow receiveShadow geometry={geo('picoPcb', () => new RoundedBoxGeometry(W, T, D, 2, 0.03))} material={pcbMat('#1f7a3a')} />
      <mesh position={[0, TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshBasicMaterial map={silk} transparent />
      </mesh>
      {/* furos acastelados: pad dourado do furo até à borda */}
      {def.pins.map((p) => (
        <group key={p.id}>
          <Box size={[0.17, 0.012, D / 2 - Math.abs(p.pos[2]) + 0.06]} pos={[p.pos[0], TOP + 0.006, Math.sign(p.pos[2]) * (Math.abs(p.pos[2]) + (D / 2 - Math.abs(p.pos[2])) / 2 - 0.03)]} color={METAL.gold} metal={1} rough={0.28} />
          <Cyl r={0.05} h={0.02} pos={[p.pos[0], TOP + 0.014, p.pos[2]]} color="#222" seg={10} />
        </group>
      ))}
      {/* micro-USB */}
      <MicroUsb pos={[-W / 2 + 0.22, TOP, 0]} size={[0.58, 0.27, 0.78]} />
      {/* BOOTSEL */}
      <TactSwitch pos={[-1.45, TOP, 0.22]} size={0.38} cap="#f5f5f5" />
      {/* RP2040 (7 × 7 mm), flash QSPI, cristal e regulador */}
      <Chip pos={[0.15, TOP, 0]} size={[0.7, 0.09, 0.7]} pkg="qfn" n={14} label="RP2040" />
      <Chip pos={[-0.75, TOP, -0.2]} size={[0.5, 0.09, 0.4]} n={4} label="W25Q16" />
      <Crystal pos={[-0.7, TOP, 0.35]} l={0.32} h={0.08} d={0.2} />
      <Box size={[0.3, 0.08, 0.3]} pos={[1.0, TOP + 0.04, 0.45]} color="#1a1a1a" />
      {/* SWD: SWCLK, GND, SWDIO */}
      {[-1, 0, 1].map((i) => (
        <Cyl key={i} r={0.06} h={0.02} pos={[W / 2 - 0.15, TOP + 0.01, i * PITCH]} color="#d4af37" metal={0.9} seg={10} />
      ))}
      <GlowLed pos={LED} size={[0.14, 0.06, 0.08]} color="#33ff66" read={gp25} />
    </group>
  )
}

function Overlay2D({ info }) {
  const running = !!eng()?.arduinoRunning()
  return (
    <g pointerEvents="none">
      <Glow2D info={info} pos={LED} color="#33ff66" on={running && gp25() > 0.05} r={6} />
    </g>
  )
}

export default { type: 'pico', Model, Overlay2D }
