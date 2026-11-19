// Cremalheira de módulo 1 numa guia: a barra dentada de POM (dentes de flancos retos a 20°,
// linha primitiva no topo do corpo) desliza segundo x com o mount "bar" entre as duas réguas
// de alumínio da guia, aparafusadas à base com parafusos DIN 912.
import { useFrame, useRef, geo, mat, THREE } from '../kit.jsx'
import { plateGeo, rrectShape, addHole, brushedMat, SocketScrews } from './_mechKit.jsx'
import { slideNow } from '../../../functions/mechLive.js'
import { RACK, rackLen } from '@shared/parts/gearRack.js'
import { scaleOf } from '@shared/components.js'

const M = 0.1
const P = Math.PI * M

function rackGeo(L) {
  return geo(`rack2:${L}`, () => {
    const s = new THREE.Shape()
    const yb = RACK.Y0
    const yr = RACK.Y0 + RACK.H - 1.25 * M // pé do dente
    const yt = RACK.Y0 + RACK.H + M // cabeça do dente
    s.moveTo(-L / 2, yb)
    s.lineTo(L / 2, yb)
    s.lineTo(L / 2, yr)
    const n = Math.floor(L / P)
    const yp = RACK.Y0 + RACK.H // linha primitiva
    const t20 = Math.tan((20 * Math.PI) / 180)
    const hp = P / 4 // meia-espessura do dente na linha primitiva
    for (let i = n - 1; i >= 0; i--) {
      const x = -L / 2 + (i + 0.5) * P + (L - n * P) / 2
      s.lineTo(x + Math.min(P / 2 - 0.005, hp + (yp - yr) * t20), yr)
      s.lineTo(x + hp - M * t20, yt)
      s.lineTo(x - hp + M * t20, yt)
      s.lineTo(x - Math.min(P / 2 - 0.005, hp + (yp - yr) * t20), yr)
    }
    s.lineTo(-L / 2, yr)
    s.closePath()
    const b = 0.01
    const g = new THREE.ExtrudeGeometry(s, { depth: RACK.W - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: 1 })
    g.translate(0, 0, -RACK.W / 2 + b)
    g.computeVertexNormals()
    return g
  })
}

function Model({ part }) {
  const L = rackLen(part.config || {})
  const bar = useRef()
  useFrame(() => {
    if (bar.current) bar.current.position.x = slideNow(part.id, 'bar', [0, 1, 0]) / scaleOf(part)[0] // o grupo do modelo já está escalado
  })
  const G = RACK.GUIDE_L
  return (
    <group>
      {/* base da guia (chapa com 4 furos de fixação) e réguas laterais aparafusadas */}
      <mesh geometry={plateGeo('rackBase', RACK.Y0, () => {
        const sh = rrectShape(-G / 2, -1.2, G / 2, 1.2, 0.15)
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) addHole(sh, sx * (G / 2 - 0.45), sz * 0.85, 0.17)
        return sh
      }, 0.02)} material={brushedMat('#3d4a52', 0.6, 0.45)} castShadow receiveShadow />
      {[-1, 1].map((sd) => (
        <mesh key={sd} geometry={plateGeo('rackRail', 0.9, () => rrectShape(-G / 2, -0.175, G / 2, 0.175, 0.05), 0.02)} position={[0, RACK.Y0, sd * (RACK.W / 2 + 0.2)]} material={brushedMat('#c9d1d6', 0.85, 0.32)} castShadow receiveShadow />
      ))}
      <SocketScrews pts={[-1, 1].flatMap((sd) => [-1, 0, 1].map((k) => [k * (G / 2 - 0.6), RACK.Y0 + 0.9, sd * (RACK.W / 2 + 0.2)]))} rh={0.13} hh={0.12} />
      <group ref={bar}>
        <mesh geometry={rackGeo(L)} material={mat('#f1f1ec', 0, 0.4)} castShadow receiveShadow />
      </group>
    </group>
  )
}

export default { type: 'gearRack', Model }
