// Estrutura de quadricóptero X de 5" (tipo 220 mm "Martian"/QAV): 4 braços de carbono de 4 mm
// cortados por CNC (afunilam para o motor, rasgo de aligeiramento, pé do motor redondo com as
// ranhuras 12×12/16×16 e o furo do veio), placa central com a furação 30,5 × 30,5 do "stack",
// pilares de alumínio anodizado M3, placa de cima com os rasgos da fita da bateria, fita de
// velcro com fivela e a seta da frente impressa. Tecido 3K em sarja com verniz.
import { Box, Cyl, THREE } from '../kit.jsx'
import { DRONE, DRONE_ARMS } from '@shared/parts/droneFrame.js'
import { holeCircle, holeSlot, rrect } from './_mdfKit.jsx'
import { bevelPlateXZ, carbonMats, ScrewHeads } from './_matKit.jsx'

const C = DRONE.arm * Math.SQRT2 // distância do centro ao eixo do motor ao longo do braço
const PAD = 1.4 // raio do pé do motor
const W0 = 0.85 // meia largura do braço junto ao corpo
const W1 = 0.7 // meia largura junto ao motor
const STAND = [[-4, -1.8], [-4, 1.8], [4, -1.8], [4, 1.8]]

// braço no referencial dele (x para fora; forma em (x, −z))
function armShape() {
  const s = new THREE.Shape()
  const a = Math.asin(W1 / PAD)
  s.moveTo(1.5, -W0)
  s.lineTo(C - PAD * Math.cos(a), -W1)
  s.absarc(C, 0, PAD, Math.PI + a, Math.PI - a + 2 * Math.PI, false)
  s.lineTo(1.5, W0)
  s.lineTo(1.5, -W0)
  // pé do motor: furo do veio/clip e ranhuras radiais (servem 12×12 e 16×16 mm)
  holeCircle(s, C, 0, 0.4)
  for (let k = 0; k < 4; k++) {
    const t = Math.PI / 4 + (k * Math.PI) / 2
    const h = new THREE.Path()
    const r0 = 0.85
    const r1 = 1.13
    const w = 0.16
    const [cx, cy] = [Math.cos(t), Math.sin(t)]
    // ranhura radial de r0 a r1 (pontas redondas)
    h.absarc(C + cx * r1, cy * r1, w, t - Math.PI / 2, t + Math.PI / 2, false)
    h.absarc(C + cx * r0, cy * r0, w, t + Math.PI / 2, t + (3 * Math.PI) / 2, false)
    h.closePath()
    s.holes.push(h)
  }
  // rasgo de aligeiramento e os 2 furos M3 que prendem o braço entre as placas
  holeSlot(s, 4.2, C - 2.2, 0, 0.5)
  holeCircle(s, 2.2, 0, 0.16)
  holeCircle(s, 3.3, 0, 0.16)
  return s
}

// placa central de baixo (10 × 4,6): furação do stack 30,5 mm, pilares e janela para os cabos
function bottomShape() {
  const s = rrect(new THREE.Shape(), -5, -2.3, 5, 2.3, 0.6)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) holeCircle(s, sx * 1.525, sz * 1.525, 0.16)
  for (const [x, z] of STAND) holeCircle(s, x, -z, 0.16)
  holeSlot(s, 2.6, 3.4, 0, 0.9)
  holeSlot(s, -3.4, -2.6, 0, 0.9)
  return s
}

// placa de cima (9 × 4,2): rasgos da fita da bateria, furos dos pilares e aligeiramentos
function topShape() {
  const s = rrect(new THREE.Shape(), -4.5, -2.1, 4.5, 2.1, 0.6)
  for (const [x, z] of STAND) holeCircle(s, x, -z, 0.16)
  for (const x of [-2.6, 2.6]) {
    const h = rrect(new THREE.Path(), x - 0.15, -1.3, x + 0.15, 1.3, 0.12)
    s.holes.push(h)
  }
  holeSlot(s, -1.2, 1.2, 0, 0.7)
  return s
}

function DroneFrameModel() {
  const { plate: P, topY: T, top: TT } = DRONE
  const M = carbonMats()
  const arm = bevelPlateXZ('droneArm', P, armShape, 0.025, 16)
  const bot = bevelPlateXZ('droneBot', P, bottomShape, 0.02, 12)
  const top = bevelPlateXZ('droneTop', TT, topShape, 0.02, 12)
  return (
    <group>
      {/* braços (por baixo) e placa central por cima deles (0,1 mm acima: sem faces coincidentes) */}
      {DRONE_ARMS.map(([k, , , yaw]) => (
        <group key={k} rotation={[0, (yaw * Math.PI) / 180, 0]}>
          <mesh geometry={arm} material={M} castShadow receiveShadow />
          {/* abraçadeira de nylon branca do ESC */}
          <Box size={[0.25, 0.08, 1.75]} pos={[DRONE.esc * Math.SQRT2 - 1.2, P + 0.04, 0]} color="#ecebe6" rough={0.6} />
          <Box size={[0.3, 0.22, 0.3]} pos={[DRONE.esc * Math.SQRT2 - 1.2, P + 0.11, 0.78]} color="#ecebe6" rough={0.6} />
        </group>
      ))}
      <mesh geometry={bot} material={M} position={[0, 0.01, 0]} castShadow receiveShadow />
      {/* parafusos dos braços (cabeça por baixo) */}
      <ScrewHeads rot={[Math.PI, 0, 0]} r={0.27} pts={DRONE_ARMS.flatMap(([, , , yaw]) => [2.2, 3.3].map((d) => { const a = (yaw * Math.PI) / 180; return [Math.cos(a) * d, 0, Math.sin(a) * d] }))} color="#151515" />
      {/* pilares M3 de alumínio anodizado (vermelho), com as cabeças dos parafusos em cima */}
      {STAND.map(([x, z], i) => (
        <Cyl key={i} r={0.22} h={T - P} pos={[x, (T + P) / 2, z]} color="#b71c1c" metal={0.8} rough={0.3} seg={6} />
      ))}
      <mesh geometry={top} material={M} position={[0, T, 0]} castShadow receiveShadow />
      <ScrewHeads r={0.27} pts={STAND.map(([x, z]) => [x, T + TT, z])} color="#151515" />
      {/* fita de velcro da bateria pelos rasgos, com a fivela de alumínio */}
      <Box size={[0.2, 0.025, 4.3]} pos={[-2.6, T + TT + 0.012, 0]} color="#1a1a1a" rough={0.95} />
      <Box size={[0.2, 0.025, 4.3]} pos={[2.6, T + TT + 0.012, 0]} color="#1a1a1a" rough={0.95} />
      <Box size={[0.32, 0.06, 0.5]} pos={[2.6, T + TT + 0.04, -1.6]} color="#c62828" metal={0.6} rough={0.35} />
      {/* almofada de borracha antiderrapante entre os rasgos */}
      <Box size={[4.6, 0.03, 3.2]} pos={[0, T + TT + 0.015, 0]} color="#2a2a2a" rough={0.98} />
      {/* seta da frente (+x) impressa a branco */}
      <Box size={[0.8, 0.01, 0.18]} pos={[3.75, T + TT + 0.005, 0]} color="#f5f5f5" rough={0.6} />
      <Box size={[0.4, 0.01, 0.16]} pos={[4.1, T + TT + 0.005, -0.12]} rot={[0, -Math.PI / 4, 0]} color="#f5f5f5" rough={0.6} />
      <Box size={[0.4, 0.01, 0.16]} pos={[4.1, T + TT + 0.005, 0.12]} rot={[0, Math.PI / 4, 0]} color="#f5f5f5" rough={0.6} />
    </group>
  )
}

export default { type: 'droneFrame', Model: DroneFrameModel }
