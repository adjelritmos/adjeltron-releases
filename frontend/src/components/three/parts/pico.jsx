// Raspberry Pi Pico: placa verde de 21 × 51 × 1 mm com 40 furos (2 filas a 0,7") e os meios-furos
// acastelados na borda, 4 furos de fixação de 2,1 mm (47 × 11,4 mm), micro-USB à esquerda (−x),
// botão BOOTSEL, RP2040 (QFN-56, 7 × 7 mm) ao centro, flash QSPI (USON-8), cristal de 12 MHz
// (3,2 × 2,5 mm), regulador RT6150 com a bobina, LED verde da placa (GP25) e os 3 pinos de
// depuração SWD na ponta direita. `PicoBoard` também serve a Pico W, a Pico 2 e a Pico 2 W.
import { GlowLed, useCanvasTexture, eng, PITCH, METAL, MicroUsb, Chip, TactSwitch, mergedGeo, geo, mat, THREE } from '../kit.jsx'
import { PcbPlate, PlatedHoles, PinBlocks, Smds, SmdCrystal, Inductor, MarkText } from './_boardKit.jsx'
import def from '@shared/parts/pico.js'
import { Glow2D } from './group-c-ui.jsx'

const W = 5.1
const D = 2.1
const BY = 0.25 // face de baixo da placa (por cima dos espaçadores dos pinos)
const T = 0.1
const TOP = BY + T
const LED = [-1.75, TOP + 0.03, -0.55]
const PX = 200
const HOLES = def.pins.map((p) => [p.pos[0], p.pos[2]])
const MOUNT = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx * 2.35, sz * 0.57, 0.105]))
const SMDS = [
  [-1.75, -0.3, 0, 'r'], [-0.62, 0.25, 0, 'c'], [-0.62, -0.25, 0, 'c'], [-0.45, 0.5, 1, 'c'], [-0.45, -0.5, 1, 'c'],
  [0.75, 0.5, 1, 'c'], [0.75, -0.5, 1, 'c'], [0.6, 0.0, 1, 'r'], [-1.05, 0.55, 0, 'r'], [1.4, -0.45, 0, 'C'],
  [1.4, 0.0, 1, 'C'], [-1.1, -0.55, 0, 'c'], [-2.0, 0.55, 1, 'd'],
]
// Pico W: o chip vai para a esquerda e a blindagem ocupa a ponta direita
const SMDS_W = SMDS.filter(([x]) => x < 1.1 && x !== -0.62 && x !== 0.6)

const gp25 = () => {
  const e = eng()
  if (!e || !e.arduinoRunning()) return 0
  const p = e.pins[25]
  return p?.mode === 'OUTPUT' ? (p.pwm ? p.duty : p.out) : 0
}

// pistas douradas dos furos acastelados (do anel até à borda) e o meio-furo metalizado na borda
const castGeo = () =>
  mergedGeo('pico-cast', () => {
    const b = geo('gull', () => new THREE.BoxGeometry(1, 1, 1))
    return def.pins.flatMap((p) => {
      const s = Math.sign(p.pos[2])
      const len = D / 2 - Math.abs(p.pos[2])
      return [
        [b, [p.pos[0], TOP + 0.004, s * (Math.abs(p.pos[2]) + len / 2)], [0, 0, 0], [0.16, 0.008, len]],
        [b, [p.pos[0], BY + T / 2, s * (D / 2 + 0.002)], [0, 0, 0], [0.13, T + 0.008, 0.006]],
      ]
    })
  })

// placa da família Pico (title, chip, wireless, year) com o LED a ler `read`
export function PicoBoard({ title = 'Raspberry Pi Pico', chip = 'RP2040', wireless = false, year = 2020, read }) {
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
    [`pico-${title}`],
    Math.round(W * PX),
    Math.round(D * PX),
  )
  const chipX = wireless ? -0.35 : 0.15
  const swdX = wireless ? 1.0 : W / 2 - 0.15
  const swd = [-1, 0, 1].map((i) => [swdX, i * PITCH])
  return (
    <group>
      {/* pinos soldados por baixo, com o espaçador de plástico */}
      <PinBlocks id="pico" pts={HOLES} y={0} h={BY} />
      <PcbPlate id="pico" w={W} d={D} t={T} y={BY} r={0.06} holes={MOUNT} color="#1f7a3a" ringColor={METAL.gold} />
      <mesh position={[0, TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshBasicMaterial map={silk} transparent />
      </mesh>
      {/* furos (com solda) e os acastelados na borda */}
      <mesh geometry={castGeo()} material={mat(METAL.gold, 1, 0.28)} />
      <PlatedHoles id="pico" pts={HOLES} y={TOP + 0.008} r={0.07} hole={0.045} />
      {/* micro-USB e BOOTSEL */}
      <MicroUsb pos={[-W / 2 + 0.22, TOP, 0]} size={[0.58, 0.27, 0.78]} />
      <TactSwitch pos={[-1.45, TOP, 0.22]} size={0.38} cap="#f5f5f5" />
      {/* microcontrolador (QFN 7 × 7 mm) com a marcação a laser, flash QSPI, cristal, regulador + bobina */}
      <Chip pos={[chipX, TOP, 0]} size={[0.7, 0.09, 0.7]} pkg="qfn" n={14} />
      <MarkText
        lines={[{ text: chip === 'RP2350' ? 'RP2350A' : 'RP2-B2', font: 'bold 44px Arial', y: 34 }, { text: chip === 'RP2350' ? '24/14' : '20/21', font: '36px Arial', y: 76 }, { text: 'P64M15.00', font: '30px Arial', y: 112 }]}
        pos={[chipX, TOP + 0.092, 0.03]}
        w={0.6}
        d={0.3}
        color="#9a9a9a"
      />
      <Chip pos={[-0.95, TOP, -0.2]} size={[0.3, 0.06, 0.2]} pkg="qfn" n={4} />
      <SmdCrystal pos={[-0.9, TOP, 0.35]} l={0.32} w={0.25} label="12.000" />
      <Inductor pos={[chipX + 0.85, TOP, 0.32]} size={0.3} h={0.15} label="2R2" />
      <Chip pos={[chipX + 0.85, TOP, -0.15]} size={[0.25, 0.06, 0.25]} pkg="qfn" n={3} />
      <Smds id={`pico-${wireless ? 'w' : 'n'}`} y={TOP} items={wireless ? SMDS_W : SMDS} />
      {wireless && (
        <group>
          {/* CYW43439 sob a blindagem metálica (estampada, com o rebordo) */}
          <mesh position={[1.62, TOP + 0.065, 0]} castShadow geometry={geo('picoShield', () => new THREE.BoxGeometry(0.85, 0.13, 0.95))} material={mat(METAL.nickel, 1, 0.32)} />
          <mesh position={[1.62, TOP + 0.131, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('plane1', () => new THREE.PlaneGeometry(1, 1))} scale={[0.77, 0.87, 1]} material={mat('#cfd3d8', 1, 0.24)} />
        </group>
      )}
      {/* SWD: SWCLK, GND, SWDIO */}
      <PlatedHoles id={`pico-swd-${wireless ? 'w' : 'n'}`} pts={swd} y={TOP} r={0.075} hole={0.045} solder={false} square={1} />
      <GlowLed pos={LED} size={[0.14, 0.06, 0.08]} color="#33ff66" read={read} />
    </group>
  )
}

function Model() {
  return <PicoBoard read={gp25} />
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
