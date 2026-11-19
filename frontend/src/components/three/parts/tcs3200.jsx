// TCS3200 (GY-31): placa preta de 28 × 28 mm com o TCS3200 em SOIC-8 de epóxi transparente (vê-se
// a matriz 8 × 8 de fotodíodos com os filtros R/G/B/claro), os 4 LEDs brancos 5050 de fósforo
// amarelo à volta, o anel branco que tapa a luz direta, passivos, furos e a serigrafia dos pinos;
// o 2D mostra a cor do objeto e o filtro ativo.
import { RBox, HeaderPins, Glow, liveOf, geo, mat, mergedGeo, METAL, THREE } from '../kit.jsx'
import def from '@shared/parts/tcs3200.js'
import { ShapedPcb, Art, SmdField } from './mq2.jsx'

const T = 0.16
const C = [0.2, 0] // centro do sensor (x, z)
const HOLES = [
  [1.2, -1.2, 0.12],
  [1.2, 1.2, 0.12],
]
const LEDS = [
  [-0.5, -0.72],
  [-0.5, 0.72],
  [0.9, -0.72],
  [0.9, 0.72],
]
const unit = () => geo('sb:unitBox', () => new THREE.BoxGeometry(1, 1, 1))

// matriz de fotodíodos (8 × 8, filtros em xadrez) vista pelo epóxi
function dieMat() {
  return geo('tcs3200:die', () => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const x = c.getContext('2d')
    x.fillStyle = '#5a5a52'
    x.fillRect(0, 0, 64, 64)
    const cols = ['#c0392b', '#27ae60', '#2e5fc9', '#d9d9d0']
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      x.fillStyle = cols[(i + 2 * j) % 4]
      x.fillRect(4 + i * 7, 4 + j * 7, 6, 6)
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.3, metalness: 0.2 })
  })
}
// pernas em asa de gaivota do SOIC-8 (corpo 5 × 4 mm, pernas nos lados ±z)
const legsGeo = () =>
  mergedGeo('tcs3200:legs', () =>
    [-1, 1].flatMap((s) =>
      [-0.19, -0.064, 0.064, 0.19].flatMap((x) => [
        [unit(), [x, 0.085, s * 0.23], [0, 0, 0], [0.04, 0.018, 0.07]],
        [unit(), [x, 0.045, s * 0.27], [0, 0, 0], [0.04, 0.08, 0.018]],
        [unit(), [x, 0.009, s * 0.3], [0, 0, 0], [0.04, 0.018, 0.07]],
      ]),
    ),
  )
// anel de plástico branco (tubo curto) que rodeia o sensor
const ringGeo = () =>
  geo('tcs3200:ring', () => new THREE.LatheGeometry([[0.54, 0], [0.62, 0], [0.62, 0.55], [0.6, 0.57], [0.56, 0.57], [0.54, 0.55]].map(([r, y]) => new THREE.Vector2(r, y)), 40))

function draw(p) {
  for (const [x, z] of HOLES) p.ring(x, z, 0.12, 0.2)
  for (const pin of def.pins) p.text(pin.id, -0.96, pin.pos[2], 0.1)
  for (const [x, z] of LEDS) p.rect(x, z, 0.58, 0.58, { lw: 0.012 })
  p.circle(C[0], C[1], 0.7, { lw: 0.014 })
  p.text('GY-31', 1.22, 0, 0.13, { rot: -Math.PI / 2 })
  p.text('TCS3200', 0.2, 1.22, 0.1)
}

function Model({ part }) {
  const on = () => (liveOf(part.id)?.powered ? 1 : 0)
  return (
    <group>
      <ShapedPcb id="tcs3200" w={2.8} d={2.8} t={T} r={0.1} holes={HOLES} color="#141414" />
      <Art id="tcs3200" w={2.8} d={2.8} pos={[0, T + 0.0015, 0]} draw={draw} />
      {/* TCS3200: SOIC-8 de epóxi transparente com a matriz à vista */}
      <group position={[C[0], T, C[1]]}>
        <mesh geometry={legsGeo()} material={mat(METAL.tin, 1, 0.3)} />
        <mesh position={[0, 0.06, 0]} geometry={unit()} scale={[0.22, 0.02, 0.22]} material={dieMat()} />
        <mesh position={[0, 0.09, 0]} geometry={unit()} scale={[0.5, 0.15, 0.4]} material={mat('#efe6b0', 0, 0.1, { transparent: true, opacity: 0.5, depthWrite: false })} />
      </group>
      <mesh position={[C[0], T, C[1]]} geometry={ringGeo()} material={mat('#efefea', 0, 0.5)} castShadow />
      {/* LEDs brancos 5050: caixa branca e janela de fósforo que acende */}
      {LEDS.map(([x, z], i) => (
        <group key={i} position={[x, T, z]}>
          <RBox size={[0.5, 0.14, 0.5]} r={0.02} pos={[0, 0.07, 0]} color="#f4f4f0" rough={0.45} />
          <Glow pos={[0, 0.142, 0]} color="#fffbe6" base="#e6cf6a" read={on} halo={0.8}>
            <cylinderGeometry args={[0.19, 0.19, 0.01, 20]} />
          </Glow>
        </group>
      ))}
      <SmdField
        id="tcs3200"
        y={T}
        items={[
          [-0.5, 0, Math.PI / 2],
          [0.95, 0, Math.PI / 2],
          [0.2, -0.95, 0],
          [0.2, 0.95, 0],
          [-0.05, -1.15, 0, 'c'],
          [0.45, 1.0, 0, 'c'],
        ]}
      />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

function Overlay2D({ part, info, live, input }) {
  const c = ['r', 'g', 'b'].map((k) => Math.round(input?.[k] ?? part.config?.[k] ?? 0))
  const [x, y] = info.project([0.2, 0, 0])
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r={14} fill={`rgb(${c.join(',')})`} stroke="#fff" strokeWidth={1.5} opacity={0.9} />
      {live?.powered && live.filter && (
        <text x={x} y={y + 30} textAnchor="middle" fontSize={10} fontWeight="700" fill="#fff" fontFamily="monospace">
          {live.filter} {live.hz > 999 ? `${(live.hz / 1000).toFixed(1)} kHz` : `${live.hz} Hz`}
        </text>
      )}
    </g>
  )
}

export default { type: 'tcs3200', Model, Overlay2D }
