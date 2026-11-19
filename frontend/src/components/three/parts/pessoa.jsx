// Pessoa (boneco estilizado) da maquete: sapatilhas com sola e atacadores, pernas com joelhos,
// calças com cinto e fivela, camisola com bainha, braços com cotovelos, mãos, pescoço, cabeça
// com cabelo, olhos (com o branco), sobrancelhas, nariz, boca e orelhas. Olha para +x.
// Durante a simulação desloca-se para inputs[id] = { px, pz, yaw } (arrastada com o rato, ver
// functions/walkDrag.js) e, sempre que se mexe (também ao arrastá-la na construção), anda:
// pernas e braços balançam com a velocidade.
import { Box, Cyl, geo, mat, inputOf, liveOf, useFrame, useRef, THREE } from '../kit.jsx'
import { pessoaK } from '@shared/parts/pessoa.js'
import { useStore } from '../../../contexts/store.js'
import { simRef } from '../../../contexts/simRef.js'

// cápsula vertical centrada (raio r, parte reta len)
function Cap({ r, len, pos = [0, 0, 0], color, rough = 0.75, scale }) {
  return <mesh position={pos} scale={scale} castShadow geometry={geo(`cap${r},${len}`, () => new THREE.CapsuleGeometry(r, len, 6, 16))} material={mat(color, 0, rough)} />
}
function Ball({ r, pos, color, rough = 0.6, scale }) {
  return <mesh position={pos} scale={scale} castShadow geometry={geo(`sph${r}`, () => new THREE.SphereGeometry(r, 24, 16))} material={mat(color, 0, rough)} />
}

const _w = new THREE.Vector3()

function Model({ part }) {
  const c = part.config || {}
  const k = pessoaK(c)
  const walker = useRef()
  const legs = [useRef(), useRef()]
  const knees = [useRef(), useRef()]
  const arms = [useRef(), useRef()]
  const elbows = [useRef(), useRef()]
  const body = useRef()
  const st = useRef({ last: null, phase: 0, amp: 0, speed: 0 })
  useFrame((_, dtRaw) => {
    const g = walker.current
    if (!g) return
    const dt = Math.min(0.1, Math.max(1e-4, dtRaw))
    const s = st.current
    // deslocamento da simulação (no referencial da peça)
    const sim = useStore.getState().mode === 'sim'
    const i = sim ? inputOf(part.id) : {}
    const tx = +i.px || 0
    const tz = +i.pz || 0
    // com a física a resolver as colisões (PhysicsWorld) a posição já vem suavizada
    const kk = sim && simRef.walkPhys.has(part.id) ? 1 : 1 - Math.exp(-dt * 18)
    g.position.x += (tx - g.position.x) * kk
    g.position.z += (tz - g.position.z) * kk
    // altura (degraus que sobe com a física: a laje da casa, placas…)
    g.position.y += ((+i.py || 0) - g.position.y) * kk
    let da = (+i.yaw || 0) - g.rotation.y
    da = Math.atan2(Math.sin(da), Math.cos(da))
    g.rotation.y += da * (1 - Math.exp(-dt * 10))
    // velocidade real (mundo): também conta quando a peça é arrastada na construção
    g.updateWorldMatrix(true, false)
    _w.setFromMatrixPosition(g.matrixWorld)
    const v = s.last ? Math.hypot(_w.x - s.last.x, _w.z - s.last.z) / dt : 0
    if (!s.last) s.last = new THREE.Vector3()
    s.last.copy(_w)
    s.speed += (v - s.speed) * (1 - Math.exp(-dt * 8))
    const moving = s.speed > 0.6 * k || !!liveOf(part.id)?.moving
    const ampT = moving ? Math.min(1, s.speed / (8 * k) + 0.35) : 0
    s.amp += (ampT - s.amp) * (1 - Math.exp(-dt * 6))
    // passo de ~6 cm (× escala): a fase avança com a distância percorrida
    s.phase += moving ? Math.max(s.speed, 3 * k) * dt * ((2 * Math.PI) / (6 * k)) : 0
    const sw = Math.sin(s.phase) * 0.55 * s.amp
    for (let j = 0; j < 2; j++) {
      const sg = j ? -1 : 1
      // anca roda em torno de z (perna para a frente = +x); joelho dobra quando a perna vem atrás
      if (legs[j].current) legs[j].current.rotation.z = sg * sw
      if (knees[j].current) knees[j].current.rotation.z = -Math.max(0, -sg * Math.sin(s.phase + 0.6)) * 0.8 * s.amp
      if (arms[j].current) arms[j].current.rotation.z = -sg * sw * 0.8
      if (elbows[j].current) elbows[j].current.rotation.z = 0.25 + 0.25 * s.amp
    }
    if (body.current) body.current.position.y = Math.abs(Math.cos(s.phase)) * 0.18 * k * s.amp
  })

  const pele = c.pele || '#e2b48d'
  const cab = c.cabelo || '#3a2618'
  const top = c.camisola || '#2f6fb5'
  const calc = c.calcas || '#2b3240'
  const sap = c.sapatos || '#1f1f1f'
  return (
    <group ref={walker}>
      <group scale={[k, k, k]}>
        <group ref={body}>
          {/* pernas: anca em y = 7,1; joelho a 3,7 (a perna balança em torno de z) */}
          {[-0.55, 0.55].map((z, j) => (
            <group key={z} ref={legs[j]} position={[0, 7.1, z]}>
              <Cap r={0.5} len={2.5} pos={[0, -1.7, 0]} color={calc} />
              <group ref={knees[j]} position={[0, -3.4, 0]}>
                <Cap r={0.46} len={2.5} pos={[0, -1.5, 0]} color={calc} />
                <Cap r={0.36} len={0.3} pos={[0, -2.95, 0]} color={pele} />
                {/* sapatilha: gáspea, sola de borracha clara e atacadores */}
                <mesh position={[0.32, -3.4, 0]} scale={[1, 0.55, 0.75]} castShadow geometry={geo('shoe', () => new THREE.CapsuleGeometry(0.48, 0.75, 4, 12).rotateZ(Math.PI / 2))} material={mat(sap, 0, 0.45)} />
                <mesh position={[0.32, -3.6, 0]} scale={[1.04, 0.14, 0.8]} geometry={geo('shoe', () => new THREE.CapsuleGeometry(0.48, 0.75, 4, 12).rotateZ(Math.PI / 2))} material={mat('#ece8e0', 0, 0.7)} />
                <Box size={[0.4, 0.04, 0.16]} pos={[0.55, -3.14, 0]} rot={[0, 0, -0.35]} color="#f2f2f2" />
              </group>
            </group>
          ))}
          {/* anca / cinto */}
          <Cap r={0.75} len={0.5} pos={[0, 7.45, 0]} scale={[0.85, 0.9, 1.45]} color={calc} />
          <group position={[0, 7.95, 0]} scale={[0.68, 1, 1.08]}>
            <Cyl r={1.02} h={0.22} color="#5b3a22" rough={0.5} seg={24} />
          </group>
          {/* fivela do cinto */}
          <Box size={[0.06, 0.26, 0.36]} pos={[0.7, 7.95, 0]} color="#c9ced3" metal={0.9} rough={0.3} />
          {/* tronco (camisola), mais largo nos ombros */}
          <group position={[0, 9.75, 0]} scale={[0.62, 1, 1]}>
            <Cyl r={1.25} r2={1.02} h={3.6} pos={[0, 0, 0]} color={top} rough={0.85} seg={28} />
            <Ball r={1.25} pos={[0, 1.8, 0]} color={top} rough={0.85} scale={[1, 0.42, 1]} />
            {/* bainha da camisola (por cima do cinto) */}
            <Cyl r={1.07} h={0.16} pos={[0, -1.72, 0]} color={top} rough={0.9} seg={28} />
          </group>
          {/* gola */}
          <Cyl r={0.42} h={0.25} pos={[0, 12.0, 0]} color={top} rough={0.85} seg={16} />
          {/* pescoço e cabeça */}
          <Cyl r={0.3} h={0.75} pos={[0, 12.35, 0]} color={pele} seg={14} />
          <Ball r={1.0} pos={[0.05, 13.45, 0]} color={pele} rough={0.55} scale={[0.95, 1.08, 0.9]} />
          {/* cabelo: calote atrás e em cima */}
          <mesh position={[0.0, 13.5, 0]} scale={[0.97, 1.1, 0.94]} castShadow geometry={geo('hairTop', () => new THREE.SphereGeometry(1.06, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.36))} material={mat(cab, 0, 0.8, { side: THREE.DoubleSide })} />
          <mesh position={[-0.04, 13.5, 0]} scale={[0.97, 1.1, 0.94]} castShadow geometry={geo('hairBack2', () => new THREE.SphereGeometry(1.06, 24, 12, Math.PI * 1.3, Math.PI * 1.4, 0, Math.PI * 0.7))} material={mat(cab, 0, 0.8, { side: THREE.DoubleSide })} />
          {/* olhos, sobrancelhas, nariz e orelhas */}
          {[-0.33, 0.33].map((z) => (
            <group key={z}>
              <Ball r={0.15} pos={[0.9, 13.55, z]} color="#f4f1ea" rough={0.4} scale={[0.5, 0.75, 1]} />
              <Ball r={0.11} pos={[0.92, 13.55, z]} color="#20160f" rough={0.3} />
              <Box size={[0.05, 0.07, 0.3]} pos={[0.95, 13.8, z]} color={cab} />
              <Ball r={0.17} pos={[0.05, 13.4, z * 2.7]} color={pele} scale={[0.6, 1, 0.45]} />
            </group>
          ))}
          <Ball r={0.13} pos={[1.0, 13.3, 0]} color={pele} scale={[1.2, 1, 0.9]} />
          <Box size={[0.04, 0.06, 0.36]} pos={[0.93, 12.95, 0]} color="#9b4a3c" />
          {/* braços: ombro em y = 11,4; cotovelo a 2,2 cm do ombro */}
          {[-1.45, 1.45].map((z, j) => (
            <group key={z} ref={arms[j]} position={[0, 11.4, z]} rotation={[z < 0 ? 0.06 : -0.06, 0, 0]}>
              <Ball r={0.45} pos={[0, 0, 0]} color={top} rough={0.85} />
              <Cap r={0.36} len={1.6} pos={[0, -1.1, 0]} color={top} rough={0.85} />
              <group ref={elbows[j]} position={[0, -2.2, 0]}>
                <Cap r={0.3} len={1.6} pos={[0, -1.0, 0]} color={pele} />
                <Ball r={0.36} pos={[0.05, -2.2, 0]} color={pele} scale={[0.8, 1.1, 0.6]} />
              </group>
            </group>
          ))}
        </group>
      </group>
    </group>
  )
}

export default { type: 'pessoa', Model }
