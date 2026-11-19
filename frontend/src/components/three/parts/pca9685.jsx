// PCA9685 (16 canais, formato Adafruit): placa azul de 62,5 × 25,4 mm com 4 furos de 2,5 mm,
// 16 colunas de 3 pinos pretos (PWM / V+ / GND) em 4 grupos, cabeçalho de controlo de 6 pinos em
// cada ponta (o da direita é para encadear placas), PCA9685 em TSSOP-28, redes de resistências de
// 220 Ω à frente de cada grupo, pontes de endereço A0–A5, condensador eletrolítico, LED de
// alimentação e o borne de parafusos azul V+ / GND em cima.
import { useCanvasTexture, GlowLed, liveOf, Chip, ECap } from '../kit.jsx'
import { PcbPlate, PinBlocks, PinField, ScrewTerminal, Smds } from './_boardKit.jsx'
import def, { pcaChX, PCA_ROWS, PCA_CH } from '@shared/parts/pca9685.js'
import { Badge, Glow2D } from './group-c-ui.jsx'

const L = 6.25
const D = 2.54
const BY = 0.12
const T = 0.16
const TOP = BY + T
const PIN_TOP = 0.95
const PX = 120
const HEAD = def.pins.filter((p) => ['GND', 'OE', 'SCL', 'SDA', 'VCC', 'V+'].includes(p.id))
const CH_PINS = Array.from({ length: PCA_CH }, (_, k) => Object.values(PCA_ROWS).map((z) => [pcaChX(k), z])).flat()
// cabeçalho de controlo: o de entrada (pinos do catálogo) e o de saída na ponta direita (só aspeto)
const HEAD_IN = HEAD.map((p) => [p.pos[0], p.pos[2]])
const HEAD_OUT = HEAD.map((p) => [-p.pos[0], p.pos[2]])
const HOLES = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => [sx * (L / 2 - 0.3), sz * (D / 2 - 0.3), 0.125])
// redes de resistências (220 Ω) à frente de cada grupo de 4 canais, desacoplamento e resistências do LED
const SMDS = [
  ...[0, 4, 8, 12].map((k) => [(pcaChX(k) + pcaChX(k + 3)) / 2, 0.1, 0, 'n']),
  [-0.7, -0.55, 1, 'c'], [-2.0, -0.55, 1, 'c'], [-2.3, -0.75, 0, 'r'], [0.75, -0.95, 0, 'R'], [1.05, -0.95, 0, 'R'],
  ...[0, 1, 2, 3, 4, 5].map((i) => [1.4 + i * 0.16, -0.45, 1, 'r']),
]

function Model({ part }) {
  const silk = useCanvasTexture(
    (ctx) => {
      const at = (x, z) => [(x + L / 2) * PX, (z + D / 2) * PX]
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 13px Arial'
      for (let k = 0; k < PCA_CH; k++) {
        const [x, y] = at(pcaChX(k), PCA_ROWS.PWM - 0.3)
        ctx.fillText(String(k), x, y)
      }
      ctx.font = 'bold 11px Arial'
      for (const p of def.pins.filter((q) => ['GND', 'OE', 'SCL', 'SDA', 'VCC', 'V+'].includes(q.id))) {
        const [x, y] = at(p.pos[0] + 0.33, p.pos[2])
        ctx.fillText(p.id, x, y)
      }
      ctx.font = 'bold 18px Arial'
      const [tx, ty] = at(1.4, -0.75)
      ctx.fillText('16-CH 12-BIT PWM', tx, ty)
      ctx.font = 'bold 14px Arial'
      const [vx, vy] = at(-0.1, -0.45)
      ctx.fillText('V+    GND', vx, vy)
      // nomes das filas junto ao primeiro grupo e pontes de endereço A0–A5 (almofadas douradas)
      ctx.font = 'bold 10px Arial'
      ctx.textAlign = 'right'
      for (const [t, z] of [['PWM', PCA_ROWS.PWM], ['V+', PCA_ROWS['V+']], ['GND', PCA_ROWS.GND]]) ctx.fillText(t, at(pcaChX(0) - 0.16, z)[0], at(0, z)[1])
      ctx.textAlign = 'center'
      for (let i = 0; i < 6; i++) {
        const [ax, ay] = at(1.4 + i * 0.16, -0.95)
        ctx.fillStyle = '#d9b44a'
        ctx.fillRect(ax - 6, ay - 9, 12, 7)
        ctx.fillRect(ax - 6, ay + 2, 12, 7)
        ctx.fillStyle = '#fff'
        ctx.fillText(`A${i}`, ax, ay - 16)
      }
    },
    ['pca9685-2'],
    Math.round(L * PX),
    Math.round(D * PX),
  )
  return (
    <group>
      <PcbPlate id="pca9685" w={L} d={D} t={T} y={BY} r={0.1} holes={HOLES} color="#1f4fb5" />
      <mesh position={[0, TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[L, D]} />
        <meshBasicMaterial map={silk} transparent />
      </mesh>
      {/* chip PCA9685 (TSSOP-28) com a marcação, passivos e redes de resistências */}
      <Chip pos={[-1.35, TOP, -0.55]} size={[0.97, 0.1, 0.44]} n={14} label="PCA9685PW" />
      <Smds id="pca9685" y={TOP} items={SMDS} />
      {/* condensador eletrolítico e LED */}
      <ECap pos={[2.6, TOP, -0.75]} r={0.32} h={0.7} />
      <GlowLed pos={[-2.3, TOP + 0.04, -0.95]} size={[0.12, 0.06, 0.08]} color="#ff3b30" read={() => (liveOf(part.id)?.powered ? 1 : 0)} />
      {/* borne de parafusos V+ / GND (os parafusos ficam à altura dos pinos do catálogo) */}
      <ScrewTerminal n={2} pitch={0.5} pos={[-0.1, TOP, -0.92]} color="#1f7fd1" h={0.72} d={0.6} screwY={PIN_TOP - TOP - 0.01} />
      {/* cabeçalhos de controlo (entrada à esquerda, encadeamento à direita) e as 16 colunas de 3 pinos */}
      <PinBlocks id="pca-pins" pts={[...HEAD_IN, ...HEAD_OUT, ...CH_PINS]} y={TOP} />
      <PinField id="pca-pins" pts={[...HEAD_IN, ...HEAD_OUT, ...CH_PINS].map(([x, z]) => [x, PIN_TOP, z])} y0={TOP - 0.05} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered) return null
  return (
    <g pointerEvents="none">
      {(live.us || []).map((us, k) =>
        us ? <Glow2D key={k} info={info} pos={[pcaChX(k), 0, PCA_ROWS.PWM - 0.3]} color="#ffd54f" on r={4} /> : null,
      )}
      <Badge info={info} text={live.sleep ? 'a dormir' : `${Math.round(live.freq)} Hz · V+ ${String(live.vplus).replace('.', ',')} V`} color={live.sleep ? '#404040' : '#f5f5f5'} />
    </g>
  )
}

export default { type: 'pca9685', Model, Overlay2D }
