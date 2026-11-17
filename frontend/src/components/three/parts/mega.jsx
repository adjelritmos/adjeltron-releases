// Arduino Mega 2560: placa azul-petróleo de 101,6 × 53,3 mm, USB-B e jack à esquerda,
// ATmega2560 (TQFP-100) ao centro e conectores fêmea pretos nas posições exatas dos
// pinos do catálogo (incluindo o conector duplo 2×18 na ponta direita).
import { Box, Cyl, GlowLed, Standoff, useCanvasTexture, eng, PITCH, geo, pcbMat, METAL, UsbB, BarrelJack, Chip, Crystal, TactSwitch } from '../kit.jsx'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

import def from '@shared/parts/mega.js'
import { Glow2D } from './group-c-ui.jsx'

const W = 10.16
const D = 5.33
const PCB_Y = 1.08 // centro da placa (como o Uno)
const TOP = PCB_Y + 0.08
const HDR_H = 0.85
const HDR_Y = 1.95 - HDR_H / 2 + 0.055 // topo dos conectores ≈ altura dos pinos (1,95)
const LED_ON = [-2.9, TOP + 0.04, -1.2]
const LED_L = [-2.25, TOP + 0.04, -1.75]
const PX = 120 // px por cm na serigrafia
const pinOf = Object.fromEntries(def.pins.map((p) => [p.id, p]))

const pin13 = () => {
  const e = eng()
  if (!e || !e.arduinoRunning()) return 0
  const p = e.pins[13]
  return p?.mode === 'OUTPUT' ? (p.pwm ? p.duty : p.out) : 0
}

// conectores fêmea: cada grupo de pinos consecutivos é um bloco preto
const GROUPS = [
  ['D0', 'D7'], ['D8', 'SCL'], ['D14', 'D21'], ['IOREF', 'VIN'], ['A0', 'A7'], ['A8', 'A15'],
]
function headerBox([a, b]) {
  const pa = pinOf[a].pos
  const pb = pinOf[b].pos
  const len = Math.abs(pa[0] - pb[0]) + PITCH
  return { size: [len, HDR_H, PITCH], pos: [(pa[0] + pb[0]) / 2, HDR_Y, pa[2]] }
}

function Model() {
  const silk = useCanvasTexture(
    (ctx) => {
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const X = (x) => (x + W / 2) * PX
      const Z = (z) => (z + D / 2) * PX
      ctx.font = 'bold 13px Arial'
      for (const p of def.pins) {
        const name = p.id.split('.')[0].replace(/^D(\d)/, '$1')
        const [x, , z] = p.pos
        if (x > 4.3) {
          // conector duplo: etiquetas à esquerda (pares) / em cima-baixo
          if (x < 4.6) ctx.fillText(name, X(x) - 24, Z(z))
          continue
        }
        ctx.save()
        ctx.translate(X(x), Z(z) + (z > 0 ? -26 : 26))
        ctx.rotate(-Math.PI / 2)
        ctx.fillText(name, 0, 0)
        ctx.restore()
      }
      ctx.font = 'bold 15px Arial'
      ctx.fillText('PWM', X(0.36), Z(-1.85))
      ctx.fillText('COMMUNICATION', X(2.6), Z(-1.85))
      ctx.fillText('POWER', X(-2.15), Z(1.85))
      ctx.fillText('ANALOG IN', X(1.6), Z(1.85))
      ctx.fillText('DIGITAL', X(3.75), Z(-0.6))
      ctx.font = 'bold 44px Arial'
      ctx.fillText('ARDUINO', X(-1.6), Z(0.15))
      ctx.font = 'bold 34px Arial'
      ctx.fillText('MEGA 2560', X(2.0), Z(0.75))
      ctx.font = 'bold 13px Arial'
      ctx.fillText('ON', X(LED_ON[0]) + 18, Z(LED_ON[2]))
      ctx.fillText('L', X(LED_L[0]) + 14, Z(LED_L[2]))
    },
    ['mega'],
    Math.round(W * PX),
    Math.round(D * PX),
  )
  const dbl = [pinOf['5V.2'].pos, pinOf['GND.5'].pos]
  return (
    <group>
      {[[-4.6, -2.2], [4.6, -2.2], [-4.6, 2.2], [4.0, 2.2]].map(([x, z], i) => (
        <Standoff key={i} x={x} z={z} h={1.0} />
      ))}
      <mesh position={[0, PCB_Y, 0]} castShadow receiveShadow geometry={geo('megaPcb', () => new RoundedBoxGeometry(W, 0.16, D, 2, 0.04))} material={pcbMat('#04858f')} />
      <mesh position={[0, TOP + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshBasicMaterial map={silk} transparent />
      </mesh>
      {/* USB-B, jack de alimentação, regulador, ATmega16U2 */}
      <UsbB pos={[-W / 2 + 0.38, 1.71 - 0.55, -1.3]} />
      <BarrelJack pos={[-W / 2 + 0.43, 1.71 - 0.55, 1.65]} />
      <Box size={[0.6, 0.3, 0.8]} pos={[-3.85, 1.31, 0.6]} color="#222" />
      <Chip pos={[-3.3, TOP, -1.2]} size={[0.5, 0.08, 0.5]} pkg="qfn" n={8} rotY={Math.PI / 4} label="16U2" />
      {/* cristal e botão de reset */}
      <Crystal pos={[-1.6, TOP, 1.05]} l={0.7} h={0.3} d={0.3} />
      <TactSwitch pos={[-4.0, 1.29 - 0.125, -2.0]} size={0.5} cap="#b71c1c" />
      {/* ATmega2560 (TQFP-100, rodado 45°) com as patilhas */}
      <Chip pos={[0.5, TOP, -0.35]} size={[1.3, 0.12, 1.3]} pkg="qfp" n={25} rotY={Math.PI / 4} label="ATMEGA2560" />
      {/* ICSP 2×3 junto à ponta direita */}
      {[0, 1, 2].map((i) =>
        [-0.127, 0.127].map((dz) => <Box key={`${i}${dz}`} size={[0.06, 0.6, 0.06]} pos={[3.75 + dz, TOP + 0.3, 0.6 + (i - 1) * PITCH]} color={METAL.gold} metal={1} rough={0.25} />),
      )}
      {/* conectores fêmea */}
      {GROUPS.map((g) => {
        const h = headerBox(g)
        return <Box key={g[0]} size={h.size} pos={h.pos} color="#111" />
      })}
      <Box size={[2 * PITCH, HDR_H, Math.abs(dbl[1][2] - dbl[0][2]) + PITCH]} pos={[(dbl[0][0] + dbl[1][0]) / 2, HDR_Y, (dbl[0][2] + dbl[1][2]) / 2]} color="#111" />
      {/* furos dos conectores */}
      {def.pins.map((p) => (
        <Box key={p.id} size={[0.1, 0.01, 0.1]} pos={[p.pos[0], HDR_Y + HDR_H / 2 + 0.006, p.pos[2]]} color="#000" />
      ))}
      <GlowLed pos={LED_ON} color="#33ff66" read={() => (eng()?.arduinoRunning() ? 1 : 0)} />
      <GlowLed pos={LED_L} color="#ffaa00" read={pin13} />
    </group>
  )
}

function Overlay2D({ info }) {
  const running = !!eng()?.arduinoRunning()
  return (
    <g pointerEvents="none">
      <Glow2D info={info} pos={LED_ON} color="#33ff66" on={running} r={5} />
      <Glow2D info={info} pos={LED_L} color="#ffaa00" on={running && pin13() > 0.05} r={5} />
    </g>
  )
}

export default { type: 'mega', Model, Overlay2D }
