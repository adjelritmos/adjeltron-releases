// Mancal KP08 (chumaceira de flange baixa em liga de zinco fundida): corpo com as orelhas da
// base e a caixa redonda numa só peça (perfil fundido com concordâncias), 2 porcas de
// fixação, rolamento de inserção com colar de aperto excêntrico e 2 parafusos sem cabeça,
// copo de lubrificação de latão no topo e troço de veio de 8 mm segundo +z (roda com o mount
// "shaft").
import { useFrame, useRef, geo, mat, THREE } from '../kit.jsx'
import { mountRotNow } from '../../../functions/mechLive.js'
import { rotZ, HexNuts, BRASS } from './_mechKit.jsx'
import { PB } from '@shared/parts/pillowBlock.js'

const ZAMAK = '#9aa2a8'
const RH = 1.15 // raio da caixa do rolamento

// perfil frontal (plano xy) extrudido segundo z: base com orelhas e caixa redonda
function bodyGeo() {
  return geo('kp08Body', () => {
    const L = PB.L
    const T = PB.T
    const s = new THREE.Shape()
    s.moveTo(-L / 2 + 0.2, 0)
    s.lineTo(L / 2 - 0.2, 0)
    s.quadraticCurveTo(L / 2, 0, L / 2, 0.2)
    s.lineTo(L / 2, T - 0.08)
    s.quadraticCurveTo(L / 2, T, L / 2 - 0.08, T)
    s.lineTo(1.55, T)
    // concordância até à caixa (tangente ao círculo a −25°)
    const a0 = (-25 * Math.PI) / 180
    s.quadraticCurveTo(1.15, T, Math.cos(a0) * RH, PB.AY + Math.sin(a0) * RH)
    s.absarc(0, PB.AY, RH, a0, Math.PI - a0, false)
    s.quadraticCurveTo(-1.15, T, -1.55, T)
    s.lineTo(-L / 2 + 0.08, T)
    s.quadraticCurveTo(-L / 2, T, -L / 2, T - 0.08)
    s.lineTo(-L / 2, 0.2)
    s.quadraticCurveTo(-L / 2, 0, -L / 2 + 0.2, 0)
    const h = new THREE.Path()
    h.absarc(0, PB.AY, 0.95, 0, Math.PI * 2, true)
    s.holes.push(h)
    const b = 0.05
    const g = new THREE.ExtrudeGeometry(s, { depth: PB.W - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: 2, curveSegments: 20 })
    g.translate(0, 0, -PB.W / 2 + b)
    g.computeVertexNormals()
    return g
  })
}
// rolamento visto de frente: anel exterior, vedante e anel interior com o colar excêntrico
function ringGeo(r0, r1, h) {
  return geo(`kp08Ring${r0},${r1},${h}`, () => new THREE.LatheGeometry([[r0, -h / 2], [r1, -h / 2], [r1, h / 2], [r0, h / 2], [r0, -h / 2]].map(([a, b]) => new THREE.Vector2(a, b)), 32))
}

function Model({ part }) {
  const shaft = useRef()
  useFrame(() => {
    if (shaft.current) shaft.current.rotation.z = mountRotNow(part.id, 'shaft')
  })
  return (
    <group>
      <mesh geometry={bodyGeo()} material={mat(ZAMAK, 0.6, 0.55)} castShadow receiveShadow />
      {/* porcas de fixação (com anilha) nas orelhas */}
      <HexNuts pts={[[-2.1, PB.T, 0], [2.1, PB.T, 0]]} r={0.33} h={0.2} color="#c0c6cb" />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 2.1, PB.T + 0.005, 0]} geometry={geo('kp08Washer', () => new THREE.CylinderGeometry(0.4, 0.4, 0.01, 20))} material={mat('#c9ced2', 0.85, 0.35)} />
      ))}
      {/* rolamento: anel exterior, vedante preto e anel interior (rodam juntos com o veio) */}
      <mesh position={[0, PB.AY, 0]} rotation={rotZ} geometry={ringGeo(0.78, 0.95, PB.W - 0.02)} material={mat('#d0d6da', 0.9, 0.25)} />
      <mesh position={[0, PB.AY, 0]} rotation={rotZ} geometry={ringGeo(0.55, 0.78, PB.W - 0.12)} material={mat('#1a1a1a', 0, 0.6)} />
      {/* copo de lubrificação (niple) */}
      <mesh position={[0, PB.AY + RH + 0.06, 0]} geometry={geo('kp08Nip', () => new THREE.CylinderGeometry(0.12, 0.12, 0.14, 6))} material={mat(BRASS, 0.85, 0.3)} />
      <mesh position={[0, PB.AY + RH + 0.2, 0]} geometry={geo('kp08NipBall', () => new THREE.SphereGeometry(0.09, 12, 8))} material={mat(BRASS, 0.85, 0.3)} />
      <group ref={shaft} position={[0, PB.AY, 0]}>
        <mesh rotation={rotZ} geometry={ringGeo(0.4, 0.55, PB.W + 0.1)} material={mat('#c9cfd3', 0.9, 0.28)} />
        {/* colar excêntrico com os 2 parafusos sem cabeça */}
        <mesh position={[0, 0, PB.W / 2 + 0.17]} rotation={rotZ} geometry={ringGeo(0.4, 0.72, 0.28)} material={mat('#c9cfd3', 0.9, 0.28)} castShadow />
        {[0, 2.1].map((a) => (
          <mesh key={a} position={[Math.sin(a) * 0.72, Math.cos(a) * 0.72, PB.W / 2 + 0.17]} rotation={[0, 0, -a]} geometry={geo('kp08Set', () => new THREE.CylinderGeometry(0.1, 0.1, 0.02, 10))} material={mat('#222', 0.6, 0.4)} />
        ))}
        <mesh rotation={rotZ} geometry={geo('kp08Shaft', () => new THREE.CylinderGeometry(0.4, 0.4, 2.2, 24))} material={mat('#e3e6e8', 1, 0.15)} castShadow />
        <mesh position={[0.4, 0, 0.85]} geometry={geo('kp08Mark', () => new THREE.BoxGeometry(0.02, 0.3, 0.3))} material={mat('#e53935', 0, 0.5)} />
      </group>
    </group>
  )
}

export default { type: 'pillowBlock', Model }
