// Encapsulamento TO-220 (não é um componente): reguladores e MOSFET de potência.
// Dimensões reais (JEDEC TO-220AB): corpo de epóxi 10 × 9 × ~3,2 mm à frente (+x) com o topo
// chanfrado; aba de cobre niquelado de 1,3 mm atrás, à altura toda, com os entalhes laterais e
// o furo de 3,7 mm para o parafuso M3; 3 pernas retangulares (ombro de 1,3 mm junto ao corpo,
// 0,8 mm em baixo) a 2,54 mm. Dissipador opcional: perfil extrudido de alumínio anodizado preto
// com alhetas, aparafusado à aba.
import { THREE, geo, mat, mergedGeo, METAL, PITCH } from '../kit.jsx'
import { Mark } from './_dip.jsx'

const BODY_Y = [0.45, 1.35] // corpo moldado
const TAB_TOP = 2.0
const XF = 0.225 // face da frente
const XT = [-0.225, -0.095] // aba (de trás para a frente)
const HOLE_Y = 1.72

const unitBox = () => geo('gull', () => new THREE.BoxGeometry(1, 1, 1))

// corpo: perfil lateral (x, y) extrudido ao longo de z, com o chanfro do topo à frente
const bodyGeo = () =>
  geo('to220Body', () => {
    const b = 0.012
    const [y0, y1] = BODY_Y
    const s = new THREE.Shape()
    s.moveTo(XT[1] - 0.005, y0 + b)
    s.lineTo(XF - 0.03, y0 + b)
    s.lineTo(XF - b, y0 + 0.04)
    s.lineTo(XF - b, y1 - 0.12)
    s.lineTo(XF - 0.07, y1 - b)
    s.lineTo(XT[1] - 0.005, y1 - b)
    s.closePath()
    const depth = 1.0 - 2 * b
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 4 })
    g.translate(0, 0, -depth / 2)
    g.computeVertexNormals()
    return g
  })

// aba: contorno (z, y) com entalhes e furo, espessura ao longo de x
const tabGeo = () =>
  geo('to220Tab', () => {
    const s = new THREE.Shape()
    const hw = 0.5
    s.moveTo(-hw, BODY_Y[0])
    s.lineTo(hw, BODY_Y[0])
    s.lineTo(hw, BODY_Y[1] + 0.03)
    s.lineTo(hw - 0.05, BODY_Y[1] + 0.06)
    s.lineTo(hw - 0.05, BODY_Y[1] + 0.13)
    s.lineTo(hw, BODY_Y[1] + 0.16)
    s.lineTo(hw, TAB_TOP - 0.05)
    s.lineTo(hw - 0.05, TAB_TOP)
    s.lineTo(-hw + 0.05, TAB_TOP)
    s.lineTo(-hw, TAB_TOP - 0.05)
    s.lineTo(-hw, BODY_Y[1] + 0.16)
    s.lineTo(-hw + 0.05, BODY_Y[1] + 0.13)
    s.lineTo(-hw + 0.05, BODY_Y[1] + 0.06)
    s.lineTo(-hw, BODY_Y[1] + 0.03)
    s.closePath()
    const hole = new THREE.Path()
    hole.absarc(0, HOLE_Y, 0.185, 0, Math.PI * 2, true)
    s.holes.push(hole)
    const t = XT[1] - XT[0]
    const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 20 })
    // (z local = espessura) → −x; x local → z
    g.rotateY(-Math.PI / 2)
    g.translate(XT[1], 0, 0)
    g.computeVertexNormals()
    return g
  })

// pernas: ombro largo junto ao corpo e troço estreito até ao pino (y = 0)
const legsGeo = () =>
  mergedGeo('to220Legs', () =>
    [PITCH, 0, -PITCH].flatMap((z) => [
      [unitBox(), [0, 0.375, z], [0, 0, 0], [0.05, 0.15, 0.13]],
      [unitBox(), [0, 0.29, z], [0, 0, 0], [0.05, 0.03, 0.1]],
      [unitBox(), [0, 0.14, z], [0, 0, 0], [0.05, 0.28, 0.08]],
    ]),
  )

// dissipador (perfil em pente): base encostada às costas da aba e 6 alhetas para −x
const sinkGeo = () =>
  geo('to220Sink', () => {
    const x0 = XT[0]
    const xb = x0 - 0.12
    const xf = -0.73
    const hw = 0.75
    const t = 0.035
    const fins = [0.715, 0.43, 0.143, -0.143, -0.43, -0.715]
    const s = new THREE.Shape()
    s.moveTo(x0, -hw)
    s.lineTo(x0, hw)
    fins.forEach((zc) => {
      const za = Math.min(hw, zc + t)
      const zb = Math.max(-hw, zc - t)
      s.lineTo(xb, za)
      s.lineTo(xf, za)
      s.lineTo(xf, zb)
      s.lineTo(xb, zb)
    })
    s.lineTo(x0, -hw)
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.9, bevelEnabled: false })
    // (x, z_local=v, e) → (x, e, −v)
    g.rotateX(-Math.PI / 2)
    g.translate(0, 0.3, 0)
    g.computeVertexNormals()
    return g
  })

// parafuso M3 de cabeça redonda com fenda em cruz (pela frente da aba) e porca atrás
const screwGeo = () =>
  mergedGeo('to220Screw', () => [
    [geo('to220ScrewHead', () => new THREE.SphereGeometry(0.27, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 1)), [XT[1], HOLE_Y, 0], [0, 0, -Math.PI / 2]],
    [geo('to220ScrewShank', () => new THREE.CylinderGeometry(0.15, 0.15, 1, 10)), [XT[0] - 0.12, HOLE_Y, 0], [0, 0, Math.PI / 2], [1, 0.3, 1]],
  ])

export function To220({ text, sub, heatsink, code = 'GK347  CHN' }) {
  const lines = [
    { text, font: `bold ${text.length > 7 ? 46 : 54}px Arial`, y: 74 },
    { text: code, font: 'bold 30px Arial', y: 128 },
  ]
  if (sub) lines.push({ text: sub, font: '28px Arial', y: 174 })
  return (
    <group>
      <mesh geometry={legsGeo()} material={mat(METAL.tin, 1, 0.3)} castShadow />
      <mesh geometry={bodyGeo()} material={mat('#141414', 0, 0.6)} castShadow receiveShadow />
      <mesh geometry={tabGeo()} material={mat('#d3d6da', 1, 0.28)} castShadow receiveShadow />
      {/* marca redonda do extrator e marcação a laser na face da frente (pino 1 à esquerda) */}
      <mesh position={[XF + 0.001, BODY_Y[0] + 0.07, 0.4]} rotation={[0, Math.PI / 2, 0]} geometry={geo('to220Eject', () => new THREE.CircleGeometry(0.045, 16))} material={mat('#0d0d0d', 0, 0.3)} />
      <Mark lines={lines} px={[256, 200]} pos={[XF + 0.002, 0.9, -0.02]} rot={[0, Math.PI / 2, 0]} w={0.86} h={0.67} color="#bdbdbd" />
      {heatsink && (
        <group>
          <mesh geometry={sinkGeo()} material={mat('#1d1f23', 0.6, 0.45)} castShadow receiveShadow />
          <mesh geometry={screwGeo()} material={mat(METAL.nickel, 1, 0.3)} castShadow />
          <mesh position={[XT[1] + 0.128, HOLE_Y, 0]} rotation={[0, 0, Math.PI / 2]} geometry={mergedGeo('to220Cross', () => [[unitBox(), [0, 0, 0], [0, 0, 0], [0.24, 0.02, 0.05]], [unitBox(), [0, 0, 0], [0, 0, 0], [0.05, 0.02, 0.24]]])} material={mat('#3a3d42', 1, 0.5)} />
        </group>
      )}
    </group>
  )
}
