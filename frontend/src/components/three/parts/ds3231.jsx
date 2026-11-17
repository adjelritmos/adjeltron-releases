// Módulo RTC ZS-042: DS3231 (SOIC-16), EEPROM AT24C32 e suporte da pilha na traseira.
import { Box, Cyl, Pcb, HeaderPins, useLabel, GlowLed, liveOf } from '../kit.jsx'
import def from '@shared/parts/ds3231.js'
import { Chip } from './_analogModule.jsx'
import { Badge, fmt } from './group-c-ui.jsx'

const T = 0.16

function Model({ part }) {
  const chip = useLabel([{ text: 'DS3231', font: 'bold 64px Arial', y: 75 }, { text: 'SN', font: '46px Arial', y: 145 }], 280, 200)
  return (
    <group>
      <Pcb size={[3.8, T, 2.2]} color="#1d4ed8" />
      {/* pilha CR2032 por baixo (vê-se o bordo do suporte) */}
      <Cyl r={0.95} h={0.25} pos={[0.65, -0.12, 0]} color="#1a1a1a" seg={36} />
      {/* DS3231 SOIC-16 */}
      <group position={[-0.35, T, 0.05]}>
        <Box size={[1.03, 0.25, 0.75]} pos={[0, 0.125, 0]} color="#151515" rough={0.4} />
        {[-1, 1].map((s) => Array.from({ length: 8 }, (_, k) => <Box key={`${s}${k}`} size={[0.05, 0.05, 0.1]} pos={[(k - 3.5) * 0.127, 0.03, s * 0.42]} color="#ccc" metal={0.8} />))}
        <mesh position={[0, 0.255, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.9, 0.62]} />
          <meshBasicMaterial map={chip} transparent />
        </mesh>
      </group>
      {/* EEPROM AT24C32, resistências e LED de alimentação */}
      <Chip pos={[1.15, T, 0.45]} />
      <Box size={[0.35, 0.06, 0.6]} pos={[1.15, T + 0.03, -0.45]} color="#d8d8d8" />
      {[0.6, 0.85].map((x) => (
        <Box key={x} size={[0.12, 0.06, 0.22]} pos={[x, T + 0.03, -0.75]} color="#222" />
      ))}
      <GlowLed pos={[-1.05, T + 0.04, -0.85]} size={[0.16, 0.08, 0.1]} color="#ff3030" read={() => (liveOf(part.id)?.powered ? 1 : 0)} />
      {/* pinos de passagem do lado direito (furos) */}
      {Array.from({ length: 4 }, (_, i) => (
        <Cyl key={i} r={0.09} h={T + 0.01} pos={[1.7, T / 2, (i - 1.5) * 0.254]} color="#c9a227" metal={0.8} rough={0.3} seg={12} />
      ))}
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered || !live.time) return null
  const t = live.temp != null ? ` · ${fmt(live.temp, 1)} °C` : ''
  return <Badge info={info} text={`🕒 ${live.time}${t}`} />
}

export default { type: 'ds3231', Model, Overlay2D }
