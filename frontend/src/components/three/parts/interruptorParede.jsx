// Interruptor de parede (gama europeia de embutir, tipo espelho quadrado): espelho com a aresta
// boleada em degrau, abertura com a folga em sombra, tecla basculante larga e ligeiramente
// abaulada que inclina conforme está ligado, janela do sinalizador luminoso e a régua de
// bornes de parafuso atrás (L e L1).
import { RBox, Box, inputOf, useFrame, useRef } from '../kit.jsx'
import { Bornes } from './_casaKit.jsx'

function Model({ part }) {
  const c = part.config || {}
  const col = c.cor || '#f5f5f2'
  const key = useRef()
  useFrame(() => {
    if (key.current) key.current.rotation.z = inputOf(part.id).on ? 0.1 : -0.1
  })
  return (
    <group>
      {/* espelho: base e degrau boleado por cima */}
      <RBox size={[2.6, 0.16, 2.6]} r={0.07} pos={[0, 0.08, 0]} color={col} rough={0.32} />
      <RBox size={[2.42, 0.1, 2.42]} r={0.05} pos={[0, 0.17, 0]} color={col} rough={0.28} />
      {/* abertura do espelho: folga escura à volta da tecla e suporte (bastidor) */}
      <Box size={[1.66, 0.02, 2.02]} pos={[0, 0.215, 0]} color="#3a3a38" rough={0.8} />
      <Box size={[1.56, 0.1, 1.92]} pos={[0, 0.27, 0]} color="#d9d9d4" rough={0.5} />
      {/* tecla basculante (eixo segundo z) */}
      <group ref={key} position={[0, 0.38, 0]}>
        <RBox size={[1.52, 0.16, 1.88]} r={0.06} pos={[0, 0.02, 0]} color={col} rough={0.25} />
        <RBox size={[1.4, 0.05, 1.76]} r={0.025} pos={[0, 0.1, 0]} color={col} rough={0.2} />
        {/* sinalizador luminoso (janela laranja) */}
        <RBox size={[0.3, 0.03, 0.12]} r={0.012} pos={[0.5, 0.12, 0]} color="#ff7043" rough={0.25} />
      </group>
      {/* régua de bornes atrás (L e L1) */}
      <Bornes pos={[-1.3, 0.15, 0]} size={[0.4, 0.3, 1.0]} zs={[-0.3, 0.3]} />
    </group>
  )
}

export default { type: 'interruptorParede', Model }
