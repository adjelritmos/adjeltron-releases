// Raspberry Pi Zero 2 W (decorativo), com a disposição da placa real (65 × 30 mm, 4 furos de
// 2,75 mm a 58 × 23 mm): sistema-em-pacote RP3A0 com a tampa metálica, módulo Wi‑Fi/Bluetooth
// blindado, GPIO de 40 pinos com a barra soldada (borda −z), mini-HDMI e 2 micro-USB (borda +z),
// conector de câmara CSI (borda +x), cartão microSD (borda −x), LED ACT e passivos SMD.
import { Box, RBox, HeaderPins, MicroUsb, useLabel } from '../kit.jsx'
import { PcbPlate, Smds } from './_boardKit.jsx'
import { RPIZ } from '@shared/parts/raspberryPiZero2W.js'

const { L, W, pcb } = RPIZ
const TOP = pcb
const STEEL = '#c9ccd0'
const HOLES = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx * 2.9, sz * 1.15]))
// 40 pinos (2 × 20) ao longo da borda −z
const GZ = -W / 2 + 0.35
const GPIO = Array.from({ length: 40 }, (_, i) => ({ id: `g${i}`, pos: [(Math.floor(i / 2) - 9.5) * 0.254, 0, GZ - 0.127 + (i % 2) * 0.254] }))
const SMDS = [
  [-1.8, 0.1, 0, 'c'], [-1.8, 0.35, 0, 'c'], [-1.55, 0.75, 1, 'r'], [0.35, -0.35, 0, 'c'], [0.35, -0.1, 0, 'c'], [0.6, 0.85, 1, 'c'],
  [1.05, -0.55, 0, 'r'], [2.3, 0.1, 1, 'c'], [2.3, -0.5, 0, 'C'], [-2.4, -0.45, 0, 'C'], [-0.2, 1.0, 0, 'r'], [1.9, -0.55, 0, 'c'],
]

function Model() {
  const label = useLabel([{ text: 'Raspberry Pi Zero 2 W', font: 'bold 42px Arial' }], 512, 96)
  const soc = useLabel([{ text: 'Raspberry Pi', font: 'bold 44px Arial', y: 90, color: '#3a3d40' }, { text: 'RP3A0-AU', font: '34px Arial', y: 160, color: '#3a3d40' }], 256, 256)
  return (
    <group>
      <PcbPlate id="rpiz2w" w={L} d={W} t={pcb} y={0} r={0.3} holes={HOLES.map(([x, z]) => [x, z, 0.1375])} color="#1d7a3c" ringColor="#d4af37" />
      <mesh position={[0.2, TOP + 0.002, 1.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.3, 0.43]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
      {/* GPIO 2 × 20 com a barra de pinos soldada */}
      <Box size={[20 * 0.254, 0.25, 2 * 0.254]} pos={[0, TOP + 0.125, GZ]} color="#111" rough={0.5} />
      <HeaderPins pins={GPIO} base={TOP} />
      {/* RP3A0: sistema-em-pacote com a tampa metálica */}
      <Box size={[1.5, 0.06, 1.5]} pos={[-0.75, TOP + 0.03, 0.15]} color="#2a2a2a" rough={0.5} />
      <Box size={[1.3, 0.12, 1.3]} pos={[-0.75, TOP + 0.09, 0.15]} color="#b9bdc2" metal={0.85} rough={0.35} />
      <mesh position={[-0.75, TOP + 0.152, 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.15, 1.15]} />
        <meshBasicMaterial map={soc} transparent />
      </mesh>
      {/* módulo Wi‑Fi / Bluetooth blindado e a antena (recorte triangular dourado na borda) */}
      <Box size={[1.2, 0.16, 1.0]} pos={[1.35, TOP + 0.08, 0.15]} color={STEEL} metal={0.95} rough={0.25} />
      <Box size={[0.7, 0.008, 0.35]} pos={[0.4, TOP + 0.004, 1.3]} color="#d4af37" metal={0.8} rough={0.4} />
      <Smds id="rpiz2w" y={TOP} items={SMDS} />
      {/* mini-HDMI e as duas micro-USB (dados e alimentação) na borda +z */}
      <RBox size={[1.1, 0.33, 0.75]} r={0.05} pos={[-L / 2 + 1.24, TOP + 0.165, W / 2 - 0.3]} color={STEEL} metal={0.9} rough={0.3} />
      <Box size={[0.9, 0.2, 0.02]} pos={[-L / 2 + 1.24, TOP + 0.165, W / 2 + 0.08]} color="#0d0d0d" />
      {[4.14, 5.4].map((x) => (
        <MicroUsb key={x} pos={[-L / 2 + x, TOP, W / 2 - 0.2]} rotY={Math.PI / 2} />
      ))}
      {/* conector de câmara (CSI) na borda +x */}
      <Box size={[0.4, 0.13, 1.7]} pos={[L / 2 - 0.2, TOP + 0.065, 0]} color="#efe8d8" rough={0.6} />
      <Box size={[0.14, 0.15, 1.8]} pos={[L / 2 - 0.05, TOP + 0.075, 0]} color="#1a1a1a" rough={0.5} />
      {/* ranhura do cartão microSD (borda −x) com o cartão metido */}
      <Box size={[1.15, 0.14, 1.2]} pos={[-L / 2 + 0.75, TOP + 0.07, 0.25]} color={STEEL} metal={0.9} rough={0.3} />
      <Box size={[0.5, 0.07, 1.1]} pos={[-L / 2 + 0.05, TOP + 0.06, 0.25]} color="#1b1b1b" rough={0.5} />
      {/* LED ACT (verde) */}
      <Box size={[0.15, 0.06, 0.1]} pos={[L / 2 - 0.85, TOP + 0.03, 1.2]} color="#43a047" />
    </group>
  )
}

export default { type: 'raspberryPiZero2W', Model }
