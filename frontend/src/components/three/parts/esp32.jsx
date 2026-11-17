// ESP32 DevKit V1: placa preta de 51 × 28 mm, módulo ESP-WROOM-32 (blindagem
// metálica + antena PCB) à direita, micro-USB à esquerda, botões EN/BOOT e
// LEDs vermelho (alimentação) e azul (GPIO2).
import { Box, Cyl, GlowLed, useCanvasTexture, eng, PITCH, pcbMat, EspModule, MicroUsb, TactSwitch, Chip, Smd, METAL, geo } from '../kit.jsx'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
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
      ctx.font = 'bold 22px Arial'
      ctx.fillText('ESP32 DEVKIT V1', (-0.7 + W / 2) * PX, (0 + D / 2) * PX)
      ctx.font = 'bold 15px Arial'
      ctx.fillText('EN', (-2.05 + W / 2) * PX, (0.95 + D / 2) * PX)
      ctx.fillText('BOOT', (-2.05 + W / 2) * PX, (-0.95 + D / 2) * PX)
    },
    ['esp32'],
    Math.round(W * PX),
    Math.round(D * PX),
  )
  return (
    <group>
      {/* espaçadores dos pinos (por baixo) */}
      {[-1.27, 1.27].map((z) => (
        <Box key={z} size={[15 * PITCH, BY, 0.25]} pos={[0, BY / 2, z]} color="#111" />
      ))}
      <mesh position={[0, BY + T / 2, 0]} castShadow receiveShadow geometry={geo('esp32Pcb', () => new RoundedBoxGeometry(W, T, D, 2, 0.05))} material={pcbMat('#141414')} />
      <mesh position={[0, TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshBasicMaterial map={silk} transparent />
      </mesh>
      {/* furos metalizados dos pinos com a ponta do pino e a solda */}
      {def.pins.map((p) => (
        <group key={p.id}>
          <Cyl r={0.085} h={0.02} pos={[p.pos[0], TOP + 0.01, p.pos[2]]} color={METAL.gold} metal={1} rough={0.3} seg={12} />
          <Cyl r={0.06} r2={0.035} h={0.05} pos={[p.pos[0], TOP + 0.04, p.pos[2]]} color={METAL.tin} metal={1} rough={0.25} seg={10} />
        </group>
      ))}
      {/* módulo ESP-WROOM-32: blindagem metálica gravada + antena em meandro */}
      <EspModule pos={[1.3, TOP, 0]} l={1.8} w={1.8} />
      {/* micro-USB, regulador AMS1117 (SOT-223), ponte USB-série CP2102 (QFN) e passivos */}
      <MicroUsb pos={[-W / 2 + 0.28, TOP, 0]} size={[0.6, 0.3, 0.8]} />
      <Chip pos={[-1.05, TOP, 0.6]} size={[0.35, 0.12, 0.6]} n={3} rotY={Math.PI / 2} label="1117" />
      <Chip pos={[-0.6, TOP, -0.4]} size={[0.5, 0.08, 0.5]} pkg="qfn" n={7} label="CP2102" />
      {[[-0.15, -0.55, 0], [-0.15, -0.3, 0], [-0.3, 0.45, 1], [-1.55, 0.25, 1], [-1.55, -0.25, 1], [0.1, 0.55, 0]].map(([x, z, r], i) => (
        <Smd key={i} pos={[x, TOP, z]} rotY={r ? Math.PI / 2 : 0} len={0.16} wid={0.09} h={0.05} color={i % 2 ? '#8a6a48' : '#1c1c1c'} />
      ))}
      {/* botões EN e BOOT */}
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
