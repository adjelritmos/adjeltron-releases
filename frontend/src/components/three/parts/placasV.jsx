// Placas vindas do catálogo do Velxio: ATtiny85 (DIP-8), Franzininho, Arduino Nano RP2040 Connect
// e STM32 Blue Pill. As placas com pinos usam o mesmo desenho da Nano: espaçadores por baixo,
// PCB com serigrafia (nome de cada pino junto ao furo), furos com os pinos soldados e LEDs que
// leem o pino verdadeiro (LED da placa) e a alimentação. Furos metalizados e soldas numa só
// malha, passivos SMD na disposição típica de cada placa.
import { Box, RBox, Cyl, GlowLed, useCanvasTexture, eng, PITCH, METAL, MicroUsb, Chip, Crystal, TactSwitch, geo, mat, silkMat, THREE } from '../kit.jsx'
import { PcbPlate, PlatedHoles, PinBlocks, PinField, Smds, Sot23, DipIc, MarkText } from './_boardKit.jsx'
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

function makeBoard({ def, W, D, color, title, titleAt = [0, 0], spacers, Parts, leds, smds = [], holes = [], pinName = (id) => id.split('.')[0] }) {
  const pts = def.pins.map((p) => [p.pos[0], p.pos[2]])
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
        {/* barras de pinos por baixo (plástico segmentado) */}
        {spacers.length > 0 && <PinBlocks id={def.type} pts={pts} y={0} h={BY} />}
        <PcbPlate id={def.type} w={W} d={D} t={T} y={BY} r={0.05} holes={holes} color={color} />
        <mesh position={[0, TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[W, D]} />
          <meshBasicMaterial map={silk} transparent />
        </mesh>
        <PlatedHoles id={def.type} pts={pts} y={TOP} />
        {smds.length > 0 && <Smds id={def.type} y={TOP} items={smds} />}
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
const ATTINY_LINES = [{ text: 'ATTINY85', font: 'bold 84px Arial', y: 58 }, { text: '20PU', font: 'bold 54px Arial', y: 122 }]
function AttinyModel() {
  return <DipIc pins={ATTINY_DEF.pins} len={1.0} lines={ATTINY_LINES} />
}

// ---------------- Franzininho ----------------
const FW = FRANZ.W
// condensadores 1206, resistências e díodos zener (SOD-123) da USB
const franzSmds = [[-1.3, -0.4, 0, 'K'], [0.15, 0.4, 0, 'K'], [-0.4, 0.38, 0, 'd'], [-0.15, 0.38, 0, 'd'], [-0.2, -0.42, 0, 'R'], [0.6, -0.42, 0, 'R'], [0.35, 0.05, 1, 'R']]
const franzLeds = [
  { pos: [-0.2, TOP + 0.04, -0.15], color: '#ff3030', read: running, label: 'ON' },
  { pos: [0.6, TOP + 0.04, -0.15], color: '#3399ff', read: pinLevel(1), label: 'P1' },
]
// corpo TO-92 (meia-lua: face plana com a marcação virada para −z)
const to92Geo = () =>
  geo('to92', () => {
    const sh = new THREE.Shape()
    const a0 = Math.asin(0.075 / 0.2)
    sh.absarc(0, 0, 0.2, a0, Math.PI - a0, true)
    sh.closePath()
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.45, bevelEnabled: false, curveSegments: 16 })
    g.rotateX(-Math.PI / 2)
    return g
  })
function FranzParts() {
  return (
    <group>
      {/* língua USB-A na ponta esquerda (a própria placa com os 4 contactos) */}
      <Box size={[1.2, T, 1.2]} pos={[-FW / 2 - 0.6, BY + T / 2, 0]} color="#1e4fa8" rough={0.6} />
      {[-0.39, -0.13, 0.13, 0.39].map((z, i) => (
        <Box key={z} size={[0.75, 0.01, i === 0 || i === 3 ? 0.18 : 0.14]} pos={[-FW / 2 - 0.62, TOP + 0.005, z]} color={METAL.gold} metal={1} rough={0.3} />
      ))}
      <Chip pos={[0.9, TOP, 0.05]} size={[0.5, 0.1, 0.4]} n={4} label="TINY85" />
      {/* regulador 78L05 (TO-92: face plana virada para −z) e eletrolítico */}
      <group position={[-0.85, TOP, -0.35]}>
        <mesh position={[0, 0.08, 0]} castShadow geometry={to92Geo()} material={mat('#151515', 0, 0.45)} />
        <mesh position={[0, 0.3, -0.076]} rotation={[0, Math.PI, 0]} geometry={geo('plane1', () => new THREE.PlaneGeometry(1, 1))} scale={[0.3, 0.12, 1]} material={silkMat([{ text: '78L05', font: 'bold 60px Arial' }], 256, 96, '#bdbdbd')} />
      </group>
      <Cyl r={0.15} h={0.4} pos={[-1.4, TOP + 0.2, 0.35]} color="#1d4ed8" seg={18} />
      <Cyl r={0.14} h={0.01} pos={[-1.4, TOP + 0.405, 0.35]} color={METAL.alu} metal={1} rough={0.35} seg={18} />
    </group>
  )
}

// ---------------- Arduino Nano RP2040 Connect ----------------
const NW = 4.5
const ND = 1.85
const nrpHoles = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx * (NW / 2 - 0.13), sz * 0.762, 0.089]))
const nrpSmds = [[-1.2, 0, 1, 'C'], [-0.95, 0, 1, 'c'], [0.6, 0.5, 1, 'c'], [0.6, -0.5, 1, 'c'], [-0.25, 0.6, 0, 'c'], [0.45, -0.62, 0, 'c'], [-1.45, 0.3, 0, 'r'], [-0.7, 0.12, 0, 'r']]
// cristal SMD de 12 MHz (tampa metálica)
const SmdXtal = ({ pos }) => (
  <group position={pos}>
    <Box size={[0.32, 0.04, 0.25]} pos={[0, 0.02, 0]} color="#d9cfb8" />
    <Box size={[0.29, 0.035, 0.22]} pos={[0, 0.055, 0]} color={METAL.nickel} metal={1} rough={0.28} />
  </group>
)
const nrpLeds = [
  { pos: [-0.95, TOP + 0.04, 0.35], color: '#33ff66', read: running, label: 'ON' },
  { pos: [-0.95, TOP + 0.04, -0.35], color: '#ffaa00', read: pinLevel(13), label: 'L' },
]
function NrpParts() {
  return (
    <group>
      <MicroUsb pos={[-NW / 2 + 0.3, TOP, 0]} size={[0.75, 0.3, 0.78]} />
      {/* módulo u-blox NINA-W102 (blindagem metálica com a etiqueta gravada) e a antena */}
      <Box size={[1.05, 0.22, 1.0]} pos={[1.3, TOP + 0.11, 0]} color={METAL.nickel} metal={1} rough={0.32} />
      <MarkText lines={[{ text: 'u-blox', font: 'bold 52px Arial', y: 40 }, { text: 'NINA-W102', font: 'bold 44px Arial', y: 92 }, { text: 'IC 8595A', font: '30px Arial', y: 134 }]} px={[256, 160]} pos={[1.3, TOP + 0.222, 0]} w={0.85} d={0.53} rotY={-Math.PI / 2} color="#5d6166" />
      <Box size={[0.25, 0.23, 1.0]} pos={[1.95, TOP + 0.115, 0]} color="#1a1a1a" rough={0.5} />
      <Chip pos={[0.15, TOP, 0]} size={[0.7, 0.09, 0.7]} pkg="qfp" n={10} label="RP2040" />
      <Chip pos={[-0.55, TOP, 0.42]} size={[0.32, 0.08, 0.26]} n={3} />
      <Chip pos={[-0.55, TOP, -0.42]} size={[0.28, 0.08, 0.28]} pkg="qfp" n={3} />
      <SmdXtal pos={[0.15, TOP, -0.62]} />
      <TactSwitch pos={[-1.45, TOP, -0.45]} size={0.3} cap="#f2f2f2" />
    </group>
  )
}

// ---------------- STM32 Blue Pill ----------------
const BW = BLUEPILL_W
const BD = 2.28
const BP_JMP = [0, 1, 2].flatMap((i) => [-0.312, 0.312].map((z) => [1.6 + i * PITCH, z]))
const BP_SWD = [-1.5, -0.5, 0.5, 1.5].map((k) => [BW / 2 - 0.2, k * PITCH])
const bpSmds = [[-1.2, 0.15, 0, 'r'], [-1.2, -0.15, 0, 'r'], [-0.95, 0.45, 1, 'c'], [-0.95, -0.45, 1, 'c'], [-0.2, 0.5, 0, 'c'], [-0.2, -0.5, 0, 'c'], [1.0, 0.55, 1, 'c'], [1.0, -0.55, 1, 'c'], [-1.45, 0, 1, 'C'], [-2.0, 0.55, 0, 'r']]
const bpLeds = [
  { pos: [-1.2, TOP + 0.04, 0.4], color: '#ff3030', read: running, label: 'PWR' },
  { pos: [-1.2, TOP + 0.04, -0.4], color: '#33ff66', read: pinLevel(32, true), label: 'PC13' },
]
function BpParts() {
  return (
    <group>
      <MicroUsb pos={[-BW / 2 + 0.3, TOP, 0]} size={[0.75, 0.3, 0.78]} />
      <Chip pos={[0.4, TOP, 0]} size={[0.75, 0.1, 0.75]} pkg="qfp" n={12} rotY={Math.PI / 4} label="STM32" />
      {/* cristal de 8 MHz (HC-49/S SMD) e cristal de relógio de 32,768 kHz (cilindro deitado) */}
      <Crystal pos={[-0.55, TOP, 0.0]} l={0.5} h={0.14} d={0.2} rotY={Math.PI / 2} />
      <Cyl r={0.1} h={0.5} pos={[1.3, TOP + 0.1, 0]} rot={[Math.PI / 2, 0, 0]} color={METAL.nickel} metal={1} rough={0.3} seg={14} />
      {/* jumpers BOOT0 / BOOT1 (2 × 3 pinos, capas amarelas) e botão de reset */}
      <PinBlocks id="bp-jmp" pts={BP_JMP} y={TOP} />
      <PinField id="bp-jmp" pts={BP_JMP.map(([x, z]) => [x, TOP + 0.7, z])} y0={TOP - 0.05} />
      {[-0.312, 0.312].map((z) => (
        <RBox key={z} size={[0.5, 0.42, 0.24]} r={0.03} pos={[1.6 + PITCH * 0.5, TOP + 0.5, z]} color="#f2c200" rough={0.5} />
      ))}
      <TactSwitch pos={[-1.75, TOP, 0.45]} size={0.36} cap="#f2f2f2" />
      {/* regulador de 3,3 V (SOT-23-5) */}
      <Sot23 pos={[-1.75, TOP, -0.4]} n={5} label="4A2D" />
      {/* conector SWD (4 pinos) na ponta direita */}
      <PinBlocks id="bp-swd" pts={BP_SWD} y={TOP} />
      <PinField id="bp-swd" pts={BP_SWD.map(([x, z]) => [x, TOP + 0.85, z])} y0={TOP - 0.05} />
    </group>
  )
}

export default [
  { type: 'attiny85', Model: AttinyModel },
  makeBoard({ def: FRANZININHO_DEF, W: FW, D: FRANZ.D, color: '#1e4fa8', title: 'Franzininho', titleAt: [0.3, 0.15], spacers: [[0.85, 6, 0.335], [-0.85, 3, 0.954]], Parts: FranzParts, leds: franzLeds, smds: franzSmds }),
  makeBoard({ def: NANO_RP2040_DEF, W: NW, D: ND, color: '#0e8a8f', title: 'NANO RP2040', titleAt: [0.15, 0.62], spacers: [[0.762, 15], [-0.762, 15]], Parts: NrpParts, leds: nrpLeds, smds: nrpSmds, holes: nrpHoles, pinName: (id) => (id === 'D0' ? 'RX' : id === 'D1' ? 'TX' : id.split('.')[0]) }),
  makeBoard({ def: BLUEPILL_DEF, W: BW, D: BD, color: '#1b4fb8', title: 'BLUE PILL', titleAt: [0.4, 0.55], spacers: [[0.762, 20], [-0.762, 20]], Parts: BpParts, leds: bpLeds, smds: bpSmds, pinName: (id) => id.split('.')[0].replace(/^P(?=[ABC])/, '') }),
]
