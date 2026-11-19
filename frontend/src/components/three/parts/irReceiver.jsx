// Recetor IR KY-022: placa preta com o VS1838B (corpo de epóxi preto com a lente em cúpula)
// deitado na ponta +x, pernas dobradas até às ilhas de solda, resistência e LED vermelho que
// pisca ao receber; pinos S + −.
import { RBox, HeaderPins, Leg, GlowLed, liveOf, THREE, geo, mergedGeo, mat, METAL } from '../kit.jsx'
import def from '@shared/parts/irReceiver.js'
import { Board, Passive, Silk, PinLabels } from './_analogModule.jsx'

const T = 0.16

// ilhas de solda das 3 pernas do recetor (anel estanhado + furo)
const padsGeo = () =>
  mergedGeo('ky022pads', () => {
    const ring = geo('ky022ring', () => new THREE.CylinderGeometry(0.075, 0.075, 0.012, 14))
    return [-0.254, 0, 0.254].map((z) => [ring, [0.35, T + 0.006, z]])
  })

function Model({ part }) {
  const blink = () => {
    const L = liveOf(part.id)
    if (!L?.powered) return 0
    return L.rx ? (Math.floor(performance.now() / 60) % 2 ? 1 : 0.25) : 0
  }
  return (
    <group>
      <Board x={[-1.2, 1.3]} z={[-0.75, 0.75]} t={T} color="#151515" r={0.07} holes={[[-0.25, 0.0, 0.15]]} />
      <mesh geometry={padsGeo()} material={mat(METAL.tin, 1, 0.3)} />
      {/* VS1838B: pernas dobradas a 90° e corpo deitado com a cúpula para cima */}
      {[-0.254, 0, 0.254].map((z) => (
        <group key={z}>
          <Leg from={[0.35, T, z]} to={[0.35, T + 0.25, z]} r={0.022} />
          <Leg from={[0.35, T + 0.25, z]} to={[0.62, T + 0.25, z]} r={0.022} />
        </group>
      ))}
      <group position={[0.92, T + 0.25, 0]}>
        <RBox size={[0.65, 0.5, 0.75]} r={0.05} pos={[0, 0, 0]} color="#1a1a1a" rough={0.38} />
        {/* ressalto de topo e cúpula (lente) */}
        <mesh position={[0.02, 0.25, 0]} scale={[1, 0.62, 1]} geometry={geo('vs1838dome', () => new THREE.SphereGeometry(0.28, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2))} material={mat('#262626', 0, 0.12)} />
        <mesh position={[0.02, 0.251, 0]} geometry={geo('vs1838ring', () => new THREE.TorusGeometry(0.29, 0.02, 6, 24).rotateX(Math.PI / 2))} material={mat('#1d1d1d', 0, 0.4)} />
      </group>
      {/* resistência SMD e LED de sinal */}
      <Passive pos={[-0.35, T, 0.45]} kind="r" big />
      <GlowLed pos={[-0.35, T + 0.04, -0.45]} size={[0.16, 0.08, 0.1]} color="#ff3030" read={blink} />
      <Silk text="KY-022" pos={[0.08, T + 0.002, 0]} w={0.42} d={0.12} rotY={Math.PI / 2} />
      <PinLabels pins={def.pins} names={['S', '+', '−']} y={T} off={[0.26, 0]} w={0.14} d={0.14} />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered || !live.rx) return null
  const [x, y] = info.project([-0.35, 0.2, -0.45])
  return <circle cx={x} cy={y} r={5} fill="#ff3030" opacity={0.9} filter="url(#glow)" pointerEvents="none" />
}

export default { type: 'irReceiver', Model, Overlay2D }
