// Módulo "Tiny RTC" (azul, 28 × 27 mm): DS1307 em DIP-8 (molde, entalhe e
// marcação), EEPROM 24C32 (SOIC-8), cristal cilíndrico de 32,768 kHz deitado, suporte de pilha com a
// patilha metálica de mola sobre a CR2032, resistências de pull-up e a fila de 5 pinos.
import { Box, Cyl, HeaderPins, useLabel, Chip, METAL } from '../kit.jsx'
import { PcbPlate, DipIc, Smds } from './_boardKit.jsx'
import def from '@shared/parts/ds1307.js'
import { Badge } from './group-c-ui.jsx'

const T = 0.16
const DS_LINES = [{ text: 'DS1307', font: 'bold 80px Arial', y: 54 }, { text: '2215A2  N', font: 'bold 44px Arial', y: 116 }]
const SMDS = [[-0.3, 0.75, 1, 'r'], [-0.1, 0.75, 1, 'r'], [0.1, 0.75, 1, 'r'], [-1.3, 0.8, 1, 'c'], [0.45, 0.75, 1, 'd']]

function Model() {
  const cell = useLabel([{ text: 'CR2032', font: 'bold 70px Arial', y: 100 }, { text: '3V', font: 'bold 60px Arial', y: 170 }], 256, 256)
  return (
    <group>
      <group position={[0, 0, 0.025]}>
        <PcbPlate id="ds1307" w={2.8} d={2.75} t={T} y={0} r={0.08} color="#1b3fa0" />
      </group>
      {/* suporte da pilha: base de plástico preta, pilha CR2032 e a patilha metálica de mola por cima */}
      <Box size={[2.15, 0.12, 1.75]} pos={[0.35, T + 0.06, -0.35]} color="#202020" rough={0.55} />
      <Cyl r={1.02} h={0.16} pos={[0.35, T + 0.08, -0.35]} color="#202020" rough={0.55} seg={40} />
      <Cyl r={0.98} h={0.32} pos={[0.35, T + 0.16, -0.35]} color="#c9cdd2" metal={1} rough={0.25} seg={40} />
      <Cyl r={0.9} h={0.006} pos={[0.35, T + 0.322, -0.35]} color="#b7bbc0" metal={1} rough={0.3} seg={40} />
      <mesh position={[0.35, T + 0.326, -0.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.4, 1.4]} />
        <meshBasicMaterial map={cell} transparent color="#555" />
      </mesh>
      <Box size={[0.5, 0.025, 1.15]} pos={[0.35, T + 0.335, -0.85]} color={METAL.nickel} metal={1} rough={0.3} />
      <Box size={[0.5, 0.36, 0.025]} pos={[0.35, T + 0.17, -1.42]} color={METAL.nickel} metal={1} rough={0.3} />
      {/* DS1307 (DIP-8), cristal de 32,768 kHz deitado, EEPROM 24C32 e passivos */}
      <group position={[-1.0, T, 0.25]} rotation={[0, Math.PI / 2, 0]}>
        <DipIc n={8} len={0.95} y0={0.04} h={0.32} lines={DS_LINES} />
      </group>
      <Cyl r={0.1} h={0.6} pos={[-1.05, T + 0.1, -0.8]} rot={[0, 0, Math.PI / 2]} color={METAL.nickel} metal={1} rough={0.28} seg={16} />
      <Chip pos={[0.9, T, 0.75]} size={[0.49, 0.15, 0.39]} n={4} label="24C32" />
      <Smds id="ds1307" y={T} items={SMDS} />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered || !live.time) return null
  return <Badge info={info} text={`🕒 ${live.time}`} />
}

export default { type: 'ds1307', Model, Overlay2D }
