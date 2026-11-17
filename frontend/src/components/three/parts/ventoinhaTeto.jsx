// Ventoinha de teto: florão (com os fios do motor), haste, motor e 5 pás de madeira que rodam
// com live.rpm. Pendurada por baixo de uma laje (y local = para baixo).
import { Box, Cyl, liveOf, useFrame, useRef } from '../kit.jsx'

const BODY = '#e9e7e2'
const BRASS = '#b8913f'

function Model({ part }) {
  const c = part.config || {}
  const haste = Math.max(0.3, +(c.haste ?? 1.5))
  const rot = useRef()
  useFrame((_, dt) => {
    const rpm = liveOf(part.id)?.rpm || 0
    if (rot.current) rot.current.rotation.y += ((rpm * 2 * Math.PI) / 60) * Math.min(dt, 0.1)
  })
  const ym = 0.6 + haste
  return (
    <group>
      <Cyl r={1.05} r2={0.7} h={0.6} pos={[0, 0.3, 0]} color={BODY} rough={0.45} seg={28} />
      <Cyl r={0.14} h={haste} pos={[0, 0.6 + haste / 2, 0]} color={BRASS} metal={0.85} rough={0.3} seg={12} />
      <Cyl r={0.08} h={0.45} pos={[-0.95, 0.3, -0.3]} rot={[0, 0, Math.PI / 2]} color="#c62828" seg={8} />
      <Cyl r={0.08} h={0.45} pos={[-0.95, 0.3, 0.3]} rot={[0, 0, Math.PI / 2]} color="#212121" seg={8} />
      <Cyl r={1.3} r2={1.5} h={0.9} pos={[0, ym + 0.45, 0]} color={BODY} rough={0.45} seg={32} />
      <Cyl r={1.52} h={0.08} pos={[0, ym + 0.5, 0]} color={BRASS} metal={0.85} rough={0.3} seg={32} />
      <group ref={rot} position={[0, ym + 0.75, 0]}>
        {Array.from({ length: 5 }, (_, i) => (
          <group key={i} rotation={[0, (i * 2 * Math.PI) / 5, 0]}>
            <Box size={[1.4, 0.1, 0.35]} pos={[1.6, 0.05, 0]} color={BRASS} metal={0.85} rough={0.3} />
            <group position={[3.6, 0.12, 0]} rotation={[0.12, 0, 0]}>
              <Box size={[4.0, 0.08, 1.15]} pos={[0, 0, 0]} color={c.pas || '#8b5a2b'} rough={0.55} />
            </group>
          </group>
        ))}
        <Cyl r={0.7} h={0.3} pos={[0, 0.25, 0]} color={BODY} rough={0.45} seg={24} />
      </group>
    </group>
  )
}

export default { type: 'ventoinhaTeto', Model }
