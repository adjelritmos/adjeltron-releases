// ESP32 DevKit V1 (DOIT, 30 pinos): placa preta de 51,4 × 28,3 mm, módulo ESP-WROOM-32
// (18 × 25,5 mm, blindagem metálica + antena PCB) com a antena rente à ponta direita (+x),
// micro-USB à esquerda com os botões EN/BOOT de cada lado, regulador AMS1117 (SOT-223),
// ponte USB-série CP2102 (QFN-28), transístores do auto-reset, díodo de proteção, passivos
// 0603 e os LEDs vermelho (alimentação) e azul (GPIO2).
import { GlowLed, useCanvasTexture, eng, EspModule, MicroUsb, TactSwitch, Chip } from '../kit.jsx'
import { PcbPlate, PlatedHoles, PinBlocks, Smds, Sot23, Sot223 } from './_boardKit.jsx'
import def from '@shared/parts/esp32.js'
import { Glow2D } from './group-c-ui.jsx'

const W = 5.15
const D = 2.8
const BY = 0.25
const T = 0.16
const TOP = BY + T
const LED_PWR = [-1.55, TOP + 0.04, 0.55]
const LED_IO2 = [-1.55, TOP + 0.04, -0.55]
const PX = 160
const HOLES = def.pins.map((p) => [p.pos[0], p.pos[2]])
// passivos 0603/0805, díodo SOD-123 (proteção da USB) e condensadores de desacoplamento
const SMDS = [
  [-1.55, 0.3, 1, 'r'], [-1.55, -0.3, 1, 'r'], [-1.3, -0.1, 0, 'r'], [-1.3, 0.1, 0, 'r'],
  [-0.15, -0.55, 0, 'c'], [-0.15, -0.3, 0, 'r'], [-0.12, 0.2, 1, 'c'], [-0.42, 0.75, 1, 'c'],
  [-0.75, 0.05, 0, 'c'], [-0.5, 0.05, 0, 'c'], [-0.85, -0.85, 0, 'r'], [-0.55, -0.85, 0, 'r'],
  [-1.85, 0.1, 1, 'd'], [-0.95, 0.98, 0, 'C'], [-0.12, 0.85, 1, 't'],
]

const gpio2 = () => {
  const e = eng()
  if (!e || !e.arduinoRunning()) return 0
  const p = e.pins[2]
  return p?.mode === 'OUTPUT' ? (p.pwm ? p.duty : p.out) : 0
}

function Model() {
  const silk = useCanvasTexture(
    (ctx) => {
      ctx.fillStyle = '#fff'
      ctx.strokeStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 15px Arial'
      for (const p of def.pins) {
        const x = (p.pos[0] + W / 2) * PX
        const z = (p.pos[2] + D / 2) * PX
        const name = p.id.startsWith('GPIO') ? (p.label.split(' ')[0] || p.id) : p.id.split('.')[0]
        ctx.save()
        ctx.translate(x, z + (p.pos[2] > 0 ? -26 : 26))
        ctx.rotate(-Math.PI / 2)
        ctx.fillText(name, 0, 0)
        ctx.restore()
      }
      ctx.font = 'bold 15px Arial'
      ctx.fillText('EN', (-2.05 + W / 2) * PX, (0.55 + D / 2) * PX)
      ctx.fillText('BOOT', (-2.05 + W / 2) * PX, (-0.55 + D / 2) * PX)
      ctx.font = 'bold 12px Arial'
      ctx.fillText('PWR', (-1.25 + W / 2) * PX, (LED_PWR[2] + 0.16 + D / 2) * PX)
      ctx.fillText('IO2', (-1.25 + W / 2) * PX, (LED_IO2[2] - 0.16 + D / 2) * PX)
      // contorno do módulo e moldura da zona sem cobre por baixo da antena
      ctx.lineWidth = 2
      ctx.strokeRect((0.0 + W / 2) * PX, (-0.95 + D / 2) * PX, 2.6 * PX, 1.9 * PX)
    },
    ['esp32-2'],
    Math.round(W * PX),
    Math.round(D * PX),
  )
  return (
    <group>
      {/* barras de pinos por baixo (plástico segmentado) */}
      <PinBlocks id="esp32" pts={HOLES} y={0} h={BY} />
      <PcbPlate id="esp32" w={W} d={D} t={T} y={BY} r={0.06} color="#141414" />
      <mesh position={[0, TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshBasicMaterial map={silk} transparent />
      </mesh>
      {/* furos metalizados com a ponta do pino e a solda */}
      <PlatedHoles id="esp32" pts={HOLES} y={TOP} />
      {/* módulo ESP-WROOM-32 (25,5 mm ao longo de x), antena rente à ponta da placa */}
      <EspModule pos={[W / 2 - 1.275, TOP, 0]} l={2.55} w={1.8} />
      {/* micro-USB, regulador AMS1117, CP2102 e transístores do auto-reset (S8050, "J3Y") */}
      <MicroUsb pos={[-W / 2 + 0.28, TOP, 0]} size={[0.6, 0.3, 0.8]} />
      <Sot223 pos={[-0.95, TOP, 0.55]} rotY={Math.PI / 2} label="AMS1117" sub="3.3" />
      <Chip pos={[-0.55, TOP, -0.45]} size={[0.5, 0.08, 0.5]} pkg="qfn" n={7} label="CP2102" />
      <Sot23 pos={[-1.1, TOP, -0.3]} label="J3Y" />
      <Sot23 pos={[-1.1, TOP, -0.7]} label="J3Y" />
      <Smds id="esp32" y={TOP} items={SMDS} />
      {/* botões EN e BOOT (SMD 3 × 4 mm) */}
      {[0.85, -0.85].map((z) => (
        <TactSwitch key={z} pos={[-2.05, TOP, z]} size={0.38} round={false} cap="#2a2a2a" />
      ))}
      <GlowLed pos={LED_PWR} size={[0.12, 0.06, 0.08]} color="#ff3b30" read={() => (eng()?.arduinoRunning() ? 1 : 0)} />
      <GlowLed pos={LED_IO2} size={[0.12, 0.06, 0.08]} color="#2a7bff" read={gpio2} />
    </group>
  )
}

function Overlay2D({ info }) {
  const running = !!eng()?.arduinoRunning()
  return (
    <g pointerEvents="none">
      <Glow2D info={info} pos={LED_PWR} color="#ff3b30" on={running} r={5} />
      <Glow2D info={info} pos={LED_IO2} color="#2a7bff" on={running && gpio2() > 0.05} r={6} />
    </g>
  )
}

export default { type: 'esp32', Model, Overlay2D }
