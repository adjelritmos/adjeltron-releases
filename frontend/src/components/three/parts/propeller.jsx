// Hélice de 2 pás (tipo 5×3 de plástico injetado): cubo com o furo do veio e o ressalto do
// adaptador, pás com perfil aerodinâmico (bordo de ataque grosso, fuga fina, curvatura), torção
// que diminui para a ponta e planta larga a ~30 % do raio com a ponta arredondada. Cubo na
// origem, eixo +y; disco translúcido a alta rotação.
// Exporta bladeGeo (pá de hélice em cache), usada também pelo brushless e pela ventoinha do dcMotor.
import { Cyl, THREE, geo, mat, useFrame, useRef, liveOf } from '../kit.jsx'
import { propR } from '@shared/parts/propeller.js'

// Pá ao longo de +x (de r0 a R), corda segundo z, espessura segundo y (normal ao disco).
// o = { r0, R, chord(t), twist(t) [rad], thick(t), sweep(t), camber, n, m, mirror }, t ∈ [0, 1]
// Pá de uma hélice CW (vista de cima): o bordo de ataque fica em +z e sobe (+y) com twist > 0;
// mirror: true espelha em z (hélice CCW). Geometria em cache pela chave.
export function bladeGeo(key, o) {
  return geo(`blade:${key}`, () => {
    const n = o.n ?? 16 // estações ao longo do raio
    const m = o.m ?? 14 // pontos do perfil
    const sz = o.mirror ? -1 : 1
    const pos = []
    const idx = []
    const tri = (a, b, c) => (sz > 0 ? idx.push(a, b, c) : idx.push(a, c, b))
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const x = o.r0 + t * (o.R - o.r0)
      const c = Math.max(0.02, o.chord(t))
      const th = Math.max(0.008, o.thick(t))
      const a = o.twist(t)
      const sw = o.sweep ? o.sweep(t) : 0
      const cam = (o.camber ?? 0.05) * c
      for (let j = 0; j < m; j++) {
        const q = (j / m) * Math.PI * 2
        // perfil: elipse achatada com o máximo de espessura à frente e curvatura (intradorso plano)
        const u = Math.cos(q) // −1 fuga … +1 ataque
        const z = (c / 2) * u + sw
        const y = (th / 2) * Math.sin(q) * (0.75 + 0.25 * u) + cam * (1 - u * u)
        pos.push(x, z * Math.sin(a) + y * Math.cos(a), sz * (z * Math.cos(a) - y * Math.sin(a)))
      }
    }
    for (let i = 0; i < n; i++)
      for (let j = 0; j < m; j++) {
        const a = i * m + j
        const b = i * m + ((j + 1) % m)
        const c = a + m
        const d = b + m
        tri(a, c, b)
        tri(b, c, d)
      }
    // tampas (raiz e ponta) em leque
    const cap = (i, flip) => {
      const base = pos.length / 3
      let sx = 0
      let sy = 0
      let sz = 0
      for (let j = 0; j < m; j++) {
        sx += pos[(i * m + j) * 3]
        sy += pos[(i * m + j) * 3 + 1]
        sz += pos[(i * m + j) * 3 + 2]
      }
      pos.push(sx / m, sy / m, sz / m)
      for (let j = 0; j < m; j++) {
        const a = i * m + j
        const b = i * m + ((j + 1) % m)
        flip ? tri(base, b, a) : tri(base, a, b)
      }
    }
    cap(0, false)
    cap(n, true)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  })
}

// hélice de 2 pás de plástico (planta típica das 5×3 / 1045)
const propBlade = (R, dir) =>
  bladeGeo(`p2:${R},${dir}`, {
    mirror: dir < 0,
    r0: 0.45,
    R,
    chord: (t) => (0.75 + 1.1 * Math.sin(Math.min(1, t * 2.2) * Math.PI * 0.5) - 0.9 * t * t) * Math.max(0.6, R / 6.35) * (t > 0.92 ? Math.sqrt(Math.max(0.05, (1 - t) / 0.08)) : 1),
    twist: (t) => 0.62 - 0.42 * t,
    thick: (t) => (0.13 - 0.09 * t) * Math.max(0.7, R / 6.35),
    sweep: (t) => -0.12 * t * t * Math.max(0.6, R / 6.35),
    camber: 0.05,
  })

function Model({ part }) {
  const c = part.config || {}
  const R = propR(c)
  const dir = c.spin === 'CCW' ? -1 : 1
  const blur = useRef()
  useFrame(() => {
    if (blur.current) blur.current.opacity = Math.min(0.35, Math.abs(liveOf(part.id)?.rpm || 0) / 6000)
  })
  const color = c.spin === 'CCW' ? '#212121' : '#e65100'
  const m = mat(color, 0, 0.38)
  return (
    <group>
      {/* cubo com o ressalto, o furo do veio e o anel de reforço */}
      <Cyl r={0.6} h={0.7} pos={[0, 0.4, 0]} color={color} rough={0.4} seg={24} />
      <Cyl r={0.5} r2={0.6} h={0.1} pos={[0, 0.8, 0]} color={color} rough={0.4} seg={24} />
      <Cyl r={0.45} h={0.06} pos={[0, 0.02, 0]} color={color} rough={0.45} seg={24} />
      <Cyl r={0.25} h={0.86} pos={[0, 0.42, 0]} color="#0b0b0b" rough={0.8} seg={14} />
      {[0, 1].map((b) => (
        <mesh key={b} position={[0, 0.45, 0]} rotation={[0, b * Math.PI, 0]} geometry={propBlade(R, dir)} material={m} castShadow />
      ))}
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[R, R, 0.02, 48]} />
        <meshStandardMaterial ref={blur} color={color} transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

export default { type: 'propeller', Model }
