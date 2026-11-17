// Bico de baixo do pato robô: chapa amarela com a almofada cor-de-rosa e dois braços em L dos lados
// da cabeça até à articulação. Desenhado no referencial "natural" (x frente, y cima, z direita), com
// a origem na articulação, dentro de um grupo rodado −90° em x (o y local é o eixo do servo do bico).
import { RBox, Box, Cyl } from '../kit.jsx'
import { PATO_G } from '@shared/parts/_pato.js'
import { bic } from '@shared/parts/bicoPato.js'

const { jaw: J } = PATO_G
const YEL = '#f7c600'
const RX = [Math.PI / 2, 0, 0]
// caixa (coordenadas do robô) → natural do bico
const RB = ({ x0, x1, y0, y1, z0, z1, r = 0.15, color = YEL }) => (
  <RBox size={[x1 - x0, y1 - y0, z1 - z0]} pos={bic([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2])} r={r} color={color} rough={0.45} />
)

function BicoPatoModel() {
  const { y: hy } = PATO_G.hinge
  const ax = J.armX
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <RB x0={J.x0} x1={J.x1} y0={J.y0} y1={J.y1} z0={-J.z} z1={J.z} r={0.25} />
      <Box size={[3.6, 0.05, 2 * J.z - 0.6]} pos={bic([J.x1 - 2.1, J.y1 + 0.025, 0])} color="#e7a9c4" rough={0.8} />
      {[1, -1].map((s) => {
        const z0 = s > 0 ? J.armZ0 : -J.armZ1
        const z1 = s > 0 ? J.armZ1 : -J.armZ0
        return (
          <group key={s}>
            {/* L: para a frente junto à base da cabeça e a descer até à chapa */}
            <RB x0={PATO_G.hinge.x - 0.5} x1={ax + 0.45} y0={hy - 0.4} y1={hy + 0.4} z0={z0} z1={z1} />
            <RB x0={ax - 0.45} x1={ax + 0.45} y0={J.y0} y1={hy} z0={z0} z1={z1} />
            {/* aba que liga o braço à chapa */}
            <RB x0={ax - 0.45} x1={ax + 1.2} y0={J.y0} y1={J.y1} z0={s > 0 ? J.z - 0.2 : -J.armZ1} z1={s > 0 ? J.armZ1 : -J.z + 0.2} />
            <Cyl r={0.55} h={J.armZ1 - J.armZ0} pos={bic([PATO_G.hinge.x, hy, (z0 + z1) / 2])} rot={RX} color={YEL} rough={0.45} />
          </group>
        )
      })}
      {/* ligação ao disco do servo (lado direito) */}
      <Cyl r={0.5} h={J.armZ0 - PATO_G.hinge.z} pos={bic([PATO_G.hinge.x, hy, (J.armZ0 + PATO_G.hinge.z) / 2])} rot={RX} color={YEL} rough={0.45} />
    </group>
  )
}

export default { type: 'bicoPato', Model: BicoPatoModel }
