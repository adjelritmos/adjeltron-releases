// PCA9685: placa azul de 62 × 25 mm com 16 filas de 3 pinos (PWM / V+ / GND),
// cabeçalho de controlo à esquerda e borne de parafusos V+ / GND em cima.
import { Box, Cyl, useCanvasTexture, GlowLed, liveOf, PITCH } from '../kit.jsx'
import def, { pcaChX, PCA_ROWS, PCA_CH } from '@shared/parts/pca9685.js'
import { Badge, Glow2D } from './group-c-ui.jsx'

const L = 6.25
const D = 2.54
const BY = 0.12
const T = 0.16
const TOP = BY + T
const PIN_TOP = 0.95
const PX = 120
const ROW_COLOR = { PWM: '#f2c230', 'V+': '#e53935', GND: '#1a1a1a' }

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
    },
    ['pca9685'],
    Math.round(L * PX),
    Math.round(D * PX),
  )
  return (
    <group>
      <Box size={[L, T, D]} pos={[0, BY + T / 2, 0]} color="#1f4fb5" rough={0.5} />
      <mesh position={[0, TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[L, D]} />
        <meshBasicMaterial map={silk} transparent />
      </mesh>
      {/* furos de fixação */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <Cyl key={i} r={0.16} h={T + 0.01} pos={[sx * (L / 2 - 0.3), BY + T / 2, sz * (D / 2 - 0.3)]} color="#d9b54a" metal={0.8} rough={0.3} seg={16} />
      ))}
      {/* chip PCA9685 (TSSOP-28) */}
      <Box size={[0.98, 0.1, 0.45]} pos={[-1.35, TOP + 0.05, -0.55]} color="#151515" rough={0.4} />
      {Array.from({ length: 14 }).map((_, i) => (
        <group key={i}>
          <Box size={[0.03, 0.03, 0.12]} pos={[-1.8 + i * 0.065, TOP + 0.015, -0.27]} color="#ccc" metal={0.8} />
          <Box size={[0.03, 0.03, 0.12]} pos={[-1.8 + i * 0.065, TOP + 0.015, -0.83]} color="#ccc" metal={0.8} />
        </group>
      ))}
      {/* condensador eletrolítico e LED */}
      <Cyl r={0.32} h={0.7} pos={[2.6, TOP + 0.35, -0.75]} color="#1a2a6a" rough={0.4} />
      <Cyl r={0.33} h={0.04} pos={[2.6, TOP + 0.71, -0.75]} color="#bbb" metal={0.7} />
      <GlowLed pos={[-2.3, TOP + 0.04, -0.95]} size={[0.12, 0.06, 0.08]} color="#ff3b30" read={() => (liveOf(part.id)?.powered ? 1 : 0)} />
      {/* borne de parafusos V+ / GND */}
      <Box size={[1.05, 0.75, 0.6]} pos={[-0.1, TOP + 0.375, -0.92]} color="#2e7d32" rough={0.6} />
      {[-0.35, 0.15].map((x) => (
        <group key={x}>
          <Cyl r={0.16} h={0.06} pos={[x, PIN_TOP - 0.02, -0.85]} color="#c0c0c0" metal={0.9} rough={0.3} seg={16} />
          <Box size={[0.26, 0.03, 0.05]} pos={[x, PIN_TOP + 0.01, -0.85]} color="#555" />
        </group>
      ))}
      {/* cabeçalho de controlo (6 pinos) */}
      <Box size={[0.25, 0.25, 6 * PITCH]} pos={[-2.85, TOP + 0.125, 0]} color="#111" />
      {/* 16 colunas de 3 pinos, com a cor de cada fila na base */}
      {Array.from({ length: PCA_CH }).map((_, k) => (
        <group key={k} position={[pcaChX(k), 0, 0]}>
          {Object.entries(PCA_ROWS).map(([row, z]) => (
            <group key={row}>
              <Box size={[0.24, 0.25, 0.24]} pos={[0, TOP + 0.125, z]} color={ROW_COLOR[row]} />
              <Box size={[0.064, PIN_TOP - TOP, 0.064]} pos={[0, (PIN_TOP + TOP) / 2, z]} color="#d4af37" metal={0.9} rough={0.25} />
            </group>
          ))}
        </group>
      ))}
      {def.pins
        .filter((p) => ['GND', 'OE', 'SCL', 'SDA', 'VCC', 'V+'].includes(p.id))
        .map((p) => (
          <Box key={p.id} size={[0.064, PIN_TOP - TOP, 0.064]} pos={[p.pos[0], (PIN_TOP + TOP) / 2, p.pos[2]]} color="#d4af37" metal={0.9} rough={0.25} />
        ))}
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
