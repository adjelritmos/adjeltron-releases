// ESP32 formato Uno (Wemos D1 R32): contorno, furos e conectores do Uno numa placa preta com o
// módulo ESP-WROOM-32 (blindagem + antena para +x), micro-USB e jack à esquerda, ponte USB-série
// CH340G (SOIC-16) com o cristal de 12 MHz, conversor DC-DC MP2307 com a bobina, regulador
// AMS1117-3.3, condensador eletrolítico SMD, botão RESET e LEDs (alimentação e GPIO2, azul).
import { Cyl, GlowLed, useCanvasTexture, eng, EspModule, MicroUsb, BarrelJack, Chip, Crystal, TactSwitch, ECap, FemaleHeader } from '../kit.jsx'
import { ShapePlate, UNO, UNO_OUTLINE, UNO_HOLES, UNO_HEADERS } from '../models.jsx'
import { PlatedHoles, Smds, Sot223, Inductor } from './_boardKit.jsx'
import def from '@shared/parts/esp32Uno.js'

const HOLE_R = 0.16 // furos de 3,2 mm
const SMDS = [
  [-1.0, -0.15, 0, 'r'], [-1.0, -1.05, 0, 'r'], [-2.3, -0.75, 1, 'c'], [-2.55, -0.75, 1, 'c'],
  [-1.2, -1.85, 0, 'r'], [-1.2, -1.1, 0, 'r'], [-0.6, -0.9, 1, 'c'], [-0.6, -0.45, 1, 'c'],
  [-1.6, 0.3, 0, 'C'], [-1.3, 0.3, 0, 'C'], [-0.9, 0.95, 1, 'R'], [-2.55, 1.0, 1, 'd'],
  [-0.65, 0.4, 0, 'c'], [-0.65, 0.65, 0, 'r'], [-2.0, -1.8, 0, 'r'],
]

const gpio2 = () => {
  const e = eng()
  if (!e || !e.arduinoRunning()) return 0
  const p = e.pins[2]
  return p?.mode === 'OUTPUT' ? (p.pwm ? p.duty : p.out) : 0
}

function Model() {
  const { T, B } = UNO
  const top = def.pins[0].pos[1]
  // serigrafia branca: nome da placa e os GPIO ao lado dos conectores (como na placa real)
  const silk = useCanvasTexture(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h)
      const PX = w / 6.858
      const X = (x) => (x + 3.429) * PX
      const Z = (z) => (z + 2.667) * PX
      ctx.fillStyle = '#f2f2f2'
      ctx.strokeStyle = '#f2f2f2'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `bold ${0.32 * PX}px Arial`
      ctx.fillText('WeMos D1 R32', X(-1.0), Z(1.3))
      ctx.font = `${0.16 * PX}px Arial`
      for (const p of def.pins) {
        const io = p.label.match(/IO\d+/)?.[0] || p.label.split(' ')[0]
        ctx.fillText(io, X(p.pos[0]), Z(p.pos[2] + (p.pos[2] < 0 ? 0.38 : -0.38)))
      }
      ctx.font = `bold ${0.14 * PX}px Arial`
      ctx.fillText('RESET', X(-2.4), Z(0.25))
      ctx.fillText('ON', X(-0.9), Z(-1.6))
      ctx.fillText('IO2', X(-0.9), Z(-1.35))
      // contorno do módulo
      ctx.lineWidth = 0.025 * PX
      ctx.strokeRect(X(-0.33), Z(-0.75), 2.66 * PX, 1.9 * PX)
    },
    ['r32-silk-2'],
    1372,
    1068,
  )
  return (
    <group>
      {UNO_HOLES.map(([x, z], i) => (
        <Cyl key={i} r={0.22} h={B} pos={[x, B / 2, z]} color="#efefea" rough={0.6} seg={12} />
      ))}
      <ShapePlate pts={UNO_OUTLINE} top={T - 0.002} t={T - B} color="#141414" holes={UNO_HOLES.map(([x, z]) => [x, z, HOLE_R])} />
      <PlatedHoles id="r32-mount" pts={UNO_HOLES} y={T - 0.002} r={0.28} hole={HOLE_R} color="#cfd3d8" solder={false} dark={false} />
      <mesh position={[0, T + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6.858, 5.334]} />
        <meshBasicMaterial map={silk} transparent alphaTest={0.4} />
      </mesh>
      {/* módulo ESP-WROOM-32 (antena para +x, sobre uma zona sem cobre) */}
      <mesh position={[1.95, T + 0.002, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.75, 1.9]} />
        <meshStandardMaterial color="#0b0b0b" roughness={0.5} />
      </mesh>
      <EspModule pos={[1.0, T, 0.2]} l={2.55} w={1.8} title="ESP-WROOM-32" sub="WEMOS D1 R32" />
      {/* micro-USB e jack, CH340G + cristal, MP2307 + bobina, AMS1117, eletrolítico e RESET */}
      <MicroUsb pos={[-3.2, T, -1.2]} size={[0.6, 0.3, 0.8]} />
      <BarrelJack pos={[-3.0, T, 1.85]} />
      <Chip pos={[-1.6, T, -0.6]} size={[1.0, 0.15, 0.39]} n={8} label="CH340G" />
      <Crystal pos={[-2.0, T, -1.3]} l={0.9} h={0.35} d={0.4} />
      <Chip pos={[-1.2, T, 1.45]} size={[0.49, 0.15, 0.39]} n={4} label="MP2307" />
      <Inductor pos={[-1.95, T, 1.65]} size={0.5} h={0.3} label="100" />
      <Sot223 pos={[-2.0, T, 0.85]} label="AMS1117" sub="3.3" />
      <ECap pos={[-0.55, T, 1.6]} r={0.3} h={0.55} color="#1b1b1b" stripe="#c9cdd2" />
      <TactSwitch pos={[-2.4, T, -0.2]} size={0.6} cap="#1d1d1d" />
      <Smds id="r32" y={T} items={SMDS} />
      {UNO_HEADERS.map((hd, i) => (
        <FemaleHeader key={i} n={hd.n} x={hd.x} z={hd.z} top={top} h={top - T} />
      ))}
      <GlowLed pos={[-1.2, T + 0.03, -1.6]} size={[0.16, 0.06, 0.08]} color="#ff3b3b" read={() => (eng()?.arduinoRunning() ? 1 : 0)} />
      <GlowLed pos={[-1.2, T + 0.03, -1.35]} size={[0.16, 0.06, 0.08]} color="#3b7bff" read={gpio2} />
    </group>
  )
}

export default { type: 'esp32Uno', Model }
