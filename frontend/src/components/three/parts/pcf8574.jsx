// Módulo PCF8574: placa azul de 44 × 22 mm com 2 furos de 3 mm metalizados, PCF8574P em DIP-16
// ao centro (molde, entalhe e marcação NXP), pontes A0–A2 (3 pinos cada, com a capa preta do
// jumper no lado + ou −), resistências de pull-up, condensador de desacoplamento, LED de
// alimentação, cabeçalho I2C à esquerda e fila INT + P0–P7 em baixo.
import { RBox, HeaderPins, useCanvasTexture, GlowLed, liveOf } from '../kit.jsx'
import { PcbPlate, DipIc, PinBlocks, PinField, Smds } from './_boardKit.jsx'
import def from '@shared/parts/pcf8574.js'
import { Glow2D } from './group-c-ui.jsx'

const L = 4.4
const D = 2.2
const T = 0.16
const BY = 0.2
const TOP = BY + T
const PX = 120
const HOLES = [[-1, -1], [1, -1]].map(([sx, sz]) => [sx * (L / 2 - 0.28), sz * (D / 2 - 0.28), 0.14])
const JMP = [0, 1, 2].flatMap((k) => [-1, 0, 1].map((j) => [1.45 + k * 0.28, 0.25 + j * 0.254]))
const DIP_LINES = [{ text: 'PCF8574P', font: 'bold 76px Arial', y: 50 }, { text: 'NXP  CC2215', font: 'bold 42px Arial', y: 104 }, { text: 'Hnn 07', font: '36px Arial', y: 142 }]
const SMDS = [[-1.4, -0.45, 0, 'r'], [1.05, 0.25, 1, 'c'], [-1.2, 0.35, 1, 'r'], [-1.0, 0.35, 1, 'r'], [-0.8, 0.35, 1, 'r'], [1.25, -0.85, 0, 'C']]

function Model({ part }) {
  const silk = useCanvasTexture(
    (ctx) => {
      const at = (x, z) => [(x + L / 2) * PX, (z + D / 2) * PX]
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 13px Arial'
      for (const p of def.pins) {
        const left = p.pos[2] < 0.5
        const [x, y] = left ? at(p.pos[0] + 0.34, p.pos[2]) : at(p.pos[0], p.pos[2] - 0.3)
        ctx.fillText(p.id, x, y)
      }
      ctx.font = 'bold 16px Arial'
      const [tx, ty] = at(0.95, -0.85)
      ctx.fillText('PCF8574 I/O', tx, ty)
      ctx.font = 'bold 12px Arial'
      const [ax, ay] = at(1.7, -0.1)
      ctx.fillText('A0 A1 A2', ax, ay)
    },
    ['pcf8574'],
    Math.round(L * PX),
    Math.round(D * PX),
  )
  const addr = part.config?.addr ?? 0x20
  const bits = (addr & 7)
  return (
    <group>
      <PcbPlate id="pcf8574" w={L} d={D} t={T} y={BY} r={0.08} holes={HOLES} color="#1f4fb5" />
      <mesh position={[0, TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[L, D]} />
        <meshBasicMaterial map={silk} transparent />
      </mesh>
      {/* chip PCF8574P (DIP-16) soldado na placa */}
      <group position={[0.1, TOP, -0.25]}>
        <DipIc n={16} len={1.98} y0={0.04} h={0.3} lines={DIP_LINES} />
      </group>
      <Smds id="pcf8574" y={TOP} items={SMDS} />
      {/* pontes de endereço A0–A2 (3 pinos cada; capa do jumper no lado + ou −) */}
      <PinBlocks id="pcf-jmp" pts={JMP} y={TOP} />
      <PinField id="pcf-jmp" pts={JMP.map(([x, z]) => [x, TOP + 0.7, z])} y0={TOP - 0.05} />
      {[0, 1, 2].map((k) => (
        <RBox key={k} size={[0.24, 0.42, 0.5]} r={0.03} pos={[1.45 + k * 0.28, TOP + 0.5, 0.25 + ((bits >> k) & 1 ? -0.127 : 0.127)]} color="#1e1e1e" rough={0.5} />
      ))}
      {/* LED de alimentação */}
      <GlowLed pos={[-1.4, TOP + 0.04, -0.75]} color="#ff3030" read={() => (liveOf(part.id)?.powered ? 1 : 0)} />
      <HeaderPins pins={def.pins} base={TOP} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered) return null
  return <Glow2D info={info} pos={[-1.4, 0, -0.75]} color="#ff3030" on r={4} />
}

export default { type: 'pcf8574', Model, Overlay2D }
