// Módulo RTC ZS-042 (azul, 38 × 22 mm, 2 furos de 3 mm): DS3231SN (SOIC-16 largo, marcado), EEPROM
// AT24C32 (SOIC-8), rede de resistências de pull-up de 4,7 kΩ, díodo e resistência de carga da
// pilha, LED de alimentação, 6 pinos de um lado, 4 furos de passagem do outro e o suporte da pilha
// CR2032 por baixo (vê-se o bordo).
import { Cyl, HeaderPins, GlowLed, liveOf, Chip } from '../kit.jsx'
import { PcbPlate, PlatedHoles, Smds, MarkText } from './_boardKit.jsx'
import def from '@shared/parts/ds3231.js'
import { Badge, fmt } from './group-c-ui.jsx'

const T = 0.16
const HOLES = [[1.6, -0.9, 0.15], [1.6, 0.9, 0.15]]
const PASS = Array.from({ length: 4 }, (_, i) => [1.7, (i - 1.5) * 0.254])
const SMDS = [[1.15, -0.45, 1, 'n'], [0.6, -0.75, 0, 'r'], [0.85, -0.75, 0, 'r'], [-1.05, -0.6, 0, 'r'], [0.5, 0.75, 0, 'd'], [-1.05, 0.75, 1, 'c'], [0.55, 0.2, 1, 'c']]

function Model({ part }) {
  return (
    <group>
      <PcbPlate id="ds3231" w={3.8} d={2.2} t={T} y={0} r={0.08} holes={HOLES} color="#1d4ed8" />
      {/* suporte da pilha CR2032 por baixo (vê-se o bordo) */}
      <Cyl r={0.95} h={0.25} pos={[0.65, -0.12, 0]} color="#1a1a1a" seg={36} />
      {/* DS3231SN SOIC-16 com a marcação a laser */}
      <Chip pos={[-0.35, T, 0.05]} size={[1.03, 0.25, 0.75]} n={8} />
      <MarkText lines={[{ text: 'DS3231SN', font: 'bold 60px Arial', y: 40 }, { text: '#2215', font: '44px Arial', y: 92 }, { text: '1A01  H', font: '38px Arial', y: 134 }]} px={[256, 160]} pos={[-0.35, T + 0.267, 0.05]} w={0.85} d={0.55} />
      {/* EEPROM AT24C32, rede de pull-ups, carga da pilha e LED de alimentação */}
      <Chip pos={[1.15, T, 0.45]} size={[0.49, 0.15, 0.39]} n={4} label="24C32" />
      <Smds id="ds3231" y={T} items={SMDS} />
      <GlowLed pos={[-1.05, T + 0.04, -0.85]} size={[0.16, 0.08, 0.1]} color="#ff3030" read={() => (liveOf(part.id)?.powered ? 1 : 0)} />
      {/* furos de passagem do lado direito (32K, SQW, SCL, SDA … para encadear) */}
      <PlatedHoles id="ds3231-pass" pts={PASS} y={T} r={0.09} hole={0.05} solder={false} square={1} />
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
