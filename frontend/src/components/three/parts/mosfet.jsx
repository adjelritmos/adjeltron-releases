// MOSFET IRLZ44N em TO-220: corpo preto, aba metálica atrás (−x) com furo, pernas G, D, S.
import { Box, Cyl, Leg, useLabel, PITCH } from '../kit.jsx'
import { Badge, Boom, fmt } from './group-c-ui.jsx'

function Model() {
  const label = useLabel([{ text: 'IRLZ44N', font: 'bold 58px Arial', y: 90 }, { text: 'N-MOS', font: 'bold 40px Arial', y: 170 }], 256, 256)
  return (
    <group>
      {[PITCH, 0, -PITCH].map((z) => (
        <group key={z}>
          <Leg from={[0, 0, z]} to={[0, 0.3, z]} r={0.03} />
          <Box size={[0.05, 0.16, 0.08]} pos={[0, 0.38, z]} color="#cfcfcf" metal={0.85} rough={0.3} />
        </group>
      ))}
      <Box size={[0.45, 0.9, 1.0]} pos={[0, 0.9, 0]} color="#161616" rough={0.55} />
      <mesh position={[0.227, 0.9, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.9, 0.8]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
      {/* aba metálica (ligada ao D) */}
      <Box size={[0.13, 1.55, 1.0]} pos={[-0.16, 1.225, 0]} color="#c9ccd1" metal={0.9} rough={0.3} />
      <Cyl r={0.18} h={0.15} pos={[-0.16, 1.65, 0]} rot={[0, 0, Math.PI / 2]} color="#1a1a1a" />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  if (live.burned) return <Boom info={info} />
  if (!live.id || live.id < 0.0005) return null
  return <Badge info={info} text={live.id >= 1 ? `${fmt(live.id, 2)} A` : `${fmt(live.id * 1000, 0)} mA`} color={live.mode === 'parcial' ? '#f59e0b' : '#f5f5f5'} />
}

export default { type: 'mosfet', Model, Overlay2D }
