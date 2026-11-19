// Íman do sensor de porta MC-38: caixa de ABS branca com o corpo de perfil trapezoidal boleado
// (onde vai o íman), abas de fixação nas pontas com os furos escareados e os parafusos, a
// tampa de baixo e a marca de alinhamento gravada no topo.
import { RBox, Box, mat } from '../kit.jsx'
import { extrudeXGeo, roundShape, ScrewHead } from './_casaKit.jsx'

const WHITE = '#f3f3f0'

function Model() {
  // perfil do corpo (forma: x = z, y = altura): base 1,2, topo 0,9 (com o boleado das arestas)
  const body = extrudeXGeo('imanBody', () => roundShape([[-0.56, 0.0, 0], [0.56, 0.0, 0], [0.44, 0.84, 0.2], [-0.44, 0.84, 0.2]]), 1.4, 0.04)
  return (
    <group>
      {/* tampa de baixo (base com as abas) */}
      <RBox size={[2.2, 0.28, 1.2]} r={0.12} pos={[0, 0.14, 0]} color={WHITE} rough={0.4} />
      {/* corpo do íman */}
      <mesh geometry={body} material={mat(WHITE, 0, 0.38)} castShadow receiveShadow />
      {/* furos escareados das abas com os parafusos */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.88, 0.281, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat('#c9c9c3', 0, 0.6)}>
            <circleGeometry args={[0.16, 18]} />
          </mesh>
          <ScrewHead pos={[s * 0.88, 0.3, 0]} r={0.11} rotY={s * 0.5} color="#d5d9dc" />
        </group>
      ))}
      {/* marca de alinhamento (seta gravada) no topo, do lado que fica junto ao sensor */}
      <Box size={[0.05, 0.02, 0.4]} pos={[0.45, 0.875, 0]} color="#9e9e9e" />
      <Box size={[0.22, 0.02, 0.05]} pos={[0.36, 0.875, 0]} color="#9e9e9e" />
    </group>
  )
}

export default { type: 'imanPorta', Model }
