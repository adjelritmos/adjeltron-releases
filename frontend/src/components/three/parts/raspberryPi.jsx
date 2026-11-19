// Raspberry Pi 4 Model B (decorativo), com a disposição da placa real (85 × 56 mm, 4 furos de
// 2,75 mm a 58 × 49 mm): SoC BCM2711 com tampa metálica e o dissipador de alumínio preto com
// alhetas (como nos robôs PiDog), RAM, módulo WiFi/Bluetooth blindado, controlador USB VL805,
// GPIO de 40 pinos, header PoE, 2 × USB 3.0 (azuis) + 2 × USB 2.0, Ethernet com LEDs e patilha,
// USB-C, 2 × micro-HDMI, áudio, conectores de câmara (CSI) e ecrã (DSI), LEDs PWR/ACT, passivos
// SMD e cartão microSD por baixo; espaçadores de latão (baixos) e espaçadores altos para o HAT.
import { Box, RBox, Cyl, HeaderPins, useLabel, mergedGeo, geo, mat, THREE } from '../kit.jsx'
import { PcbPlate, Smds } from './_boardKit.jsx'
import { RPI } from '@shared/parts/raspberryPi.js'

const { L, W, pcb, standoff, hatY } = RPI
const Y = standoff // face de baixo da PCB
const TOP = Y + pcb
const STEEL = '#c9ccd0'
// furos de fixação (58 × 49 mm)
const HOLES = [[-L / 2 + 0.35, -W / 2 + 0.35], [-L / 2 + 0.35 + 5.8, -W / 2 + 0.35], [-L / 2 + 0.35, -W / 2 + 0.35 + 4.9], [-L / 2 + 0.35 + 5.8, -W / 2 + 0.35 + 4.9]]
// 40 pinos (2 × 20) ao longo da borda −z
const GPIO = Array.from({ length: 40 }, (_, i) => ({ id: `g${i}`, pos: [-L / 2 + 0.8 + Math.floor(i / 2) * 0.254, 0, -W / 2 + 0.33 + (i % 2) * 0.254] }))
// header PoE (2 × 2) junto ao fim do GPIO
const POE = [0, 1, 2, 3].map((i) => ({ id: `p${i}`, pos: [L / 2 - 2.35 + (i % 2) * 0.254, 0, -W / 2 + 0.75 + Math.floor(i / 2) * 0.254] }))

// passivos SMD espalhados à volta do SoC, da RAM e do PMIC
const SMDS = [
  [-0.5, -0.9, 0, 'c'], [-0.2, 1.0, 0, 'r'], [1.2, -0.6, 1, 'c'], [-2.2, 0.2, 1, 'r'], [0.9, 1.0, 0, 'c'], [-0.6, 0.95, 0, 'c'],
  [1.4, 0.35, 1, 'c'], [-0.4, -0.75, 0, 'c'], [-0.4, -0.6, 0, 'c'], [-0.3, 0.85, 1, 'c'], [1.05, -1.05, 0, 'r'], [1.25, -1.05, 0, 'r'],
  [-2.3, 0.5, 0, 'C'], [-2.3, 0.75, 0, 'C'], [-3.35, 0.95, 1, 'C'], [-2.45, 1.25, 0, 'c'], [-2.2, -0.35, 1, 'c'], [2.15, 0.15, 0, 'c'],
  [2.6, 0.65, 1, 'c'], [1.7, 0.65, 1, 'r'], [0.35, -0.75, 0, 'c'], [0.35, 1.05, 0, 'c'], [-1.35, -0.85, 0, 'r'], [-1.35, 0.95, 0, 'r'],
]
// dissipador de alumínio anodizado preto: base de 14 × 14 mm e 9 alhetas (uma só malha)
const HS = { x: -1.35, z: 0.05, base: 1.4, bh: 0.1, fh: 0.62, n: 9 }
const heatsinkGeo = () =>
  mergedGeo('rpiHeatsink', () => {
    const b = geo('gull', () => new THREE.BoxGeometry(1, 1, 1))
    const out = [[b, [0, HS.bh / 2, 0], [0, 0, 0], [HS.base, HS.bh, HS.base]]]
    for (let i = 0; i < HS.n; i++) out.push([b, [(i - (HS.n - 1) / 2) * (HS.base - 0.1) / (HS.n - 1), HS.bh + HS.fh / 2, 0], [0, 0, 0], [0.07, HS.fh, HS.base]])
    return out
  })

// chip com marcação (caixa preta + rótulo por cima)
function Chip({ pos, size, label, sub, color = '#1c1c1c', ink = '#e8e8e8' }) {
  const tex = useLabel([{ text: label, font: 'bold 40px Arial', y: sub ? 52 : 70, color: ink }, ...(sub ? [{ text: sub, font: '26px Arial', y: 96, color: ink }] : [])], 256, 128)
  return (
    <group position={pos}>
      <RBox size={size} r={0.02} pos={[0, size[1] / 2, 0]} color={color} rough={0.5} />
      <mesh position={[0, size[1] + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size[0] * 0.9, size[2] * 0.6]} />
        <meshBasicMaterial map={tex} transparent />
      </mesh>
    </group>
  )
}

// porta USB tipo A dupla (2 aberturas com a lingueta de plástico)
function UsbStack({ z, color }) {
  const x = L / 2 - 0.75
  return (
    <group>
      <Box size={[1.75, 1.55, 1.35]} pos={[x, TOP + 0.78, z]} color={STEEL} metal={0.9} rough={0.3} />
      {[0.42, 1.12].map((y) => (
        <group key={y}>
          {/* abertura escura e lingueta (azul nas USB 3.0, preta nas 2.0) */}
          <Box size={[0.03, 0.55, 1.2]} pos={[L / 2 + 0.115, TOP + y + 0.05, z]} color="#0d0d0d" />
          <Box size={[0.05, 0.18, 1.0]} pos={[L / 2 + 0.11, TOP + y + 0.12, z]} color={color} rough={0.5} />
        </group>
      ))}
    </group>
  )
}

function Model() {
  const label = useLabel([{ text: 'Raspberry Pi 4 Model B', font: 'bold 44px Arial' }, { text: '© Raspberry Pi 2018', font: '26px Arial', y: 200 }], 512, 256)
  return (
    <group>
      {/* espaçadores de latão (baixos) e PCB com os furos metalizados */}
      {HOLES.map(([x, z], i) => (
        <Cyl key={i} r={0.25} h={standoff} pos={[x, standoff / 2, z]} color="#c9a227" metal={0.85} rough={0.3} seg={6} />
      ))}
      <PcbPlate id="rpi4" w={L} d={W} t={pcb} y={Y} r={0.3} holes={HOLES.map(([x, z]) => [x, z, 0.1375])} color="#1d7a3c" ringColor="#d4af37" />
      <mesh position={[-2.2, TOP + 0.002, 1.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.8, 1.4]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
      {/* GPIO 2 × 20 e PoE 2 × 2 */}
      <Box size={[20 * 0.254, 0.25, 2 * 0.254]} pos={[-L / 2 + 0.8 + 9.5 * 0.254, TOP + 0.125, -W / 2 + 0.33 + 0.127]} color="#111" rough={0.5} />
      <HeaderPins pins={GPIO} base={TOP} />
      <Box size={[2 * 0.254, 0.25, 2 * 0.254]} pos={[L / 2 - 2.35 + 0.127, TOP + 0.125, -W / 2 + 0.75 + 0.127]} color="#111" rough={0.5} />
      <HeaderPins pins={POE} base={TOP} />
      {/* SoC BCM2711 com a tampa metálica (heat spreader) */}
      <Box size={[1.5, 0.1, 1.5]} pos={[-1.35, TOP + 0.05, 0.05]} color="#2a2a2a" rough={0.5} />
      <Chip pos={[-1.35, TOP + 0.08, 0.05]} size={[1.3, 0.1, 1.3]} label="BROADCOM" sub="BCM2711" color="#b9bdc2" ink="#3a3d40" />
      {/* dissipador preto com alhetas, colado por cima da tampa com fita térmica */}
      <mesh position={[HS.x, TOP + 0.185, HS.z]} castShadow receiveShadow geometry={heatsinkGeo()} material={mat('#1b1c1f', 0.6, 0.5)} />
      {/* RAM LPDDR4 */}
      <Chip pos={[0.35, TOP, 0.15]} size={[1.0, 0.1, 1.4]} label="MICRON" sub="LPDDR4" />
      {/* módulo WiFi / Bluetooth com blindagem metálica e antena impressa na borda */}
      <Box size={[1.2, 0.18, 1.0]} pos={[-2.95, TOP + 0.09, -1.15]} color={STEEL} metal={0.95} rough={0.25} />
      <Box size={[0.5, 0.01, 0.75]} pos={[-L / 2 + 0.3, TOP + 0.005, -1.15]} color="#d4af37" metal={0.8} rough={0.4} />
      {/* controlador USB VL805 e PMIC */}
      <Chip pos={[2.15, TOP, 0.65]} size={[0.6, 0.08, 0.6]} label="VL805" />
      <Chip pos={[-2.9, TOP, 0.95]} size={[0.5, 0.07, 0.5]} label="MXL" />
      {/* condensadores e resistências SMD espalhados */}
      <Smds id="rpi4" y={TOP} items={SMDS} />
      {/* USB 2.0 (lingueta preta) e USB 3.0 (azul) e Ethernet RJ45 com LEDs na borda +x */}
      <UsbStack z={-1.6} color="#1565c0" />
      <UsbStack z={0.3} color="#1a1a1a" />
      <Box size={[2.1, 1.35, 1.6]} pos={[L / 2 - 0.95, TOP + 0.68, 1.95]} color={STEEL} metal={0.9} rough={0.3} />
      <Box size={[0.03, 0.9, 1.1]} pos={[L / 2 + 0.11, TOP + 0.6, 1.95]} color="#111" />
      <Box size={[0.03, 0.15, 0.25]} pos={[L / 2 + 0.115, TOP + 1.18, 1.5]} color="#7cff7c" />
      <Box size={[0.03, 0.15, 0.25]} pos={[L / 2 + 0.115, TOP + 1.18, 2.4]} color="#ffb300" />
      {/* USB-C (alimentação), 2 micro-HDMI e áudio de 3,5 mm na borda +z */}
      <RBox size={[0.9, 0.32, 0.75]} r={0.12} pos={[-L / 2 + 1.12, TOP + 0.16, W / 2 - 0.3]} color={STEEL} metal={0.9} rough={0.3} />
      <RBox size={[0.6, 0.1, 0.02]} r={0.04} pos={[-L / 2 + 1.12, TOP + 0.16, W / 2 + 0.075]} color="#0d0d0d" />
      {[-1.65, -0.3].map((x) => (
        <group key={x}>
          <Box size={[0.7, 0.3, 0.75]} pos={[x, TOP + 0.15, W / 2 - 0.3]} color={STEEL} metal={0.9} rough={0.3} />
          <Box size={[0.5, 0.14, 0.02]} pos={[x, TOP + 0.15, W / 2 + 0.075]} color="#0d0d0d" />
        </group>
      ))}
      <Box size={[0.6, 0.55, 1.2]} pos={[1.15, TOP + 0.28, W / 2 - 0.6]} color="#141414" rough={0.5} />
      <Cyl r={0.3} h={0.25} pos={[1.15, TOP + 0.3, W / 2 + 0.1]} rot={[Math.PI / 2, 0, 0]} color="#141414" rough={0.5} />
      {/* conectores de fita: câmara (CSI, entre o HDMI e o áudio) e ecrã (DSI, na borda −x) */}
      <Box size={[2.2, 0.55, 0.4]} pos={[0.35, TOP + 0.275, W / 2 - 1.3]} color="#efe8d8" rough={0.6} />
      <Box size={[2.0, 0.12, 0.42]} pos={[0.35, TOP + 0.6, W / 2 - 1.3]} color="#1a1a1a" rough={0.5} />
      <Box size={[0.4, 0.55, 2.2]} pos={[-L / 2 + 0.55, TOP + 0.275, 0.1]} color="#efe8d8" rough={0.6} />
      <Box size={[0.42, 0.12, 2.0]} pos={[-L / 2 + 0.55, TOP + 0.6, 0.1]} color="#1a1a1a" rough={0.5} />
      {/* LEDs PWR (vermelho) e ACT (verde) */}
      <Box size={[0.15, 0.06, 0.1]} pos={[-L / 2 + 0.25, TOP + 0.03, 1.55]} color="#e53935" />
      <Box size={[0.15, 0.06, 0.1]} pos={[-L / 2 + 0.25, TOP + 0.03, 1.8]} color="#43a047" />
      {/* cartão microSD por baixo (−x) */}
      <Box size={[1.3, 0.1, 1.1]} pos={[-L / 2 + 0.3, Y - 0.06, 0]} color="#1e3a8a" rough={0.5} />
      {/* espaçadores altos para o HAT */}
      {HOLES.map(([x, z], i) => (
        <Cyl key={`h${i}`} r={0.22} h={hatY - TOP} pos={[x, TOP + (hatY - TOP) / 2, z]} color="#c9a227" metal={0.85} rough={0.3} seg={6} />
      ))}
    </group>
  )
}

export default { type: 'raspberryPi', Model }
