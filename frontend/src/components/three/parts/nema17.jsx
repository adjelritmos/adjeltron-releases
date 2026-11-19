// Motor de passo NEMA 17 (17HS4401: 42,3 × 42,3 × 40 mm): tampas de alumínio com os cantos
// chanfrados, pacote de chapas do estator ao meio (com as lâminas), ressalto de centragem de
// Ø22 mm, 4 furos M3 roscados a 31 mm, etiqueta lateral e veio de Ø5 mm com o plano em D.
// O veio com a bandeira roda com live.angle (positivo = sentido horário visto de cima).
// Ficha JST-PH de 6 vias de lado e o cabo de 4 fios até à placa de ligação com 4 pinos.
// Exporta nemaGeo (prisma quadrado de cantos chanfrados) e dShaftGeo (veio em D), usados
// também pelo biaxial e pelos motores com veio em D.
import { Box, Cyl, Leg, Pcb, HeaderPins, THREE, geo, mat, mergedGeo, useFrame, useRef, liveOf, D2R } from '../kit.jsx'
import def from '@shared/parts/nema17.js'

const S = 4.23
const WIRES = ['#e53935', '#1e63d6', '#2e9d3a', '#1a1a1a']

// prisma de secção quadrada (lado s) com os cantos chanfrados (c), de y = 0 a h
export function nemaGeo(s, c, h) {
  return geo(`nema:${s},${c},${h}`, () => {
    const b = Math.min(0.03, h / 4)
    const a = s / 2 - b // o chanfro de acabamento (bevel) cresce para fora: fica dentro de s
    const sh = new THREE.Shape()
    sh.moveTo(-a + c, -a)
    sh.lineTo(a - c, -a)
    sh.lineTo(a, -a + c)
    sh.lineTo(a, a - c)
    sh.lineTo(a - c, a)
    sh.lineTo(-a + c, a)
    sh.lineTo(-a, a - c)
    sh.lineTo(-a, -a + c)
    sh.closePath()
    const g = new THREE.ExtrudeGeometry(sh, { depth: h - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1 })
    g.translate(0, 0, b)
    g.rotateX(-Math.PI / 2)
    return g
  })
}
// veio de raio r com o plano em D (plano em x = f, f < r), de y = 0 a len
export function dShaftGeo(r, f, len) {
  return geo(`dshaft:${r},${f},${len}`, () => {
    const a0 = Math.acos(f / r)
    const sh = new THREE.Shape()
    sh.moveTo(f, -Math.sin(a0) * r)
    sh.lineTo(f, Math.sin(a0) * r)
    sh.absarc(0, 0, r, a0, Math.PI * 2 - a0, false)
    const g = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false, curveSegments: 16 })
    g.rotateX(-Math.PI / 2)
    return g
  })
}

// perfil (z, y) da lata: círculo de raio r cortado por |y| ≤ h, extrudido segundo −x
// (lata dos motores 130, 370 e N20: redonda com as faces de cima e de baixo achatadas)
export function canGeo(r, h, len, bevel) {
  return geo(`m130:${r},${h},${len},${bevel}`, () => {
    const R = r - bevel
    const Hh = h - bevel
    const a0 = Math.asin(Hh / R)
    const sh = new THREE.Shape()
    const N = 14
    for (let i = 0; i <= N; i++) {
      const a = -a0 + (2 * a0 * i) / N // arco direito (+z)
      const [x, y] = [R * Math.cos(a), R * Math.sin(a)]
      i ? sh.lineTo(x, y) : sh.moveTo(x, y)
    }
    for (let i = 0; i <= N; i++) {
      const a = Math.PI - a0 + (2 * a0 * i) / N // arco esquerdo (−z)
      sh.lineTo(R * Math.cos(a), R * Math.sin(a))
    }
    sh.closePath()
    const g = new THREE.ExtrudeGeometry(sh, { depth: len - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 })
    g.translate(0, 0, bevel)
    g.rotateY(-Math.PI / 2) // (z_forma, y, profundidade) → (x = −profundidade, y, z)
    g.computeVertexNormals()
    return g
  })
}

// pacote de chapas: riscas finas das lâminas (textura repetida segundo a altura)
let LAM
export function laminationMat() {
  if (!LAM) {
    const c = document.createElement('canvas')
    c.width = 4
    c.height = 16
    const x = c.getContext('2d')
    x.fillStyle = '#26272a'
    x.fillRect(0, 0, 4, 16)
    x.fillStyle = '#121214'
    x.fillRect(0, 12, 4, 4)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1, 1 / 0.07)
    LAM = new THREE.MeshStandardMaterial({ map: t, metalness: 0.55, roughness: 0.5, envMapIntensity: 0.9 })
  }
  return LAM
}

// etiqueta lateral (prateada, impressa a preto)
let LBL
function labelMat() {
  if (!LBL) {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 256
    const x = c.getContext('2d')
    x.fillStyle = '#d9dcdf'
    x.fillRect(0, 0, 512, 256)
    x.fillStyle = '#111'
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    x.font = 'bold 64px Arial'
    x.fillText('17HS4401', 256, 60)
    x.font = 'bold 36px Arial'
    x.fillText('1.7A   1.8°/STEP', 256, 128)
    x.font = '30px Arial'
    x.fillText('STEPPING MOTOR · 2 PHASE', 256, 190)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    LBL = new THREE.MeshStandardMaterial({ map: t, roughness: 0.45, metalness: 0.2, polygonOffset: true, polygonOffsetFactor: -2 })
  }
  return LBL
}
// furos roscados M3 nos 4 cantos (discos escuros num só desenho)
const holesGeo = (d, r) => mergedGeo(`nemaHoles${d},${r}`, () => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => [geo(`disc${r}`, () => new THREE.CircleGeometry(r, 14).rotateX(-Math.PI / 2)), [sx * d, 0, sz * d]]))

// corpo de motor de passo NEMA 17: tampas de alumínio, pacote de chapas e etiqueta
export function NemaBody({ h, cap = 0.7, label = true, s = S }) {
  const stack = h - 2 * cap
  return (
    <group>
      <mesh geometry={nemaGeo(s, 0.42, cap)} material={mat('#c3c7cc', 0.85, 0.32)} castShadow receiveShadow />
      <mesh position={[0, cap, 0]} geometry={nemaGeo(s - 0.02, 0.44, stack)} material={laminationMat()} castShadow receiveShadow />
      <mesh position={[0, cap + stack, 0]} geometry={nemaGeo(s, 0.42, cap)} material={mat('#c3c7cc', 0.85, 0.32)} castShadow receiveShadow />
      <mesh position={[0, h + 0.002, 0]} geometry={holesGeo(1.55, 0.15)} material={mat('#0e0e0e', 0, 0.8)} />
      {label && (
        <mesh position={[0.2, cap + stack / 2, (s - 0.02) / 2 + 0.003]} material={labelMat()}>
          <planeGeometry args={[2.6, Math.min(1.3, stack - 0.2)]} />
        </mesh>
      )}
    </group>
  )
}

// ficha JST-PH (branca) de lado, com as janelas dos terminais
export function NemaPlug({ x = -2.2, y = 0.55, w = 1.4 }) {
  return (
    <group>
      <Box size={[0.4, 0.55, w]} pos={[x, y, 0]} color="#f2f2ee" rough={0.5} />
      <Box size={[0.02, 0.2, w - 0.2]} pos={[x - 0.2, y + 0.1, 0]} color="#c9c9c2" />
      <Box size={[0.3, 0.05, w - 0.3]} pos={[x + 0.02, y + 0.28, 0]} color="#e2e2dc" rough={0.5} />
    </group>
  )
}

function Model({ part }) {
  const shaft = useRef()
  useFrame(() => {
    if (shaft.current) shaft.current.rotation.y = -(liveOf(part.id)?.angle || 0) * D2R
  })
  return (
    <group>
      <NemaBody h={4.0} />
      {/* ressalto de centragem Ø22 mm com o rolamento */}
      <Cyl r={1.1} h={0.2} pos={[0, 4.1, 0]} color="#d0d4d8" metal={0.9} rough={0.28} seg={40} />
      <Cyl r={0.45} h={0.02} pos={[0, 4.205, 0]} color="#7d8288" metal={1} rough={0.35} seg={24} />
      {/* veio rotativo Ø5 mm com o plano (D) e bandeira */}
      <group ref={shaft}>
        <Cyl r={0.25} h={1.0} pos={[0, 4.4, 0]} color="#e6e8ea" metal={1} rough={0.2} seg={18} />
        <mesh position={[0, 4.9, 0]} geometry={dShaftGeo(0.25, 0.2, 1.4)} material={mat('#e6e8ea', 1, 0.2)} castShadow />
        <Box size={[1.7, 0.1, 0.36]} pos={[0.85, 6.15, 0]} color="#e53935" />
        <Cyl r={0.4} h={0.12} pos={[0, 6.15, 0]} color="#e53935" />
      </group>
      {/* ficha JST-PH e cabo de 4 fios até à placa de ligação */}
      <NemaPlug />
      {WIRES.map((c, i) => {
        const z = (i - 1.5) * 0.254
        return <Leg key={c} from={[-2.35, 0.55, z * 1.3]} to={[-2.75, 0.2, z]} r={0.045} color={c} />
      })}
      <Pcb size={[0.55, 0.16, 1.4]} pos={[-2.83, 0, 0]} color="#1f7a3a" holes={false} />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

export default { type: 'nema17', Model }
