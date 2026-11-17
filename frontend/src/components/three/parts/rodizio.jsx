// Rodízio giratório: placa zincada com 4 furos (na origem), rolamento de giro, garfo de aço que
// roda em torno do +y e roda de nylon branca com o eixo atrás do eixo de giro (avanço).
// Animação: a cada frame mede-se o deslocamento da peça no mundo (robô a andar, arrastado, na
// física); o garfo vira-se suavemente para o movimento (a roda fica atrás) e a roda gira pela
// distância percorrida. A física usa uma esfera de contacto (ver shared/parts/rodizio.js).
import { Box, Cyl, RBox, useFrame, useRef, THREE } from '../kit.jsx'
import { rodizioDims, RODIZIO_PLATE_T } from '@shared/parts/rodizio.js'

const ZINC = '#c9d0d6'
const STEEL = '#b8bec4'
const NYLON = '#f3f1ea'
const _p = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _inv = new THREE.Quaternion()

function Model({ part }) {
  const { d, w, h, plate, holes, trail } = rodizioDims(part.config)
  const r = d / 2
  const T = RODIZIO_PLATE_T
  const root = useRef()
  const fork = useRef()
  const wheel = useRef()
  const st = useRef({ prev: null, yaw: 0, spin: 0 })
  useFrame((_, dt) => {
    const g = root.current
    if (!g || !fork.current || !wheel.current) return
    g.updateWorldMatrix(true, false)
    g.matrixWorld.decompose(_p, _q, new THREE.Vector3())
    const s = st.current
    if (s.prev) {
      // deslocamento no referencial da peça (plano xz, perpendicular ao eixo de giro)
      const dv = _p.clone().sub(s.prev).applyQuaternion(_inv.copy(_q).invert())
      const dist = Math.hypot(dv.x, dv.z)
      if (dist > 1e-4 && dist < 5) {
        // o garfo aponta +x (local) para o movimento: a roda (em −x) segue atrás
        const target = Math.atan2(-dv.z, dv.x)
        let e = target - s.yaw
        e = Math.atan2(Math.sin(e), Math.cos(e))
        s.yaw += e * Math.min(1, dt * 8 + dist / (trail * 2))
        // só a componente ao longo do garfo faz girar a roda
        const along = dv.x * Math.cos(s.yaw) - dv.z * Math.sin(s.yaw)
        s.spin += along / r
      }
    }
    s.prev = (s.prev || new THREE.Vector3()).copy(_p)
    fork.current.rotation.y = s.yaw
    wheel.current.rotation.z = s.spin
  })
  const yb = T + 0.45 // fundo do rolamento (topo do garfo)
  const wy = h - r // eixo da roda
  const fw = w + 0.3 // largura interior do garfo
  const legH = wy - yb + 0.25
  return (
    <group ref={root}>
      {/* placa de fixação zincada com 4 furos */}
      <RBox size={[plate, T, plate]} r={0.06} pos={[0, T / 2, 0]} color={ZINC} metal={0.75} rough={0.35} />
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b], i) => (
        <Cyl key={i} r={0.16 * (plate / 3.2)} h={T + 0.02} pos={[(a * holes) / 2, T / 2, (b * holes) / 2]} color="#2b2b2b" seg={14} />
      ))}
      {/* rolamento de giro: cúpula e anel de esferas */}
      <Cyl r={plate * 0.36} r2={plate * 0.31} h={0.22} pos={[0, T + 0.11, 0]} color={ZINC} metal={0.75} rough={0.3} seg={32} />
      <Cyl r={plate * 0.3} h={0.1} pos={[0, T + 0.27, 0]} color="#8f979e" metal={0.85} rough={0.3} seg={32} />
      <Cyl r={plate * 0.12} h={0.18} pos={[0, T + 0.38, 0]} color={STEEL} metal={0.85} rough={0.3} seg={16} />
      {/* garfo (roda em torno do +y) */}
      <group ref={fork}>
        <RBox size={[plate * 0.62, 0.14, fw + 0.28]} r={0.04} pos={[-trail * 0.35, yb + 0.07, 0]} color={STEEL} metal={0.8} rough={0.32} />
        {[-1, 1].map((s) => (
          <group key={s}>
            {/* perna inclinada do garfo até ao eixo (atrás do eixo de giro) */}
            <mesh position={[-trail / 2, yb + legH / 2, (s * (fw + 0.14)) / 2]} rotation={[0, 0, Math.atan2(trail, legH)]} castShadow>
              <boxGeometry args={[r * 0.6, legH, 0.12]} />
              <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.32} />
            </mesh>
            {/* porca do eixo */}
            <Cyl r={0.16 * (d / 2.5)} h={0.12} pos={[-trail, wy, s * ((fw + 0.14) / 2 + 0.1)]} rot={[Math.PI / 2, 0, 0]} color={ZINC} metal={0.85} rough={0.3} seg={6} />
          </group>
        ))}
        <Cyl r={0.07 * (d / 2.5) + 0.02} h={fw + 0.5} pos={[-trail, wy, 0]} rot={[Math.PI / 2, 0, 0]} color={STEEL} metal={0.9} rough={0.25} seg={10} />
        {/* roda de nylon (gira em torno do z do garfo) */}
        <group ref={wheel} position={[-trail, wy, 0]}>
          <Cyl r={r} h={w} rot={[Math.PI / 2, 0, 0]} color={NYLON} rough={0.45} seg={40} />
          <Cyl r={r - 0.06} h={w + 0.04} rot={[Math.PI / 2, 0, 0]} color="#e9e6dc" rough={0.5} seg={40} />
          <Cyl r={r * 0.42} h={w + 0.08} rot={[Math.PI / 2, 0, 0]} color="#d8d4c8" rough={0.5} seg={24} />
          {/* marca para se ver a roda a girar */}
          <Box size={[r * 0.3, 0.06, w + 0.1]} pos={[r * 0.6, 0, 0]} color="#cfcabd" />
        </group>
      </group>
    </group>
  )
}

export default { type: 'rodizio', Model }
