// Motor brushless 2205/2207 de drone (Ø28 mm) com hélice tripá de 5" (5045). Como os motores
// reais: base de alumínio anodizado, estator de 12 pólos com os enrolamentos de cobre à vista
// entre a base e a campânula, campânula a rodar com a tampa de 5 janelas (vê-se o cobre lá
// dentro) e o anel de ímanes por baixo, veio M5 roscado com porca autoblocante e os 3 fios das
// fases. A hélice roda com live.rpm (velocidade visível limitada, para não "parar" por aliasing)
// e, depressa, vira um disco translúcido. No estúdio (miniatura / imagem 2D) é mais pequena.
import { Box, Cyl, Leg, THREE, geo, mat, mergedGeo, METAL, useFrame, useRef, liveOf } from '../kit.jsx'
import def, { PROP_R, PROP_Y } from '@shared/parts/brushless.js'
import { bladeGeo } from './propeller.jsx'
import { Badge } from './group-c-ui.jsx'

const BELL_R = 1.4
const pin = (id) => def.pins.find((p) => p.id === id).pos
const unit = () => geo('bl:unit', () => new THREE.BoxGeometry(1, 1, 1))

// parede da campânula (tubo com chanfro em cima), de y = 0,5 a 1,78
const bellWallGeo = () =>
  geo('bl:wall', () => {
    const P = [[1.27, 0.5], [1.4, 0.5], [1.4, 1.7], [1.36, 1.78], [1.27, 1.78]]
    return new THREE.LatheGeometry(P.map(([r, y]) => new THREE.Vector2(r, y)), 40)
  })
// tampa da campânula com 5 janelas em arco (extrudida segundo +y)
const bellTopGeo = () =>
  geo('bl:top', () => {
    const s = new THREE.Shape()
    s.absarc(0, 0, 1.36, 0, Math.PI * 2, false)
    for (let k = 0; k < 5; k++) {
      const a0 = (k * 2 * Math.PI) / 5 + 0.18
      const a1 = a0 + (2 * Math.PI) / 5 - 0.36
      const h = new THREE.Path()
      h.absarc(0, 0, 1.12, a0, a1, false)
      h.absarc(0, 0, 0.5, a1, a0, true)
      s.holes.push(h)
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 10 })
    g.rotateX(-Math.PI / 2)
    return g
  })
// enrolamentos de cobre nos 12 dentes do estator
const windingsGeo = () =>
  mergedGeo('bl:wind', () =>
    Array.from({ length: 12 }, (_, k) => {
      const a = (k / 12) * Math.PI * 2
      return [unit(), [Math.cos(a) * 0.92, 0, Math.sin(a) * 0.92], [0, -a, 0], [0.42, 1, 0.3]]
    }),
  )
// rosca do veio (anéis)
const threadGeo = () =>
  mergedGeo('bl:thread', () => Array.from({ length: 6 }, (_, i) => [geo('bl:ring', () => new THREE.TorusGeometry(0.245, 0.018, 4, 16).rotateX(Math.PI / 2)), [0, i * 0.07, 0]]))

// hélice tripá 5045 (planta larga, ponta arredondada)
const triBlade = (R, ccw) =>
  bladeGeo(`bl3:${R},${ccw}`, {
    mirror: ccw,
    r0: 0.4,
    R,
    chord: (t) => (0.75 + 0.75 * Math.sin(Math.min(1, t * 2.5) * Math.PI * 0.5) - 0.55 * t * t) * Math.max(0.35, R / 6.35) * (t > 0.9 ? Math.sqrt(Math.max(0.06, (1 - t) / 0.1)) : 1),
    twist: (t) => 0.75 - 0.5 * t,
    thick: (t) => (0.12 - 0.08 * t) * Math.max(0.5, R / 6.35),
    sweep: (t) => -0.35 * t * t * Math.max(0.35, R / 6.35),
    camber: 0.06,
  })

function Model({ part }) {
  const prop = useRef()
  const bell = useRef()
  const blur = useRef()
  const studio = String(part.id).startsWith('__studio')
  const ccw = part.config?.spin === 'CCW'
  const R = studio ? 1.75 : PROP_R
  const color = ccw ? '#1aa3ff' : '#ff7a1a'
  useFrame((_, dt) => {
    const L = liveOf(part.id)
    const rpm = L?.rpm || 0
    const spin = L?.spin ?? (ccw ? -1 : 1)
    // CW visto de cima = rotação negativa em torno de +y
    const w = (-spin * Math.min(rpm, 700) * 2 * Math.PI) / 60
    if (prop.current) prop.current.rotation.y += w * dt
    if (bell.current) bell.current.rotation.y += w * dt
    if (blur.current) blur.current.opacity = Math.min(0.4, rpm / 9000)
  })
  const propMat = mat(color, 0, 0.35, { transparent: true, opacity: 0.93 })
  return (
    <group>
      {/* base de alumínio anodizado (furos M3 16 × 16 por baixo) com o rebordo chanfrado */}
      <Cyl r={1.36} r2={1.4} h={0.22} pos={[0, 0.11, 0]} color="#26272b" metal={0.75} rough={0.35} seg={40} />
      <Cyl r={1.1} r2={1.36} h={0.1} pos={[0, 0.27, 0]} color="#26272b" metal={0.75} rough={0.35} seg={40} />
      {[0, 1, 2, 3].map((k) => (
        <Box key={k} size={[0.5, 0.02, 0.2]} pos={[Math.cos(k * Math.PI / 2 + Math.PI / 4) * 0.8, 0.325, Math.sin(k * Math.PI / 2 + Math.PI / 4) * 0.8]} rot={[0, -(k * Math.PI / 2 + Math.PI / 4), 0]} color="#0c0c0d" />
      ))}
      {/* estator: núcleo laminado e os 12 enrolamentos de cobre */}
      <Cyl r={0.72} h={1.35} pos={[0, 1.0, 0]} color="#1b1c1f" metal={0.6} rough={0.45} seg={24} />
      <mesh position={[0, 1.02, 0]} scale={[1, 1.3, 1]} geometry={windingsGeo()} material={mat('#b8642a', 1, 0.32)} castShadow />
      {/* campânula (roda): parede, anel de ímanes por dentro, tampa colorida com janelas */}
      <group ref={bell}>
        <mesh geometry={bellWallGeo()} material={mat('#2b2c31', 0.8, 0.3, { side: THREE.DoubleSide })} castShadow />
        <Cyl r={BELL_R + 0.012} h={0.16} pos={[0, 1.6, 0]} color={color} metal={0.7} rough={0.3} seg={40} />
        <mesh position={[0, 1.76, 0]} geometry={bellTopGeo()} material={mat(color, 0.7, 0.32)} castShadow />
        <Cyl r={0.42} h={0.16} pos={[0, 1.94, 0]} color="#2b2c31" metal={0.8} rough={0.3} seg={24} />
        {/* parafusos de fixação da tampa ao veio */}
        {[0, 1, 2].map((k) => (
          <Cyl key={k} r={0.06} h={0.02} pos={[Math.cos((k * 2 * Math.PI) / 3) * 0.3, 2.025, Math.sin((k * 2 * Math.PI) / 3) * 0.3]} color={METAL.nickel} metal={1} rough={0.3} seg={8} />
        ))}
      </group>
      {/* veio M5 roscado (titânio) */}
      <Cyl r={0.24} h={0.75} pos={[0, 2.25, 0]} color="#c8ccd0" metal={1} rough={0.25} seg={16} />
      <mesh position={[0, 1.92, 0]} geometry={threadGeo()} material={mat('#aab0b6', 1, 0.3)} />
      <group position={[0, PROP_Y, 0]}>
        <group ref={prop}>
          {/* cubo da hélice e porca autoblocante (sextavado + cúpula de nylon) */}
          <Cyl r={0.55} h={0.4} color={color} rough={0.38} seg={24} />
          <Cyl r={0.3} h={0.22} pos={[0, 0.31, 0]} color={METAL.nickel} metal={1} rough={0.3} seg={6} />
          <Cyl r={0.26} r2={0.3} h={0.12} pos={[0, 0.47, 0]} color={METAL.nickel} metal={1} rough={0.3} seg={16} />
          {[0, 1, 2].map((k) => (
            <mesh key={k} rotation={[0, (k * 2 * Math.PI) / 3, 0]} geometry={triBlade(R, ccw)} material={propMat} castShadow />
          ))}
        </group>
        <mesh>
          <cylinderGeometry args={[R, R, 0.02, 48]} />
          <meshStandardMaterial ref={blur} color={color} transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      {/* 3 fios das fases (silicone preto) com balas douradas de 3,5 mm */}
      {['A', 'B', 'C'].map((id, i) => (
        <Leg key={id} from={[-1.0, 0.18, (i - 1) * 0.16]} to={[pin(id)[0] + 0.15, pin(id)[1], pin(id)[2]]} r={0.06} color={['#1e1e1e', '#2a2a2a', '#151515'][i]} />
      ))}
      <Cyl r={0.2} h={0.35} pos={[-1.25, 0.2, 0]} rot={[0, 0, Math.PI / 2]} color="#0f0f0f" rough={0.4} seg={12} />
      {['A', 'B', 'C'].map((id) => (
        <Cyl key={`b${id}`} r={0.08} h={0.25} pos={pin(id)} rot={[0, 0, Math.PI / 2]} color={METAL.gold} metal={1} rough={0.25} seg={10} />
      ))}
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  const on = (live.rpm || 0) > 100
  return <Badge info={info} text={on ? `${Math.round(live.rpm / 100) / 10}k rpm · ${String(live.thrustN?.toFixed(1)).replace('.', ',')} N` : 'parado'} color={on ? '#f5f5f5' : '#404040'} />
}

export default { type: 'brushless', Model, Overlay2D }
