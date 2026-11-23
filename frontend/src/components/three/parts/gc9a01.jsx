// Ecrã redondo 1,28" GC9A01 240×240: placa circular com patilha de 8 pinos, caixilho metálico da
// retroiluminação, vidro preto (pouco especular, para continuar negro sob as luzes do estúdio),
// anel de tinta à volta da área ativa, reflexo aditivo e a fita flexível âmbar que entra na placa.
// A imagem chega em live.fb (RLE RGB565) como nos TFT ST7789; só o círculo inscrito é visível.
import { HeaderPins, SilkText, SCREEN_TINT, THREE, geo, mat, pcbMat, liveOf, useFrame, useRef } from '../kit.jsx'
import def, { GC9A01 as G } from '@shared/parts/gc9a01.js'
import { rectOf } from './_groupA.jsx'
import { screen, decode565, SmdParts, SolderPads, Flex, PinLabels } from './_gDisplays.jsx'

const TW = 240
const PCB_T = 0.16
const PCB_COLOR = '#123a7c'

// ---------- imagem viva (um canvas por peça; fora do círculo fica transparente) ----------
const scr = screen({
  init(e) {
    e.raw = Object.assign(document.createElement('canvas'), { width: e.w, height: e.h })
    e.raw.getContext('2d').fillRect(0, 0, e.w, e.h)
    e.ver = null
  },
  key(e, L) {
    if (!L?.powered) {
      if (e.ver !== null) {
        e.ver = null
        e.raw.getContext('2d').fillRect(0, 0, e.w, e.h)
      }
    } else if (L.fb && L.ver !== e.ver) {
      const ctx = e.raw.getContext('2d')
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, e.w, e.h)
      decode565(ctx, L.fb, Math.min(e.w, L.w || e.w), Math.min(e.h, L.h || e.h), L.w || e.w)
      e.ver = L.ver
    }
    return `${!!L?.powered}|${L?.on !== false}|${!!L?.inv}|${L?.lit !== false}|${e.ver}`
  },
  draw(e, L) {
    const ctx = e.view.getContext('2d')
    ctx.save()
    ctx.clearRect(0, 0, e.w, e.h)
    ctx.beginPath()
    ctx.arc(e.w / 2, e.h / 2, e.w / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.fillStyle = '#040405'
    ctx.fillRect(0, 0, e.w, e.h)
    if (L?.powered) {
      if (L.on === false || L.ver == null) {
        // controlador por iniciar com a luz acesa: o painel IPS mostra um cinzento claro
        ctx.fillStyle = L.lit !== false ? '#d6d6d6' : '#0c0c0d'
        ctx.fillRect(0, 0, e.w, e.h)
      } else {
        if (L.inv) ctx.filter = 'invert(1)'
        ctx.globalAlpha = L.lit !== false ? 1 : 0.1
        ctx.drawImage(e.raw, 0, 0)
      }
    }
    ctx.restore()
  },
})

// ---------- geometrias ----------
// contorno da placa: círculo + patilha dos pinos (do lado de −z), com os cantos da patilha boleados
function boardShape() {
  const s = new THREE.Shape()
  const { R, CZ, tab } = G
  const hw = tab.w / 2
  const r = 0.12
  // ângulo em que a patilha encontra o círculo (y do Shape = −z do mundo, depois de rodar)
  const a = Math.asin(hw / R)
  s.moveTo(-hw, -(CZ - R * Math.cos(a)))
  s.absarc(0, -CZ, R, Math.PI / 2 + a, Math.PI / 2 - a + Math.PI * 2, false)
  s.lineTo(hw, -(tab.z0 + r))
  s.quadraticCurveTo(hw, -tab.z0, hw - r, -tab.z0)
  s.lineTo(-hw + r, -tab.z0)
  s.quadraticCurveTo(-hw, -tab.z0, -hw, -(tab.z0 + r))
  s.closePath()
  return s
}
const boardGeo = () =>
  geo('gc9a01Board', () => {
    const g = new THREE.ExtrudeGeometry(boardShape(), { depth: PCB_T - 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.012, bevelSegments: 2, curveSegments: 72 })
    // UVs do Shape vêm em cm: normalizam-se para 0…1 na placa (a máscara manchada de pcbMat
    // está pensada para placas com UVs 0…1)
    const uv = g.attributes.uv
    const span = 2 * G.R
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / span + 0.5, uv.getY(i) / span + 0.5)
    g.rotateX(-Math.PI / 2)
    g.translate(0, 0.01, 0)
    return g
  })
// borda de FR4 à vista (amarelada, mistura do laminado com a máscara)
let EDGE
const edgeMat = () => (EDGE ||= new THREE.MeshStandardMaterial({ color: new THREE.Color('#b4ad84').lerp(new THREE.Color(PCB_COLOR), 0.45), roughness: 0.6 }))

// vidro preto: physical com pouco especular, como no módulo real (fica negro sob as luzes)
let GLASS
const glassMat = () =>
  (GLASS ||= new THREE.MeshPhysicalMaterial({ color: '#050608', roughness: 0.09, metalness: 0, specularIntensity: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.06 }))
// reflexo aditivo: só soma os brilhos do ambiente, sem escurecer a imagem
let SHEEN
const sheenMat = () =>
  (SHEEN ||= new THREE.MeshPhysicalMaterial({ color: '#000000', roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.2, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))

// anel de tinta preta à volta da área ativa (com as pistas finíssimas do vidro a ver-se de perto)
let RING
function ringMat() {
  if (RING) return RING
  const n = 512
  const c = Object.assign(document.createElement('canvas'), { width: n, height: n })
  const x = c.getContext('2d')
  x.fillStyle = '#060709'
  x.fillRect(0, 0, n, n)
  x.strokeStyle = 'rgba(150,158,168,0.10)'
  x.lineWidth = 1
  for (let i = 0; i < 9; i++) {
    x.beginPath()
    x.arc(n / 2, n / 2, n * (0.455 + i * 0.0045), 0, Math.PI * 2)
    x.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  RING = new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.1, metalness: 0, specularIntensity: 0.42, polygonOffset: true, polygonOffsetFactor: -1 })
  return RING
}

function Model({ part }) {
  const tex = scr.useTex(part.id, TW, TW)
  const { CZ, glassR, actR, tab } = G
  const y0 = PCB_T + 0.01
  const frameH = 0.24
  const glassT = 0.07
  const top = y0 + frameH + glassT
  // luz da retroiluminação que escapa pelo bordo do vidro (só com o ecrã aceso)
  const rim = useRef()
  useFrame(() => {
    const L = liveOf(part.id)
    if (rim.current) rim.current.opacity = L?.powered && L?.lit !== false ? 0.35 : 0
  })
  const pinXs = def.pins.map((p) => p.pos[0])
  return (
    <group>
      {/* placa redonda com patilha: face com máscara azul e borda de FR4 */}
      <mesh geometry={boardGeo()} material={[pcbMat(PCB_COLOR), edgeMat()]} castShadow receiveShadow />
      {/* caixilho metálico da retroiluminação, vidro e anel de tinta */}
      <mesh position={[0, y0 + frameH / 2, CZ]} geometry={geo(`gcFrame${glassR}`, () => new THREE.CylinderGeometry(glassR - 0.02, glassR - 0.02, frameH, 96))} material={mat('#c9cdd1', 1, 0.38)} castShadow receiveShadow />
      <mesh position={[0, y0 + frameH + glassT / 2, CZ]} geometry={geo(`gcGlass${glassR}`, () => new THREE.CylinderGeometry(glassR, glassR, glassT, 96))} material={glassMat()} castShadow />
      <mesh position={[0, top + 0.002, CZ]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo(`gcRing${actR},${glassR}`, () => new THREE.RingGeometry(actR - 0.01, glassR - 0.015, 96, 1))} material={ringMat()} />
      <mesh position={[0, y0 + frameH + 0.004, CZ]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo(`gcRim${glassR}`, () => new THREE.RingGeometry(glassR - 0.05, glassR + 0.005, 96, 1))}>
        <meshBasicMaterial ref={rim} color="#dfe8ff" transparent opacity={0} toneMapped={false} depthWrite={false} />
      </mesh>
      {/* imagem viva: disco com UVs do quadrado 240×240 (o círculo inscrito) */}
      <mesh position={[0, top + 0.003, CZ]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo(`gcAct${actR}`, () => new THREE.CircleGeometry(actR, 128))}>
        <meshBasicMaterial map={tex} color={SCREEN_TINT} toneMapped={false} />
      </mesh>
      <mesh position={[0, top + 0.006, CZ]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo(`gcSheen${glassR}`, () => new THREE.CircleGeometry(glassR - 0.01, 96))} material={sheenMat()} renderOrder={2} />
      {/* fita flexível que sai do vidro do lado dos pinos e entra numa ranhura da placa */}
      <mesh position={[0, PCB_T + 0.004, CZ - glassR - 0.12]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.05, 0.12, 1]} geometry={geo('gcSlot', () => new THREE.PlaneGeometry(1, 1))} material={mat('#030303', 0, 0.95)} />
      <Flex x={0} z0={CZ - glassR + 0.12} z1={CZ - glassR - 0.12} w={0.95} y={y0 + 0.06} rb={0.05} />
      {/* patilha: passivos SMD, regulador, soldas dos pinos e serigrafia */}
      <SmdParts list={[[-0.72, -1.78, 0, 'c'], [-0.98, -1.78, Math.PI / 2, 'r'], [0.72, -1.78, 0, 'c'], [0.98, -1.78, Math.PI / 2, 'r']]} y={PCB_T} />
      <SolderPads pts={pinXs.map((x) => [x, G.pinZ])} y={PCB_T} r={0.085} square0 blob={false} />
      <PinLabels xs={pinXs} names={['GND', 'VCC', 'SCL', 'SDA', 'RES', 'DC', 'CS', 'BLK']} z={G.pinZ + 0.27} y={PCB_T + 0.002} h={0.11} />
      <SilkText text={'1.28" GC9A01  240×240'} pos={[0, PCB_T + 0.002, tab.z0 + 0.13]} w={1.9} d={0.13} font="bold 44px Arial" px={[720, 52]} />
      <HeaderPins pins={def.pins} base={0} />
    </group>
  )
}

function Overlay2D({ part, info, live }) {
  const url = scr.useUrl(part.id, TW, TW, live)
  if (!live?.powered) return null
  const { CZ, actR } = G
  const r = rectOf(info, -actR, CZ - actR, actR, CZ + actR)
  return <image href={url} x={r.x} y={r.y} width={r.w} height={r.h} preserveAspectRatio="none" style={{ imageRendering: 'pixelated' }} pointerEvents="none" />
}

export default { type: def.type, Model, Overlay2D }
