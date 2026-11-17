// Cabeça do pato robô (tipo XGO-Duck): base amarela oca, capuz branco boleado aberto à frente com
// um aro à volta, face cinzenta recuada com o olho-câmara ao centro (aro amarelo e lente preta) e a
// luz à esquerda (o sensor ToF da direita é a peça vl53l0x). Medidas do modelo oficial.
import { RBox, Box, Cyl } from '../kit.jsx'
import { PATO_G } from '@shared/parts/_pato.js'
import { cab } from '@shared/parts/cabecaPato.js'

const { head: Hh } = PATO_G
const { base: Bs, hood: Hd, face: Fc, eye: E, light: Lt } = Hh
const WHITE = '#f4f4f2'
const YEL = '#f7c600'
const RZ = [0, 0, Math.PI / 2]
// caixa (coordenadas do robô) → mesh local
const RB = ({ x0, x1, y0, y1, z0, z1, r = 0.2, color, rough = 0.45 }) => (
  <RBox size={[x1 - x0, y1 - y0, z1 - z0]} pos={cab([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2])} r={r} color={color} rough={rough} />
)
const FRONT = 7.6 // fim do capuz fechado; daí até Hd.x1 é o aro à volta da face

function CabecaPatoModel() {
  const zi = Bs.z - 0.35
  return (
    <group>
      {/* base amarela (oca): parede de trás, paredes dos lados e bloco da frente */}
      <RB x0={Bs.x0} x1={Bs.x0 + 0.35} y0={Bs.y0} y1={Bs.y1} z0={-Bs.z} z1={Bs.z} color={YEL} />
      {[-1, 1].map((s) => (
        <RB key={s} x0={Bs.x0} x1={5.0} y0={Bs.y0} y1={Bs.y1} z0={s > 0 ? zi : -Bs.z} z1={s > 0 ? Bs.z : -zi} color={YEL} />
      ))}
      <RB x0={5.0} x1={Bs.x1} y0={Bs.y0} y1={Bs.y1} z0={-Bs.z} z1={Bs.z} r={0.3} color={YEL} />
      {/* almofada cor-de-rosa do bico de cima (por baixo da frente) */}
      <Box size={[3.0, 0.06, 2 * Bs.z - 1.0]} pos={cab([Bs.x1 - 1.7, Bs.y0 - 0.03, 0])} color="#e7a9c4" rough={0.8} />
      {/* capuz branco: corpo boleado, faixa de baixo (fecha a curva) e o aro da frente */}
      <RB x0={Hd.x0} x1={FRONT} y0={Hd.y0} y1={Hd.y1} z0={-Hd.z} z1={Hd.z} r={Hd.r} color={WHITE} rough={0.42} />
      <RB x0={Hd.x0} x1={FRONT} y0={Hd.y0} y1={Hd.y0 + 1.2} z0={-Hd.z} z1={Hd.z} r={0.25} color={WHITE} rough={0.42} />
      <RB x0={FRONT - 0.5} x1={Hd.x1} y0={Hd.y1 - 0.75} y1={Hd.y1 - 0.05} z0={-Hd.z + 0.6} z1={Hd.z - 0.6} r={0.3} color={WHITE} rough={0.42} />
      {[-1, 1].map((s) => (
        <RB key={`a${s}`} x0={FRONT - 0.5} x1={Hd.x1} y0={Hd.y0} y1={Hd.y1 - 0.4} z0={s > 0 ? Hd.z - 0.6 : -Hd.z} z1={s > 0 ? Hd.z : -Hd.z + 0.6} r={0.3} color={WHITE} rough={0.42} />
      ))}
      {/* face cinzenta recuada */}
      <RB x0={Fc.x - 0.4} x1={Fc.x} y0={Fc.y0} y1={Fc.y1} z0={-Fc.z} z1={Fc.z} r={0.1} color="#dcdcd6" rough={0.55} />
      {/* olho-câmara: aro amarelo, anel mais escuro, lente preta */}
      <Cyl r={E.r} h={E.d} pos={cab([E.x + E.d / 2, E.y, 0])} rot={RZ} color={YEL} rough={0.4} seg={40} />
      <Cyl r={E.r * 0.66} h={E.d + 0.06} pos={cab([E.x + E.d / 2 + 0.03, E.y, 0])} rot={RZ} color="#e0a800" rough={0.35} seg={40} />
      <Cyl r={E.r * 0.42} h={E.d + 0.1} pos={cab([E.x + E.d / 2 + 0.05, E.y, 0])} rot={RZ} color="#0b0b0b" metal={0.4} rough={0.12} seg={32} />
      <Cyl r={0.12} h={0.02} pos={cab([E.x + E.d + 0.11, E.y + 0.22, 0.2])} rot={RZ} color="#ffffff" rough={0.1} seg={12} />
      {/* luz (à esquerda) */}
      <Cyl r={0.38} h={0.2} pos={cab([Fc.x + 0.1, Lt.y, Lt.z])} rot={RZ} color="#fafafa" rough={0.2} seg={20} />
    </group>
  )
}

export default { type: 'cabecaPato', Model: CabecaPatoModel }
