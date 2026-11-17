// Pé do humanoide: sola de borracha + placa de alumínio e a aba vertical (com reforços)
// onde aparafusa o braço do servo do tornozelo.
import { Box, Cyl } from '../kit.jsx'
import { FOOT, FOOT_ATTACH } from '@shared/parts/robotFoot.js'

function RobotFootModel() {
  const { L, W, sole, tabX, tabTop } = FOOT
  return (
    <group>
      <Box size={[L, 0.2, W]} pos={[0, 0.1, 0]} color="#212121" rough={0.95} />
      <Box size={[L - 0.2, sole - 0.2, W - 0.2]} pos={[0, 0.2 + (sole - 0.2) / 2, 0]} color="#cfd8dc" metal={0.85} rough={0.3} />
      {/* ponta arredondada */}
      <Cyl r={W / 2 - 0.1} h={sole - 0.2} pos={[L / 2 - 0.1, 0.2 + (sole - 0.2) / 2, 0]} color="#cfd8dc" metal={0.85} rough={0.3} seg={32} />
      {/* aba vertical para o servo do tornozelo */}
      <Box size={[0.3, tabTop - sole, 2.6]} pos={[tabX, sole + (tabTop - sole) / 2, 0]} color="#b0bec5" metal={0.85} rough={0.3} />
      <Cyl r={0.9} h={0.32} pos={[tabX, FOOT_ATTACH[1], 0]} rot={[0, 0, Math.PI / 2]} color="#cfd8dc" metal={0.85} rough={0.3} seg={24} />
      {/* reforços */}
      {[-1, 1].map((sz) => (
        <Box key={sz} size={[1.4, 0.9, 0.2]} pos={[tabX + 0.75, sole + 0.45, sz * 1.2]} color="#b0bec5" metal={0.85} rough={0.3} />
      ))}
    </group>
  )
}

export default { type: 'robotFoot', Model: RobotFootModel }
