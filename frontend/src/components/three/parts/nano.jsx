// Arduino Nano: placa azul de 43 × 18 mm com 2 filas de 15 pinos (por baixo), mini-USB
// à esquerda (−x), ATmega328P, botão de reset e LEDs ON / L (pino 13).
import { Box, Cyl, GlowLed, useCanvasTexture, eng, PITCH, geo, pcbMat, METAL, MicroUsb, Chip, Crystal, TactSwitch } from '../kit.jsx'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

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
    (ctx, w, h) => {
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
      ctx.fillText(title, (0.95 + W / 2) * PX, (0.0 + D / 2) * PX)
      ctx.font = 'bold 20px Arial'
      ctx.fillText('ON', (LED_ON[0] + 0.35 + W / 2) * PX, (LED_ON[2] + D / 2) * PX)
      ctx.fillText('L', (LED_L[0] + 0.3 + W / 2) * PX, (LED_L[2] + D / 2) * PX)
    },
    [key],
    Math.round(W * PX),
    Math.round(D * PX),
  )
  return (
    <group>
      {/* espaçadores de plástico dos pinos (por baixo) */}
      {[-0.762, 0.762].map((z) => (
        <Box key={z} size={[15 * PITCH, BY, 0.25]} pos={[0, BY / 2, z]} color="#111" />
      ))}
      <mesh position={[0, BY + T / 2, 0]} castShadow receiveShadow geometry={geo('nanoPcb', () => new RoundedBoxGeometry(W, T, D, 2, 0.04))} material={pcbMat(pcb)} />
      <mesh position={[0, TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshBasicMaterial map={silk} transparent />
      </mesh>
      {/* furos metalizados com os pinos soldados */}
      {def.pins.map((p) => (
        <group key={p.id}>
          <Cyl r={0.085} h={0.02} pos={[p.pos[0], TOP + 0.01, p.pos[2]]} color={METAL.gold} metal={1} rough={0.3} seg={12} />
          <Cyl r={0.06} r2={0.035} h={0.06} pos={[p.pos[0], TOP + 0.04, p.pos[2]]} color={METAL.tin} metal={1} rough={0.25} seg={10} />
        </group>
      ))}
      {/* mini-USB */}
      <MicroUsb pos={[-W / 2 + 0.35, TOP, 0]} size={[0.9, 0.4, 0.78]} />
      {/* ATmega328P (QFP-32, rodado 45°) */}
      <Chip pos={[0.35, TOP, 0]} size={[0.62, 0.1, 0.62]} pkg="qfp" n={8} rotY={Math.PI / 4} label="MEGA328P" />
      <Crystal pos={[-0.35, TOP, -0.42]} l={0.4} h={0.1} d={0.2} />
      {/* conversor USB-série e regulador */}
      <Chip pos={[-1.35, TOP, 0.0]} size={[0.5, 0.08, 0.38]} n={8} label="CH340" />
      <Chip pos={[1.45, TOP, 0.38]} size={[0.25, 0.08, 0.3]} n={2} rotY={Math.PI / 2} />
      {/* botão de reset */}
      <TactSwitch pos={[-0.35, TOP, 0.35]} size={0.34} cap="#f2f2f2" />
      {/* ICSP 2×3 (pinos soltos, ou com o plástico amarelo da Keyestudio) */}
      {icsp === 'yellow' && <Box size={[3 * PITCH, 0.25, 2 * PITCH]} pos={[W / 2 - 0.3 - PITCH, TOP + 0.125, 0]} color="#f2c21b" rough={0.45} />}
      {[0, 1, 2].map((i) =>
        [-0.127, 0.127].map((z) => <Box key={`${i}${z}`} size={[0.06, 0.5, 0.06]} pos={[W / 2 - 0.3 - i * PITCH, TOP + 0.25, z]} color={METAL.gold} metal={1} rough={0.25} />),
      )}
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
