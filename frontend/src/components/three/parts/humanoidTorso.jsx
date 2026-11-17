// Tronco do humanoide: caixa do peito em PLA branco (cantos chanfrados), bacia escura por
// baixo (onde aparafusam os servos laterais das ancas) e as ombreiras no topo, de onde ficam
// pendurados os servos dos ombros. Tudo dentro dos colisores (shared/parts/humanoidTorso.js).
import { Box } from '../kit.jsx'
import { TORSO, SHOULDER_PLATE as SP } from '@shared/parts/humanoidTorso.js'

const { X, Z, H, shX, shT } = TORSO
const SHELL = '#eceff1'
const DARK = '#263238'
const MID = '#90a4ae'

function HumanoidTorsoModel() {
  return (
    <group>
      {/* peito: caixa com cantos chanfrados (2 caixas cruzadas) */}
      <Box size={[2 * X, H - 0.9, 2 * Z]} pos={[0, H / 2 + 0.45, 0]} color={SHELL} rough={0.45} />
      <Box size={[2 * X - 0.5, H - 0.4, 2 * Z - 0.5]} pos={[0, H / 2 + 0.2, 0]} color={SHELL} rough={0.45} />
      {/* bacia escura (chapa onde aparafusam as ancas) */}
      <Box size={[2 * X, 0.9, 2 * Z]} pos={[0, 0.45, 0]} color={DARK} rough={0.5} />
      {/* cinta e painel do peito */}
      <Box size={[2 * X + 0.02, 0.35, 2 * Z + 0.02]} pos={[0, 3.2, 0]} color={DARK} rough={0.5} />
      {/* ombreiras (por cima dos servos dos ombros) */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box size={[SP.x, shT, SP.z1 - SP.z0]} pos={[shX, H - shT / 2, (s * (SP.z0 + SP.z1)) / 2]} color={MID} metal={0.4} rough={0.4} />
          <Box size={[2 * X - 0.3, 1.4, 0.06]} pos={[0, H - 0.9, s * (Z + 0.01)]} color={DARK} rough={0.5} />
        </group>
      ))}
    </group>
  )
}

export default { type: 'humanoidTorso', Model: HumanoidTorsoModel }
