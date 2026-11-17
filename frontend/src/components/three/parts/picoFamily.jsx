// Raspberry Pi Pico W, Pico 2 e Pico 2 W: placa verde de 21 × 51 mm com 40 furos acastelados
// (2 filas a 0,7"), micro-USB à esquerda (−x), botão BOOTSEL e LED junto à USB.
//  - Pico 2: RP2350 (QFN-60, 7 × 7 mm) ao centro e os 3 pinos de depuração na ponta direita.
//  - Pico W / Pico 2 W: chip Wi‑Fi CYW43439 dentro de uma blindagem metálica junto à ponta
//    direita e a antena impressa (zona sem cobre) na ponta; os 3 pinos de depuração passam
//    para o meio da placa. O LED está ligado ao CYW43 (WL_GPIO0 → pino 64 no código).
import { Box, Cyl, GlowLed, useCanvasTexture, eng, PITCH, geo, pcbMat, METAL, MicroUsb, Chip, Crystal, TactSwitch } from '../kit.jsx'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

import def from '@shared/parts/pico.js'
import { Glow2D } from './group-c-ui.jsx'

const W = 5.1
const D = 2.1
const BY = 0.25
const T = 0.1
const TOP = BY + T
const LED = [-1.75, TOP + 0.03, -0.55]
const PX = 200

const ledLevel = (pin) => () => {
  const e = eng()
  if (!e || !e.arduinoRunning()) return 0
  const p = e.pins?.[pin]
  return p?.mode === 'OUTPUT' ? (p.pwm ? p.duty : p.out) : 0
}

function makeModel({ title, chip, wireless, year }) {
  const ledPin = wireless ? 64 : 25
  const read = ledLevel(ledPin)
  function Model() {
    const silk = useCanvasTexture(
      (ctx) => {
        if (wireless) {
          // antena impressa: zona sem plano de cobre, com a pista em meandro
          ctx.fillStyle = '#2f8f4c'
          ctx.fillRect((2.1 + W / 2) * PX, (-0.45 + D / 2) * PX, 0.4 * PX, 0.9 * PX)
          ctx.strokeStyle = '#d6c27a'
          ctx.lineWidth = 5
          ctx.beginPath()
          for (let i = 0; i < 5; i++) {
            const y = (-0.4 + i * 0.2 + D / 2) * PX
            ctx.lineTo((2.16 + W / 2) * PX, y)
            ctx.lineTo((2.44 + W / 2) * PX, y)
          }
          ctx.stroke()
        }
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
        if (wireless) {
          ctx.font = 'bold 20px Arial'
          ctx.fillText(title, (0.5 + W / 2) * PX, (0.48 + D / 2) * PX)
        } else {
          ctx.font = 'bold 28px Arial'
          ctx.fillText(title, (1.15 + W / 2) * PX, (-0.05 + D / 2) * PX)
          ctx.font = '18px Arial'
          ctx.fillText(`© ${year}`, (1.15 + W / 2) * PX, (0.17 + D / 2) * PX)
        }
        ctx.fillText('LED', (LED[0] + W / 2) * PX + 30, (LED[2] + D / 2) * PX)
        ctx.fillText('BOOTSEL', (-1.45 + W / 2) * PX, (0.22 + D / 2) * PX + 34)
      },
      [title],
      Math.round(W * PX),
      Math.round(D * PX),
    )
    const chipX = wireless ? -0.35 : 0.15
    return (
      <group>
        {/* pinos soldados por baixo, com o espaçador de plástico */}
        {[-0.889, 0.889].map((z) => (
          <Box key={z} size={[20 * PITCH, BY, 0.25]} pos={[0, BY / 2, z]} color="#111" />
        ))}
        <mesh position={[0, BY + T / 2, 0]} castShadow receiveShadow geometry={geo('picoFamPcb', () => new RoundedBoxGeometry(W, T, D, 2, 0.03))} material={pcbMat('#1f7a3a')} />
        <mesh position={[0, TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[W, D]} />
          <meshBasicMaterial map={silk} transparent />
        </mesh>
        {/* furos acastelados */}
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
        {/* microcontrolador (RP2040 QFN-56 ou RP2350 QFN-60, 7 × 7 mm), flash QSPI de 4 MB, cristal, regulador */}
        <Chip pos={[chipX, TOP, 0]} size={[0.7, 0.09, 0.7]} pkg="qfn" n={14} label={chip} />
        <Chip pos={[-0.95, TOP, -0.2]} size={[0.5, 0.09, 0.4]} n={4} label="W25Q16" />
        <Crystal pos={[-0.9, TOP, 0.35]} l={0.32} h={0.08} d={0.2} />
        <Box size={[0.3, 0.08, 0.3]} pos={[chipX + 0.85, TOP + 0.04, 0.22]} color="#1a1a1a" />
        {wireless ? (
          <>
            {/* CYW43439 sob a blindagem metálica */}
            <Box size={[0.85, 0.13, 0.95]} pos={[1.62, TOP + 0.065, 0]} color={METAL.nickel} metal={1} rough={0.32} />
            <Box size={[0.77, 0.005, 0.87]} pos={[1.62, TOP + 0.133, 0]} color="#cfd3d8" metal={0.85} rough={0.3} />
            {/* SWD no meio da placa */}
            {[-1, 0, 1].map((i) => (
              <Cyl key={i} r={0.06} h={0.02} pos={[1.0, TOP + 0.01, i * PITCH]} color="#d4af37" metal={0.9} seg={10} />
            ))}
          </>
        ) : (
          [-1, 0, 1].map((i) => <Cyl key={i} r={0.06} h={0.02} pos={[W / 2 - 0.15, TOP + 0.01, i * PITCH]} color="#d4af37" metal={0.9} seg={10} />)
        )}
        <GlowLed pos={LED} size={[0.14, 0.06, 0.08]} color="#33ff66" read={read} />
      </group>
    )
  }
  function Overlay2D({ info }) {
    const running = !!eng()?.arduinoRunning()
    return (
      <g pointerEvents="none">
        <Glow2D info={info} pos={LED} color="#33ff66" on={running && read() > 0.05} r={6} />
      </g>
    )
  }
  return { Model, Overlay2D }
}

export const UI_PICO_FAMILY = [
  { type: 'picow', ...makeModel({ title: 'Raspberry Pi Pico W', chip: 'RP2040', wireless: true, year: 2022 }) },
  { type: 'pico2', ...makeModel({ title: 'Raspberry Pi Pico 2', chip: 'RP2350', wireless: false, year: 2024 }) },
  { type: 'pico2w', ...makeModel({ title: 'Raspberry Pi Pico 2 W', chip: 'RP2350', wireless: true, year: 2024 }) },
]
