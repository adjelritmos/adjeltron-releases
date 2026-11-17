// Cabeça do cão robô: caixa de alumínio (duas faces laterais, testa, tampa e queixo). O modelo é
// desenhado no referencial "natural" (x frente, y cima, z direita) dentro de um grupo rodado
// −90° em x (o y local da peça é o eixo do servo que acena a cabeça).
import { HEAD } from '@shared/parts/cabecaCao.js'
import { aluMat, plateGeo, flatPlateGeo, roundRectShape, circleHole, slotHole, Screws } from './_caoKit.jsx'
import { hornPts } from './coxaAlu.jsx'

const { T, x0, x1, y0, y1, z0, z1, chin } = HEAD

function sideShape(horn) {
  const s = roundRectShape(x0, y0, x1, y1, 0.7)
  circleHole(s, 0, 0, 0.32)
  if (horn) for (const [x, y] of hornPts()) circleHole(s, x, y, 0.1)
  circleHole(s, 0.25, 1.75, 0.45)
  circleHole(s, 0.25, -1.45, 0.38)
  return s
}
function frontShape() {
  // perfil no plano (−z, y)
  const s = roundRectShape(-z1, y0, -z0, y1, 0.35)
  slotHole(s, 0.7, 2.3, 0.2, 0.2)
  for (const u of [0.25, 2.75]) circleHole(s, u, -1.6, 0.12)
  return s
}
const topShape = () => roundRectShape(x0 + 0.4, -z1, x1, -z0, 0.4)
function chinShape() {
  const s = roundRectShape(chin[0], -z1 - 0.35, chin[1], -z0 + 0.35, 0.45)
  slotHole(s, chin[0] + 0.5, chin[0] + 0.9, 1.5, 0.15)
  return s
}

function Model() {
  const M = aluMat()
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {/* faces laterais: a da direita no braço do servo, a da esquerda com o furo do rolamento */}
      <mesh geometry={plateGeo('headSideR', () => sideShape(true), T, 0.03)} material={M} position={[0, 0, z1 - T]} castShadow receiveShadow />
      <mesh geometry={plateGeo('headSideL', () => sideShape(false), T, 0.03)} material={M} position={[0, 0, z0]} castShadow receiveShadow />
      {/* testa (onde encaixa a câmara) */}
      <mesh geometry={plateGeo('headFront', frontShape, T, 0.03)} material={M} position={[x1 - T, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow />
      {/* tampa e queixo (onde assenta o HC-SR04) */}
      <mesh geometry={flatPlateGeo('headTop', topShape, T, 0.03)} material={M} position={[0, y1 - T, 0]} castShadow receiveShadow />
      <mesh geometry={flatPlateGeo('headChin', chinShape, T, 0.03)} material={M} position={[0, y0, 0]} castShadow receiveShadow />
      {/* parafusos: braço do servo e cantos */}
      <Screws axis="z" pts={hornPts().map(([x, y]) => [x, y, z1])} r={0.12} />
      <Screws axis="z" pts={[[x1 - 0.5, y1 - 0.5, z1], [x1 - 0.5, y0 + 0.5, z1]]} r={0.13} />
      <Screws axis="-z" pts={[[0, 0, z0], [x1 - 0.5, y1 - 0.5, z0], [x1 - 0.5, y0 + 0.5, z0]]} r={0.13} />
    </group>
  )
}

export default { type: 'cabecaCao', Model }
