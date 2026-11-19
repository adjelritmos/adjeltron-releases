// Rodízio giratório: placa zincada com 4 furos (na origem), rolamento de giro, garfo de aço que
// roda em torno do +y e roda de nylon branca com o eixo atrás do eixo de giro (avanço).
// Animação: a cada frame mede-se o deslocamento da peça no mundo (robô a andar, arrastado, na
// física); o garfo vira-se suavemente para o movimento (a roda fica atrás) e a roda gira pela
// distância percorrida. A física usa uma esfera de contacto (ver shared/parts/rodizio.js).
import { Cyl, useFrame, useRef, geo, mat, mergedGeo, THREE } from '../kit.jsx'
import { plateGeo, rrectShape, addHole, aroundY } from './_mechKit.jsx'
import { rodizioDims, RODIZIO_PLATE_T } from '@shared/parts/rodizio.js'

const ZINC = '#c9d0d6'
const STEEL = '#b8bec4'
const NYLON = '#f3f1ea'
const _p = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _inv = new THREE.Quaternion()
const _sc = new THREE.Vector3()

// roda de nylon: perfil girado (piso boleado, flancos com o rebaixo do cubo), eixo y centrado
function wheelGeo(r, w) {
  return geo(`rodWheel${r},${w}`, () => {
    const c = Math.min(0.12, w * 0.15)
    const p = [
      [0.1, -w / 2 - 0.04],
      [r * 0.42, -w / 2 - 0.04],
      [r * 0.48, -w / 2 + 0.06],
      [r * 0.8, -w / 2 + 0.06],
      [r - c * 0.6, -w / 2],
      [r, -w / 2 + c],
      [r, w / 2 - c],
      [r - c * 0.6, w / 2],
      [r * 0.8, w / 2 - 0.06],
      [r * 0.48, w / 2 - 0.06],
      [r * 0.42, w / 2 + 0.04],
      [0.1, w / 2 + 0.04],
    ].map(([a, b]) => new THREE.Vector2(a, b))
    return new THREE.LatheGeometry(p, 40)
  })
}
// esferas do rolamento de giro (pista entre a placa e a cúpula)
function ballsGeo(R) {
  return mergedGeo(`rodBalls${R}`, () => {
    const b = geo('rodBall', () => new THREE.SphereGeometry(0.06, 8, 6))
    return Array.from({ length: 18 }, (_, i) => [b, aroundY((i / 18) * Math.PI * 2, [R, 0, 0])[0]])
  })
}
// perna do garfo (chapa estampada com nervura), de altura 1, centrada
function legGeo(d, r) {
  return geo(`rodLeg${d},${r}`, () => new THREE.BoxGeometry(r * 0.6, 1, 0.12))
}

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
    g.matrixWorld.decompose(_p, _q, _sc)
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
      {/* placa de fixação zincada com 4 furos passantes e cantos boleados */}
      <mesh geometry={plateGeo(`rodPlate${plate},${holes}`, T, () => {
        const sh = rrectShape(-plate / 2, -plate / 2, plate / 2, plate / 2, plate * 0.08)
        for (const [a, b] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) addHole(sh, (a * holes) / 2, (b * holes) / 2, 0.16 * (plate / 3.2))
        return sh
      }, 0.015)} material={mat(ZINC, 0.75, 0.35)} castShadow receiveShadow />
      {/* rolamento de giro: cúpula estampada, esferas à vista e rebite central */}
      <Cyl r={plate * 0.36} r2={plate * 0.31} h={0.22} pos={[0, T + 0.11, 0]} color={ZINC} metal={0.75} rough={0.3} seg={32} />
      <mesh position={[0, T + 0.25, 0]} geometry={ballsGeo(plate * 0.27)} material={mat('#e6e9ec', 1, 0.15)} />
      <Cyl r={plate * 0.3} h={0.08} pos={[0, T + 0.3, 0]} color="#8f979e" metal={0.85} rough={0.3} seg={32} />
      <Cyl r={plate * 0.12} r2={plate * 0.1} h={0.18} pos={[0, T + 0.38, 0]} color={STEEL} metal={0.85} rough={0.3} seg={16} />
      {/* garfo (roda em torno do +y) */}
      <group ref={fork}>
        <mesh geometry={plateGeo(`rodFork${plate},${fw}`, 0.14, () => rrectShape(-plate * 0.31, -(fw + 0.28) / 2, plate * 0.31, (fw + 0.28) / 2, 0.12), 0.02)} position={[-trail * 0.35, yb, 0]} material={mat(STEEL, 0.8, 0.32)} castShadow receiveShadow />
        {[-1, 1].map((s) => (
          <group key={s}>
            {/* perna inclinada do garfo até ao eixo (atrás do eixo de giro) */}
            <mesh position={[-trail / 2, yb + legH / 2, (s * (fw + 0.14)) / 2]} rotation={[0, 0, Math.atan2(trail, legH)]} scale={[1, legH, 1]} geometry={legGeo(d, r)} material={mat(STEEL, 0.8, 0.32)} castShadow />
            {/* porca do eixo */}
            <Cyl r={0.16 * (d / 2.5)} h={0.12} pos={[-trail, wy, s * ((fw + 0.14) / 2 + 0.1)]} rot={[Math.PI / 2, 0, 0]} color={ZINC} metal={0.85} rough={0.3} seg={6} />
          </group>
        ))}
        <Cyl r={0.07 * (d / 2.5) + 0.02} h={fw + 0.5} pos={[-trail, wy, 0]} rot={[Math.PI / 2, 0, 0]} color={STEEL} metal={0.9} rough={0.25} seg={10} />
        {/* roda de nylon (gira em torno do z do garfo) */}
        <group ref={wheel} position={[-trail, wy, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} geometry={wheelGeo(r, w)} material={mat(NYLON, 0, 0.42)} castShadow receiveShadow />
          {/* marca de fabrico moldada no flanco (deixa ver a roda a girar) */}
          <mesh position={[r * 0.64, 0, w / 2 - 0.055]} geometry={geo(`rodMark${r}`, () => new THREE.BoxGeometry(r * 0.24, 0.07, 0.02))} material={mat('#d6d1c3', 0, 0.5)} />
          <mesh position={[-r * 0.64, 0, -(w / 2 - 0.055)]} geometry={geo(`rodMark${r}`, () => new THREE.BoxGeometry(r * 0.24, 0.07, 0.02))} material={mat('#d6d1c3', 0, 0.5)} />
        </group>
      </group>
    </group>
  )
}

export default { type: 'rodizio', Model }
