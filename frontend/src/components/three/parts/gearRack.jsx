// Cremalheira de módulo 1 numa guia: a barra dentada (dentes em cima, linha primitiva no
// topo do corpo) desliza segundo x com o mount "bar".
import { Box, useFrame, useRef, geo, mat, THREE } from '../kit.jsx'
import { slideNow } from '../../../functions/mechLive.js'
import { RACK, rackLen } from '@shared/parts/gearRack.js'
import { scaleOf } from '@shared/components.js'

const M = 0.1
const P = Math.PI * M

function rackGeo(L) {
  return geo(`rack${L}`, () => {
    const s = new THREE.Shape()
    const yb = RACK.Y0
    const yr = RACK.Y0 + RACK.H - 1.25 * M // pé do dente
    const yt = RACK.Y0 + RACK.H + M // cabeça do dente
    s.moveTo(-L / 2, yb)
    s.lineTo(L / 2, yb)
    s.lineTo(L / 2, yr)
    const n = Math.floor(L / P)
    for (let i = n - 1; i >= 0; i--) {
      const x = -L / 2 + (i + 0.5) * P + (L - n * P) / 2
      s.lineTo(x + P * 0.4, yr)
      s.lineTo(x + P * 0.18, yt)
      s.lineTo(x - P * 0.18, yt)
      s.lineTo(x - P * 0.4, yr)
    }
    s.lineTo(-L / 2, yr)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: RACK.W, bevelEnabled: false })
    g.translate(0, 0, -RACK.W / 2)
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
      <Box size={[G, RACK.Y0, 2.4]} pos={[0, RACK.Y0 / 2, 0]} color="#37474f" metal={0.5} rough={0.45} />
      {[-1, 1].map((s) => (
        <Box key={s} size={[G, 0.9, 0.35]} pos={[0, RACK.Y0 + 0.45, s * (RACK.W / 2 + 0.2)]} color="#37474f" metal={0.5} rough={0.45} />
      ))}
      <group ref={bar}>
        <mesh geometry={rackGeo(L)} material={mat('#eceff1', 0.1, 0.45)} castShadow receiveShadow />
      </group>
    </group>
  )
}

export default { type: 'gearRack', Model }
