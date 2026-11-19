// Motor de passo 28BYJ-48 + placa ULN2003. O motor: lata de aço de Ø28 mm com a etiqueta, tampa
// estampada com as orelhas de fixação (furos a 35 mm), ressalto e veio excêntrico (8 mm) de duplo
// plano, caixa azul de saída dos fios. A placa: verde, ULN2003AN em DIP-16, ficha XH de 5 vias
// com a ficha do cabo, 4 LEDs vermelhos de 3 mm (A–D, acendem com as bobinas), resistências SMD,
// condensador e a serigrafia. O ponteiro no veio roda com live.angle.
import { Box, Cyl, Leg, Pcb, HeaderPins, Glow, Smd, SilkText, THREE, geo, mat, mergedGeo, METAL, useLabel, useFrame, useRef, liveOf, D2R } from '../kit.jsx'
import def from '@shared/parts/stepper.js'
import { Badge, Glow2D, fmt } from './group-c-ui.jsx'

const MOTOR = [0, 0, -1.9] // centro do corpo do motor
const SHAFT = [0.8, 0, -1.9] // veio excêntrico (8 mm do centro)
const BOARD_Y = 0.55
const LEDS = [1.0, 1.35, 1.7, 2.05].map((z) => [1.25, BOARD_Y + 0.2, z])
const WIRES = ['#1e63d6', '#e86fb0', '#f2d21b', '#f08a1a', '#e53935']
const CHIP = { x: 0.1, z: 2.45 }

// veio de Ø5 mm com dois planos (3 mm entre planos), segundo +y de 0 a len
const ddShaftGeo = (len) =>
  geo(`28byjShaft${len}`, () => {
    const r = 0.25
    const f = 0.15
    const a = Math.acos(f / r)
    const s = new THREE.Shape()
    s.absarc(0, 0, r, a, Math.PI - a, false)
    s.lineTo(-f, -Math.sin(a) * r)
    s.absarc(0, 0, r, Math.PI + a, 2 * Math.PI - a, false)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, curveSegments: 10 })
    g.rotateX(-Math.PI / 2)
    return g
  })
// pernas do DIP-16 (8 de cada lado, passo 2,54 mm, ao longo de z)
const dipLegsGeo = () =>
  mergedGeo('uln2003Legs', () => {
    const u = geo('gull', () => new THREE.BoxGeometry(1, 1, 1))
    const out = []
    for (let i = 0; i < 8; i++)
      for (const s of [-1, 1]) {
        const z = (i - 3.5) * 0.254
        out.push([u, [s * 0.36, 0.2, z], [0, 0, 0], [0.08, 0.03, 0.05]])
        out.push([u, [s * 0.395, 0.1, z], [0, 0, 0], [0.025, 0.22, 0.05]])
      }
    return out
  })
// etiqueta do motor (à volta da lata)
let LBL
function motorLabelMat() {
  if (!LBL) {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 128
    const x = c.getContext('2d')
    x.fillStyle = '#e9ecef'
    x.fillRect(0, 0, 512, 128)
    x.fillStyle = '#1a1a1a'
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    x.font = 'bold 52px Arial'
    x.fillText('28BYJ-48', 256, 46)
    x.font = 'bold 34px Arial'
    x.fillText('5VDC   1:64', 256, 98)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    LBL = new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 })
  }
  return LBL
}

function Model({ part }) {
  const arrow = useRef()
  const label = useLabel([{ text: 'ULN2003AN', font: 'bold 64px Arial' }], 512, 128)
  useFrame(() => {
    const L = liveOf(part.id)
    if (arrow.current) arrow.current.rotation.y = -(L?.angle || 0) * D2R
  })
  const coil = (k) => () => (liveOf(part.id)?.coils?.[k] ? 1 : 0)
  return (
    <group>
      {/* motor: lata de aço, etiqueta, tampa estampada com as orelhas e o ressalto do veio */}
      <Cyl r={1.4} h={1.82} pos={[MOTOR[0], 0.91, MOTOR[2]]} color="#c3c7cc" metal={0.85} rough={0.35} seg={40} />
      <Cyl r={1.38} h={0.06} pos={[MOTOR[0], 0.03, MOTOR[2]]} color="#a9aeb3" metal={0.85} rough={0.4} seg={40} />
      <mesh position={[MOTOR[0], 0.95, MOTOR[2]]} rotation={[0, -Math.PI / 2, 0]} material={motorLabelMat()}>
        <cylinderGeometry args={[1.405, 1.405, 0.9, 32, 1, true, -0.9, 1.8]} />
      </mesh>
      <Box size={[4.2, 0.08, 0.7]} pos={[0, 1.86, MOTOR[2]]} color="#b8bcc2" metal={0.85} rough={0.35} />
      <Cyl r={1.42} h={0.08} pos={[MOTOR[0], 1.86, MOTOR[2]]} color="#b8bcc2" metal={0.85} rough={0.35} seg={40} />
      {[-1.75, 1.75].map((x) => (
        <group key={x}>
          <Cyl r={0.36} h={0.08} pos={[x, 1.86, MOTOR[2]]} color="#b8bcc2" metal={0.85} rough={0.35} seg={20} />
          <Cyl r={0.21} h={0.1} pos={[x, 1.87, MOTOR[2]]} color="#1a1a1a" seg={14} />
        </group>
      ))}
      {/* bossa estampada da caixa redutora e ressalto (Ø9 mm) à volta do veio */}
      <Cyl r={1.0} r2={1.1} h={0.12} pos={[0.3, 1.96, MOTOR[2]]} color="#c7cbd0" metal={0.85} rough={0.32} seg={36} />
      <Cyl r={0.45} h={0.22} pos={[SHAFT[0], 2.13, SHAFT[2]]} color="#c7cbd0" metal={0.85} rough={0.3} seg={24} />
      {/* caixa azul de saída dos fios, virada para a placa */}
      <Box size={[1.6, 0.9, 0.5]} pos={[0, 0.6, -0.45]} color="#2457c5" rough={0.45} />
      <Box size={[1.3, 0.12, 0.1]} pos={[0, 0.96, -0.2]} color="#1d47a3" rough={0.45} />
      {WIRES.map((c, i) => (
        <Leg key={c} from={[-0.5 + i * 0.25, 0.6, -0.25]} to={[-0.5 + i * 0.25, BOARD_Y + 0.3, 0.6]} r={0.05} color={c} />
      ))}
      {/* veio de duplo plano e ponteiro (rodam) */}
      <group ref={arrow} position={[SHAFT[0], 2.24, SHAFT[2]]}>
        <mesh geometry={ddShaftGeo(0.68)} material={mat('#d9dde2', 1, 0.25)} castShadow />
        <Box size={[1.5, 0.08, 0.22]} pos={[0.55, 0.63, 0]} color="#f5f5f5" />
        <Box size={[0.35, 0.09, 0.3]} pos={[1.25, 0.63, 0]} color="#e53935" />
        <Cyl r={0.2} h={0.1} pos={[0, 0.63, 0]} color="#e53935" />
      </group>
      {/* placa ULN2003 (verde, 35 × 32 mm) */}
      <Pcb size={[3.2, 0.16, 3.5]} pos={[0, BOARD_Y - 0.16, 2.2]} color="#1f7a3a" />
      {/* ULN2003AN em DIP-16 */}
      <group position={[CHIP.x, BOARD_Y, CHIP.z]}>
        <mesh geometry={dipLegsGeo()} material={mat(METAL.tin, 1, 0.3)} />
        <mesh position={[0, 0.2, 0]} geometry={geo('uln2003Body', () => new THREE.BoxGeometry(0.64, 0.33, 1.95))} material={mat('#151515', 0, 0.45)} castShadow />
        <mesh position={[0, 0.367, 0.05]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
          <planeGeometry args={[1.5, 0.38]} />
          <meshBasicMaterial map={label} transparent color="#c8c8c8" />
        </mesh>
        <Cyl r={0.07} h={0.01} pos={[0, 0.368, -0.97]} rot={[Math.PI / 2, 0, 0]} color="#0a0a0a" seg={12} />
        <Cyl r={0.05} h={0.01} pos={[-0.18, 0.368, -0.8]} color="#2a2a2a" seg={10} />
      </group>
      {/* ficha XH de 5 vias (base branca com a parede de guia) e a ficha do cabo encaixada */}
      <Box size={[1.45, 0.45, 0.55]} pos={[0, BOARD_Y + 0.225, 0.75]} color="#f2f2ee" rough={0.55} />
      <Box size={[1.35, 0.2, 0.42]} pos={[0, BOARD_Y + 0.55, 0.72]} color="#f7f7f3" rough={0.5} />
      <Box size={[1.2, 0.06, 0.08]} pos={[0, BOARD_Y + 0.68, 0.6]} color="#e3e3dd" rough={0.5} />
      {/* LEDs vermelhos de 3 mm (A–D) */}
      {LEDS.map((p, k) => (
        <group key={k}>
          <Glow pos={[p[0], BOARD_Y + 0.28, p[2]]} color="#ff2a2a" base="#7a1d1d" read={coil(k)} halo={0.6}>
            <capsuleGeometry args={[0.15, 0.22, 4, 12]} />
          </Glow>
          <Smd pos={[p[0] - 0.45, BOARD_Y, p[2]]} len={0.16} wid={0.09} h={0.05} />
        </group>
      ))}
      <SilkText lines={[{ text: 'A   B   C   D', font: 'bold 40px Arial' }]} pos={[1.5, BOARD_Y + 0.002, 1.52]} w={1.2} d={0.18} rotY={-Math.PI / 2} />
      {/* condensador cerâmico e a serigrafia dos pinos */}
      <Box size={[0.25, 0.3, 0.12]} pos={[-0.85, BOARD_Y + 0.15, 3.55]} color="#d8a640" rough={0.5} />
      <SilkText lines={[{ text: 'IN1 IN2 IN3 IN4', font: 'bold 36px Arial' }]} pos={[-0.95, BOARD_Y + 0.002, 2.2]} w={1.3} d={0.16} rotY={-Math.PI / 2} />
      <SilkText lines={[{ text: '-  +  5-12V', font: 'bold 38px Arial' }]} pos={[1.13, BOARD_Y + 0.002, 3.85]} w={1.0} d={0.15} />
      <HeaderPins pins={def.pins} base={BOARD_Y} up={0.45} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  return (
    <g pointerEvents="none">
      {LEDS.map((p, k) => (
        <Glow2D key={k} info={info} pos={p} color="#ff3030" on={live.coils?.[k]} r={4} />
      ))}
      <Badge info={info} text={`${fmt(live.angle, 1)}° · ${fmt(live.rpm, 1)} rpm`} color={Math.abs(live.rpm || 0) > 0.2 ? '#f5f5f5' : '#404040'} />
    </g>
  )
}

export default { type: 'stepper', Model, Overlay2D }
