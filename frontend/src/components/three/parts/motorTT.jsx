// Motor TT 1:48 sem roda: caixa redutora amarela, motor metálico (lata com lados achatados) com a
// tampa de plástico branca, braçadeira transparente à volta do motor e veio duplo em D branco
// (segundo z) que roda com os mounts "shaft" (−z) e "shaft2" (+z, mesmo veio).
// Caixa em duas metades com a junta, parafusos de cruz e porcas embutidas, terminais furados.
// TTModel serve também o motor TT com encoder (motorTTEnc.jsx): disco magnético + placa atrás.
import { Box, Cyl, RBox, useFrame, useRef, useMemo, mat, liveOf, D2R, THREE, METAL } from '../kit.jsx'
import { mountRotNow } from '../../../functions/mechLive.js'
import { MotorOverlay } from './motorEnc.jsx'
import def, { TT, ttClip } from '@shared/parts/motorTT.js'

const A = TT.AY
const YEL = '#f7dc45'
const YEL2 = '#efd03a'
const rotX = [0, 0, Math.PI / 2]
const WIRE = { 'M+': '#e53935', 'M-': '#f5f5f5', GND: '#212121', VCC: '#1e88e5', A: '#fdd835', B: '#43a047' }

// braçadeira de plástico transparente (como nos kits): concha em C à volta da lata, aberta em
// cima, aba de trás com furo para a tampa, orelhas de encaixe junto à caixa e base plana
function ClearClip() {
  const m = useMemo(() => mat('#eaf4f8', 0, 0.08, { transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }), [])
  const len = TT.can[1] - TT.can[0] + 0.3
  const cx = (TT.can[0] + TT.can[1]) / 2 - 0.1
  return (
    <group>
      {/* concha (≈ 250°, aberta em cima) */}
      <mesh position={[cx, A, 0]} rotation={[0, 0, Math.PI / 2]} material={m}>
        <cylinderGeometry args={[TT.canR + 0.1, TT.canR + 0.1, len, 40, 1, true, Math.PI * 0.7, Math.PI * 1.6]} />
      </mesh>
      <mesh position={[cx, A, 0]} rotation={[0, 0, Math.PI / 2]} material={m}>
        <cylinderGeometry args={[TT.canR + 0.03, TT.canR + 0.03, len, 40, 1, true, Math.PI * 0.7, Math.PI * 1.6]} />
      </mesh>
      {/* aba de trás (anel à volta da tampa branca) */}
      <mesh position={[TT.can[0] - 0.33, A, 0]} rotation={[0, -Math.PI / 2, 0]} material={m}>
        <ringGeometry args={[0.42, TT.canR + 0.1, 40]} />
      </mesh>
      {/* base plana e paredes laterais retas (a braçadeira encaixa na caixa amarela) */}
      <mesh position={[cx, 0.06, 0]} material={m}>
        <boxGeometry args={[len, 0.12, 2.3]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[cx, 0.55, s * 1.12]} material={m}>
          <boxGeometry args={[len, 0.9, 0.07]} />
        </mesh>
      ))}
      {/* orelhas de encaixe junto à caixa */}
      {[-1, 1].map((s) => (
        <mesh key={`e${s}`} position={[TT.can[1] + 0.05, A + 0.2, s * 1.0]} material={m}>
          <boxGeometry args={[0.35, 0.7, 0.14]} />
        </mesh>
      ))}
    </group>
  )
}

export function TTModel({ part, enc = false, pins = def.pins }) {
  const shaft = useRef()
  const disc = useRef()
  useFrame(() => {
    if (shaft.current) shaft.current.rotation.z = -mountRotNow(part.id, 'shaft')
    if (disc.current) disc.current.rotation.x = (liveOf(part.id)?.motorAngle || 0) * D2R
  })
  const clip = ttClip(part.config)
  return (
    <group>
      {/* caixa redutora */}
      <RBox size={[4.4, 2.2, 1.9]} r={0.15} pos={[0.5, A, 0]} color={YEL} rough={0.5} />
      {/* cubos do veio dos dois lados */}
      {[-1, 1].map((s) => (
        <Cyl key={s} r={0.55} h={0.25} pos={[0, A, s * 1.05]} rot={[Math.PI / 2, 0, 0]} color={YEL2} rough={0.5} />
      ))}
      {/* parafusos que fecham a caixa e furos de fixação de lado a lado */}
      {[[-1.2, 0.8], [1.9, 0.8], [1.9, -0.8], [-1.2, -0.8]].map(([x, dy], i) => (
        <group key={i} position={[x, A + dy, 0]}>
          <Cyl r={0.1} h={1.95} rot={[Math.PI / 2, 0, 0]} color="#9aa0a6" metal={0.8} seg={8} />
          {/* cabeça de cruz do parafuso (lado +z) e porca sextavada embutida (lado −z) */}
          <Cyl r={0.17} h={0.06} pos={[0, 0, 0.975]} rot={[Math.PI / 2, 0, 0]} color={METAL.nickel} metal={1} rough={0.3} seg={14} />
          <Box size={[0.2, 0.03, 0.02]} pos={[0, 0, 1.006]} color="#3a3d40" />
          <Box size={[0.03, 0.2, 0.02]} pos={[0, 0, 1.006]} color="#3a3d40" />
          <Cyl r={0.16} h={0.04} pos={[0, 0, -0.96]} rot={[Math.PI / 2, 0, 0]} color="#3b3200" seg={6} />
        </group>
      ))}
      {/* junta das duas metades da caixa e nervuras de reforço moldadas */}
      <Box size={[4.12, 2.21, 0.012]} pos={[0.5, A, 0]} color="#8a7a14" rough={0.6} />
      <Box size={[4.41, 1.92, 0.012]} pos={[0.5, A, 0]} color="#8a7a14" rough={0.6} />
      {[-1, 1].map((s) => (
        <Box key={`r${s}`} size={[1.2, 0.06, 0.04]} pos={[1.05, A + s * 0.35, s * 0.96]} color={YEL2} rough={0.5} />
      ))}
      {[[0.9, 0.0], [-0.5, -0.55]].map(([x, dy], i) => (
        <Cyl key={`h${i}`} r={0.16} h={1.93} pos={[x, A + dy, 0]} rot={[Math.PI / 2, 0, 0]} color="#3b3200" seg={12} />
      ))}
      {/* patilha de fixação da frente e pino de posicionamento */}
      <Box size={[0.9, 0.25, 0.9]} pos={[2.95, 0.4, 0]} color={YEL} rough={0.5} />
      <Cyl r={0.18} h={0.27} pos={[3.05, 0.4, 0]} color="#3b3200" seg={12} />
      {/* gola amarela onde entra o motor */}
      <Cyl r={TT.canR + 0.06} h={0.35} pos={[TT.can[1] + 0.05, A, 0]} rot={rotX} color={YEL} rough={0.5} seg={28} />
      {/* motor: lata metálica com os lados achatados */}
      <group position={[TT.motorX, A, 0]} scale={[1, 1, 0.8]}>
        <Cyl r={TT.canR} h={TT.can[1] - TT.can[0]} rot={rotX} color="#c8ccd2" metal={0.9} rough={0.28} seg={32} />
        <Cyl r={TT.canR * 0.97} h={0.06} pos={[(TT.can[0] - TT.motorX) + 0.35, 0, 0]} rot={rotX} color="#aeb3b9" metal={0.9} rough={0.3} seg={32} />
      </group>
      {/* tampa de plástico branca (escovas) com o casquilho do veio e as patilhas de solda */}
      <group position={[TT.cap, A, 0]} scale={[1, 1, 0.8]}>
        <Cyl r={TT.canR * 0.96} h={0.32} rot={rotX} color="#f1f0ea" rough={0.55} seg={32} />
        <Cyl r={0.32} h={0.12} pos={[-0.2, 0, 0]} rot={rotX} color="#f6f5ef" rough={0.5} seg={20} />
      </group>
      <Cyl r={0.08} h={0.1} pos={[TT.cap - 0.3, A, 0]} rot={rotX} color="#9aa0a6" metal={0.9} rough={0.3} seg={10} />
      {!enc &&
        pins.map((p) => (
          <group key={p.id} position={[p.pos[0] + 0.06, p.pos[1], p.pos[2]]}>
            <Box size={[0.22, 0.3, 0.05]} color="#d9a441" metal={0.9} rough={0.3} />
            <Cyl r={0.045} h={0.06} pos={[-0.03, 0.06, 0]} rot={[Math.PI / 2, 0, 0]} color="#151515" seg={10} />
          </group>
        ))}
      {enc && (
        <group>
          {/* veio de trás com o disco magnético (roda com o rotor) */}
          <Cyl r={0.08} h={0.35} pos={[TT.ENC.disc + 0.12, A, 0]} rot={rotX} color="#cfd3d6" metal={0.9} rough={0.25} seg={10} />
          <group position={[TT.ENC.disc, A, 0]} ref={disc}>
            <Cyl r={0.55} h={0.12} rot={rotX} color="#3a3a3a" seg={24} />
            {[0, 1].map((k) => (
              <Box key={k} size={[0.13, 0.5, 0.12]} pos={[0, k ? 0.27 : -0.27, 0]} color={k ? '#c62828' : '#1565c0'} />
            ))}
          </group>
          {/* placa do encoder (2 sensores Hall), espaçadores e ficha de 6 vias */}
          <RBox size={[0.12, 2.0, 2.0]} r={0.04} pos={[TT.ENC.pcb, A, 0]} color="#1b5e20" rough={0.6} />
          {[-1, 1].map((s) => (
            <Box key={s} size={[0.08, 0.3, 0.3]} pos={[TT.ENC.pcb + 0.08, A + 0.62, s * 0.45]} color="#111" />
          ))}
          {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b], i) => (
            <Cyl key={i} r={0.1} h={0.3} pos={[TT.ENC.pcb + 0.17, A + a * 0.75, b * 0.75]} rot={rotX} color="#c9a24a" metal={0.8} seg={8} />
          ))}
          <Box size={[0.3, 0.55, 1.75]} pos={[TT.ENC.pin + 0.2, A, 0]} color="#f2f2f2" rough={0.5} />
          {pins.map((p) => (
            <Box key={p.id} size={[0.1, 0.1, 0.1]} pos={[p.pos[0] + 0.02, p.pos[1], p.pos[2]]} color={WIRE[p.id]} />
          ))}
        </group>
      )}
      {clip && <ClearClip />}
      {/* veio duplo em D (branco) */}
      <group ref={shaft} position={[0, A, 0]}>
        <Cyl r={0.27} h={3.0} rot={[Math.PI / 2, 0, 0]} color="#fafafa" rough={0.45} />
        <Box size={[0.1, 0.54, 3.0]} pos={[0.2, 0, 0]} color="#e6e6e6" rough={0.45} />
      </group>
    </group>
  )
}

function Model({ part }) {
  return <TTModel part={part} />
}

export default { type: 'motorTT', Model, Overlay2D: MotorOverlay }
