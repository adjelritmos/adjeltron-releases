// Berço para motor impresso (simétrico): base com 4 furos, um degrau de cada lado e o bloco
// central (perfil extrudido segundo z) com a cava larga e pouco funda no topo, e duas janelas.
import { Box, Cyl, THREE, geo } from '../kit.jsx'
import { partMat } from './_matKit.jsx'
import { bercoDims } from '@shared/parts/bercoMotor.js'

// bloco: perfil (x, y) com a cava (arco de raio R centrado no eixo do motor), extrudido em z
function blockGeo(b) {
  return geo(`berco2:${b.R}`, () => {
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
    const g = new THREE.ExtrudeGeometry(s, { depth: b.W, bevelEnabled: false, curveSegments: 4 })
    g.translate(0, 0, -b.W / 2)
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
  const hr = 0.25 * b.stepW // raio dos furos
  const hole = (x, y, k) => <Cyl key={k} r={Math.min(0.16, hr)} h={0.02} pos={[x, y + 0.005, 0]} color="#3b3c52" seg={18} />
  return (
    <group>
      {/* placa de base */}
      <mesh position={[0, b.T / 2, 0]} material={m} castShadow receiveShadow>
        <boxGeometry args={[b.L, b.T, b.W]} />
      </mesh>
      {/* degraus dos dois lados */}
      {[-1, 1].map((k) => (
        <mesh key={k} position={[k * sx, b.T + b.stepT / 2, 0]} material={m} castShadow receiveShadow>
          <boxGeometry args={[b.stepW, b.stepT, b.W]} />
        </mesh>
      ))}
      {/* bloco central com a cava */}
      <mesh geometry={blockGeo(b)} material={m} castShadow receiveShadow />
      {/* janelas (braçadeira / fios) num dos lados do bloco */}
      {[-0.22, 0.22].map((z) => (
        <Box key={z} size={[0.02, 0.32 * b.R, 0.32 * b.R]} pos={[-b.bw / 2 - 0.01, b.top - 0.75 * b.R, z * b.W]} color="#3b3c52" />
      ))}
      {/* furos: 2 nos degraus e 2 nas pontas */}
      {hole(-sx, b.T + b.stepT, 'a')}
      {hole(sx, b.T + b.stepT, 'b')}
      {hole(-ex, b.T, 'c')}
      {hole(ex, b.T, 'd')}
    </group>
  )
}

export default { type: 'bercoMotor', Model }
