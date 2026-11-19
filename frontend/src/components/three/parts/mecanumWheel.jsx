// Roda mecanum (como as de 60/80 mm dos kits): 10 rolos de borracha em barril a ±45° do eixo
// da roda, cada um num pino de aço preso entre as duas placas laterais de alumínio estampado
// (com as abas dobradas que seguram os pinos e janelas de alívio), cubo de alumínio com furo
// e parafusos de aperto. Versão L: rolos a +45° (o eixo do rolo inclina para +y no sentido de
// rotação positivo).
import { geo, mat, mergedGeo, THREE } from '../kit.jsx'
import { rollerGeo } from './omniWheel.jsx'
import { plateGeo, addHole, aroundY, brushedMat, SocketScrews } from './_mechKit.jsx'
import { mecDims } from '@shared/parts/mecanumWheel.js'

// placa lateral: disco com janelas de alívio e furo central
function sideShape(R) {
  const s = new THREE.Shape()
  s.absarc(0, 0, R, 0, Math.PI * 2, false)
  const n = 5
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + 0.3
    const a1 = a0 + (Math.PI * 2) / n - 0.55
    const h = new THREE.Path()
    h.absarc(0, 0, R * 0.74, a0, a1, false)
    h.absarc(0, 0, R * 0.42, a1, a0, true)
    s.holes.push(h)
  }
  addHole(s, 0, 0, 0.2)
  return s
}

function Model({ part }) {
  const c = part.config || {}
  const { r, w } = mecDims(c)
  const s = c.hand === 'R' ? -1 : 1
  const rr = r * 0.15
  const N = 10
  const len = w * 1.05
  const tilt = s > 0 ? Math.PI / 4 : (3 * Math.PI) / 4
  const plateR = r - rr * 1.05
  const rollers = mergedGeo(`mecRol${r},${w},${s}`, () => {
    const g = rollerGeo(len, rr)
    return Array.from({ length: N }, (_, i) => {
      const [p, q] = aroundY(-(i / N) * Math.PI * 2, [r - rr, w / 2, 0], [tilt, 0, 0])
      return [g, p, q]
    })
  })
  const pins = mergedGeo(`mecPin${r},${w},${s}`, () => {
    const cy = geo('mecPinC', () => new THREE.CylinderGeometry(0.04, 0.04, 1, 8))
    return Array.from({ length: N }, (_, i) => {
      const [p, q] = aroundY(-(i / N) * Math.PI * 2, [r - rr, w / 2, 0], [tilt, 0, 0])
      return [cy, p, q, [1, len * 1.04, 1]]
    })
  })
  // abas dobradas das placas (seguram as pontas dos pinos)
  const tabs = mergedGeo(`mecTab${r},${w}`, () => {
    const b = geo('mkUnitBox', () => new THREE.BoxGeometry(1, 1, 1))
    return Array.from({ length: N }, (_, i) => [0.08, w - 0.08].map((y) => {
      const [p, q] = aroundY(-(i / N) * Math.PI * 2, [r - rr * 1.15, y, 0])
      return [b, p, q, [rr * 0.9, 0.16, rr * 0.7]]
    })).flat()
  })
  const alu = brushedMat('#9fb0ba', 0.8, 0.34)
  return (
    <group>
      {[0, w - 0.16].map((y) => (
        <mesh key={y} geometry={plateGeo(`mecSide${plateR}`, 0.16, () => sideShape(plateR), 0.02, 24)} position={[0, y, 0]} material={alu} castShadow receiveShadow />
      ))}
      <mesh geometry={tabs} material={alu} castShadow />
      <mesh geometry={rollers} material={mat('#2b2b2b', 0, 0.85, { side: THREE.DoubleSide })} castShadow />
      <mesh geometry={pins} material={mat('#c9ced2', 0.9, 0.3)} />
      {/* cubo (anel com o furo do veio) e parafusos do cubo na face de fora */}
      <mesh position={[0, w / 2, 0]} geometry={geo(`mecHub${w}`, () => new THREE.LatheGeometry([[0.2, -w / 2], [0.7, -w / 2], [0.7, w / 2], [0.2, w / 2], [0.2, -w / 2]].map(([a, b]) => new THREE.Vector2(a, b)), 28))} material={mat('#b0bec5', 0.85, 0.3)} castShadow />
      <SocketScrews pts={Array.from({ length: 6 }, (_, k) => [Math.cos((k / 6) * Math.PI * 2) * 0.88, w, Math.sin((k / 6) * Math.PI * 2) * 0.88])} rh={0.14} hh={0.08} />
    </group>
  )
}

export default { type: 'mecanumWheel', Model }
