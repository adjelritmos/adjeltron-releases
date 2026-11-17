// Chassi de lagartas: casco, convés furado com guarda-lamas, rodas motrizes/tensoras
// (r 2,0 em x = ±7,5), rodas de apoio e lagartas de borracha com sapatas que andam com
// live.trackPos.L/R (cm; positivo = robô para a frente, o troço de baixo anda para trás).
import { useLayoutEffect } from 'react'
import { Box, Cyl, RBox, useFrame, useRef, liveOf, mat, geo, THREE } from '../kit.jsx'
import { Holes, Gear, gridPts, rotZ } from './_mechKit.jsx'
import { TANK } from '@shared/parts/tankChassis.js'

const SX = TANK.sprocketX
const AY = TANK.axleY
const RM = TANK.sprocketR + TANK.beltT / 2 // raio da linha média da lagarta
const STRAIGHT = 2 * SX
const PERIM = 2 * STRAIGHT + 2 * Math.PI * RM
const PAD = 0.8
const NPAD = Math.round(PERIM / PAD)

// ponto e ângulo da lagarta à distância s (começa em baixo à frente e anda para trás)
function pathAt(s) {
  s = ((s % PERIM) + PERIM) % PERIM
  if (s < STRAIGHT) return [SX - s, AY - RM, 0]
  s -= STRAIGHT
  const arc = Math.PI * RM
  if (s < arc) {
    const a = -Math.PI / 2 - s / RM // de baixo, por trás, para cima
    return [-SX + Math.cos(a) * RM, AY + Math.sin(a) * RM, a + Math.PI / 2]
  }
  s -= arc
  if (s < STRAIGHT) return [-SX + s, AY + RM, Math.PI]
  s -= STRAIGHT
  const a = Math.PI / 2 - s / RM
  return [SX + Math.cos(a) * RM, AY + Math.sin(a) * RM, a + Math.PI / 2]
}

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _p = new THREE.Vector3()
const _e = new THREE.Euler()
const ONE = new THREE.Vector3(1, 1, 1)

function Track({ part, side }) {
  const z = side === 'L' ? -TANK.trackZ : TANK.trackZ
  const pads = useRef()
  const wheels = useRef([])
  const last = useRef(null)
  const place = (off) => {
    const m = pads.current
    if (!m) return
    for (let i = 0; i < NPAD; i++) {
      const [x, y, a] = pathAt(i * (PERIM / NPAD) + off)
      _q.setFromEuler(_e.set(0, 0, a))
      m.setMatrixAt(i, _m.compose(_p.set(x, y, 0), _q, ONE))
    }
    m.instanceMatrix.needsUpdate = true
  }
  useLayoutEffect(() => place(0))
  useFrame(() => {
    const tp = +liveOf(part.id)?.trackPos?.[side] || 0
    if (tp === last.current) return
    last.current = tp
    place(tp)
    for (const w of wheels.current) if (w) w.rotation.z = -tp / (w.userData.r || 1)
  })
  const W = TANK.trackW
  const padGeo = geo('tankPad', () => new THREE.BoxGeometry(PAD * 0.82, TANK.beltT, W))
  const setW = (i, r) => (g) => {
    wheels.current[i] = g
    if (g) g.userData.r = r
  }
  return (
    <group position={[0, 0, z]}>
      {/* banda de borracha (interior) */}
      <instancedMesh ref={pads} args={[padGeo, mat('#1c1c1c', 0, 0.95), NPAD]} castShadow receiveShadow />
      {/* rodas motriz e tensora */}
      {[-SX, SX].map((x, i) => (
        <group key={x} position={[x, AY, 0]} ref={setW(i, TANK.sprocketR)}>
          <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.9]}>
            <Gear z={16} m={0.25} w={1.8} color="#455a64" metal={0.7} rough={0.4} bore={0.3} />
          </group>
          <Cyl r={0.5} h={W + 0.1} rot={rotZ} color="#90a4ae" metal={0.8} rough={0.3} seg={16} />
        </group>
      ))}
      {/* rodas de apoio */}
      {TANK.roadX.map((x, i) => (
        <group key={x} position={[x, TANK.roadR + TANK.beltT, 0]} ref={setW(2 + i, TANK.roadR)}>
          <Cyl r={TANK.roadR} h={W * 0.8} rot={rotZ} color="#37474f" metal={0.5} rough={0.5} seg={24} />
          <Box size={[0.3, TANK.roadR * 1.6, W * 0.82]} color="#263238" />
        </group>
      ))}
      {/* longarina interior que segura as rodas */}
      <Box size={[STRAIGHT, 1.0, 0.15]} pos={[0, 1.9, (side === 'L' ? 1 : -1) * (W / 2 + 0.15)]} color="#263238" metal={0.6} rough={0.4} />
    </group>
  )
}

function Model({ part }) {
  const h = TANK.hull
  return (
    <group>
      {/* casco */}
      <RBox size={[h.x[1] - h.x[0], h.y[1] - h.y[0], h.z[1] - h.z[0]]} r={0.2} pos={[0, (h.y[0] + h.y[1]) / 2, 0]} color="#3e4a52" metal={0.6} rough={0.45} />
      {/* convés com furos e guarda-lamas */}
      <RBox size={[20, 0.3, 15.2]} r={0.08} pos={[0, TANK.deck + 0.15, 0]} color="#cfd8dc" metal={0.85} rough={0.32} />
      <Holes pts={gridPts(23, 8, 0.8, TANK.deck + 0.15, -8.8, -2.8)} r={0.18} h={0.32} />
      {[-1, 1].map((s) => (
        <Box key={s} size={[20, 1.0, 0.2]} pos={[0, TANK.deck - 0.35, s * 7.5]} color="#cfd8dc" metal={0.85} rough={0.32} />
      ))}
      <Track part={part} side="L" />
      <Track part={part} side="R" />
    </group>
  )
}

export default { type: 'tankChassis', Model }
