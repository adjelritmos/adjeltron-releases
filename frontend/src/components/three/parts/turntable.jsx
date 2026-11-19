// Mesa giratória (rolamento de giro com coroa dentada): base quadrada de aço zincado com 4
// furos de fixação e a pista de esferas, prato de alumínio com 8 furos roscados e furo central
// sobre a coroa de 96 dentes (módulo 1) aparafusada por baixo; roda com o mount "top".
import { useFrame, useRef, mat, geo, mergedGeo, THREE } from '../kit.jsx'
import { mountRotNow } from '../../../functions/mechLive.js'
import { Gear, plateGeo, rrectShape, addHole, brushedMat, aroundY } from './_mechKit.jsx'
import { TT } from '@shared/parts/turntable.js'
import { GEAR_M } from '@shared/parts/_mech.js'

// base: chapa quadrada com os cantos boleados, 4 furos e a abertura central
function baseShape() {
  const B = TT.BASE
  const s = rrectShape(-B / 2, -B / 2, B / 2, B / 2, 0.5)
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) addHole(s, x * (B / 2 - 0.6), z * (B / 2 - 0.6), 0.22)
  addHole(s, 0, 0, 2.2)
  return s
}
// prato: disco com 8 furos M4 numa circunferência e furo central de passagem de cabos
function topShape() {
  const s = new THREE.Shape()
  s.absarc(0, 0, 4.4, 0, Math.PI * 2, false)
  for (let i = 0; i < 8; i++) addHole(s, Math.cos((i / 8) * Math.PI * 2) * 3.6, Math.sin((i / 8) * Math.PI * 2) * 3.6, 0.2)
  addHole(s, 0, 0, 0.6)
  return s
}
// esferas da pista (uma só malha) e o anel de retenção
function ballsGeo() {
  return mergedGeo('ttBalls', () => {
    const b = geo('ttBall', () => new THREE.SphereGeometry(0.16, 10, 8))
    return Array.from({ length: 30 }, (_, i) => [b, aroundY((i / 30) * Math.PI * 2, [3.0, 0, 0])[0]])
  })
}

function Model({ part }) {
  const top = useRef()
  useFrame(() => {
    if (top.current) top.current.rotation.y = mountRotNow(part.id, 'top')
  })
  return (
    <group>
      <mesh geometry={plateGeo('ttBase', TT.BASE_T, baseShape, 0.03, 24)} material={brushedMat('#7d8a92', 0.8, 0.38)} castShadow receiveShadow />
      {/* pista de esferas entre dois anéis */}
      <mesh position={[0, TT.BASE_T, 0]} geometry={geo('ttRace', () => new THREE.LatheGeometry([[2.75, 0], [3.25, 0], [3.25, 0.05], [2.75, 0.05], [2.75, 0]].map(([a, b]) => new THREE.Vector2(a, b)), 64))} material={mat('#aab3b9', 0.9, 0.3)} />
      <mesh position={[0, TT.BASE_T + 0.06, 0]} geometry={ballsGeo()} material={mat('#eef0f2', 1, 0.12)} />
      <group ref={top}>
        <Gear z={TT.Z} m={GEAR_M} w={0.6} y0={0.4} color="#d7dde1" metal={0.75} rough={0.35} bore={3.2} />
        <mesh geometry={plateGeo('ttTop', 0.12, topShape, 0.02, 32)} position={[0, TT.TOP_Y - 0.12, 0]} material={brushedMat('#cfd8dc', 0.8, 0.3)} castShadow receiveShadow />
        {/* marca vermelha para se ver a rotação */}
        <mesh position={[3.9, TT.TOP_Y + 0.005, 0]} geometry={geo('ttMark', () => new THREE.BoxGeometry(0.6, 0.02, 0.15))} material={mat('#e53935', 0, 0.5)} />
      </group>
    </group>
  )
}

export default { type: 'turntable', Model }
