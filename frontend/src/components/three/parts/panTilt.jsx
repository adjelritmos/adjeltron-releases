// Suporte pan-tilt de plástico preto (o kit comum para 2 × SG90): disco no braço do servo pan
// (4 furos dos parafusos do braço e furo central de acesso ao parafuso do eixo) e berço em U
// que segura o SG90 do tilt deitado (o eixo do tilt fica horizontal, por cima do eixo do pan),
// com as abas de aparafusar o servo. Peças injetadas: arestas boleadas e nervuras nos cantos.
import { geo, mat, mergedGeo, THREE } from '../kit.jsx'
import { plateGeo, wallGeo, addHole, rrectShape } from './_mechKit.jsx'

const PL = '#1f1f1f'

function diskShape() {
  const s = new THREE.Shape()
  s.absarc(0, 0, 1.0, 0, Math.PI * 2, false)
  for (let k = 0; k < 4; k++) addHole(s, Math.cos((k * Math.PI) / 2) * 0.6, Math.sin((k * Math.PI) / 2) * 0.6, 0.08)
  addHole(s, 0, 0, 0.22)
  return s
}
// nervuras triangulares (reforço) entre a base do berço e as paredes
function ribsGeo() {
  return mergedGeo('ptRibs', () => {
    const r = geo('ptRib', () => {
      const s = new THREE.Shape()
      s.moveTo(0, 0)
      s.lineTo(0.4, 0)
      s.lineTo(0, 0.4)
      s.closePath()
      return new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false }).translate(0, 0, -0.06)
    })
    // junto às paredes em x (a nervura aponta para dentro do berço)
    return [
      [r, [-1.75, 0.5, 0.75]],
      [r, [0.65, 0.5, 0.75], [0, Math.PI, 0]],
    ]
  })
}

function Model() {
  const m = mat(PL, 0, 0.55)
  return (
    <group>
      <mesh geometry={plateGeo('ptDisk', 0.3, diskShape, 0.04, 28)} material={m} castShadow receiveShadow />
      {/* base do berço */}
      <mesh geometry={plateGeo('ptBase', 0.2, () => rrectShape(-1.35, -1.45, 1.35, 1.45, 0.12), 0.03)} position={[-0.55, 0.3, -0.3]} material={m} castShadow receiveShadow />
      {/* paredes em x (abraçam o servo pelos topos) */}
      {[-1.85, 0.75].map((x) => (
        <mesh key={x} geometry={wallGeo('ptSide', 2.9, 2.0, 0.2, [], 0.2, 0.03)} position={[x, 0.4, -0.3]} rotation={[0, Math.PI / 2, 0]} material={m} castShadow receiveShadow />
      ))}
      {/* parede de trás (fundo do servo) */}
      <mesh geometry={wallGeo('ptBack', 2.7, 2.0, 0.15, [], 0.2, 0.03)} position={[-0.55, 0.4, -1.75]} material={m} castShadow receiveShadow />
      <mesh geometry={ribsGeo()} material={m} castShadow />
      {/* abas de aparafusar o servo (furo do parafuso autorroscante) */}
      {[-1.95, 0.85].map((x) => (
        <mesh key={`t${x}`} geometry={plateGeo('ptTab', 0.15, () => {
          const s = rrectShape(-0.2, -0.3, 0.2, 0.3, 0.06)
          addHole(s, 0, 0, 0.06)
          return s
        }, 0.02)} position={[x, 1.525, 0]} material={m} castShadow receiveShadow />
      ))}
    </group>
  )
}

export default { type: 'panTilt', Model }
