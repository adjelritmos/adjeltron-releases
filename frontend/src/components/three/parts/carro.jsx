// Carro desportivo de brincar (coupé de 2 lugares, desenho próprio): carroçaria extrudida de um
// perfil lateral com as cavas das rodas e arestas arredondadas, habitáculo em vidro fumado,
// jantes de 5 raios que rodam com a distância percorrida, faróis finos e farolim traseiro em
// barra. Frente = +x. A posição na mesa vem do backend (Scene3D, peça "carro").
import { Box, Cyl, THREE, geo, mat, liveOf, useFrame, useRef } from '../kit.jsx'
import { CAR } from '@shared/parts/carro.js'

const { L, W, wheelR: R, wheelX: WX, track: TZ } = CAR
const ARCH = R + 0.28

// perfil (x, y) → extrusão segundo z, centrada, com bisel (cantos redondos)
function extrudeSide(key, pts, depth, bevel) {
  return geo(key, () => {
    const s = new THREE.Shape()
    pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)))
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: depth - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 12 })
    g.translate(0, 0, -(depth - 2 * bevel) / 2)
    g.computeVertexNormals()
    return g
  })
}

// arco de uma cava de roda (de trás para a frente, por cima do centro)
const arch = (cx, n = 10) => Array.from({ length: n + 1 }, (_, i) => {
  const a = Math.PI - (i / n) * Math.PI
  return [cx + Math.cos(a) * ARCH, R + Math.sin(a) * ARCH]
})

// silhueta da carroçaria: para-choques, capot comprido e baixo, traseira curta com spoiler
const BODY = [
  [-8.75, 0.75], [-WX - ARCH, 0.75], ...arch(-WX), [-WX + ARCH, 0.75], [WX - ARCH, 0.75], ...arch(WX), [WX + ARCH, 0.75], [8.75, 0.75],
  [9.0, 1.35], [8.95, 2.05], [8.4, 2.55], [6.6, 2.95], [4.4, 3.25], [2.9, 3.4],
  [-3.6, 3.45], [-6.6, 3.5], [-8.35, 3.55], [-8.85, 3.3], [-9.0, 2.5], [-8.95, 1.2],
]
// habitáculo (vidro): para-brisas inclinado, tejadilho curto, vidro traseiro em fastback
const CABIN = [
  [3.35, 3.2], [1.2, 4.7], [0.2, 4.95], [-2.0, 4.95], [-3.4, 4.6], [-6.1, 3.45], [-6.1, 3.2],
]

function Wheel({ x, z, spin }) {
  const side = Math.sign(z)
  return (
    <group position={[x, R, z]}>
      <group ref={spin}>
        {/* pneu */}
        <mesh geometry={geo('carTyre', () => new THREE.TorusGeometry(R - 0.42, 0.42, 14, 32))} material={mat('#141414', 0, 0.85)} castShadow />
        <Cyl r={R - 0.35} h={1.05} rot={[Math.PI / 2, 0, 0]} color="#1b1b1b" rough={0.8} seg={28} />
        {/* jante de 5 raios */}
        <group position={[0, 0, side * 0.5]}>
          <Cyl r={R - 0.5} h={0.08} rot={[Math.PI / 2, 0, 0]} color="#2a2d30" metal={0.6} rough={0.4} seg={28} />
          <Cyl r={R - 0.48} h={0.06} pos={[0, 0, side * 0.04]} rot={[Math.PI / 2, 0, 0]} color="#c9cdd1" metal={0.9} rough={0.25} seg={28} />
          {[0, 1, 2, 3, 4].map((i) => (
            <Box key={i} size={[R - 0.62, 0.2, 0.08]} pos={[Math.cos((i * 2 * Math.PI) / 5) * (R - 0.62) / 2, Math.sin((i * 2 * Math.PI) / 5) * (R - 0.62) / 2, side * 0.09]} rot={[0, 0, (i * 2 * Math.PI) / 5]} color="#d7dbdf" metal={0.9} rough={0.25} />
          ))}
          <Cyl r={0.22} h={0.1} pos={[0, 0, side * 0.12]} rot={[Math.PI / 2, 0, 0]} color="#8d949a" metal={0.9} rough={0.3} seg={16} />
        </group>
      </group>
      {/* pinça do travão (não roda) */}
      <Box size={[0.5, 0.35, 0.15]} pos={[0.55, 0.45, side * 0.35]} color="#c62828" rough={0.5} />
    </group>
  )
}

function Model({ part }) {
  const color = part.config?.color || '#e8743b'
  const spins = [useRef(), useRef(), useRef(), useRef()]
  useFrame(() => {
    const d = +liveOf(part.id)?.d || 0
    for (const s of spins) if (s.current) s.current.rotation.z = -d / R
  })
  const paint = mat(color, 0.35, 0.28)
  return (
    <group>
      {/* carroçaria */}
      <mesh geometry={extrudeSide('carBody', BODY, W, 0.55)} material={paint} castShadow receiveShadow />
      {/* habitáculo em vidro fumado (mais estreito) */}
      <mesh geometry={extrudeSide('carCabin', CABIN, W - 1.3, 0.6)} material={mat('#11161c', 0.6, 0.12)} castShadow />
      {/* friso do tejadilho e pilares (cor da carroçaria) */}
      <Box size={[1.7, 0.08, W - 2.2]} pos={[-0.9, 4.96, 0]} color={color} metal={0.35} rough={0.3} />
      {/* fundo e difusor */}
      <Box size={[L - 1.2, 0.35, W - 0.8]} pos={[0, 0.72, 0]} color="#1a1a1a" rough={0.8} />
      <Box size={[0.6, 0.5, W - 2.0]} pos={[-8.8, 1.0, 0]} color="#151515" rough={0.6} />
      {/* frente: grelha, entradas de ar e faróis em lâmina */}
      <Box size={[0.25, 0.45, 3.6]} pos={[8.95, 1.35, 0]} color="#111" rough={0.5} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box size={[0.25, 0.4, 1.0]} pos={[8.9, 1.25, s * 2.7]} color="#111" rough={0.5} />
          <mesh position={[8.62, 2.32, s * 2.55]} rotation={[0, 0, -0.42]}>
            <boxGeometry args={[0.7, 0.14, 1.5]} />
            <meshStandardMaterial color="#f5f7ff" emissive="#dfe8ff" emissiveIntensity={0.9} toneMapped={false} />
          </mesh>
          {/* espelhos */}
          <Box size={[0.55, 0.32, 0.5]} pos={[2.6, 3.65, s * (W / 2 - 0.2)]} color={color} metal={0.35} rough={0.3} />
          {/* puxador e friso lateral */}
          <Box size={[2.6, 0.06, 0.03]} pos={[-0.6, 2.35, s * (W / 2 + 0.005)]} color="#2b2b2b" />
          {/* ponteiras de escape */}
          <Cyl r={0.2} h={0.3} pos={[-9.0, 0.95, s * 1.2]} rot={[0, 0, Math.PI / 2]} color="#9aa1a7" metal={0.9} rough={0.3} seg={14} />
        </group>
      ))}
      {/* traseira: farolim em barra e spoiler */}
      <mesh position={[-8.93, 3.05, 0]}>
        <boxGeometry args={[0.12, 0.16, W - 1.4]} />
        <meshStandardMaterial color="#ff2a2a" emissive="#ff1a1a" emissiveIntensity={0.8} toneMapped={false} />
      </mesh>
      <Box size={[0.9, 0.08, W - 1.6]} pos={[-8.2, 3.62, 0]} color="#151515" rough={0.5} />
      {/* rodas: frente/trás × esquerda/direita */}
      {[[WX, -TZ], [WX, TZ], [-WX, -TZ], [-WX, TZ]].map(([x, z], i) => (
        <Wheel key={i} x={x} z={z} spin={spins[i]} />
      ))}
    </group>
  )
}

export default { type: 'carro', Model }
