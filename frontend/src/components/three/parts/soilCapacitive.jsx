// Humidade do solo capacitivo v1.2: placa preta de 98 × 23 mm com a ponta em bico, o elétrodo de
// cobre sob o verniz (vê-se em relevo), a linha branca de profundidade máxima, o TLC555 SOIC-8,
// o regulador 662K, os passivos 0603/0805 e a ficha PH2.0 branca de 3 vias.
import { Chip, RBox, HeaderPins } from '../kit.jsx'
import def from '@shared/parts/soilCapacitive.js'
import { ShapedPcb, Art, SmdField, Sot23, polyShape } from './mq2.jsx'

const T = 0.16
// contorno: de x = −4,9 (conector) a +4,9 (ponta em bico), cantos do topo chanfrados
const OUTLINE = [
  [-4.9, -1.05],
  [-4.8, -1.15],
  [3.9, -1.15],
  [4.9, 0],
  [3.9, 1.15],
  [-4.8, 1.15],
  [-4.9, 1.05],
]

function draw(p) {
  const { ctx } = p
  // elétrodo: grande área de cobre sob a máscara (ligeiramente mais clara) com o anel de massa
  ctx.globalAlpha = 0.55
  ctx.fillStyle = '#2b2b2b'
  ctx.beginPath()
  ctx.moveTo(p.X(-1.5), p.Y(-0.95))
  ctx.lineTo(p.X(3.75), p.Y(-0.95))
  ctx.lineTo(p.X(4.55), p.Y(0))
  ctx.lineTo(p.X(3.75), p.Y(0.95))
  ctx.lineTo(p.X(-1.5), p.Y(0.95))
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#141414'
  ctx.fillRect(p.X(-1.3), p.Y(-0.6), 4.6 * p.k, 1.2 * p.k)
  ctx.fillStyle = '#2b2b2b'
  ctx.fillRect(p.X(-1.15), p.Y(-0.42), 4.3 * p.k, 0.84 * p.k)
  ctx.globalAlpha = 1
  // pistas da eletrónica
  const tr = { lw: 0.03, stroke: '#262626' }
  p.line([[-4.55, -0.25], [-3.9, -0.25], [-3.6, -0.55], [-3.35, -0.55]], tr)
  p.line([[-4.55, 0], [-3.7, 0], [-3.5, 0.25], [-3.45, 0.25]], tr)
  p.line([[-2.95, 0.25], [-2.2, 0.25], [-1.6, 0]], tr)
  // linha de profundidade máxima e serigrafia
  p.rect(-1.8, 0, 0.05, 2.2, { fill: '#f2f2ee', stroke: null })
  p.text('Capacitive Soil Moisture Sensor v1.2', 1.2, 0.82, 0.17)
  p.text('↑ max', -1.55, -0.85, 0.12, { rot: -Math.PI / 2 })
  for (const [i, n] of ['GND', 'VCC', 'AOUT'].entries()) p.text(n, -3.98, def.pins[i].pos[2], 0.1, { rot: -Math.PI / 2 })
  p.rect(-3.2, 0.25, 0.65, 0.7, { lw: 0.012 })
  p.text('U1', -3.2, 0.72, 0.09)
  p.text('U2', -2.85, -0.55, 0.09)
}

function Model() {
  return (
    <group>
      <ShapedPcb id="soilCap" t={T} outline={() => polyShape(OUTLINE)} color="#121212" />
      <Art id="soilCap" w={9.8} d={2.3} pos={[0, T + 0.0015, 0]} draw={draw} ppc={104} />
      <Chip pos={[-3.2, T, 0.25]} size={[0.49, 0.15, 0.39]} n={4} label="TLC555" />
      <Sot23 pos={[-3.2, T, -0.55]} />
      <SmdField
        id="soilCap"
        y={T}
        items={[
          [-2.5, -0.5, Math.PI / 2],
          [-2.5, 0.2, Math.PI / 2],
          [-2.5, 0.6, Math.PI / 2, 'c'],
          [-3.8, 0.7, 0, 'C'],
          [-3.8, -0.6, 0, 'C'],
          [-2.2, -0.15, 0],
          [-2.85, -0.85, 0, 'c'],
        ]}
      />
      {/* ficha PH2.0 de 3 vias: base branca com as paredes e a ranhura de polarização */}
      <RBox size={[0.45, 0.3, 0.95]} r={0.03} pos={[-4.55, T + 0.15, 0]} color="#f1efe6" rough={0.55} />
      <RBox size={[0.08, 0.12, 0.3]} r={0.01} pos={[-4.8, T + 0.06, 0]} color="#e2ded2" rough={0.6} />
      <HeaderPins pins={def.pins} base={T + 0.3} up={0.45} />
    </group>
  )
}

export default { type: 'soilCapacitive', Model }
