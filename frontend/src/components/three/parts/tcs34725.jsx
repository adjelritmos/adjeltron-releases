// TCS34725: placa azul de 20 × 20 mm com os 2 furos metalizados, o sensor TCS34725 (DFN de
// 2 × 2,4 mm com a janela do filtro de IV) ao centro, o LED branco de fósforo ao lado, o
// regulador SOT-23-5, os 2 MOSFET de conversão de nível I2C, os passivos e a serigrafia dos 7 pinos.
import { RBox, HeaderPins, Glow, liveOf, geo, mat, THREE } from '../kit.jsx'
import def from '@shared/parts/tcs34725.js'
import { ShapedPcb, Art, SmdField, SmdLed, Sot23 } from './mq2.jsx'

const T = 0.12
const HOLES = [
  [-0.75, -0.75, 0.15],
  [0.75, -0.75, 0.15],
]

function draw(p) {
  for (const [x, z] of HOLES) p.ring(x, z, 0.15, 0.27, '#d6b25a')
  for (const pin of def.pins) p.text(pin.id, pin.pos[0], 0.5, 0.1, { rot: -Math.PI / 2 })
  p.text('TCS34725', 0, -0.85, 0.12)
  p.rect(0, -0.2, 0.36, 0.32, { lw: 0.012 })
  p.rect(0.4, -0.2, 0.44, 0.38, { lw: 0.012 })
  p.text('LED', 0.4, -0.48, 0.08)
}

function Model({ part }) {
  return (
    <group>
      <ShapedPcb id="tcs34725" w={2.0} d={2.0} t={T} r={0.08} holes={HOLES} color="#1f4fb4" />
      <Art id="tcs34725" w={2.0} d={2.0} pos={[0, T + 0.0015, 0]} draw={draw} />
      {/* sensor: corpo escuro com a janela de vidro do filtro */}
      <RBox size={[0.24, 0.065, 0.2]} r={0.01} pos={[0, T + 0.0325, -0.2]} color="#2b1f12" rough={0.35} />
      <mesh position={[0, T + 0.066, -0.2]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('plane1', () => new THREE.PlaneGeometry(1, 1))} scale={[0.12, 0.1, 1]} material={mat('#6f8fb8', 0.4, 0.12)} />
      {/* LED branco (caixa branca, fósforo amarelo que acende) */}
      <RBox size={[0.35, 0.12, 0.28]} r={0.02} pos={[0.4, T + 0.06, -0.2]} color="#f4f4f0" rough={0.45} />
      <Glow pos={[0.4, T + 0.122, -0.2]} color="#fffbe6" base="#e3c95e" read={() => (liveOf(part.id)?.led ? 1 : 0)} halo={0.7}>
        <cylinderGeometry args={[0.1, 0.1, 0.006, 16]} />
      </Glow>
      <Sot23 pos={[-0.55, T, 0.05]} n={5} />
      <Sot23 pos={[-0.12, T, 0.15]} />
      <Sot23 pos={[0.32, T, 0.15]} />
      <SmdLed pos={[-0.6, T, -0.45]} size={[0.16, 0.07, 0.08]} color="#ff3030" read={() => (liveOf(part.id)?.powered ? 1 : 0)} halo={0.5} />
      <SmdField
        id="tcs34725"
        y={T}
        items={[
          [-0.55, -0.25, 0, 'c'],
          [-0.82, 0.05, Math.PI / 2, 'c'],
          [0.72, 0.1, Math.PI / 2],
          [0.86, 0.1, Math.PI / 2],
          [0, -0.52, 0],
          [-0.3, -0.52, 0, 'c'],
        ]}
      />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

function Overlay2D({ part, info, input }) {
  const c = ['r', 'g', 'b'].map((k) => Math.round(input?.[k] ?? part.config?.[k] ?? 0))
  const [x, y] = info.project([0, 0, -0.2])
  return <circle cx={x} cy={y} r={9} fill={`rgb(${c.join(',')})`} stroke="#fff" strokeWidth={1.2} opacity={0.85} pointerEvents="none" />
}

export default { type: def.type, Model, Overlay2D }
