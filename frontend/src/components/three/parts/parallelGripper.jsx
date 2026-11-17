// Garra paralela como as garras impressas com placas de fibra de carbono: duas placas de carbono
// (textura de tecido) com o micro servo MG90S entre elas, espaçadores e parafusos sextavados,
// pinhão + cremalheiras sobre guias de aço, e dois dedos em cunha (PLA ciano) com a almofada
// flexível em treliça (TPU vermelho, tipo "fin-ray") na face de aperto. Os dedos deslizam em
// paralelo como na física (def.jaws): 0° fechada, 180° aberta 4 cm.
import { Box, Cyl, RBox, jawDeg, useFrame, useRef, useMemo, THREE, mat, useCanvasTexture } from '../kit.jsx'
import { Gear } from './_mechKit.jsx'
import { extrudeXZ, extrudeXY, holeCircle, rrect } from './_mdfKit.jsx'
import def, { PG } from '@shared/parts/parallelGripper.js'

const finger = 0.3
const CYAN = '#4fd1c5'
const RED = '#e53935'
const T = 0.22 // espessura das placas de carbono

// placa de carbono: retângulo com cantos boleados, furos dos parafusos e um rasgo de alívio
function plateShape() {
  const s = rrect(new THREE.Shape(), 0, -2.2, PG.BASE_L, 2.2, 0.45)
  for (const [x, z] of [[0.4, 1.8], [0.4, -1.8], [PG.BASE_L - 0.4, 1.8], [PG.BASE_L - 0.4, -1.8], [2.3, 1.8], [2.3, -1.8]]) holeCircle(s, x, -z, 0.14)
  s.holes.push(rrect(new THREE.Path(), 1.0, -0.9, 2.0, 0.9, 0.25))
  return s
}
// dedo em cunha (plano XY, espessura em z): base junto ao carro, ponta afiada à frente
function fingerShape() {
  const s = new THREE.Shape()
  const x0 = PG.BASE_L - 0.25
  s.moveTo(x0, 0.1)
  s.lineTo(PG.BASE_L + 2.75, 0.75)
  s.lineTo(PG.BASE_L + 2.75, 1.65)
  s.lineTo(x0, 2.3)
  s.lineTo(x0, 0.1)
  s.holes.push(rrect(new THREE.Path(), x0 + 0.35, 0.75, x0 + 1.2, 1.65, 0.12))
  return s
}
// almofada fin-ray: triângulo com nervuras (os vazios em treliça deixam-na dobrar sobre o objeto)
function finRayShape() {
  const s = new THREE.Shape()
  const xa = PG.BASE_L + 0.6
  const xb = PG.BASE_L + 2.6
  s.moveTo(xa, 0.4)
  s.lineTo(xb, 1.2)
  s.lineTo(xa, 2.0)
  s.lineTo(xa, 0.4)
  const n = 4
  for (let i = 0; i < n; i++) {
    const u0 = 0.06 + i / n
    const u1 = (i + 1) / n - 0.06
    const X = (u) => xa + 0.12 + u * (xb - xa - 0.5)
    const half = (u) => 0.8 * (1 - u) - 0.18
    if (half(u1) < 0.05) break
    const h = new THREE.Path()
    h.moveTo(X(u0), 1.2 - half(u0))
    h.lineTo(X(u1), 1.2 - half(u1))
    h.lineTo(X(u1), 1.2 + half(u1))
    h.lineTo(X(u0), 1.2 + half(u0))
    h.lineTo(X(u0), 1.2 - half(u0))
    s.holes.push(h)
  }
  return s
}

// parafuso sextavado interior (Allen) preto
function Hex({ pos }) {
  return (
    <group position={pos}>
      <Cyl r={0.17} h={0.12} pos={[0, 0.06, 0]} color="#1a1a1a" metal={0.6} rough={0.35} seg={20} />
      <Cyl r={0.07} h={0.02} pos={[0, 0.125, 0]} color="#000" seg={6} />
    </group>
  )
}

function Model({ part }) {
  const fl = useRef()
  const fr = useRef()
  const pin = useRef()
  useFrame(() => {
    // posição real dos dedos (param no objeto que apertam: física, grippers.js)
    const a = jawDeg(part.id)
    const half = (0.4 + (a / 180) * PG.MAX_OPEN) / 2 + finger / 2
    if (fl.current) fl.current.position.z = -half
    if (fr.current) fr.current.position.z = half
    if (pin.current) pin.current.rotation.y = (a / 180) * Math.PI * 1.2
  })
  // tecido de carbono (sarja 2×2) numa textura pequena que se repete
  const weave = useCanvasTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#16181b'
      ctx.fillRect(0, 0, w, h)
      const c = w / 8
      for (let i = 0; i < 8; i++)
        for (let j = 0; j < 8; j++) {
          ctx.fillStyle = (i + j) % 4 < 2 ? '#2b2e33' : '#1d1f23'
          ctx.fillRect(i * c, j * c, c, c * 0.92)
        }
    },
    ['carbono-sarja'],
    64,
    64,
  )
  if (weave) {
    weave.wrapS = weave.wrapT = THREE.RepeatWrapping
    weave.repeat.set(6, 6)
  }
  const cm = useMemo(() => new THREE.MeshStandardMaterial({ map: weave, metalness: 0.25, roughness: 0.35 }), [weave])
  const plate = extrudeXZ('pgPlate', T, plateShape)
  const fing = extrudeXY('pgFinger', finger, fingerShape)
  const fin = extrudeXY('pgFinRay', 0.14, finRayShape)
  return (
    <group>
      {/* placas de carbono (em baixo e em cima) e espaçadores */}
      <mesh geometry={plate} material={cm} castShadow receiveShadow />
      <mesh geometry={plate} position={[0, 1.6 - T, 0]} material={cm} castShadow receiveShadow />
      {[[0.4, 1.8], [0.4, -1.8], [PG.BASE_L - 0.4, 1.8], [PG.BASE_L - 0.4, -1.8]].map(([x, z], i) => (
        <group key={i}>
          <Cyl r={0.2} h={1.6 - 2 * T} pos={[x, 0.8, z]} color="#9aa3aa" metal={0.85} rough={0.3} seg={6} />
          <Hex pos={[x, 1.6, z]} />
        </group>
      ))}
      {/* micro servo MG90S entre as placas e o de cima (corpo preto, etiqueta azul) */}
      <RBox size={[2.3, 1.0, 1.22]} r={0.06} pos={[1.6, 2.1, 0]} color="#1a1a1a" rough={0.5} />
      <Box size={[3.2, 0.12, 1.22]} pos={[1.6, 2.3, 0]} color="#1a1a1a" rough={0.5} />
      <Box size={[1.6, 0.5, 0.01]} pos={[1.6, 2.1, 0.615]} color="#1e88e5" rough={0.5} />
      {[-1, 1].map((s) => (
        <Hex key={s} pos={[1.6 + s * 1.35, 2.36, 0]} />
      ))}
      {/* pinhão (aço) sobre a placa de cima */}
      <group ref={pin} position={[PG.BASE_L - 0.6, 1.6, 0]}>
        <Gear z={14} m={0.1} w={0.3} color="#cfd8dc" metal={0.8} rough={0.3} />
      </group>
      {/* cabo e ficha do servo */}
      <Box size={[0.45, 0.25, 0.8]} pos={[-0.38, 0.62, 0]} color="#111" />
      <Box size={[0.4, 0.06, 0.3]} pos={[-0.0, 0.62, 0]} color="#8d6e63" />
      {def.pins.map((p) => (
        <Box key={p.id} size={[0.06, 0.06, 0.06]} pos={[p.pos[0] - 0.16, p.pos[1], p.pos[2]]} color={{ GND: '#6d4c41', VCC: '#e53935', SIG: '#fb8c00' }[p.id]} />
      ))}
      {/* guias de aço dos dedos */}
      {[0.95, 1.55].map((y) => (
        <Cyl key={y} r={0.1} h={5.6} pos={[PG.BASE_L - 0.3, y, 0]} rot={[Math.PI / 2, 0, 0]} color="#d0d4d8" metal={0.95} rough={0.25} seg={14} />
      ))}
      {[fl, fr].map((r, i) => {
        const sz = i ? 1 : -1
        return (
          <group key={i} ref={r} position={[0, 0, sz * 1.5]}>
            {/* carro (desliza nas guias) e dedo em cunha */}
            <RBox size={[0.8, 1.0, finger + 0.3]} r={0.08} pos={[PG.BASE_L - 0.3, 1.25, 0]} color={CYAN} rough={0.6} />
            <mesh geometry={fing} material={mat(CYAN, 0, 0.6)} castShadow receiveShadow />
            {/* almofada fin-ray vermelha na face de dentro */}
            <mesh geometry={fin} position={[0, 0, -sz * (finger / 2 + 0.07)]} material={mat(RED, 0, 0.65)} castShadow receiveShadow />
            <Hex pos={[PG.BASE_L - 0.3, 1.75, 0]} />
          </group>
        )
      })}
    </group>
  )
}

export default { type: 'parallelGripper', Model }
