// Interruptor de parede: espelho branco e tecla basculante que inclina conforme está ligado.
import { RBox, Box, Cyl, inputOf, useFrame, useRef } from '../kit.jsx'

function Model({ part }) {
  const c = part.config || {}
  const key = useRef()
  useFrame(() => {
    if (key.current) key.current.rotation.z = inputOf(part.id).on ? 0.12 : -0.12
  })
  return (
    <group>
      <RBox size={[2.6, 0.25, 2.6]} r={0.1} pos={[0, 0.125, 0]} color={c.cor || '#f5f5f2'} rough={0.35} />
      <Box size={[1.5, 0.12, 1.9]} pos={[0, 0.3, 0]} color="#e8e8e4" rough={0.4} />
      <group ref={key} position={[0, 0.38, 0]}>
        <RBox size={[1.3, 0.22, 1.7]} r={0.08} pos={[0, 0.06, 0]} color={c.cor || '#f5f5f2'} rough={0.3} />
        <Box size={[0.3, 0.02, 0.1]} pos={[0.4, 0.18, 0]} color="#ff7043" />
      </group>
      <Box size={[0.4, 0.3, 1.0]} pos={[-1.3, 0.15, 0]} color="#e0e0dc" rough={0.5} />
      {[-0.3, 0.3].map((z) => (
        <Cyl key={z} r={0.09} h={0.05} pos={[-1.3, 0.31, z]} color="#c0c6cc" metal={0.85} rough={0.3} seg={10} />
      ))}
    </group>
  )
}

export default { type: 'interruptorParede', Model }
