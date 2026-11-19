// Chassi de lagartas (tipo TP101): casco de alumínio anodizado com a furação lateral, convés
// furado com guarda-lamas e parafusos, rodas motrizes/tensoras dentadas (r 2,0 em x = ±7,5)
// com cubo e porca, rodas de apoio com aro de borracha e jante de alumínio de 5 furos, e
// lagartas de elos com garras (sapatas com nervura) que andam com live.trackPos.L/R (cm;
// positivo = robô para a frente, o troço de baixo anda para trás).
import { useLayoutEffect } from 'react'
import { Box, Cyl, RBox, useFrame, useRef, liveOf, mat, geo, mergedGeo, THREE } from '../kit.jsx'
import { ScrewHeads } from './_matKit.jsx'
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
  // elo da lagarta: sapata (face de dentro lisa) com a garra transversal por fora e as duas
  // cavilhas da articulação nas pontas; a face da garra fica na linha de baixo da banda
  const padGeo = mergedGeo('tankPadV3', () => {
    const b = geo('gull', () => new THREE.BoxGeometry(1, 1, 1))
    const t = TANK.beltT
    const pin = geo('tankPadPin', () => new THREE.CylinderGeometry(0.07, 0.07, 1, 8))
    return [
      [b, [0, 0.06, 0], [0, 0, 0], [PAD * 0.84, t - 0.12, W]],
      [b, [0, -t / 2 + 0.07, 0], [0, 0, 0], [0.2, 0.14, W * 0.94]],
      [pin, [PAD * 0.42, 0.05, 0], [Math.PI / 2, 0, 0], [1, W + 0.06, 1]],
    ]
  })
  // 5 furos de aligeiramento das jantes (discos escuros ligeiramente salientes)
  const wheelHoles = mergedGeo(`tankWheelHoles${TANK.roadR}`, () => {
    const h = geo('tankWheelHole', () => new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12))
    return [0, 1, 2, 3, 4].map((k) => [h, [Math.cos((k * 2 * Math.PI) / 5) * TANK.roadR * 0.5, Math.sin((k * 2 * Math.PI) / 5) * TANK.roadR * 0.5, 0], rotZ])
  })
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
          {/* porca do cubo por fora */}
          <Cyl r={0.3} h={0.2} pos={[0, 0, (side === 'L' ? -1 : 1) * (W / 2 + 0.1)]} rot={rotZ} color="#c9cfd3" metal={0.9} rough={0.3} seg={6} />
        </group>
      ))}
      {/* rodas de apoio */}
      {TANK.roadX.map((x, i) => (
        <group key={x} position={[x, TANK.roadR + TANK.beltT, 0]} ref={setW(2 + i, TANK.roadR)}>
          {/* aro de borracha e jante de alumínio com 5 furos e o rolamento ao centro */}
          <Cyl r={TANK.roadR} h={W * 0.8} rot={rotZ} color="#1d1d1d" rough={0.85} seg={28} />
          {[-1, 1].map((k) => (
            <group key={k} position={[0, 0, k * W * 0.4]}>
              <Cyl r={TANK.roadR * 0.78} h={0.04} rot={rotZ} color="#9ea7ad" metal={0.85} rough={0.3} seg={28} />
              <mesh geometry={wheelHoles} material={mat('#141618', 0, 0.85)} />
              <Cyl r={0.28} h={0.08} rot={rotZ} color="#c9cfd3" metal={0.9} rough={0.25} seg={16} />
              <Cyl r={0.12} h={0.1} rot={rotZ} color="#2b2f33" metal={0.6} rough={0.4} seg={6} />
            </group>
          ))}
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
      <RBox size={[h.x[1] - h.x[0], h.y[1] - h.y[0], h.z[1] - h.z[0]]} r={0.2} pos={[0, (h.y[0] + h.y[1]) / 2, 0]} color="#2f3940" metal={0.6} rough={0.42} />
      {/* furação das chapas laterais do casco (fila de furos M3 a 1 cm) */}
      <Holes pts={Array.from({ length: 14 }, (_, i) => [-6.5 + i * 1.0, 5.05, h.z[0]])} r={0.15} h={0.04} axis="z" />
      <Holes pts={Array.from({ length: 14 }, (_, i) => [-6.5 + i * 1.0, 5.05, h.z[1]])} r={0.15} h={0.04} axis="z" />
      {/* convés com furos e guarda-lamas */}
      <RBox size={[20, 0.3, 15.2]} r={0.08} pos={[0, TANK.deck + 0.15, 0]} color="#cfd8dc" metal={0.85} rough={0.32} />
      <Holes pts={gridPts(23, 8, 0.8, TANK.deck + 0.15, -8.8, -2.8)} r={0.18} h={0.32} />
      {[-1, 1].map((s) => (
        <Box key={s} size={[20, 1.0, 0.2]} pos={[0, TANK.deck - 0.35, s * 7.5]} color="#cfd8dc" metal={0.85} rough={0.32} />
      ))}
      {/* parafusos do convés aos cantos do casco */}
      <ScrewHeads pts={[[-9.3, TANK.deck + 0.3, -6.9], [9.3, TANK.deck + 0.3, -6.9], [-9.3, TANK.deck + 0.3, 6.9], [9.3, TANK.deck + 0.3, 6.9]]} r={0.22} color="#2b2f33" />
      <Track part={part} side="L" />
      <Track part={part} side="R" />
    </group>
  )
}

export default { type: 'tankChassis', Model }
