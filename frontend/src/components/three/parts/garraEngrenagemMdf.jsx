// Garra de engrenagens em MDF: placa de trás (de pé) com parafusos e porcas, placa principal de
// ombros redondos, SG90 por baixo com o veio na engrenagem da esquerda, duas engrenagens de
// dentes largos engrenadas, um braço em cada engrenagem e uma biela paralela de cada lado
// (paralelogramo), e os dedos serrilhados que acompanham as pontas dos braços sem rodar.
// O ângulo dos braços é o da física (geArmAngle), com a abertura do servo.
import { useFrame, useRef, THREE, Leg, RBox, Cyl, jawDeg } from '../kit.jsx'
import { DEFS } from '@shared/components.js'
import { GE, geArmAngle, geOpening, geArmEnd } from '@shared/parts/garraEngrenagemMdf.js'
import { extrudeXZ, holeCircle, rrect, mdfMats, Phillips, Sg90Body } from './_mdfKit.jsx'
import { gearGeo } from './_mechKit.jsx'

const { Y0, T, pivotX, pivotZ, LA, LINK, finger, fW } = GE
const H = Y0 + 0.8 // altura da placa de trás
const GZ = 10
const GM = (2 * pivotZ) / GZ

// placa principal (plano xz, y da forma = −z): ombros redondos à frente, furos dos pivôs
function plateShape() {
  const s = new THREE.Shape()
  s.moveTo(0, -2.4)
  s.lineTo(pivotX + 0.6, -2.4)
  s.absarc(pivotX + 0.6, -1.2, 1.2, -Math.PI / 2, 0, false)
  s.lineTo(pivotX + 1.8, 1.2)
  s.absarc(pivotX + 0.6, 1.2, 1.2, 0, Math.PI / 2, false)
  s.lineTo(0, 2.4)
  s.lineTo(0, -2.4)
  for (const sz of [-1, 1]) {
    holeCircle(s, pivotX, -sz * pivotZ, 0.16)
    holeCircle(s, pivotX, -sz * (pivotZ + LINK), 0.14)
  }
  return s
}
// placa de trás (desenhada no plano xz e depois posta de pé): furos dos parafusos de fixação
function backShape() {
  const s = rrect(new THREE.Shape(), 0, -2.4, H, 2.4, 0.2)
  for (const z of [-1.2, 1.2]) holeCircle(s, 0.7, z, 0.16)
  holeCircle(s, H - 0.6, 0, 0.3)
  return s
}
// barra de pontas redondas de 0 a L (largura w) com furo em cada ponta
function barShape(L, w) {
  const r = w / 2
  const s = new THREE.Shape()
  s.moveTo(0, -r)
  s.lineTo(L, -r)
  s.absarc(L, 0, r, -Math.PI / 2, Math.PI / 2, false)
  s.lineTo(0, r)
  s.absarc(0, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false)
  holeCircle(s, 0, 0, 0.14)
  holeCircle(s, L, 0, 0.14)
  return s
}
// dedo (lado +z: o lado de dentro é −z → +y na forma): base larga a cobrir as duas juntas,
// dedo estreito com a face de dentro serrilhada
function fingerShape() {
  const s = new THREE.Shape()
  const yi = fW / 2 // face de dentro (y da forma = −z local)
  s.moveTo(-0.45, yi)
  // face de dentro serrilhada da base até à ponta
  let up = false
  for (let x = 1.2; x < finger - 0.3; x += 0.42) {
    s.lineTo(x, yi)
    s.lineTo(x + 0.21, up ? yi : yi - 0.22)
    up = !up
  }
  s.lineTo(finger - 0.3, yi)
  s.absarc(finger - 0.75, yi - 0.45, 0.45, 0, -Math.PI / 2, true)
  s.lineTo(1.4, -fW / 2)
  s.lineTo(0.45, -LINK)
  s.absarc(0, -LINK, 0.45, 0, -Math.PI, true)
  s.lineTo(-0.45, yi)
  holeCircle(s, 0, 0, 0.14)
  holeCircle(s, 0, -LINK, 0.14)
  return s
}

function Model({ part }) {
  const cfg = part.config || {}
  const m = mdfMats(cfg)
  const arms = [useRef(), useRef()]
  const links = [useRef(), useRef()]
  const fingers = [useRef(), useRef()]
  useFrame(() => {
    const phi = geArmAngle(geOpening(jawDeg(part.id)))
    ;[-1, 1].forEach((sz, i) => {
      if (arms[i].current) arms[i].current.rotation.y = -sz * phi
      if (links[i].current) links[i].current.rotation.y = -sz * phi
      const [xe, ze] = geArmEnd(phi, sz)
      if (fingers[i].current) fingers[i].current.position.set(xe, Y0 + 3 * T, ze)
    })
  })
  const plate = extrudeXZ('geMdfPlate', T, plateShape)
  const back = extrudeXZ('geMdfBack', T, backShape)
  const arm = extrudeXZ(`geMdfArm${LA}`, T, () => barShape(LA, 0.78))
  const fing = extrudeXZ('geMdfFinger', T, fingerShape)
  const gear = gearGeo(GZ, GM, T, 0.16)
  const pins = DEFS.garraEngrenagemMdf.pins
  const cy = pins[0].pos[1]
  return (
    <group>
      {/* placa de trás (de pé) com parafusos e porcas de fixação */}
      <mesh geometry={back} material={m} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow />
      {[-1.2, 1.2].map((z) => (
        <group key={z}>
          <Cyl r={0.14} h={1.2} pos={[0.45, 0.7, z]} rot={[0, 0, Math.PI / 2]} color="#c9ccd0" metal={0.9} rough={0.3} seg={10} />
          <Cyl r={0.28} h={0.22} pos={[0.2, 0.7, z]} rot={[0, 0, Math.PI / 2]} color="#c9ccd0" metal={0.9} rough={0.3} seg={6} />
        </group>
      ))}
      {/* placa principal e servo por baixo (o veio passa na engrenagem da esquerda) */}
      <mesh geometry={plate} material={m} position={[0, Y0, 0]} castShadow receiveShadow />
      <group position={[pivotX - 0.55, 0, -pivotZ]}>
        <Sg90Body />
      </group>
      {[-1, 1].map((sz, i) => (
        <group key={sz}>
          {/* engrenagem + braço (rodam juntos à volta do pivô) */}
          <group ref={arms[i]} position={[pivotX, Y0 + T, sz * pivotZ]}>
            <mesh geometry={gear} material={m} rotation={[0, sz > 0 ? Math.PI / GZ : 0, 0]} castShadow receiveShadow />
            <mesh geometry={arm} material={m} position={[0, T, 0]} castShadow receiveShadow />
            <Phillips pos={[0, 2 * T, 0]} />
            <Phillips pos={[LA, 2 * T, 0]} />
          </group>
          {/* biela paralela (pivô na placa, por fora do braço) */}
          <group ref={links[i]} position={[pivotX, Y0 + 2 * T, sz * (pivotZ + LINK)]}>
            <mesh geometry={arm} material={m} castShadow receiveShadow />
            <Phillips pos={[0, T, 0]} />
          </group>
          {/* dedo (segue a ponta do braço, sempre paralelo) */}
          <group ref={fingers[i]} position={[pivotX + LA, Y0 + 3 * T, sz * pivotZ]}>
            <group scale={[1, 1, sz]}>
              <mesh geometry={fing} material={m} castShadow receiveShadow />
            </group>
            <Phillips pos={[0, T, 0]} />
            <Phillips pos={[0, T, sz * LINK]} />
          </group>
        </group>
      ))}
      {/* cabo do servo até à ficha */}
      {pins.map((p, j) => (
        <Leg key={p.id} from={[pivotX - 1.7, 0.5, -pivotZ + (j - 1) * 0.1]} to={[p.pos[0] + 0.42, cy, p.pos[2]]} r={0.05} color={['#6d4c41', '#e53935', '#fb8c00'][j]} />
      ))}
      <RBox size={[0.42, 0.26, 0.78]} r={0.02} pos={[pins[0].pos[0] + 0.21, cy, 0]} color="#111" />
    </group>
  )
}

export default { type: 'garraEngrenagemMdf', Model }
