// ESP32 formato Uno (Wemos D1 R32): contorno e conectores do Uno, placa preta com o
// módulo ESP-WROOM-32 (blindagem + antena), micro-USB e jack à esquerda, LED azul no GPIO2.
import { Box, Cyl, GlowLed, useCanvasTexture, eng, EspModule, MicroUsb, BarrelJack, Chip, TactSwitch } from '../kit.jsx'
import { FemaleHeader } from '../kit.jsx'
import { ShapePlate, UNO, UNO_OUTLINE, UNO_HOLES, UNO_HEADERS } from '../models.jsx'
import def from '@shared/parts/esp32Uno.js'

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
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `bold ${0.32 * PX}px Arial`
      ctx.fillText('WeMos D1 R32', X(-1.0), Z(1.3))
      ctx.font = `${0.16 * PX}px Arial`
      for (const p of def.pins) {
        const io = p.label.match(/IO\d+/)?.[0] || p.label.split(' ')[0]
        ctx.fillText(io, X(p.pos[0]), Z(p.pos[2] + (p.pos[2] < 0 ? 0.38 : -0.38)))
      }
    },
    ['r32-silk-1'],
    1372,
    1068,
  )
  return (
    <group>
      {UNO_HOLES.map(([x, z], i) => (
        <Cyl key={i} r={0.22} h={B} pos={[x, B / 2, z]} color="#efefea" rough={0.6} seg={12} />
      ))}
      <ShapePlate pts={UNO_OUTLINE} top={T - 0.002} t={T - B} color="#141414" />
      <mesh position={[0, T + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6.858, 5.334]} />
        <meshBasicMaterial map={silk} transparent alphaTest={0.4} />
      </mesh>
      {/* módulo ESP-WROOM-32 (antena para +x, sobre uma zona sem cobre) */}
      <Box size={[0.75, 0.004, 1.9]} pos={[1.95, T + 0.002, 0.2]} color="#0b0b0b" />
      <EspModule pos={[1.0, T, 0.2]} l={2.55} w={1.8} title="ESP-WROOM-32" sub="WEMOS D1 R32" />
      {/* micro-USB, jack, regulador, ponte USB-série e botões */}
      <MicroUsb pos={[-3.2, T, -1.2]} size={[0.6, 0.3, 0.8]} />
      <BarrelJack pos={[-3.0, T, 1.85]} />
      <Chip pos={[-1.9, T, 0.9]} size={[0.65, 0.18, 0.5]} n={3} label="1117" />
      <Chip pos={[-1.6, T, -0.6]} size={[0.5, 0.08, 0.5]} pkg="qfn" n={7} label="CH340" />
      {[-0.4, 0.4].map((z) => (
        <TactSwitch key={z} pos={[-2.2, T, z - 0.4]} size={0.35} round={false} cap="#2a2a2a" />
      ))}
      {UNO_HEADERS.map((hd, i) => (
        <FemaleHeader key={i} n={hd.n} x={hd.x} z={hd.z} top={top} h={top - T} />
      ))}
      <GlowLed pos={[-1.2, T + 0.03, -1.6]} size={[0.16, 0.06, 0.08]} color="#ff3b3b" read={() => (eng()?.arduinoRunning() ? 1 : 0)} />
      <GlowLed pos={[-1.2, T + 0.03, -1.35]} size={[0.16, 0.06, 0.08]} color="#3b7bff" read={gpio2} />
    </group>
  )
}

export default { type: 'esp32Uno', Model }
