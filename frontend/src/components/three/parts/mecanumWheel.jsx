// Roda mecanum: 9 rolos em barril a ±45° do eixo da roda, entre duas placas laterais.
// Versão L: rolos a +45° (o eixo do rolo inclina para +y no sentido de rotação positivo).
import { Cyl, mat, THREE } from '../kit.jsx'
import { rollerGeo } from './omniWheel.jsx'
import { mecDims } from '@shared/parts/mecanumWheel.js'

function Model({ part }) {
  const c = part.config || {}
  const { r, w } = mecDims(c)
  const s = c.hand === 'R' ? -1 : 1
  const rr = r * 0.15
  const N = 10
  const len = w * 1.05
  const rg = rollerGeo(len, rr)
  const rm = mat('#2b2b2b', 0, 0.85, { side: THREE.DoubleSide })
  return (
    <group>
      {[0.08, w - 0.08].map((y) => (
        <Cyl key={y} r={r - rr * 1.05} h={0.16} pos={[0, y, 0]} color="#78909c" metal={0.7} rough={0.35} seg={N * 2} />
      ))}
      {Array.from({ length: N }, (_, i) => {
        const a = (i / N) * Math.PI * 2
        return (
          <group key={i} rotation={[0, -a, 0]}>
            <mesh position={[r - rr, w / 2, 0]} rotation={[s > 0 ? Math.PI / 4 : (3 * Math.PI) / 4, 0, 0]} geometry={rg} material={rm} castShadow />
            {[0.08, w - 0.08].map((y) => (
              <mesh key={y} position={[r - rr * 1.15, y, 0]}>
                <boxGeometry args={[rr * 0.9, 0.16, rr * 0.7]} />
                <meshStandardMaterial color="#78909c" metalness={0.7} roughness={0.35} />
              </mesh>
            ))}
          </group>
        )
      })}
      <Cyl r={0.7} h={w} pos={[0, w / 2, 0]} color="#b0bec5" metal={0.85} rough={0.3} seg={20} />
      <Cyl r={0.2} h={w + 0.02} pos={[0, w / 2, 0]} color="#111" seg={12} />
    </group>
  )
}

export default { type: 'mecanumWheel', Model }
