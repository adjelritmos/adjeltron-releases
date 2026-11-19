// Berço para motor impresso em 3D (simétrico): base com 4 furos passantes e cantos boleados,
// um degrau de cada lado (caixa para a cabeça do parafuso) e o bloco central (perfil extrudido
// segundo z, arestas chanfradas) com a cava larga e pouco funda no topo, e duas janelas para a
// braçadeira. Furos de verdade (vê-se através), como na peça impressa.
import { Box, THREE, geo } from '../kit.jsx'
import { partMat } from './_matKit.jsx'
import { plateGeo, rrectShape, addHole } from './_mechKit.jsx'
import { bercoDims } from '@shared/parts/bercoMotor.js'

// bloco: perfil (x, y) com a cava (arco de raio R centrado no eixo do motor), extrudido em z
function blockGeo(b) {
  return geo(`berco3:${b.R},${b.W}`, () => {
    const s = new THREE.Shape()
    const h = b.top - b.axisY // < 0: o topo fica abaixo do eixo
    const a0 = Math.atan2(h, b.cx) // canto direito da cava
    const a1 = Math.atan2(h, -b.cx) // canto esquerdo
    s.moveTo(-b.bw / 2, 0)
    s.lineTo(b.bw / 2, 0)
    s.lineTo(b.bw / 2, b.top)
    s.lineTo(b.cx, b.top)
    const N = 24
    for (let i = 1; i < N; i++) {
      const t = a0 + (i / N) * (a1 - a0) // de a0 a a1, por baixo do eixo
      s.lineTo(Math.cos(t) * b.R, b.axisY + Math.sin(t) * b.R)
    }
    s.lineTo(-b.cx, b.top)
    s.lineTo(-b.bw / 2, b.top)
    s.closePath()
    const e = 0.02
    const g = new THREE.ExtrudeGeometry(s, { depth: b.W - 2 * e, bevelEnabled: true, bevelThickness: e, bevelSize: e, bevelOffset: -e, bevelSegments: 1, curveSegments: 4 })
    g.translate(0, 0, -b.W / 2 + e)
    g.computeVertexNormals()
    return g
  })
}

function Model({ part }) {
  const c = part.config || {}
  const b = bercoDims(c)
  const m = partMat(c, 'pla')
  const sx = b.bw / 2 + b.stepW / 2
  const ex = (b.L / 2 + b.bw / 2 + b.stepW) / 2 // centro das pontas da base
  const hr = Math.min(0.16, 0.25 * b.stepW) // raio dos furos
  const base = plateGeo(`bercoBase${b.L},${b.W},${b.T},${sx},${ex}`, b.T, () => {
    const sh = rrectShape(-b.L / 2, -b.W / 2, b.L / 2, b.W / 2, Math.min(0.3, b.W * 0.2))
    for (const x of [-ex, -sx, sx, ex]) addHole(sh, x, 0, hr)
    return sh
  }, 0.02)
  const step = plateGeo(`bercoStep${b.stepW},${b.W},${b.stepT}`, b.stepT, () => {
    const sh = rrectShape(-b.stepW / 2, -b.W / 2, b.stepW / 2, b.W / 2, 0.04)
    addHole(sh, 0, 0, hr * 1.7) // caixa da cabeça do parafuso (fica rente ao degrau)
    return sh
  }, 0.015)
  return (
    <group>
      {/* placa de base */}
      <mesh geometry={base} material={m} castShadow receiveShadow />
      {/* degraus dos dois lados */}
      {[-1, 1].map((k) => (
        <mesh key={k} geometry={step} position={[k * sx, b.T, 0]} material={m} castShadow receiveShadow />
      ))}
      {/* bloco central com a cava */}
      <mesh geometry={blockGeo(b)} material={m} castShadow receiveShadow />
      {/* janelas (braçadeira / fios) num dos lados do bloco */}
      {[-0.22, 0.22].map((z) => (
        <Box key={z} size={[0.02, 0.32 * b.R, 0.32 * b.R]} pos={[-b.bw / 2 - 0.01, b.top - 0.75 * b.R, z * b.W]} color="#3b3c52" />
      ))}
    </group>
  )
}

export default { type: 'bercoMotor', Model }
