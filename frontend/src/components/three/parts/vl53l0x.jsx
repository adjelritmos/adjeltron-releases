// GY-VL53L0XV2: placa roxa de 25 × 10,7 mm com os 2 furos metalizados nas pontas, o módulo
// VL53L0X (4,4 × 2,4 × 1 mm, preto, com as janelas de vidro do laser VCSEL e do recetor SPAD),
// o regulador 662K, os passivos, o LED de alimentação e a serigrafia; no 2D, a distância medida.
import { RBox, HeaderPins, liveOf, geo, mat, THREE } from '../kit.jsx'
import def from '@shared/parts/vl53l0x.js'
import { ShapedPcb, Art, SmdField, SmdLed, Sot23 } from './mq2.jsx'

const T = 0.12
const HOLES = [
  [-1.0, -0.2, 0.11],
  [1.0, -0.2, 0.11],
]
const S = [0, -0.18] // módulo do sensor

function draw(p) {
  for (const [x, z] of HOLES) p.ring(x, z, 0.11, 0.2, '#d6b25a')
  p.text('VL53L0X', 0.52, -0.44, 0.08)
  p.text('GY-VL53L0XV2', -0.48, -0.44, 0.07)
  p.rect(S[0], S[1], 0.54, 0.34, { lw: 0.01 })
}

function Model({ part }) {
  return (
    <group>
      <ShapedPcb id="vl53" w={2.5} d={1.07} t={T} r={0.06} holes={HOLES} color="#5e2b97" />
      <Art id="vl53" w={2.5} d={1.07} pos={[0, T + 0.0015, 0]} draw={draw} />
      {/* módulo VL53L0X: corpo preto e as duas janelas (emissor e recetor) */}
      <RBox size={[0.44, 0.1, 0.24]} r={0.012} pos={[S[0], T + 0.05, S[1]]} color="#141414" rough={0.35} />
      {[
        [-0.1, '#4a2f6e'],
        [0.1, '#1d2430'],
      ].map(([dx, c]) => (
        <mesh key={dx} position={[S[0] + dx, T + 0.1005, S[1]]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('vl53:win', () => new THREE.CircleGeometry(0.045, 16))} material={mat(c, 0.3, 0.08)} />
      ))}
      <Sot23 pos={[-0.62, T, -0.15]} />
      <SmdLed pos={[0.62, T, -0.15]} size={[0.16, 0.07, 0.08]} color="#ff3030" read={() => (liveOf(part.id)?.powered ? 1 : 0)} halo={0.5} />
      <SmdField
        id="vl53"
        y={T}
        items={[
          [-0.38, -0.12, Math.PI / 2, 'c'],
          [0.38, -0.12, Math.PI / 2],
          [0.88, 0.1, Math.PI / 2],
          [-0.88, 0.1, Math.PI / 2, 'c'],
          [0.62, 0.05, 0],
          [-0.62, 0.08, 0, 'c'],
        ]}
      />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered) return null
  const [x, y] = info.project([0, 0, -0.45])
  const mm = live.mm ?? 0
  return (
    <text x={x} y={y + 2} textAnchor="middle" fontSize={9} fontWeight="700" fill="#fff" fontFamily="monospace" pointerEvents="none">
      {mm > 2000 ? 'fora' : `${Math.round(mm)} mm`}
    </text>
  )
}

export default { type: def.type, Model, Overlay2D }
