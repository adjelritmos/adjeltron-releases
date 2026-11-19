// Dobradiça de aço inox (tipo "butt hinge"): aba fixa (x −2,5…0), nós enrolados com o pino
// segundo z em y = 0,25 (cabeças boleadas nas pontas) e aba móvel que roda à volta do pino com
// o mount "pin" (eixo y do mount = +z da peça). Abas com cantos boleados e furos escareados.
import { useFrame, useRef, geo, mat, mergedGeo, THREE } from '../kit.jsx'
import { mountRotNow } from '../../../functions/mechLive.js'
import { plateGeo, addHole, brushedMat } from './_mechKit.jsx'
import { HINGE } from '@shared/parts/hinge.js'

const STEEL = '#c3cbd0'
const HOLES = [[1.6, -0.9], [1.6, 0.9]] // (distância ao pino, z)

// aba de x = 0 (junto ao nó) a x = L, cantos de fora boleados, furos escareados
function leafShape() {
  const L = HINGE.L
  const W = HINGE.W
  const r = 0.3
  const s = new THREE.Shape()
  s.moveTo(0, -W / 2)
  s.lineTo(L - r, -W / 2)
  s.absarc(L - r, -W / 2 + r, r, -Math.PI / 2, 0, false)
  s.lineTo(L, W / 2 - r)
  s.absarc(L - r, W / 2 - r, r, 0, Math.PI / 2, false)
  s.lineTo(0, W / 2)
  s.lineTo(0, -W / 2)
  for (const [x, z] of HOLES) addHole(s, x, -z, 0.17)
  return s
}
// escareado (cone à volta de cada furo, na face de cima da aba)
function csinkGeo(T) {
  return mergedGeo(`hingeCs${T}`, () => {
    const cone = geo('hingeCone', () => new THREE.LatheGeometry([new THREE.Vector2(0.3, 0), new THREE.Vector2(0.17, -0.1)], 20))
    return HOLES.map(([x, z]) => [cone, [x, T + 0.001, z]])
  })
}
// nós: tubos enrolados (os de índice par na aba fixa, os ímpares na móvel)
function knuckleGeo(par) {
  const kn = 5
  const W = HINGE.W
  return mergedGeo(`hingeKn${par}`, () => {
    const tube = geo(`hingeTube${W / kn}`, () => {
      const h = W / kn - 0.02
      const p = [[0.08, 0], [0.18, 0], [0.2, 0.02], [0.2, h - 0.02], [0.18, h], [0.08, h], [0.08, 0]].map(([a, b]) => new THREE.Vector2(a, b))
      return new THREE.LatheGeometry(p, 20).translate(0, -h / 2, 0)
    })
    const out = []
    for (let i = 0; i < kn; i++) if (i % 2 === par) out.push([tube, [0, 0, -W / 2 + (i + 0.5) * (W / kn)], [Math.PI / 2, 0, 0]])
    return out
  })
}

function Model({ part }) {
  const leaf = useRef()
  useFrame(() => {
    if (leaf.current) leaf.current.rotation.z = mountRotNow(part.id, 'pin')
  })
  const T = HINGE.T
  const M = brushedMat(STEEL, 0.85, 0.3)
  const leafG = plateGeo('hingeLeaf', T, leafShape, 0.015)
  return (
    <group>
      {/* aba fixa (espelhada: do pino para −x) */}
      <group scale={[-1, 1, 1]}>
        <mesh geometry={leafG} material={M} castShadow receiveShadow />
        <mesh geometry={csinkGeo(T)} material={mat('#9aa3a9', 0.9, 0.3, { side: THREE.DoubleSide })} />
      </group>
      <mesh geometry={knuckleGeo(0)} position={[0, HINGE.PIN_Y, 0]} material={M} castShadow receiveShadow />
      {/* pino com as cabeças boleadas */}
      <mesh position={[0, HINGE.PIN_Y, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={geo(`hingePin${HINGE.W}`, () => new THREE.CylinderGeometry(0.08, 0.08, HINGE.W + 0.06, 12))} material={mat('#9aa4aa', 0.9, 0.25)} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, HINGE.PIN_Y, s * (HINGE.W / 2 + 0.03)]} rotation={[s * Math.PI / 2, 0, 0]} geometry={geo('hingePinHead', () => new THREE.SphereGeometry(0.13, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 1))} material={mat('#b4bcc1', 0.9, 0.25)} />
      ))}
      <group ref={leaf} position={[0, HINGE.PIN_Y, 0]}>
        <group position={[0.05, -HINGE.PIN_Y, 0]}>
          <mesh geometry={leafG} material={M} castShadow receiveShadow />
          <mesh geometry={csinkGeo(T)} material={mat('#9aa3a9', 0.9, 0.3, { side: THREE.DoubleSide })} />
        </group>
        <mesh geometry={knuckleGeo(1)} material={M} castShadow receiveShadow />
      </group>
    </group>
  )
}

export default { type: 'hinge', Model }
