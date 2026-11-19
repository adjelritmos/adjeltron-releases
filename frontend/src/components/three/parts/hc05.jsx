// HC-05 (base ZS-040): placa base azul de 44 × 16 mm com a placa Bluetooth verde acastelada
// (27 × 13 × 0,8 mm: CSR BC417, flash de 8 Mbit, cristal de 26 MHz e antena impressa em
// ziguezague na ponta), regulador de 3,3 V, LED de estado, botão EN (KEY) e 6 pinos.
import { HeaderPins, useCanvasTexture, GlowLed, liveOf, TactSwitch, Chip, mergedGeo, geo, mat, METAL, THREE } from '../kit.jsx'
import { PcbPlate, Smds, Sot23, SmdCrystal, MarkText } from './_boardKit.jsx'
import def from '@shared/parts/hc05.js'
import { Glow2D } from './group-c-ui.jsx'

const L = 4.4
const D = 1.6
const T = 0.16
const TOP = T
const PX = 120
const LED = [-1.2, TOP + 0.04, 0.55]
const BT = { x: 0.75, l: 2.7, d: 1.3, t: 0.08 }
// almofadas acasteladas (13 de cada lado + 8 na ponta de trás) soldadas à placa base
const castGeo = () =>
  mergedGeo('hc05-cast', () => {
    const b = geo('gull', () => new THREE.BoxGeometry(1, 1, 1))
    const out = []
    for (let i = 0; i < 13; i++)
      for (const s of [-1, 1]) {
        const x = BT.x - BT.l / 2 + 0.2 + i * 0.15
        out.push([b, [x, TOP + BT.t / 2, s * (BT.d / 2 + 0.003)], [0, 0, 0], [0.08, BT.t + 0.01, 0.01]])
        out.push([b, [x, TOP + 0.006, s * (BT.d / 2 + 0.04)], [0, 0, 0], [0.09, 0.012, 0.08]])
      }
    return out
  })
const SMDS = [[-1.55, -0.45, 1, 'c'], [-1.55, 0.05, 1, 'C'], [-1.2, 0.3, 0, 'r'], [-0.85, -0.55, 1, 'r'], [-1.72, 0.5, 1, 'r']]
const BT_SMDS = [[0.25, 0.45, 0, 'c'], [0.25, -0.45, 0, 'c'], [1.35, 0.45, 1, 'c'], [-0.4, 0.4, 1, 'r'], [-0.4, -0.4, 1, 'r'], [1.45, -0.35, 1, 'c']]

function Model({ part }) {
  const silk = useCanvasTexture(
    (ctx) => {
      const at = (x, z) => [(x + L / 2) * PX, (z + D / 2) * PX]
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 11px Arial'
      for (const p of def.pins) {
        const [x, y] = at(p.pos[0] + 0.18, p.pos[2])
        ctx.fillText(p.id, x, y)
      }
    },
    ['hc05'],
    Math.round(L * PX),
    Math.round(D * PX),
  )
  const bt = useCanvasTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#1d7a3a'
      ctx.fillRect(0, 0, w, h)
      // antena impressa (ziguezague dourado) na ponta direita
      ctx.strokeStyle = '#d4af37'
      ctx.lineWidth = 5
      ctx.beginPath()
      const x0 = w * 0.78
      for (let i = 0; i < 7; i++) {
        const y = 12 + (i * (h - 24)) / 6
        ctx.lineTo(i % 2 ? w - 10 : x0, y)
        ctx.lineTo(i % 2 ? x0 : w - 10, y)
      }
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 22px Arial'
      ctx.fillText('HC-05', 300, h - 26)
    },
    ['hc05-bt-2'],
    512,
    246,
  )
  return (
    <group>
      <PcbPlate id="hc05" w={L} d={D} t={T} y={0} r={0.06} color="#1f4fb5" />
      <mesh position={[0, TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[L, D]} />
        <meshBasicMaterial map={silk} transparent />
      </mesh>
      {/* placa Bluetooth acastelada: BC417, flash, cristal de 26 MHz e passivos */}
      <group position={[BT.x, 0, 0]}>
        <PcbPlate id="hc05-bt" w={BT.l} d={BT.d} t={BT.t} y={TOP} r={0.02} color="#1d7a3a" />
      </group>
      <mesh position={[BT.x, TOP + BT.t + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BT.l, BT.d]} />
        <meshBasicMaterial map={bt} />
      </mesh>
      <mesh geometry={castGeo()} material={mat(METAL.tin, 1, 0.28)} />
      <group position={[0, BT.t, 0]}>
        <Chip pos={[0.2, TOP, 0]} size={[0.62, 0.1, 0.62]} pkg="qfn" n={10} />
        <MarkText lines={[{ text: 'CSR', font: 'bold 60px Arial', y: 44 }, { text: 'BC417', font: 'bold 52px Arial', y: 98 }]} px={[256, 128]} pos={[0.2, TOP + 0.102, 0]} w={0.5} d={0.25} />
        <Chip pos={[0.95, TOP, 0.12]} size={[0.5, 0.1, 0.42]} n={6} label="EN29LV" />
        <SmdCrystal pos={[0.95, TOP, -0.38]} l={0.32} w={0.25} label="26.000" />
        <Smds id="hc05-bt" y={TOP} items={BT_SMDS} />
      </group>
      {/* regulador de 3,3 V (SOT-23-5), passivos e botão EN (KEY) */}
      <Sot23 pos={[-1.15, TOP, -0.4]} n={5} label="662K" />
      <Smds id="hc05" y={TOP} items={SMDS} />
      <TactSwitch pos={[-0.85, TOP, 0.45]} size={0.3} round={false} cap="#1d1d1d" />
      <GlowLed pos={LED} color="#ff3030" read={() => (liveOf(part.id)?.led ? 1 : 0)} />
      <HeaderPins pins={def.pins} base={TOP} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  return <Glow2D info={info} pos={LED} color="#ff3030" on={!!live?.led} r={4} />
}

export default { type: 'hc05', Model, Overlay2D }
