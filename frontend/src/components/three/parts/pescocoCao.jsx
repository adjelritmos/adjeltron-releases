// Pescoço do cão robô: base no braço do servo vertical e parede com janela onde o micro servo
// da cabeça entra deitado (abas aparafusadas por trás).
import { NECK } from '@shared/parts/pescocoCao.js'
import { Cyl } from '../kit.jsx'
import { aluMat, plateGeo, flatPlateGeo, roundRectShape, circleHole, rectHole, Screws } from './_caoKit.jsx'
import { hornPts } from './coxaAlu.jsx'

const { T, plateZ } = NECK
const HY = NECK.horn[1]

function baseShape() {
  // x −2,4..1,2; z −1,4..1,0 (o perfil usa y = −z)
  const s = roundRectShape(-2.4, -1.0, 1.2, 1.4, 0.35)
  circleHole(s, 0, 0, 0.32)
  for (const [x, y] of hornPts()) circleHole(s, x, y, 0.1)
  circleHole(s, -1.6, 0.6, 0.3)
  return s
}
function wallShape() {
  const s = roundRectShape(-2.4, 0, 1.2, HY + 0.85, 0.35)
  // janela do corpo do servo e furos das abas
  rectHole(s, -1.75, HY - 0.66, 0.65, HY + 0.66, 0.1)
  for (const x of [-1.97, 0.87]) circleHole(s, x, HY, 0.1)
  circleHole(s, -0.55, 0.6, 0.28)
  return s
}

function Model() {
  const M = aluMat()
  return (
    <group>
      <mesh geometry={flatPlateGeo('neckBase', baseShape, T, 0.03)} material={M} castShadow receiveShadow />
      <mesh geometry={plateGeo('neckWall', wallShape, T, 0.03)} material={M} position={[0, 0, plateZ]} castShadow receiveShadow />
      {/* dobra da chapa */}
      <Cyl r={T} h={3.6} pos={[-0.6, T, plateZ]} rot={[0, 0, Math.PI / 2]} color="#c9cfd3" metal={0.85} rough={0.35} seg={10} />
      <Screws pts={hornPts().map(([x, y]) => [x, T, -y])} r={0.12} />
      <Screws axis="z" pts={[-1.97, 0.87].map((x) => [x, HY, plateZ + T])} r={0.12} />
    </group>
  )
}

export default { type: 'pescocoCao', Model }
