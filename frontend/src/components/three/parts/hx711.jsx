// Célula de carga de 5 kg (barra de alumínio de 80 × 12,7 × 12,7 mm com o furo duplo "binóculo"
// atravessado de lado, furos roscados nas pontas e os extensómetros cobertos de silicone branco)
// + amplificador HX711 (placa verde com o HX711 em SOP-16, transístor do regulador, passivos,
// almofadas E+/E−/A−/A+/B−/B+ onde soldam os 4 fios). Com massa > 0 aparece um peso de latão na
// ponta livre da célula (altura proporcional à massa).
import { Box, Cyl, Leg, HeaderPins, useFrame, useRef, inputOf, useCanvasTexture, Chip, geo, mat, THREE } from '../kit.jsx'
import { PcbPlate, Smds, Sot23 } from './_boardKit.jsx'
import def from '@shared/parts/hx711.js'

const T = 0.16
const BAR = { x: [-6.0, 2.0], s: 1.27, y0: 0.35 }
const BAR_TOP = BAR.y0 + BAR.s
const FREE_X = -4.6 // centro do peso
// fios da célula (cor → almofada): vermelho E+, preto E−, branco A−, verde A+
const WIRES = [['#e53935', -0.75], ['#1a1a1a', -0.45], ['#f5f5f5', -0.15], ['#2e9d3a', 0.15]]
const PADS = [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75] // E+ E− A− A+ B− B+ (z)
const SMDS = [[3.35, -0.7, 1, 'c'], [3.55, -0.7, 1, 'c'], [3.9, 0.75, 0, 'r'], [3.9, -0.75, 0, 'r'], [2.85, 0.75, 0, 'r'], [3.15, 0.75, 0, 'C'], [4.05, 0.1, 1, 'c']]

// barra da célula: perfil extrudido ao longo de z com o furo duplo (dois círculos unidos por uma
// fenda) no meio do comprimento — é o que torna a barra flexível onde estão os extensómetros
const barGeo = () =>
  geo('hx711Bar', () => {
    const [x0, x1] = BAR.x
    const y0 = BAR.y0
    const y1 = BAR.y0 + BAR.s
    const sh = new THREE.Shape()
    sh.moveTo(x0, y0)
    sh.lineTo(x1, y0)
    sh.lineTo(x1, y1)
    sh.lineTo(x0, y1)
    sh.closePath()
    const cx = (x0 + x1) / 2
    const cy = (y0 + y1) / 2
    const r = 0.42
    const h = 0.14
    const d = 0.5
    const a = Math.asin(h / r)
    const hole = new THREE.Path()
    hole.moveTo(cx - d + r * Math.cos(a), cy + h)
    hole.lineTo(cx + d - r * Math.cos(a), cy + h)
    hole.absarc(cx + d, cy, r, Math.PI - a, -(Math.PI - a), true)
    hole.lineTo(cx - d + r * Math.cos(a), cy - h)
    hole.absarc(cx - d, cy, r, -a, a, true)
    sh.holes.push(hole)
    const g = new THREE.ExtrudeGeometry(sh, { depth: BAR.s, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 20 })
    g.translate(0, 0, -BAR.s / 2)
    return g
  })

function Model({ part }) {
  const weight = useRef()
  // serigrafia da placa (nomes das almofadas e dos pinos) e etiqueta da célula
  const silk = useCanvasTexture(
    (ctx, w, h) => {
      const at = (x, z) => [((x - 3.55) / 2.7 + 0.5) * w, (z / 2.0 + 0.5) * h]
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 13px Arial'
      ;['E+', 'E-', 'A-', 'A+', 'B-', 'B+'].forEach((t, i) => ctx.fillText(t, ...at(2.55, PADS[i])))
      ctx.textAlign = 'right'
      for (const p of def.pins) ctx.fillText(p.id, ...at(4.42, p.pos[2]))
    },
    ['hx711-silk'],
    324,
    240,
  )
  const sticker = useCanvasTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#f2f2ee'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#222'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 44px Arial'
      ctx.fillText('5 kg', w / 2, h * 0.32)
      ctx.font = '24px Arial'
      ctx.fillText('1.0 ± 0.15 mV/V', w / 2, h * 0.7)
    },
    ['hx711-sticker'],
    256,
    96,
  )
  useFrame(() => {
    const g = Math.max(0, Math.min(5000, inputOf(part.id).value || 0))
    const m = weight.current
    if (!m) return
    m.visible = g > 0
    const h = 0.25 + (2.2 * g) / 5000
    m.scale.y = h
    m.position.y = BAR_TOP + h / 2
  })
  const bx = (BAR.x[0] + BAR.x[1]) / 2
  return (
    <group>
      {/* barra de alumínio apoiada na ponta fixa (espaçador) */}
      <Box size={[1.8, BAR.y0, 1.27]} pos={[1.1, BAR.y0 / 2, 0]} color="#3a3a3a" />
      <mesh castShadow receiveShadow geometry={barGeo()} material={mat('#c9cdd2', 0.85, 0.38)} />
      {/* furos roscados M4/M5 nas pontas (em cima) */}
      {[-5.5, -4.8, 0.6, 1.3].map((x) => (
        <Cyl key={x} r={0.22} h={0.02} pos={[x, BAR_TOP + 0.025, 0]} color="#1a1a1a" seg={16} />
      ))}
      {/* extensómetros cobertos de silicone branco e a etiqueta lateral */}
      <Box size={[1.7, 0.08, 0.95]} pos={[bx, BAR_TOP + 0.04, 0]} color="#f2f2f0" rough={0.9} />
      <Box size={[1.2, 0.06, 0.7]} pos={[bx, BAR_TOP + 0.1, 0]} color="#fafafa" rough={0.9} />
      <mesh position={[-4.3, BAR.y0 + BAR.s / 2, BAR.s / 2 + 0.022]} geometry={geo('plane1', () => new THREE.PlaneGeometry(1, 1))} scale={[2.2, 0.8, 1]}>
        <meshStandardMaterial map={sticker} roughness={0.6} />
      </mesh>
      {/* fios até à placa */}
      {WIRES.map(([c, z]) => (
        <Leg key={c} from={[bx + 0.8, BAR_TOP + 0.1, z * 0.4]} to={[2.4, T + 0.08, z]} r={0.04} color={c} />
      ))}
      {/* placa HX711: almofadas dos fios, HX711 (SOP-16), transístor S8550, passivos e serigrafia */}
      <group position={[3.55, 0, 0]}>
        <PcbPlate id="hx711" w={2.7} d={2.0} t={T} y={0} r={0.06} color="#1f7a3a" />
      </group>
      <mesh position={[3.55, T + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.7, 2.0]} />
        <meshBasicMaterial map={silk} transparent />
      </mesh>
      {PADS.map((z) => (
        <Cyl key={z} r={0.1} h={0.02} pos={[2.4, T + 0.01, z]} color="#c9a227" metal={1} rough={0.3} seg={12} />
      ))}
      {WIRES.map(([c, z]) => (
        <Cyl key={c} r={0.08} r2={0.11} h={0.06} pos={[2.4, T + 0.03, z]} color="#d8dbde" metal={1} rough={0.25} seg={10} />
      ))}
      <Chip pos={[3.45, T, 0.1]} size={[1.0, 0.15, 0.39]} n={8} label="HX711" />
      <Sot23 pos={[3.0, T, -0.5]} label="2TY" />
      <Smds id="hx711" y={T} items={SMDS} />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
      {/* peso de latão (escala y = altura) */}
      <mesh ref={weight} visible={false} position={[FREE_X, BAR_TOP + 0.5, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 1, 32]} />
        <meshStandardMaterial color="#c9a227" metalness={0.85} roughness={0.3} />
      </mesh>
    </group>
  )
}

function Overlay2D({ info, input }) {
  const g = input?.value || 0
  if (g <= 0) return null
  const [cx, cy] = info.project([FREE_X, 0, 0])
  const [rx] = info.project([FREE_X + 0.85, 0, 0])
  return (
    <g pointerEvents="none">
      <circle cx={cx} cy={cy} r={Math.abs(rx - cx)} fill="#c9a227" stroke="#7a5e10" strokeWidth={1.5} />
      <circle cx={cx - 5} cy={cy - 5} r={Math.abs(rx - cx) * 0.35} fill="#fff" opacity={0.25} />
    </g>
  )
}

export default { type: 'hx711', Model, Overlay2D }
