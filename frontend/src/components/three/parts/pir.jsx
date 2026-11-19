// PIR HC-SR501: placa verde de 32 × 24 mm com a lente de Fresnel branca leitosa (flange quadrada
// de 24 mm encaixada por patilhas, cúpula Ø 23 mm facetada em anéis e gomos). A cúpula ganha um
// tom quente com OUT = HIGH.
import { RBox, HeaderPins, liveOf, useFrame, useRef, geo, THREE } from '../kit.jsx'
import def from '@shared/parts/pir.js'
import { ShapedPcb, Art } from './mq2.jsx'

const T = 0.16
const LX = 0.15 // centro da lente (x)

// perfil da cúpula (raio, altura): os segmentos facetados imitam as zonas da lente de Fresnel
const domeGeo = () =>
  geo('pir:dome', () =>
    new THREE.LatheGeometry(
      [[1.15, 0], [1.15, 0.12], [1.13, 0.32], [1.05, 0.56], [0.92, 0.78], [0.74, 0.95], [0.5, 1.07], [0.24, 1.13], [0, 1.15]].map(([r, y]) => new THREE.Vector2(r, y)),
      18,
    ),
  )

function draw(p) {
  for (const [i, n] of ['VCC', 'OUT', 'GND'].entries()) p.text(n, -1.13, def.pins[i].pos[2], 0.1, { rot: -Math.PI / 2 })
  // marcas das patilhas da lente
  for (const sz of [-1, 1]) p.rect(LX, sz * 1.12, 0.5, 0.08, { lw: 0.012 })
}

function Model({ part }) {
  const dome = useRef()
  useFrame(() => {
    if (dome.current) dome.current.emissiveIntensity = liveOf(part.id)?.out ? 0.35 : 0
  })
  return (
    <group>
      <ShapedPcb id="pir" w={3.2} d={2.4} t={T} r={0.08} color="#1f6f2a" />
      <Art id="pir" w={3.2} d={2.4} pos={[0, T + 0.0015, 0]} draw={draw} />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
      {/* flange quadrada da lente e as patilhas de encaixe nas arestas */}
      <RBox size={[2.35, 0.14, 2.35]} r={0.05} pos={[LX, T + 0.07, 0]} color="#f2f1ea" rough={0.55} />
      {[-1, 1].map((s) => (
        <RBox key={s} size={[0.45, 0.32, 0.06]} r={0.02} pos={[LX, T, s * 1.2]} color="#f2f1ea" rough={0.55} />
      ))}
      <mesh position={[LX, T + 0.14, 0]} geometry={domeGeo()} castShadow>
        <meshStandardMaterial ref={dome} color="#f6f5ef" emissive="#ff8a65" emissiveIntensity={0} roughness={0.42} flatShading transparent opacity={0.96} />
      </mesh>
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered) return null
  const [x, y] = info.project([0.15, 0, 0])
  const r = info.project([1.3, 0, 0])[0] - x
  return (
    <g pointerEvents="none">
      {live.out && <circle cx={x} cy={y} r={r} fill="#ff7043" opacity={0.35} filter="url(#glow)" />}
      <text x={x} y={y + r + 12} textAnchor="middle" fontSize={10} fill={live.out ? '#ffab91' : '#9ca3af'} fontFamily="monospace">
        {!live.ready ? 'a arrancar…' : live.out ? 'OUT HIGH' : 'OUT LOW'}
      </text>
    </g>
  )
}

export default { type: 'pir', Model, Overlay2D }
