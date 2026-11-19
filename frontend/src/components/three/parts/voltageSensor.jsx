// Sensor de tensão 0–25 V: placa vermelha de 27 × 14 mm com o furo de fixação, as 2 resistências
// SMD 1206 do divisor (30 kΩ "303" + 7,5 kΩ "752"), o borne azul KF301 de 2 vias (5 mm) com os
// parafusos e as bocas dos fios, os 3 pinos e a serigrafia real (VCC/GND, S + −).
import { RBox, Cyl, HeaderPins, SilkText, geo, mat, mergedGeo, METAL, THREE } from '../kit.jsx'
import def from '@shared/parts/voltageSensor.js'
import { ShapedPcb, Art, SmdField } from './mq2.jsx'

const T = 0.16
const BX = 0.025 // centro da placa (x)
const HOLE = [-0.5 - BX, 0, 0.16] // relativo ao centro da placa
const TX = 0.85 // borne (x)
const unit = () => geo('sb:unitBox', () => new THREE.BoxGeometry(1, 1, 1))

// borne de parafuso KF301 de 2 vias (passo 5 mm), bocas viradas para +x à altura dos pinos
function Terminal() {
  const zs = [-0.25, 0.25]
  return (
    <group position={[TX, T, 0]}>
      <RBox size={[0.75, 0.62, 1.0]} r={0.03} pos={[0, 0.31, 0]} color="#1f6fd1" rough={0.5} />
      {/* parte de cima mais estreita (lado dos parafusos) com a separação entre vias */}
      <RBox size={[0.6, 0.24, 1.0]} r={0.03} pos={[-0.075, 0.72, 0]} color="#1f6fd1" rough={0.5} />
      <mesh geometry={mergedGeo('vs:ribs', () => [[unit(), [-0.075, 0.6, 0], [0, 0, 0], [0.62, 0.5, 0.04]]])} material={mat('#1a5fb4', 0, 0.55)} />
      {zs.map((z) => (
        <group key={z}>
          {/* poço do parafuso e cabeça com fenda */}
          <Cyl r={0.17} h={0.01} pos={[-0.1, 0.838, z]} color="#0d2a52" rough={0.8} seg={18} />
          <Cyl r={0.145} h={0.05} pos={[-0.1, 0.821, z]} color={METAL.nickel} metal={1} rough={0.3} seg={18} />
          <mesh position={[-0.1, 0.847, z]} geometry={unit()} scale={[0.04, 0.008, 0.24]} material={mat('#3a3d40', 0.6, 0.5)} />
          {/* boca do fio */}
          <mesh position={[0.376, 0.59, z]} rotation={[0, Math.PI / 2, 0]} geometry={geo('plane1', () => new THREE.PlaneGeometry(1, 1))} scale={[0.3, 0.3, 1]} material={mat('#06090f', 0, 0.9)} />
        </group>
      ))}
    </group>
  )
}

function draw(p) {
  p.ring(HOLE[0], HOLE[1], 0.16, 0.27)
  const lx = -1.15 - BX + 0.24
  for (const [i, n] of ['S', '+', '−'].entries()) p.text(n, lx, def.pins[i].pos[2], 0.12)
  p.text('VCC', 0.3 - BX, -0.25, 0.09)
  p.text('GND', 0.3 - BX, 0.25, 0.09)
  p.rect(-0.05 - BX, -0.3, 0.42, 0.24, { lw: 0.01 })
  p.rect(-0.05 - BX, 0.3, 0.42, 0.24, { lw: 0.01 })
  p.text('R1', -0.05 - BX, -0.52, 0.08)
  p.text('R2', -0.05 - BX, 0.52, 0.08)
  // pistas: borne → R1 → S, R2 → GND
  const tr = { lw: 0.05, stroke: '#d8453f' }
  p.line([[TX - BX, -0.25], [0.2 - BX, -0.3]], tr)
  p.line([[-0.3 - BX, -0.3], [-0.85 - BX, -0.254]], tr)
  p.line([[TX - BX, 0.25], [0.2 - BX, 0.3]], tr)
}

function Model() {
  return (
    <group>
      <ShapedPcb id="voltS" pos={[BX, 0, 0]} w={2.7} d={1.4} t={T} r={0.08} holes={[HOLE]} color="#c62828" />
      <Art id="voltS" w={2.7} d={1.4} pos={[BX, T + 0.0015, 0]} draw={draw} />
      <SmdField
        id="voltS"
        y={T}
        items={[
          [-0.05, -0.3, 0, 'L'],
          [-0.05, 0.3, 0, 'L'],
        ]}
      />
      <SilkText text="303" pos={[-0.05, T + 0.056, -0.3]} w={0.2} d={0.1} font="bold 44px Arial" />
      <SilkText text="752" pos={[-0.05, T + 0.056, 0.3]} w={0.2} d={0.1} font="bold 44px Arial" />
      <Terminal />
      <HeaderPins pins={def.pins.filter((p) => !p.conn)} base={0} up={0.45} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (live?.vin == null) return null
  const [x, y] = info.project([-0.1, 0, 0])
  return (
    <text x={x} y={y + 4} textAnchor="middle" fontSize={10} fontWeight="700" fill="#fff" fontFamily="monospace" pointerEvents="none">
      {live.vin.toFixed(1)} V
    </text>
  )
}

export default { type: 'voltageSensor', Model, Overlay2D }
