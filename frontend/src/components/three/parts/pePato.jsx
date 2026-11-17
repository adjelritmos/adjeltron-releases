// Pé do pato robô: sola de TPU cor-de-rosa, base amarela e o berço (duas paredes atrás, de topo
// redondo) onde assenta o servo do tornozelo; rolamento na parede de dentro.
import { RBox, Cyl } from '../kit.jsx'
import { PATO_G } from '@shared/parts/_pato.js'
import { peLocal } from '@shared/parts/pePato.js'

const { foot: F } = PATO_G
const YEL = '#f7c600'
const RX = [Math.PI / 2, 0, 0]

function PePatoModel({ part }) {
  const s = +(part.config?.s ?? 1)
  const L = peLocal(s)
  const cx = L.x((F.x0 + F.x1) / 2)
  const cz = L.z((F.z0 + F.z1) / 2)
  const W = F.z1 - F.z0
  const wl = F.wallX - F.x0
  const wx = L.x((F.x0 + F.wallX) / 2)
  return (
    <group>
      <RBox size={[F.x1 - F.x0, F.sole, W]} pos={[cx, L.y(F.sole / 2), cz]} r={0.15} color="#d9a3c9" rough={0.85} />
      <RBox size={[F.x1 - F.x0, F.base - F.sole + 0.2, W]} pos={[cx, L.y((F.sole + F.base) / 2), cz]} r={0.35} color={YEL} rough={0.45} />
      {[F.z0 + 0.2, F.z1 - 0.2].map((z, i) => (
        <group key={i}>
          <RBox size={[wl, F.top - F.base, 0.4]} pos={[wx, L.y((F.base + F.top) / 2 - 0.3), L.z(z)]} r={0.15} color={YEL} rough={0.45} />
          <Cyl r={wl / 2 - 0.05} h={0.4} pos={[wx, L.y(F.top - 0.6), L.z(z)]} rot={RX} color={YEL} rough={0.45} seg={32} />
        </group>
      ))}
      {/* rolamento do eixo do tornozelo (parede de dentro) */}
      <Cyl r={0.5} h={0.44} pos={[0, 0, L.z(F.z0 + 0.2)]} rot={RX} color="#c3c7cb" metal={0.8} rough={0.3} seg={24} />
      <Cyl r={0.2} h={0.46} pos={[0, 0, L.z(F.z0 + 0.2)]} rot={RX} color="#555" metal={0.5} seg={16} />
      {/* frente da base mais baixa (biqueira) */}
      <RBox size={[0.8, 0.3, W - 0.4]} pos={[L.x(F.x1 - 0.5), L.y(F.base + 0.1), cz]} r={0.12} color={YEL} rough={0.45} />
    </group>
  )
}

export default { type: 'pePato', Model: PePatoModel }
