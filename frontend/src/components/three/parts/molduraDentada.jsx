// Moldura dentada em U: lado dentado (dentes para dentro, −z), lado liso e ponta fechada em
// +x; a ponta −x é aberta. Desliza segundo x com o mount "frame" (live.slide).
import { geo, useFrame, useRef, THREE } from '../kit.jsx'
import { slideNow } from '../../../functions/mechLive.js'
import { partMat } from './_matKit.jsx'
import { mdDims, MD } from '@shared/parts/molduraDentada.js'

const M = 0.1
const P = Math.PI * M

function frameGeo(d) {
  const { L, T, bar, zt0, zt1, zs0, zs1, endBar } = d
  return geo(`moldura${L},${T},${bar},${zt0},${zs0},${endBar}`, () => {
    // forma no plano (x, s) com s = −z (ver rotação abaixo)
    const s = new THREE.Shape()
    const pt = (x, z, first) => (first ? s.moveTo(x, -z) : s.lineTo(x, -z))
    pt(-L / 2, zt1, true)
    pt(L / 2, zt1)
    pt(L / 2, zs1)
    pt(-L / 2, zs1)
    pt(-L / 2, zs0)
    pt(L / 2 - endBar, zs0)
    pt(L / 2 - endBar, zt0)
    // dentes ao longo do lado dentado, de +x para −x, com a ponta virada para o pinhão (−z)
    const x0 = -L / 2
    const x1 = L / 2 - endBar
    const n = Math.floor((x1 - x0) / P)
    const off = (x1 - x0 - n * P) / 2
    const tip = zt0 - 0.125 - M // cabeça do dente: r − m
    for (let i = n - 1; i >= 0; i--) {
      const x = x0 + off + (i + 0.5) * P
      pt(x + P * 0.4, zt0)
      pt(x + P * 0.18, tip)
      pt(x - P * 0.18, tip)
      pt(x - P * 0.4, zt0)
    }
    pt(-L / 2, zt0)
    const g = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false })
    g.rotateX(-Math.PI / 2) // (x, s, profundidade) → (x, profundidade, −s)
    g.translate(0, MD.CY - T / 2, 0)
    g.computeVertexNormals()
    return g
  })
}

function Model({ part }) {
  const c = part.config || {}
  const d = mdDims(c)
  const g = useRef()
  useFrame(() => {
    if (g.current) g.current.position.x = slideNow(part.id, 'frame', [0, 1, 0])
  })
  return (
    <group ref={g}>
      <mesh geometry={frameGeo(d)} material={partMat(c, 'pla')} castShadow receiveShadow />
    </group>
  )
}

export default { type: 'molduraDentada', Model }
