// Bloco de aço de massa conhecida, com a massa gravada no topo.
import { RBox, Cyl, useLabel } from '../kit.jsx'
import { blockDims } from '@shared/parts/loadBlock.js'

function Model({ part }) {
  const c = part.config || {}
  const [x, y, z] = blockDims(c)
  const g = c.grams ?? 100
  const tex = useLabel([{ text: g >= 1000 ? `${g / 1000} kg` : `${g} g`, font: 'bold 120px sans-serif', y: 128 }], 512, 256)
  return (
    <group>
      <RBox size={[x, y, z]} r={0.12} pos={[0, y / 2, 0]} color="#5f6a72" metal={0.8} rough={0.45} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <Cyl key={i} r={0.17} h={0.02} pos={[sx * (x / 2 - 0.45), y + 0.005, sz * (z / 2 - 0.45)]} color="#1b1f22" seg={12} />
      ))}
      <mesh position={[0, y + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[x * 0.8, x * 0.4]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} />
      </mesh>
    </group>
  )
}

export default { type: 'loadBlock', Model }
