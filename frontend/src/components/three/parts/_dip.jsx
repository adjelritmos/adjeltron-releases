// Circuito integrado DIP genérico (não é um componente) e utilitários de encapsulamentos
// partilhados pelos discretos (fios em polilinha, marcação impressa em qualquer face).
// DIP real (JEDEC MS-001): corpo de epóxi com 6,35 mm de largura e ~3,3 mm de altura, com
// saída de molde (faces ligeiramente inclinadas) e linha de partição a meio; entalhe em meia-lua
// e covinha do pino 1 à esquerda (−x); marcas redondas e polidas dos extratores; pernas em
// "ombro" largo (1,5 mm) que saem do corpo e descem a 7,62 mm, afinando para 0,46 mm.
import { THREE, geo, mat, mergedGeo, silkMat, METAL } from '../kit.jsx'

const Y0 = 0.12 // o corpo fica ~1,2 mm acima da breadboard
const H = 0.33

// ---------- utilitários partilhados ----------
const unitBox = () => geo('gull', () => new THREE.BoxGeometry(1, 1, 1))
const wireUnit = () => geo('wireUnit8', () => new THREE.CylinderGeometry(1, 1, 1, 8))
const wireJoint = () => geo('wireJoint', () => new THREE.SphereGeometry(1, 8, 6))
const _a = new THREE.Vector3()
const _b = new THREE.Vector3()
const _qq = new THREE.Quaternion()
const _ee = new THREE.Euler()
const _upY = new THREE.Vector3(0, 1, 0)
// itens de mergedGeo de um fio redondo ao longo de uma polilinha (pernas dobradas), com uma
// esfera em cada dobra para não haver frestas
export function wireItems(points, r = 0.025) {
  const out = []
  for (let i = 0; i < points.length - 1; i++) {
    _a.set(...points[i])
    _b.set(...points[i + 1])
    const d = _b.clone().sub(_a)
    const L = d.length()
    if (L < 1e-6) continue
    _qq.setFromUnitVectors(_upY, d.divideScalar(L))
    _ee.setFromQuaternion(_qq)
    out.push([wireUnit(), _a.clone().add(_b).multiplyScalar(0.5).toArray(), [_ee.x, _ee.y, _ee.z], [r, L, r]])
    if (i > 0) out.push([wireJoint(), points[i], [0, 0, 0], [r, r, r]])
  }
  return out
}
// malha de pernas/fios (estanho por omissão) a partir de várias polilinhas, em cache pela chave
export function Wires({ id, lines, r = 0.025, color = METAL.tin, metal = 1, rough = 0.3 }) {
  const g = mergedGeo(`wires:${id}:${r}`, () => lines.flatMap((pts) => wireItems(pts, r)))
  return <mesh geometry={g} material={mat(color, metal, rough)} castShadow />
}

// marcação impressa/gravada a laser num plano (texto em cache por conteúdo). `rot` orienta o
// plano (normal +z local); lines = [{ text, font, x?, y? }] na tela px.
export function Mark({ lines, pos, rot = [0, 0, 0], w, h, px = [256, 128], color = '#cfcfcf' }) {
  return <mesh position={pos} rotation={rot} geometry={geo('plane1', () => new THREE.PlaneGeometry(1, 1))} scale={[w, h, 1]} material={silkMat(lines, px[0], px[1], color)} />
}

// ---------- corpo DIP ----------
function dipBodyGeo(len, w) {
  return geo(`dipBody${len},${w}`, () => {
    const b = 0.012 // boleado das arestas das pontas
    const hm = H * 0.45 // linha de partição do molde
    const d = 0.016 // saída de molde de cada metade
    const hw = w / 2 - b
    const s = new THREE.Shape()
    s.moveTo(-hw + d, b)
    s.lineTo(hw - d, b)
    s.lineTo(hw, hm)
    s.lineTo(hw - d, H - b)
    s.lineTo(-hw + d, H - b)
    s.lineTo(-hw, hm)
    s.closePath()
    const depth = len - 2 * b
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 4 })
    g.rotateY(Math.PI / 2)
    g.translate(-depth / 2, Y0, 0)
    g.computeVertexNormals()
    return g
  })
}

export function Dip({ pins, len, text, sub, color = '#1a1a1a', ink = '#c9c9c9', w = 0.65, code = '2347  E4' }) {
  const top = Y0 + H
  const dark = new THREE.Color(color).getHSL({}).l < 0.4 // corpo preto (ou branco, como o PC817)
  const key = `${len},${w}|${pins.map((p) => p.pos.map((v) => +v.toFixed(4)).join(',')).join(';')}`
  // pernas: ombro horizontal a sair do corpo, troço largo a descer, cauda estreita até ao pino
  const legs = mergedGeo(`dipLegs${key}`, () => {
    const out = []
    const ye = Y0 + 0.1 // altura de saída das pernas (logo abaixo da linha de partição)
    const ys = 0.05 // fim do troço largo (assenta aqui na placa)
    for (const p of pins) {
      const [x, , z] = p.pos
      const s = Math.sign(z) || 1
      const zi = s * (w / 2 - 0.03)
      out.push([unitBox(), [x, ye, (zi + z + s * 0.0125) / 2], [0, 0, 0], [0.13, 0.025, Math.abs(z + s * 0.0125 - zi)]])
      out.push([unitBox(), [x, (ye + ys) / 2, z], [0, 0, 0], [0.13, ye - ys + 0.012, 0.025]])
      // ressalto em cunha entre o troço largo e a cauda
      out.push([unitBox(), [x, ys - 0.01, z], [0, 0, 0], [0.09, 0.02, 0.025]])
      out.push([unitBox(), [x, (ys - 0.02 + p.pos[1]) / 2, z], [0, 0, 0], [0.046, ys - 0.02 - p.pos[1], 0.025]])
    }
    return out
  })
  const ejector = len > 1.3
  // marcação com a proporção da tela (512 × 192), o mais larga que caiba no topo
  const th = Math.min(w * 0.72, Math.min(len * 0.82, 1.6) * 0.375)
  const tw = th / 0.375
  const lines = [{ text, font: `bold ${text.length > 9 ? 70 : 84}px Arial`, y: 50 }]
  if (sub) lines.push({ text: sub, font: 'bold 40px Arial', y: 112 })
  lines.push({ text: code, font: '34px Arial', y: sub ? 160 : 120 })
  return (
    <group>
      <mesh geometry={legs} material={mat(METAL.tin, 1, 0.3)} castShadow />
      <mesh geometry={dipBodyGeo(len, w)} material={mat(color, 0, 0.62)} castShadow receiveShadow />
      {/* entalhe em meia-lua no topo e na face da ponta (pino 1 à esquerda) */}
      <mesh position={[-len / 2 + 0.004, top + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('dipNotchTop', () => new THREE.CircleGeometry(0.07, 16, -Math.PI / 2, Math.PI))} material={mat(dark ? '#060606' : '#a9a9a9', 0, 0.9)} />
      <mesh position={[-len / 2 - 0.001, top - 0.004, 0]} rotation={[0, -Math.PI / 2, 0]} geometry={geo('dipNotchEnd', () => new THREE.CircleGeometry(0.07, 16, Math.PI, Math.PI))} material={mat(dark ? '#060606' : '#a9a9a9', 0, 0.9)} />
      {/* covinha do pino 1 e marcas polidas dos extratores do molde */}
      <mesh position={[-len / 2 + 0.17, top + 0.0015, 0.17]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('dipDimple', () => new THREE.CircleGeometry(0.045, 16))} material={mat(dark ? '#0b0b0b' : '#bdbdbd', 0, 0.25)} />
      {ejector &&
        [-1, 1].map((s) => (
          <mesh key={s} position={[s * (len / 2 - 0.2), top + 0.001, -0.14]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('dipEject', () => new THREE.CircleGeometry(0.075, 20))} material={mat(dark ? '#141414' : '#dcdcdc', 0, 0.3)} />
        ))}
      <Mark lines={lines} px={[512, 192]} pos={[0.04, top + 0.003, -0.01]} rot={[-Math.PI / 2, 0, 0]} w={tw} h={th} color={ink} />
    </group>
  )
}
