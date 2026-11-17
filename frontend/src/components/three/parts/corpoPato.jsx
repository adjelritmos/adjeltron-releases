// Corpo do pato robô: concha branca boleada (duas metades com junta ao meio) com o encaixe do servo
// do pescoço em cima, à frente; placa preta das ancas por baixo; suporte da bateria atrás (branco,
// com rasgos de lado). Medidas do modelo oficial (shared/parts/_pato.js).
import { RBox, Box } from '../kit.jsx'
import { PATO_G } from '@shared/parts/_pato.js'

const { body: B, plate: P, holder: Hd, notch: N } = PATO_G
const Y0 = B.y0
const WHITE = '#f4f4f2'
const SEAM = '#c9cdd0'
// caixa boleada a partir de limites (coordenadas do robô)
const RB = ({ x0, x1, y0, y1, z0, z1, r = 0.6, color = WHITE }) => (
  <RBox size={[x1 - x0, y1 - y0, z1 - z0]} pos={[(x0 + x1) / 2, (y0 + y1) / 2 - Y0, (z0 + z1) / 2]} r={r} color={color} rough={0.45} />
)

function CorpoPatoModel() {
  const yN = N.y0
  return (
    <group>
      {/* concha: parte de baixo inteira e, em cima, os blocos à volta do encaixe do pescoço */}
      <RB x0={B.x0} x1={B.x1} y0={B.y0 + 0.05} y1={yN + 0.8} z0={-B.z} z1={B.z} r={0.9} />
      {[-1, 1].map((s) => (
        <RB key={s} x0={B.x0} x1={B.x1} y0={yN} y1={B.y1} z0={s > 0 ? N.z : -B.z} z1={s > 0 ? B.z : -N.z} r={0.9} />
      ))}
      <RB x0={B.x0} x1={N.x0 + 0.4} y0={yN} y1={B.y1} z0={-N.z - 0.3} z1={N.z + 0.3} r={0.6} />
      {/* junta das duas metades */}
      <Box size={[B.x1 - B.x0 - 1.4, 0.03, 0.05]} pos={[(B.x0 + N.x0) / 2 - 0.3, B.y1 + 0.005 - Y0, 0]} color={SEAM} />
      {/* placa preta das ancas */}
      <Box size={[P.x1 - P.x0, P.y1 - P.y0, 2 * P.z]} pos={[(P.x0 + P.x1) / 2, (P.y0 + P.y1) / 2 - Y0, 0]} color="#222" rough={0.6} />
      {/* suporte da bateria (atrás) com rasgos de lado */}
      <RB x0={Hd.x0} x1={Hd.x1} y0={Hd.y0} y1={Hd.y1} z0={-Hd.z} z1={Hd.z} r={0.4} />
      {[-1, 1].flatMap((s) =>
        [0, 1, 2].map((i) => (
          <Box key={`${s}${i}`} size={[1.8, 0.35, 0.04]} pos={[(Hd.x0 + Hd.x1) / 2, Hd.y0 + 2.0 + i * 1.6 - Y0, s * (Hd.z + 0.01)]} color="#cfd3d6" />
        )),
      )}
    </group>
  )
}

export default { type: 'corpoPato', Model: CorpoPatoModel }
