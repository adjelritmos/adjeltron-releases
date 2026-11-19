// Aquecedor de quartzo (o modelo de 3 tubos de 1200 W das lojas, à escala): caixa de chapa
// lacada com as laterais estampadas (grelhas de ventilação), refletor de alumínio polido em
// calha atrás de cada tubo, 3 tubos de quartzo com a resistência em espiral por dentro e os
// topos de porcelana, que ficam ao rubro com live.g (potência relativa, com inércia térmica),
// grelha de proteção de arame cromado à frente (+x), pegas, comutador rotativo 0-I-II-III com
// a lâmpada piloto, pés de chapa com borrachas e a régua de bornes atrás. Ilumina e "aquece" a
// sala com uma luz laranja.
import { Box, RBox, Cyl, Halo, Glow, SilkText, geo, mat, mergedGeo, liveOf, useFrame, useMemo, useRef, THREE } from '../kit.jsx'
import { AQ } from '@shared/parts/aquecedor.js'
import { Bornes, rodItem, helixGeo } from './_casaKit.jsx'

const TUBES = [0.95, 2.1, 3.25]

function Model({ part }) {
  const c = part.config || {}
  const { W, H, D, Y0 } = AQ
  const body = c.cor || '#d9dcdf'
  const glow = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f3e6d6', emissive: '#ff5a1a', emissiveIntensity: 0, roughness: 0.08, transparent: true, opacity: 0.55, toneMapped: false, depthWrite: false }), [])
  const coil = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7a5a48', emissive: '#ff8a2a', emissiveIntensity: 0, roughness: 0.5, metalness: 0.4, toneMapped: false }), [])
  const light = useRef()
  useFrame(() => {
    const g = Math.max(0, Math.min(1.5, liveOf(part.id)?.g || 0))
    glow.emissiveIntensity = g * 2.2
    glow.opacity = 0.55 + Math.min(0.4, g * 0.4)
    glow.color.set(g > 0.05 ? '#ffd2a8' : '#f3e6d6')
    coil.emissiveIntensity = g * 3
    if (light.current) light.current.intensity = g * 60
  })
  const tl = W - 0.7 // comprimento do tubo de quartzo
  const tubeGeo = geo(`aqTube${W}`, () => new THREE.CylinderGeometry(0.15, 0.15, tl, 18, 1, true).rotateX(Math.PI / 2))
  // resistência em espiral (fio de Kanthal) ao longo do tubo
  const coilGeo = helixGeo(`aq${W}`, 0.07, 0.018, -(tl - 0.3) / 2, (tl - 0.3) / 2, Math.round((tl - 0.3) / 0.07), 8)
  const yb = Y0
  // grelha de proteção: varetas verticais, travessas e aro (uma só malha)
  const grille = mergedGeo(`aqGrille${W},${H},${D}`, () => {
    const out = []
    const x = D / 2 - 0.05
    const n = 17
    for (let i = 0; i < n; i++) {
      const z = -W / 2 + 0.3 + (i * (W - 0.6)) / (n - 1)
      out.push(rodItem([x, yb + 0.3, z], [x, yb + H - 0.3, z], 0.022))
    }
    for (const y of [0.32, 0.9, H / 2, H - 0.9, H - 0.32]) out.push(rodItem([x + 0.03, yb + y, -W / 2 + 0.22], [x + 0.03, yb + y, W / 2 - 0.22], 0.028))
    return out
  })
  // laterais estampadas: rasgos de ventilação (sombra) nas duas faces de fora
  const slots = mergedGeo(`aqSlots${W},${H},${D}`, () => {
    const b = geo('aqUnit', () => new THREE.BoxGeometry(1, 1, 1))
    const out = []
    for (const s of [-1, 1])
      for (let i = 0; i < 9; i++) out.push([b, [-0.05, yb + 0.7 + i * ((H - 1.4) / 8), s * (W / 2 + 0.001)], [0, 0, 0], [D * 0.55, 0.07, 0.01]])
    return out
  })
  const metalBody = { color: body, metal: 0.35, rough: 0.38 }
  return (
    <group>
      {/* pés de chapa com as borrachas nas pontas */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <RBox size={[D + 0.6, 0.16, 0.45]} r={0.06} pos={[0, 0.12, s * (W / 2 - 0.5)]} color="#34373b" metal={0.4} rough={0.45} />
          {[-1, 1].map((e) => (
            <RBox key={e} size={[0.3, 0.06, 0.4]} r={0.025} pos={[e * (D / 2 + 0.12), 0.03, s * (W / 2 - 0.5)]} color="#121212" rough={0.9} />
          ))}
          <Box size={[0.3, Y0 - 0.15, 0.3]} pos={[0, 0.2 + (Y0 - 0.2) / 2, s * (W / 2 - 0.5)]} color="#34373b" metal={0.4} rough={0.45} />
        </group>
      ))}
      {/* caixa: refletor de fundo, laterais estampadas, tampa e base boleadas */}
      <Box size={[0.1, H, W]} pos={[-D / 2 + 0.05, yb + H / 2, 0]} color={body} {...metalBody} />
      <Box size={[0.02, H - 0.6, W - 0.5]} pos={[-D / 2 + 0.11, yb + H / 2, 0]} color="#eef1f4" metal={0.95} rough={0.12} />
      {[-1, 1].map((s) => (
        <RBox key={s} size={[D, H, 0.2]} r={0.05} pos={[0, yb + H / 2, s * (W / 2 - 0.1)]} {...metalBody} />
      ))}
      <mesh geometry={slots} material={mat('#26292c', 0, 0.8)} />
      <RBox size={[D + 0.1, 0.3, W + 0.1]} r={0.1} pos={[0, yb + H - 0.15, 0]} {...metalBody} />
      <RBox size={[D + 0.1, 0.3, W + 0.1]} r={0.1} pos={[0, yb + 0.15, 0]} {...metalBody} />
      {/* pega de transporte (alça de plástico no topo, atrás) */}
      <RBox size={[0.3, 0.16, 1.6]} r={0.07} pos={[-D / 2 + 0.3, yb + H + 0.08, -0.6]} color="#26292c" rough={0.5} />
      {/* refletores parabólicos (calhas de alumínio polido) atrás de cada tubo */}
      {TUBES.map((y) => (
        <mesh key={y} position={[-D / 2 + 0.55, yb + y + 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={geo(`aqRefl${W}`, () => new THREE.CylinderGeometry(0.48, 0.48, W - 0.45, 24, 1, true, Math.PI, Math.PI))} material={mat('#f4f6f8', 1, 0.1, { side: THREE.DoubleSide })} />
      ))}
      {/* tubos de quartzo: vidro, espiral por dentro, topos de porcelana e grampos de mola */}
      {TUBES.map((y) => (
        <group key={y} position={[-D / 2 + 0.6, yb + y + 0.05, 0]}>
          <mesh geometry={tubeGeo} material={glow} renderOrder={2} />
          <mesh geometry={coilGeo} material={coil} rotation={[Math.PI / 2, 0, 0]} />
          {[-1, 1].map((s) => (
            <group key={s}>
              <Cyl r={0.17} h={0.24} pos={[0, 0, s * (tl / 2)]} rot={[Math.PI / 2, 0, 0]} color="#f2efe6" rough={0.35} seg={14} />
              <Cyl r={0.19} h={0.05} pos={[0, 0, s * (tl / 2 + 0.1)]} rot={[Math.PI / 2, 0, 0]} color="#b9bec4" metal={0.85} rough={0.3} seg={14} />
              <Box size={[0.08, 0.5, 0.05]} pos={[-0.12, 0, s * (tl / 2 + 0.14)]} color="#b9bec4" metal={0.85} rough={0.3} />
            </group>
          ))}
        </group>
      ))}
      {/* grelha de proteção (arame cromado) */}
      <mesh geometry={grille} material={mat('#d6dadd', 1, 0.25)} castShadow />
      {/* comutador rotativo com a marcação e a lâmpada piloto (acende com a potência) */}
      <group position={[0.15, yb + H, W / 2 - 0.75]}>
        <Cyl r={0.28} h={0.05} pos={[0, 0.025, 0]} color="#1c1e21" rough={0.5} seg={20} />
        <Cyl r={0.2} r2={0.22} h={0.2} pos={[0, 0.14, 0]} color="#1c1e21" rough={0.45} seg={18} />
        <Box size={[0.3, 0.07, 0.06]} pos={[0.03, 0.26, 0]} rot={[0, 0.6, 0]} color="#1c1e21" rough={0.45} />
        <Box size={[0.12, 0.012, 0.025]} pos={[0.11, 0.3, -0.07]} rot={[0, 0.6, 0]} color="#f2f2f2" />
        <SilkText text="0 · I · II · III" pos={[-0.36, 0.006, 0]} w={0.6} d={0.12} rotY={Math.PI / 2} color="#2a2c2f" font="bold 40px Arial" px={[320, 64]} />
      </group>
      <Glow pos={[0.15, yb + H + 0.03, W / 2 - 1.35]} color="#ff7a1a" base="#5a2a12" intensity={3} read={() => Math.min(1, (liveOf(part.id)?.g || 0) * 3)}>
        <sphereGeometry args={[0.07, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </Glow>
      {/* régua de bornes atrás */}
      <Bornes pos={[-D / 2 - 0.25, 0.25, 0]} size={[0.4, 0.3, 1.0]} />
      <Halo pos={[D / 2 + 0.2, yb + H / 2, 0]} size={W * 1.3} color="#ff7a2a" read={() => Math.min(1, (liveOf(part.id)?.g || 0) * 0.8)} />
      <pointLight ref={light} position={[D / 2 + 1.5, yb + H / 2, 0]} color="#ff7a2a" intensity={0} distance={40} decay={2} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  const g = live?.g || 0
  if (g < 0.05) return null
  const [x, y] = info.project([0, 0, 0])
  return <rect x={x - 12} y={y - 32} width={24} height={64} rx={5} fill="#ff7a2a" opacity={Math.min(0.8, 0.2 + g * 0.5)} filter="url(#glow)" pointerEvents="none" />
}

export default { type: 'aquecedor', Model, Overlay2D }
