// Pé do humanoide (kit de suportes de alumínio de 2 mm): sola de borracha antiderrapante com o
// piso em espinha, chapa de alumínio escovado com a biqueira redonda e furos de aligeiramento,
// aba vertical dobrada com o furo do eixo e os 4 furos do braço do servo do tornozelo, dois
// esquadros triangulares de reforço e parafusos M3 de cabeça boleada.
import { mat, THREE } from '../kit.jsx'
import { FOOT, FOOT_ATTACH } from '@shared/parts/robotFoot.js'
import { extrudeXY, holeCircle, rrect } from './_mdfKit.jsx'
import { bevelPlateXZ, ScrewHeads } from './_matKit.jsx'
import { aluMat } from './_caoKit.jsx'

const { L, W, sole, tabX, tabTop } = FOOT
const RUB = 0.2 // espessura da borracha
const TOE = W / 2 - 0.1 // raio da biqueira
const TOE_X = L / 2 - 0.1

// contorno da sola (x, −z): retângulo atrás e meio disco à frente
function soleShape(inset = 0) {
  const s = new THREE.Shape()
  const r = TOE - inset
  const x0 = -L / 2 + inset
  s.moveTo(x0, -r)
  s.lineTo(TOE_X, -r)
  s.absarc(TOE_X, 0, r, -Math.PI / 2, Math.PI / 2, false)
  s.lineTo(x0, r)
  s.lineTo(x0, -r)
  return s
}

// borracha com o piso em espinha (rasgos em V que deixam ver o fundo escuro)
function rubberShape() {
  const s = soleShape(0)
  for (let i = 0; i < 9; i++) {
    const x = -L / 2 + 0.7 + i * 0.85
    for (const k of [-1, 1]) {
      const h = new THREE.Path()
      const z0 = k * 0.35
      const z1 = k * 1.9
      h.moveTo(x, z0)
      h.lineTo(x + 0.45, z1)
      h.lineTo(x + 0.6, z1)
      h.lineTo(x + 0.15, z0)
      h.lineTo(x, z0)
      s.holes.push(h)
    }
  }
  return s
}

function plateShape() {
  const s = soleShape(0.1)
  for (const x of [-2.6, 1.6]) holeCircle(s, x, 0, 0.55)
  holeCircle(s, TOE_X + 0.6, 0, 0.7)
  return s
}

// aba do tornozelo (plano zy, espessura x): cantos de cima boleados, furo do eixo e os 4 furos
// do braço do servo à volta (raio 5,5 mm)
function tabShape() {
  const yA = FOOT_ATTACH[1]
  const s = rrect(new THREE.Shape(), -1.3, sole - 0.05, 1.3, tabTop + 0.2, 0.6)
  holeCircle(s, 0, yA, 0.32)
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2
    holeCircle(s, 0.55 * Math.cos(a), yA + 0.55 * Math.sin(a), 0.1)
  }
  return s
}

// esquadro triangular (plano xy, espessura z)
function gussetShape() {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.lineTo(1.25, 0)
  s.lineTo(0, 0.9)
  s.lineTo(0, 0)
  return s
}

function RobotFootModel() {
  const alu = aluMat()
  const rubber = bevelPlateXZ('footRubber', RUB, rubberShape, 0.03, 16)
  const plate = bevelPlateXZ('footPlate', sole - RUB, plateShape, 0.03, 16)
  const tab = extrudeXY('footTab', 0.3, tabShape)
  const gusset = extrudeXY('footGusset', 0.2, gussetShape)
  return (
    <group>
      {/* fundo escuro por baixo dos rasgos do piso e a borracha */}
      <mesh geometry={bevelPlateXZ('footBase', 0.04, () => soleShape(0.05), 0.01, 12)} material={mat('#0c0c0c', 0, 0.95)} position={[0, 0.02, 0]} />
      <mesh geometry={rubber} material={mat('#1d1d1d', 0, 0.95)} castShadow receiveShadow />
      {/* chapa de alumínio */}
      <mesh geometry={plate} material={alu} position={[0, RUB, 0]} castShadow receiveShadow />
      <ScrewHeads pts={[[-3.4, sole, -1.6], [-3.4, sole, 1.6], [3.0, sole, -1.6], [3.0, sole, 1.6]]} r={0.2} color="#9aa1a7" metal={0.9} rough={0.3} />
      {/* aba vertical (dobrada da chapa) */}
      <mesh geometry={tab} material={alu} position={[tabX, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow />
      {/* esquadros de reforço */}
      {[-1, 1].map((sz) => (
        <mesh key={sz} geometry={gusset} material={alu} position={[tabX + 0.15, sole, sz * 1.2]} castShadow />
      ))}
    </group>
  )
}

export default { type: 'robotFoot', Model: RobotFootModel }
