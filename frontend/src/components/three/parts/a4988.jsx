// Placa A4988 (formato Pololu, 20,3 × 15,2 mm, verde): chip A4988 (QFN-28) por baixo do dissipador
// de alumínio colado (9 × 9 mm, alhetas), trimpot SMD de limitação de corrente com o rotor metálico
// em cruz, as duas resistências de sensor de corrente (R100), condensadores 1206 e passivos, nomes
// dos pinos na serigrafia e 2 filas de 8 pinos soldados por baixo (espaçador preto).
import { useCanvasTexture, mat, mergedGeo, geo, THREE } from '../kit.jsx'
import { PcbPlate, PlatedHoles, PinBlocks, PinField, Smds, MarkText } from './_boardKit.jsx'
import def from '@shared/parts/a4988.js'

const PCB_Y = 0.35
const T = 0.16
const TOP = PCB_Y + T
const W = 2.03
const D = 1.52
const PX = 200
const HOLES = def.pins.map((p) => [p.pos[0], p.pos[2]])
const HS = { x: 0.25, z: 0, s: 0.9, bh: 0.12, fh: 0.42, n: 6 }
const SMDS = [
  [-0.55, 0.32, 0, 'K'], [-0.3, 0.35, 1, 'K'], [0.85, 0.35, 1, 'C'], [0.85, -0.35, 1, 'C'],
  [-0.3, -0.3, 1, 'c'], [-0.85, -0.3, 1, 'r'], [-0.85, 0.05, 1, 'r'], [-0.3, 0.05, 1, 'c'],
]
// dissipador: base + alhetas numa só malha
const heatsinkGeo = () =>
  mergedGeo('a4988Hs', () => {
    const b = geo('gull', () => new THREE.BoxGeometry(1, 1, 1))
    const out = [[b, [0, HS.bh / 2, 0], [0, 0, 0], [HS.s, HS.bh, HS.s]]]
    for (let i = 0; i < HS.n; i++) out.push([b, [0, HS.bh + HS.fh / 2, (i - (HS.n - 1) / 2) * ((HS.s - 0.08) / (HS.n - 1))], [0, 0, 0], [HS.s, HS.fh, 0.07]])
    return out
  })

function Model() {
  const silk = useCanvasTexture(
    (ctx) => {
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 15px Arial'
      for (const p of def.pins) {
        const x = (p.pos[0] + W / 2) * PX
        const z = (p.pos[2] + D / 2) * PX
        ctx.save()
        ctx.translate(x, z + (p.pos[2] > 0 ? -30 : 30))
        ctx.rotate(-Math.PI / 2)
        ctx.fillText(p.id.split('.')[0], 0, 0)
        ctx.restore()
      }
    },
    ['a4988-silk'],
    Math.round(W * PX),
    Math.round(D * PX),
  )
  return (
    <group>
      {/* pinos (das posições do catálogo até à solda por cima) e espaçadores de plástico */}
      <PinField id="a4988" pts={HOLES.map(([x, z]) => [x, TOP + 0.08, z])} y0={0} />
      <PinBlocks id="a4988" pts={HOLES} y={PCB_Y - 0.25} />
      <PcbPlate id="a4988" w={W} d={D} t={T} y={PCB_Y} r={0.04} color="#1d7a3a" />
      <mesh position={[0, TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshBasicMaterial map={silk} transparent />
      </mesh>
      <PlatedHoles id="a4988" pts={HOLES} y={TOP} r={0.08} solder={false} square={1} />
      {/* dissipador de alumínio com alhetas sobre o chip (fita térmica cinzenta por baixo) */}
      <mesh position={[HS.x, TOP + 0.005, HS.z]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('plane1', () => new THREE.PlaneGeometry(1, 1))} scale={[HS.s, HS.s, 1]} material={mat('#8d9196', 0, 0.8)} />
      <mesh position={[HS.x, TOP + 0.01, HS.z]} castShadow geometry={heatsinkGeo()} material={mat('#c9cdd2', 1, 0.42)} />
      {/* trimpot SMD de limitação de corrente: base cerâmica e rotor metálico com fenda em cruz */}
      <group position={[-0.6, TOP, -0.15]}>
        <mesh position={[0, 0.04, 0]} geometry={geo('a4988TpB', () => new THREE.BoxGeometry(0.32, 0.08, 0.3))} material={mat('#efe9dc', 0, 0.6)} />
        <mesh position={[0, 0.1, 0]} geometry={geo('a4988TpR', () => new THREE.CylinderGeometry(0.12, 0.12, 0.05, 18))} material={mat('#c9cdd2', 1, 0.3)} />
        <mesh position={[0, 0.126, 0]} rotation={[0, Math.PI / 4, 0]} geometry={mergedGeo('a4988TpX', () => [[geo('gull', () => new THREE.BoxGeometry(1, 1, 1)), [0, 0, 0], [0, 0, 0], [0.2, 0.01, 0.035]], [geo('gull', () => new THREE.BoxGeometry(1, 1, 1)), [0, 0, 0], [0, 0, 0], [0.035, 0.01, 0.2]]])} material={mat('#3a3d40', 0.5, 0.6)} />
      </group>
      {/* resistências de sensor de corrente (R100) e passivos */}
      <Smds id="a4988" y={TOP} items={SMDS} />
      <MarkText lines={[{ text: 'R100', font: 'bold 70px Arial' }]} px={[256, 96]} pos={[0.85, TOP + 0.101, 0.35]} w={0.12} d={0.06} rotY={Math.PI / 2} color="#e8e8e8" />
      <MarkText lines={[{ text: 'R100', font: 'bold 70px Arial' }]} px={[256, 96]} pos={[0.85, TOP + 0.101, -0.35]} w={0.12} d={0.06} rotY={Math.PI / 2} color="#e8e8e8" />
    </group>
  )
}

export default { type: 'a4988', Model }
