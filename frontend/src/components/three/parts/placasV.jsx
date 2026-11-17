// Placas vindas do catálogo do Velxio: ATtiny85 (DIP-8), Franzininho, Arduino Nano RP2040 Connect
// e STM32 Blue Pill. As placas com pinos usam o mesmo desenho da Nano: espaçadores por baixo,
// PCB com serigrafia (nome de cada pino junto ao furo), furos com os pinos soldados e LEDs que
// leem o pino verdadeiro (LED da placa) e a alimentação.
import { Box, Cyl, Leg, GlowLed, useCanvasTexture, useLabel, eng, PITCH, geo, pcbMat, METAL, MicroUsb, Chip, Crystal, TactSwitch } from '../kit.jsx'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { ATTINY_DEF, FRANZININHO_DEF, NANO_RP2040_DEF, BLUEPILL_DEF, FRANZ, BLUEPILL_W } from '@shared/parts/placasV.js'
import { Glow2D } from './group-c-ui.jsx'

const BY = 0.25 // face de baixo da placa (por cima dos espaçadores)
const T = 0.16
const TOP = BY + T
const PX = 200

// nível de um pino da placa (0..1) — `low`: LED que acende a LOW (PC13 da Blue Pill)
const pinLevel = (n, low = false) => () => {
  const e = eng()
  if (!e || !e.arduinoRunning()) return 0
  const p = e.pins[n]
  if (!p || p.mode !== 'OUTPUT') return 0
  const v = p.pwm ? p.duty : p.out
  return low ? 1 - v : v
}
const running = () => (eng()?.arduinoRunning() ? 1 : 0)

function makeBoard({ def, W, D, color, title, titleAt = [0, 0], spacers, Parts, leds, pinName = (id) => id.split('.')[0] }) {
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
          ctx.fillText(pinName(p.id), x, z + (p.pos[2] > 0 ? -32 : 32))
        }
        ctx.font = 'bold 34px Arial'
        ctx.fillText(title, (titleAt[0] + W / 2) * PX, (titleAt[1] + D / 2) * PX)
        for (const l of leds) if (l.label) (ctx.font = 'bold 18px Arial'), ctx.fillText(l.label, (l.pos[0] + 0.3 + W / 2) * PX, (l.pos[2] + D / 2) * PX)
      },
      [def.type],
      Math.round(W * PX),
      Math.round(D * PX),
    )
    return (
      <group>
        {spacers.map(([z, n, x = 0]) => (
          <Box key={`${z}${x}`} size={[n * PITCH, BY, 0.25]} pos={[x, BY / 2, z]} color="#111" />
        ))}
        <mesh position={[0, BY + T / 2, 0]} castShadow receiveShadow geometry={geo(`${def.type}Pcb`, () => new RoundedBoxGeometry(W, T, D, 2, 0.04))} material={pcbMat(color)} />
        <mesh position={[0, TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[W, D]} />
          <meshBasicMaterial map={silk} transparent />
        </mesh>
        {def.pins.map((p) => (
          <group key={p.id}>
            <Cyl r={0.085} h={0.02} pos={[p.pos[0], TOP + 0.01, p.pos[2]]} color={METAL.gold} metal={1} rough={0.3} seg={12} />
            <Cyl r={0.06} r2={0.035} h={0.06} pos={[p.pos[0], TOP + 0.04, p.pos[2]]} color={METAL.tin} metal={1} rough={0.25} seg={10} />
          </group>
        ))}
        <Parts />
        {leds.map((l) => (
          <GlowLed key={l.pos.join()} pos={l.pos} size={[0.12, 0.06, 0.08]} color={l.color} read={l.read} />
        ))}
      </group>
    )
  }
  function Overlay2D({ info }) {
    const on = running()
    return (
      <g pointerEvents="none">
        {leds.map((l) => (
          <Glow2D key={l.pos.join()} info={info} pos={l.pos} color={l.color} on={!!on && l.read() > 0.05} r={5} />
        ))}
      </g>
    )
  }
  return { type: def.type, Model, Overlay2D }
}

// ---------------- ATtiny85 (DIP-8) ----------------
const DIP = { w: 1.0, d: 0.65, y0: 0.12, h: 0.33 }
function AttinyModel() {
  const label = useLabel([{ text: 'ATTINY85', font: 'bold 84px Arial' }], 512, 128)
  const top = DIP.y0 + DIP.h
  return (
    <group>
      {ATTINY_DEF.pins.map((p) => {
        const s = Math.sign(p.pos[2])
        return (
          <group key={p.id}>
            <Leg from={p.pos} to={[p.pos[0], DIP.y0 + 0.12, p.pos[2]]} r={0.025} />
            <Box size={[0.1, 0.03, 0.08]} pos={[p.pos[0], DIP.y0 + 0.12, s * (DIP.d / 2 + 0.03)]} color="#c9c9c9" metal={0.8} rough={0.3} />
          </group>
        )
      })}
      <Box size={[DIP.w, DIP.h, DIP.d]} pos={[0, DIP.y0 + DIP.h / 2, 0]} color="#1a1a1a" rough={0.55} />
      <Cyl r={0.09} h={0.02} pos={[-DIP.w / 2 + 0.02, top + 0.001, 0]} color="#050505" seg={20} />
      <Cyl r={0.04} h={0.01} pos={[-DIP.w / 2 + 0.15, top + 0.001, 0.18]} color="#3a3a3a" seg={16} />
      <mesh position={[0.06, top + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.8, 0.2]} />
        <meshBasicMaterial map={label} transparent color="#d8d8d8" />
      </mesh>
    </group>
  )
}

// ---------------- Franzininho ----------------
const FW = FRANZ.W
const franzLeds = [
  { pos: [-0.2, TOP + 0.04, -0.15], color: '#ff3030', read: running, label: 'ON' },
  { pos: [0.6, TOP + 0.04, -0.15], color: '#3399ff', read: pinLevel(1), label: 'P1' },
]
function FranzParts() {
  return (
    <group>
      {/* língua USB-A na ponta esquerda (a própria placa com os 4 contactos) */}
      <Box size={[1.2, T, 1.2]} pos={[-FW / 2 - 0.6, BY + T / 2, 0]} color="#1e4fa8" rough={0.6} />
      {[-0.39, -0.13, 0.13, 0.39].map((z, i) => (
        <Box key={z} size={[0.75, 0.01, i === 0 || i === 3 ? 0.18 : 0.14]} pos={[-FW / 2 - 0.62, TOP + 0.005, z]} color={METAL.gold} metal={1} rough={0.3} />
      ))}
      <Chip pos={[0.9, TOP, 0.05]} size={[0.5, 0.1, 0.4]} n={4} label="TINY85" />
      {/* regulador 78L05 (TO-92) e condensadores */}
      <Cyl r={0.2} h={0.45} pos={[-0.85, TOP + 0.225, -0.35]} color="#111" seg={20} />
      <Cyl r={0.15} h={0.4} pos={[-1.4, TOP + 0.2, 0.35]} color="#1d4ed8" seg={18} />
      <Box size={[0.2, 0.08, 0.1]} pos={[-1.3, TOP + 0.04, -0.4]} color="#c8a36b" />
      <Box size={[0.2, 0.08, 0.1]} pos={[0.15, TOP + 0.04, 0.4]} color="#c8a36b" />
      {/* díodos zener da USB */}
      {[-0.1, 0.15].map((x) => (
        <Box key={x} size={[0.22, 0.08, 0.12]} pos={[x - 0.3, TOP + 0.04, 0.38]} color="#222" />
      ))}
    </group>
  )
}

// ---------------- Arduino Nano RP2040 Connect ----------------
const NW = 4.5
const ND = 1.85
const nrpLeds = [
  { pos: [-0.95, TOP + 0.04, 0.35], color: '#33ff66', read: running, label: 'ON' },
  { pos: [-0.95, TOP + 0.04, -0.35], color: '#ffaa00', read: pinLevel(13), label: 'L' },
]
function NrpParts() {
  return (
    <group>
      <MicroUsb pos={[-NW / 2 + 0.3, TOP, 0]} size={[0.75, 0.3, 0.78]} />
      {/* módulo u-blox NINA-W102 (blindagem metálica) */}
      <Box size={[1.05, 0.22, 1.0]} pos={[1.3, TOP + 0.11, 0]} color={METAL.nickel} metal={0.9} rough={0.35} />
      <Box size={[0.25, 0.23, 1.0]} pos={[1.95, TOP + 0.115, 0]} color="#e6e6e6" rough={0.5} />
      <Chip pos={[0.15, TOP, 0]} size={[0.7, 0.09, 0.7]} pkg="qfp" n={10} label="RP2040" />
      <Chip pos={[-0.55, TOP, 0.42]} size={[0.32, 0.08, 0.26]} n={3} />
      <Chip pos={[-0.55, TOP, -0.42]} size={[0.28, 0.08, 0.28]} pkg="qfp" n={3} />
      <Crystal pos={[0.15, TOP, -0.62]} l={0.3} h={0.08} d={0.16} />
      <TactSwitch pos={[-1.45, TOP, -0.45]} size={0.3} cap="#f2f2f2" />
    </group>
  )
}

// ---------------- STM32 Blue Pill ----------------
const BW = BLUEPILL_W
const BD = 2.28
const bpLeds = [
  { pos: [-1.2, TOP + 0.04, 0.4], color: '#ff3030', read: running, label: 'PWR' },
  { pos: [-1.2, TOP + 0.04, -0.4], color: '#33ff66', read: pinLevel(32, true), label: 'PC13' },
]
function BpParts() {
  return (
    <group>
      <MicroUsb pos={[-BW / 2 + 0.3, TOP, 0]} size={[0.75, 0.3, 0.78]} />
      <Chip pos={[0.4, TOP, 0]} size={[0.75, 0.1, 0.75]} pkg="qfp" n={12} rotY={Math.PI / 4} label="STM32" />
      <Crystal pos={[-0.55, TOP, 0.0]} l={0.5} h={0.14} d={0.2} rotY={Math.PI / 2} />
      {/* jumpers BOOT0 / BOOT1 (amarelos) e botão de reset */}
      {[-0.13, 0.13].map((z) => (
        <group key={z}>
          {[0, 1, 2].map((i) => (
            <Box key={i} size={[0.06, 0.5, 0.06]} pos={[1.6 + i * PITCH, TOP + 0.25, z * 2.4]} color={METAL.gold} metal={1} rough={0.25} />
          ))}
          <Box size={[0.22, 0.32, 0.22]} pos={[1.6 + PITCH * 0.5, TOP + 0.4, z * 2.4]} color="#f2c200" rough={0.5} />
        </group>
      ))}
      <TactSwitch pos={[-1.75, TOP, 0.45]} size={0.36} cap="#f2f2f2" />
      <Chip pos={[-1.75, TOP, -0.4]} size={[0.3, 0.08, 0.25]} n={2} />
      {/* conector SWD (4 pinos) na ponta direita */}
      {[-1.5, -0.5, 0.5, 1.5].map((k) => (
        <Box key={k} size={[0.06, 0.5, 0.06]} pos={[BW / 2 - 0.2, TOP + 0.25, k * PITCH]} color={METAL.gold} metal={1} rough={0.25} />
      ))}
    </group>
  )
}

export default [
  { type: 'attiny85', Model: AttinyModel },
  makeBoard({ def: FRANZININHO_DEF, W: FW, D: FRANZ.D, color: '#1e4fa8', title: 'Franzininho', titleAt: [0.3, 0.15], spacers: [[0.85, 6, 0.335], [-0.85, 3, 0.954]], Parts: FranzParts, leds: franzLeds }),
  makeBoard({ def: NANO_RP2040_DEF, W: NW, D: ND, color: '#0e8a8f', title: 'NANO RP2040', titleAt: [0.15, 0.62], spacers: [[0.762, 15], [-0.762, 15]], Parts: NrpParts, leds: nrpLeds, pinName: (id) => (id === 'D0' ? 'RX' : id === 'D1' ? 'TX' : id.split('.')[0]) }),
  makeBoard({ def: BLUEPILL_DEF, W: BW, D: BD, color: '#1b4fb8', title: 'BLUE PILL', titleAt: [0.4, 0.55], spacers: [[0.762, 20], [-0.762, 20]], Parts: BpParts, leds: bpLeds, pinName: (id) => id.split('.')[0].replace(/^P(?=[ABC])/, '') }),
]
