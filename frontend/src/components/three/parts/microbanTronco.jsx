// Tronco do humanoide Microban (ver shared/parts/microbanTronco.js): caixa boleada de PLA branco com
// a cinta escura, os aros dos alojamentos dos 5 servos (2 ancas por baixo, 2 ombros de lado e o
// pescoço em cima) e os parafusos das tampas da frente e de trás.
import { RBox, Cyl } from '../kit.jsx'
import { MB_TRONCO as T, mbPonto } from '@shared/parts/_microban.js'
import { ScrewHeads } from './_matKit.jsx'

const WHITE = '#f1f1ee'
const DARK = '#25272b'
const ym = (T.y0 + T.y1) / 2
const hy = T.y1 - T.y0

function MicrobanTroncoModel() {
  const neck = mbPonto('head')
  return (
    <group>
      <RBox size={[2 * T.x, hy, 2 * T.z]} r={0.35} pos={[0, ym, 0]} color={WHITE} rough={0.5} />
      {/* cinta escura (junta entre a bacia e o peito) */}
      <RBox size={[2 * T.x + 0.02, 0.3, 2 * T.z + 0.02]} r={0.1} pos={[0, 3.3, 0]} color={DARK} rough={0.5} />
      {/* aros dos alojamentos dos servos: ancas (por baixo), ombros (de lado) e pescoço (em cima) */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Cyl r={0.85} h={0.04} pos={[mbPonto('hipYaw', s)[0], T.y0 - 0.01, mbPonto('hipYaw', s)[2]]} color={DARK} rough={0.5} seg={28} />
          <Cyl r={0.85} h={0.04} pos={[0, mbPonto('shoulderPitch', s)[1], s * (T.z + 0.01)]} rot={[Math.PI / 2, 0, 0]} color={DARK} rough={0.5} seg={28} />
        </group>
      ))}
      <RBox size={[3.7, 0.04, 2.3]} r={0.015} pos={[neck[0] - 0.7, T.y1 + 0.01, 0]} color={DARK} rough={0.5} />
      {/* parafusos das tampas (frente e costas) */}
      <ScrewHeads rot={[0, 0, -Math.PI / 2]} r={0.13} pts={[-1, 1].flatMap((z) => [T.y0 + 0.5, T.y1 - 0.5].map((y) => [-y, T.x, z * (T.z - 0.5)]))} color="#b0b6ba" metal={0.9} rough={0.3} />
      <ScrewHeads rot={[0, 0, Math.PI / 2]} r={0.13} pts={[-1, 1].flatMap((z) => [T.y0 + 0.5, T.y1 - 0.5].map((y) => [y, T.x, z * (T.z - 0.5)]))} color="#b0b6ba" metal={0.9} rough={0.3} />
    </group>
  )
}

export default { type: 'microbanTronco', Model: MicrobanTroncoModel }
