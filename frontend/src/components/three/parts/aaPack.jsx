// Suporte preto para 4 pilhas AA lado a lado (alternadas), como o "4 × AA battery holder" de
// ABS: berços curvos entre as pilhas, molas cónicas no polo − e patilhas niqueladas no +, as
// pontes de ligação em série nos topos e fios vermelho/preto até aos pinos.
// Exporta AACell e Spring (pilha AA real e mola cónica), usados também pela caixa 2 × 2.
import { Box, RBox, Cyl, THREE, geo, mat, METAL } from '../kit.jsx'
import def from '@shared/parts/aaPack.js'
import { LeadPair } from './battery9v.jsx'
import { Badge, fmt } from './group-c-ui.jsx'

const LX = 6.4
const LZ = 6.2
const ZS = [-2.2, -0.73, 0.73, 2.2]
const PLASTIC = '#161616'

// ---------- pilha AA (LR6: Ø14,5 × 50,5 mm) ----------
// lata de aço (fundo plano = −, mamilo = +) num torno; manga impressa por cima.
// Ao longo de +x (o + em +x); centro do corpo na origem: de x = −2,45 a +2,555.
const cellCanGeo = () =>
  geo('aaCan', () => {
    const P = [[0, -2.45], [0.5, -2.45], [0.64, -2.435], [0.69, -2.4], [0.7, -2.36], [0.7, 2.34], [0.685, 2.39], [0.64, 2.425], [0.32, 2.43], [0.29, 2.445], [0.28, 2.52], [0.26, 2.548], [0.2, 2.555], [0, 2.555]]
    const g = new THREE.LatheGeometry(P.map(([r, y]) => new THREE.Vector2(r, y)), 24)
    g.rotateZ(-Math.PI / 2)
    return g
  })
const cellWrapGeo = () =>
  geo('aaWrap', () => {
    const g = new THREE.CylinderGeometry(0.704, 0.704, 4.66, 24, 1, true)
    g.rotateZ(-Math.PI / 2)
    g.translate(-0.06, 0, 0)
    return g
  })
// manga impressa (u = à volta, v = ao longo da pilha; topo da tela = polo +)
const WRAP = new Map()
function wrapMat(color) {
  let m = WRAP.get(color)
  if (m) return m
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 512
  const x = c.getContext('2d')
  const g = x.createLinearGradient(0, 0, 256, 0)
  g.addColorStop(0, color)
  g.addColorStop(0.5, new THREE.Color(color).offsetHSL(0, 0, 0.06).getStyle())
  g.addColorStop(1, color)
  x.fillStyle = g
  x.fillRect(0, 0, 256, 512)
  // faixa escura junto ao + com o símbolo, e risca dourada
  x.fillStyle = '#121212'
  x.fillRect(0, 0, 256, 120)
  x.fillStyle = '#d4a53a'
  x.fillRect(0, 120, 256, 10)
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  for (const u of [64, 192]) {
    x.save()
    x.translate(u, 300)
    x.rotate(-Math.PI / 2)
    x.fillStyle = '#ffffff'
    x.font = 'bold 54px Arial'
    x.fillText('AA  1.5V', 0, -14)
    x.font = 'bold 24px Arial'
    x.fillStyle = '#e8e8e8'
    x.fillText('ALKALINE · LR6', 0, 30)
    x.restore()
    x.save()
    x.translate(u, 60)
    x.rotate(-Math.PI / 2)
    x.fillStyle = '#d4a53a'
    x.font = 'bold 56px Arial'
    x.fillText('+', 0, 0)
    x.restore()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  m = new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 0.8 })
  WRAP.set(color, m)
  return m
}
// pilha AA deitada ao longo de x: dir = +1 (+ em +x) ou −1
export function AACell({ pos, dir = 1, color = '#2e7d32' }) {
  return (
    <group position={pos} rotation={[0, dir > 0 ? 0 : Math.PI, 0]}>
      <mesh geometry={cellCanGeo()} material={mat(METAL.nickel, 1, 0.3)} castShadow />
      <mesh geometry={cellWrapGeo()} material={wrapMat(color)} castShadow />
    </group>
  )
}

// ---------- mola cónica de aço (polo −) ----------
// hélice de 4,5 espiras que aperta do diâmetro da base (no topo do suporte) até ao bico.
// Ao longo de +x, de 0 (base) a `len`.
class ConeHelix extends THREE.Curve {
  getPoint(t, out = new THREE.Vector3()) {
    const a = t * Math.PI * 2 * 4.5
    const r = 0.42 - 0.2 * t
    return out.set(t, Math.cos(a) * r, Math.sin(a) * r)
  }
}
const springGeo = () => geo('aaSpring', () => new THREE.TubeGeometry(new ConeHelix(), 72, 0.028, 5, false))
export function Spring({ pos, dir = 1, len = 0.4 }) {
  return <mesh position={pos} scale={[dir * len, 1, 1]} geometry={springGeo()} material={mat('#b9bec4', 1, 0.3)} castShadow />
}
// patilha do polo + (chapa niquelada com botão estampado), encostada à parede em x = wallX
// até `tip` (|x| do mamilo da pilha)
export function PlusTab({ wallX, y, z, dir = 1, tip = 2.52 }) {
  const reach = Math.abs(wallX) - tip
  return (
    <group position={[wallX, y, z]} scale={[dir, 1, 1]}>
      <Box size={[0.04, 0.95, 0.8]} pos={[-0.02, 0, 0]} color={METAL.nickel} metal={1} rough={0.3} />
      <Cyl r={0.17} r2={0.22} h={reach} pos={[-reach / 2, 0, 0]} rot={[0, 0, Math.PI / 2]} color={METAL.nickel} metal={1} rough={0.28} seg={14} />
    </group>
  )
}

// tom ligeiramente diferente nas pilhas alternadas (como pilhas de lotes diferentes)
export const cellTone = (c, k) => (k ? new THREE.Color(c).offsetHSL(0, 0, -0.03).getStyle() : c)

function Model({ part }) {
  const color = part?.config?.color || def.config.color
  const wall = 0.15
  const y = 0.9
  return (
    <group>
      {/* fundo, paredes laterais baixas e topos altos (aberto em cima) */}
      <RBox size={[LX, 0.2, LZ]} r={0.06} pos={[0, 0.1, 0]} color={PLASTIC} rough={0.55} />
      {[-1, 1].map((s) => (
        <RBox key={`x${s}`} size={[0.2, 1.6, LZ]} r={0.05} pos={[s * (LX / 2 - 0.1), 0.8, 0]} color={PLASTIC} rough={0.55} />
      ))}
      {[-1, 1].map((s) => (
        <RBox key={`z${s}`} size={[LX, 1.05, wall]} r={0.04} pos={[0, 0.525, s * (LZ / 2 - wall / 2)]} color={PLASTIC} rough={0.55} />
      ))}
      {/* nervuras entre os berços (onde as pilhas encostam) */}
      {[-1.46, 0, 1.46].map((z) => (
        <Box key={z} size={[LX - 0.6, 0.32, 0.08]} pos={[0, 0.36, z]} color="#1d1d1d" rough={0.6} />
      ))}
      {/* pilhas alternadas (em série), molas no −, patilhas no + e polaridades em relevo nos topos */}
      {ZS.map((z, i) => {
        const dir = i % 2 ? -1 : 1
        return (
          <group key={z}>
            <AACell pos={[-0.05 * dir, y, z]} dir={dir} color={cellTone(color, i % 2)} />
            <Spring pos={[-dir * 2.98, y, z]} dir={dir} len={0.5} />
            <PlusTab wallX={dir * (LX / 2 - 0.2)} y={y} z={z} dir={dir} />
            <Box size={[0.02, 0.06, 0.26]} pos={[dir * (LX / 2 + 0.001), 1.3, z]} color="#2c2c2c" />
            <Box size={[0.02, 0.26, 0.06]} pos={[dir * (LX / 2 + 0.001), 1.3, z]} color="#2c2c2c" />
            <Box size={[0.02, 0.06, 0.26]} pos={[-dir * (LX / 2 + 0.001), 1.3, z]} color="#2c2c2c" />
          </group>
        )
      })}
      {/* pontes de ligação em série (chapas niqueladas por cima dos topos) */}
      {[[1, -1.46], [-1, 0], [1, 1.46]].map(([s, z]) => (
        <Box key={z} size={[0.22, 0.03, 1.5]} pos={[s * (LX / 2 - 0.1), 1.615, z]} color={METAL.nickel} metal={1} rough={0.35} />
      ))}
      {/* parafuso/rebite de fixação no fundo */}
      <Cyl r={0.16} h={0.02} pos={[0, 0.205, 0]} color="#2a2a2a" seg={12} />
      <LeadPair from={[LX / 2, 0.5, 0]} pins={def.pins} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  return <Badge info={info} text={`${fmt(live.v, 2)} V`} />
}

export default { type: 'aaPack', Model, Overlay2D }
