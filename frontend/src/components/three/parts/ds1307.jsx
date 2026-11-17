// Módulo "Tiny RTC" com DS1307, EEPROM 24C32, cristal de 32,768 kHz e pilha CR2032.
import { Box, Cyl, Pcb, HeaderPins, useLabel } from '../kit.jsx'
import def from '@shared/parts/ds1307.js'
import { Chip } from './_analogModule.jsx'
import { Badge } from './group-c-ui.jsx'

const T = 0.16

function Model() {
  const cell = useLabel([{ text: 'CR2032', font: 'bold 70px Arial', y: 100 }, { text: '3V', font: 'bold 60px Arial', y: 170 }], 256, 256)
  const chip = useLabel([{ text: 'DS1307', font: 'bold 72px Arial' }], 256, 96)
  return (
    <group>
      <Pcb size={[2.8, T, 2.75]} pos={[0, 0, 0.025]} color="#1b3fa0" />
      {/* suporte e pilha CR2032 */}
      <Box size={[2.15, 0.2, 1.75]} pos={[0.35, T + 0.1, -0.35]} color="#202020" />
      <Cyl r={0.98} h={0.32} pos={[0.35, T + 0.16, -0.35]} color="#c9cdd2" metal={0.9} rough={0.25} seg={40} />
      <mesh position={[0.35, T + 0.325, -0.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.4, 1.4]} />
        <meshBasicMaterial map={cell} transparent color="#555" />
      </mesh>
      {/* DS1307 (DIP-8) e cristal */}
      <group position={[-1.0, T, 0.25]} rotation={[0, Math.PI / 2, 0]}>
        <Box size={[0.95, 0.32, 0.62]} pos={[0, 0.16, 0]} color="#151515" rough={0.4} />
        <mesh position={[0, 0.325, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.85, 0.32]} />
          <meshBasicMaterial map={chip} transparent />
        </mesh>
      </group>
      <Box size={[0.25, 0.25, 0.7]} pos={[-1.05, T + 0.12, -0.75]} rot={[0, 0, Math.PI / 2]} color="#c9cdd2" metal={0.9} rough={0.25} />
      <Chip pos={[0.9, T, 0.75]} />
      <Box size={[0.12, 0.06, 0.2]} pos={[-0.3, T + 0.03, 0.75]} color="#c8b089" />
      <Box size={[0.12, 0.06, 0.2]} pos={[-0.1, T + 0.03, 0.75]} color="#c8b089" />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered || !live.time) return null
  return <Badge info={info} text={`🕒 ${live.time}`} />
}

export default { type: 'ds1307', Model, Overlay2D }
