// Peças de construção para os modelos 3D procedurais (dimensões reais, em cm).
// Usadas por models.jsx e pelos componentes em plugin (components/three/parts/*.jsx).
import { createContext, useContext, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { PITCH, pinOrient, pinOrientMode, headerPinGeom, PIN_DIRS } from '@shared/components.js'
import { simRef } from '../../contexts/simRef.js'

export const D2R = Math.PI / 180
export const eng = () => simRef.engine
// ângulo das maxilas de uma garra (graus de servo): o da física quando há (as maxilas param no
// objeto que apertam), senão o do servo no backend (90 sem simulação)
export const jawDeg = (id) => simRef.jawAngles?.get(id) ?? eng()?.servoOf?.get(id)?.angle ?? 90

// ---------- helpers ----------
export function useCanvasTexture(draw, deps, w = 512, h = 256) {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    draw(c.getContext('2d'), w, h)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
export function useLabel(lines, w = 512, h = 256) {
  return useCanvasTexture(
    (ctx) => {
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      lines.forEach((l) => {
        ctx.font = l.font
        ctx.fillStyle = l.color || '#fff'
        ctx.fillText(l.text, l.x ?? w / 2, l.y ?? h / 2)
      })
    },
    [JSON.stringify(lines)],
    w,
    h,
  )
}

// geometrias e materiais partilhados (muitas peças iguais: menos memória e menos programas)
const GEO = new Map()
const MAT = new Map()
export function geo(key, make) {
  let g = GEO.get(key)
  if (!g) GEO.set(key, (g = make()))
  return g
}
export function mat(color, metal = 0, rough = 0.7, extra) {
  const key = `${color}|${metal}|${rough}|${extra ? JSON.stringify(extra) : ''}`
  let m = MAT.get(key)
  // as cenas têm mapa de ambiente (StudioEnvironment.jsx): metais com reflexos reais; os
  // plásticos ganham um pouco de brilho especular e as superfícies muito lisas não ficam espelhos
  if (!m)
    MAT.set(
      key,
      (m = new THREE.MeshStandardMaterial({
        color,
        metalness: metal,
        roughness: metal > 0.5 ? Math.max(rough, 0.18) : Math.max(rough, 0.08),
        envMapIntensity: metal > 0.5 ? 1.0 : 0.7,
        ...(extra || {}),
      })),
    )
  return m
}
// caixa com um chanfro mínimo nas arestas (até 0,3 mm, proporcional): nenhuma peça real tem
// arestas perfeitamente vivas — o fio de luz nas arestas é o que lhe dá volume (sem ele o modelo
// parece um desenho). Caixas muito finas (pistas, etiquetas) ficam como estavam.
const boxGeo = ([w, h, d]) =>
  geo(`b${w},${h},${d}`, () => {
    const m = Math.min(w, h, d)
    return m < 0.04 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 1, Math.min(0.03, m * 0.12))
  })
const cylGeo = (r, r2, h, seg) => geo(`c${r},${r2},${h},${seg}`, () => new THREE.CylinderGeometry(r, r2, h, seg))
const rboxGeo = ([w, h, d], r) =>
  geo(`r${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4)))

export const Box = ({ size, pos = [0, 0, 0], rot, color, metal = 0, rough = 0.7, ...rest }) => (
  <mesh position={pos} rotation={rot} castShadow receiveShadow geometry={boxGeo(size)} material={mat(color, metal, rough)} {...rest} />
)
// caixa com arestas boleadas (plásticos injetados, corpos de componentes)
export const RBox = ({ size, r = 0.05, pos = [0, 0, 0], rot, color, metal = 0, rough = 0.6, ...rest }) => (
  <mesh position={pos} rotation={rot} castShadow receiveShadow geometry={rboxGeo(size, r)} material={mat(color, metal, rough)} {...rest} />
)
export const Cyl = ({ r, r2, h, pos = [0, 0, 0], rot = [0, 0, 0], color, metal = 0, rough = 0.6, seg = 24, opacity }) =>
  opacity != null ? (
    <mesh position={pos} rotation={rot} castShadow geometry={cylGeo(r, r2 ?? r, h, seg)}>
      <meshStandardMaterial color={color} metalness={metal} roughness={rough} transparent opacity={opacity} />
    </mesh>
  ) : (
    <mesh position={pos} rotation={rot} castShadow geometry={cylGeo(r, r2 ?? r, h, seg)} material={mat(color, metal, rough)} />
  )
// perna/fio rígido entre dois pontos: cilindro unitário partilhado, escalado (sem geometria
// nem material novos por peça). Cor por omissão: fio de cobre estanhado.
const _up = new THREE.Vector3(0, 1, 0)
// cor de metal (cinzento claro ou dourado/latão)? Os fios coloridos (servo, motores) são plástico.
const METALISH = new Map()
function metalish(color) {
  let v = METALISH.get(color)
  if (v === undefined) {
    const c = new THREE.Color(color)
    const hsl = c.getHSL({}, THREE.SRGBColorSpace)
    v = (hsl.s < 0.12 && hsl.l > 0.45 && hsl.l < 0.95) || (hsl.h > 0.09 && hsl.h < 0.16 && hsl.s > 0.3 && hsl.s < 0.75 && hsl.l > 0.4 && hsl.l < 0.7)
    METALISH.set(color, v)
  }
  return v
}
export const Leg = ({ from, to, r = 0.025, color = '#dfe2e5', metal }) => {
  const [mid, q, len] = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const d = b.clone().sub(a)
    const l = d.length()
    return [a.add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(_up, l > 1e-9 ? d.divideScalar(l) : _up), l]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from[0], from[1], from[2], to[0], to[1], to[2]])
  return <mesh position={mid} quaternion={q} scale={[r, Math.max(len, 1e-4), r]} castShadow geometry={geo('legUnit', () => new THREE.CylinderGeometry(1, 1, 1, 8))} material={(metal ?? metalish(color)) ? mat(color, 1, 0.35) : mat(color, 0, 0.5)} />
}

export function GlowLed({ pos, size = [0.18, 0.08, 0.1], color, read, halo = 0.7 }) {
  const mat = useRef()
  useFrame(() => {
    const v = read()
    if (mat.current) {
      mat.current.emissiveIntensity = v * 4
      mat.current.color.set(v > 0.05 ? color : '#555')
    }
  })
  return (
    <group position={pos}>
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial ref={mat} color="#555" emissive={color} emissiveIntensity={0} toneMapped={false} />
      </mesh>
      {halo > 0 && <Halo size={halo} color={color} read={read} />}
    </group>
  )
}

// ---------- halo de luz à volta de um emissor aceso ----------
// Um LED aceso numa mesa clara, sem halo, quase não se distingue de um apagado (a cor saturada
// não é mais clara do que o fundo). O halo é um disco suave virado para a câmara: núcleo quase
// branco e orla da cor da luz, com tamanho e opacidade a crescer com o brilho (0..1).
// `read()` devolve o brilho; `color` é fixa (string/THREE.Color) ou `readColor()` dá a cor atual.
let HALO_TEX = null
function haloTexture() {
  if (HALO_TEX) return HALO_TEX
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  r.addColorStop(0, 'rgba(255,255,255,1)')
  r.addColorStop(0.12, 'rgba(255,255,255,0.9)')
  r.addColorStop(0.3, 'rgba(255,255,255,0.45)')
  r.addColorStop(0.6, 'rgba(255,255,255,0.12)')
  r.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = r
  g.fillRect(0, 0, 128, 128)
  HALO_TEX = new THREE.CanvasTexture(c)
  HALO_TEX.colorSpace = THREE.SRGBColorSpace
  return HALO_TEX
}
const _hc = new THREE.Color()
// cor de um LED endereçável (0xRRGGBB, valores PWM): o olho é logarítmico — um WS2812 a
// 40/255 continua bem visível. Devolve o nível percetual (0 = apagado … 1) e põe em `out` a
// cor saturada (canal maior = 1), que é a que se vê no LED.
export function pixelLevel(c, out) {
  const r = (c >> 16) & 255
  const g = (c >> 8) & 255
  const b = c & 255
  const m = Math.max(r, g, b)
  if (m < 2) {
    out?.setRGB(0, 0, 0)
    return 0
  }
  out?.setRGB(r / m, g / m, b / m, THREE.SRGBColorSpace)
  return 0.35 + 0.65 * Math.sqrt(m / 255)
}
// halo de um LED endereçável (WS2812): cor e brilho de live.c[i]
export function PixelHalo({ id, i, pos, size = 1.2 }) {
  const c = useMemo(() => new THREE.Color(), [])
  return <Halo pos={pos} size={size} read={() => pixelLevel(liveOf(id)?.c?.[i] ?? 0, c)} readColor={() => c} />
}
export function Halo({ pos = [0, 0, 0], size = 1, color = '#ffffff', read, readColor }) {
  const sp = useRef()
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: haloTexture(), transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }), [])
  useFrame(() => {
    const s = sp.current
    if (!s) return
    const v = Math.max(0, Math.min(1, read() || 0))
    s.visible = v > 0.02
    if (!s.visible) return
    if (readColor) _hc.copy(readColor())
    else _hc.set(color)
    // a cor da luz um pouco mais clara (mistura com branco) para se ver sobre fundos claros e escuros
    mat.color.copy(_hc).lerp(_hc.clone().setRGB(1, 1, 1), 0.15)
    mat.opacity = 0.35 + 0.6 * Math.sqrt(v)
    const k = size * (0.55 + 0.45 * Math.sqrt(v))
    s.scale.set(k, k, 1)
  })
  return <sprite ref={sp} position={pos} material={mat} visible={false} raycast={() => null} renderOrder={10} />
}
export const Standoff = ({ x, z, h, color = '#e8e8e8' }) => <Cyl r={0.15} h={h} pos={[x, h / 2, z]} color={color} />
export const powered = (id) => !!eng()?.circuit.st[id]?.powered


// estado vivo de um componente em plugin (enviado pelo backend)
export const liveOf = (id) => simRef.engine?.live?.[id]
// controlo interativo atual (slider, interruptor…) de uma peça
export const inputOf = (id) => simRef.inputs[id] || {}

// ---------- materiais e geometrias "de eletrónica" ----------
// máscara de solda: plástico com verniz brilhante por cima (clearcoat), partilhado por cor
const PCBMAT = new Map()
export function pcbMat(color) {
  let m = PCBMAT.get(color)
  if (!m)
    PCBMAT.set(
      color,
      (m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.22, envMapIntensity: 0.8 })),
    )
  return m
}
// metais típicos (cores reais): estanho (pernas, soldas), ouro (pinos), níquel (blindagens), alumínio
export const METAL = { tin: '#d8dbde', gold: '#d9b44a', nickel: '#d3d7db', alu: '#d8dbdf', brass: '#c9a24a', copper: '#c87a4a' }
export const tinMat = () => mat(METAL.tin, 1, 0.3)
export const goldMat = () => mat(METAL.gold, 1, 0.25)

// junta várias geometrias-base transformadas numa só (uma chamada de desenho, caixa envolvente
// correta para os fios e para a seleção). Cache pela chave.
// items: [[geometria, [x, y, z], [rx, ry, rz]?, [sx, sy, sz]?], ...]
const _mt = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
export function mergedGeo(key, build) {
  return geo(`m:${key}`, () => {
    const items = build()
    if (!items.length) return new THREE.BufferGeometry()
    const parts = items.map(([g, p, r = [0, 0, 0], s = [1, 1, 1]]) => {
      const c = (g.index ? g.toNonIndexed() : g.clone())
      c.applyMatrix4(_mt.compose(new THREE.Vector3(...p), _q.setFromEuler(_e.set(...r)), new THREE.Vector3(...s)))
      return c
    })
    const out = mergeGeometries(parts, false)
    parts.forEach((c) => c.dispose())
    out.computeBoundingBox()
    out.computeBoundingSphere()
    return out
  })
}
const pyrGeo = () => geo('pinTip', () => new THREE.CylinderGeometry(0.008, 0.045, 0.06, 4, 1).rotateY(Math.PI / 4))

// placa de circuito impresso (arestas boleadas, verniz) com furos de montagem metalizados
export function Pcb({ size, color = '#1d4ed8', pos = [0, 0, 0], holes = true }) {
  const [w, h, d] = size
  return (
    <group position={pos}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow geometry={rboxGeo(size, 0.03)} material={pcbMat(color)} />
      {holes &&
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
          <group key={i} position={[sx * (w / 2 - 0.25), h + 0.002, sz * (d / 2 - 0.25)]}>
            <mesh geometry={cylGeo(0.13, 0.13, 0.006, 16)} material={mat(METAL.tin, 1, 0.3)} />
            <mesh position={[0, 0.002, 0]} geometry={cylGeo(0.08, 0.08, 0.006, 12)} material={mat('#0a0a0a', 0, 0.9)} />
          </group>
        ))}
    </group>
  )
}

// texto/desenho de serigrafia num plano deitado (topo de placas e chips); textura e material
// partilhados por conteúdo. lines: [{ text, font, x?, y? }] em píxeis da tela w × h.
const SILK = new Map()
export function silkMat(lines, w = 256, h = 64, color = '#f2f2f2') {
  const key = `${JSON.stringify(lines)}|${w}|${h}|${color}`
  let m = SILK.get(key)
  if (!m) {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const l of lines) {
      ctx.font = l.font
      ctx.fillText(l.text, l.x ?? w / 2, l.y ?? h / 2)
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    SILK.set(key, (m = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })))
  }
  return m
}
// etiqueta deitada (texto de uma linha ou várias) sobre uma superfície horizontal
export function SilkText({ text, lines, pos, w, d, rotY = 0, color = '#f2f2f2', font = 'bold 40px Arial', px = [256, 64] }) {
  const L = lines || [{ text, font }]
  return (
    <mesh position={pos} rotation={[-Math.PI / 2, 0, rotY]} geometry={geo('plane1', () => new THREE.PlaneGeometry(1, 1))} scale={[w, d, 1]} material={silkMat(L, px[0], px[1], color)} />
  )
}

// circuito integrado SMD: corpo epóxi preto, pernas em asa de gaivota (SOIC/TSSOP: 2 lados;
// QFP: 4 lados; QFN: só almofadas), ponto do pino 1 e marcação opcional
export function Chip({ pos, size = [0.5, 0.15, 0.4], pkg = 'soic', n = 4, rotY = 0, label, labelColor = '#bdbdbd' }) {
  const [w, h, d] = size
  const legs = mergedGeo(`chip${pkg}${w},${h},${d},${n}`, () => {
    const out = []
    const leg = geo('gull', () => new THREE.BoxGeometry(1, 1, 1))
    const side = (axisLen, off, horiz) => {
      for (let i = 0; i < n; i++) {
        const t = n > 1 ? (i / (n - 1) - 0.5) * axisLen * 0.84 : 0
        for (const s of [-1, 1]) {
          if (pkg === 'qfn') {
            out.push([leg, horiz ? [t, 0.008, s * (off - 0.02)] : [s * (off - 0.02), 0.008, t], [0, 0, 0], horiz ? [0.03, 0.016, 0.06] : [0.06, 0.016, 0.03]])
            continue
          }
          // troço horizontal saindo do corpo + pé assente na placa
          out.push([leg, horiz ? [t, h * 0.45, s * (off + 0.03)] : [s * (off + 0.03), h * 0.45, t], [0, 0, 0], horiz ? [0.035, 0.018, 0.07] : [0.07, 0.018, 0.035]])
          out.push([leg, horiz ? [t, h * 0.22, s * (off + 0.07)] : [s * (off + 0.07), h * 0.22, t], [0, 0, 0], horiz ? [0.035, h * 0.45, 0.018] : [0.018, h * 0.45, 0.035]])
          out.push([leg, horiz ? [t, 0.009, s * (off + 0.1)] : [s * (off + 0.1), 0.009, t], [0, 0, 0], horiz ? [0.035, 0.018, 0.07] : [0.07, 0.018, 0.035]])
        }
      }
    }
    side(w, d / 2, true)
    if (pkg === 'qfp' || pkg === 'qfn') side(d, w / 2, false)
    return out
  })
  const by = pkg === 'qfn' ? 0 : 0.015
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, by + h / 2, 0]} castShadow geometry={rboxGeo([w, h, d], 0.012)} material={mat('#161616', 0, 0.42)} />
      <mesh geometry={legs} material={mat(METAL.tin, 1, 0.3)} />
      <mesh position={[-w / 2 + 0.06, by + h + 0.001, d / 2 - 0.06]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('dot', () => new THREE.CircleGeometry(0.025, 12))} material={mat('#3a3a3a', 0, 0.9)} />
      {label && <SilkText text={label} pos={[0, by + h + 0.002, 0]} w={w * 0.85} d={Math.min(d * 0.4, w * 0.22)} color={labelColor} font="bold 42px Arial" />}
    </group>
  )
}

// passivo SMD (0805/1206): corpo cerâmico com terminais estanhados nas pontas (ao longo de x)
export function Smd({ pos, rotY = 0, len = 0.2, wid = 0.12, h = 0.06, color = '#1c1c1c' }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, h / 2, 0]} geometry={boxGeo([len * 0.7, h, wid])} material={mat(color, 0, 0.55)} />
      <mesh position={[0, h / 2, 0]} geometry={mergedGeo(`smdEnds${len},${wid},${h}`, () => [-1, 1].map((s) => [geo('gull', () => new THREE.BoxGeometry(1, 1, 1)), [(s * len * 0.425), 0, 0], [0, 0, 0], [len * 0.15, h * 1.02, wid * 1.02]]))} material={mat(METAL.tin, 1, 0.3)} />
    </group>
  )
}

// condensador eletrolítico vertical: manga plástica com risca do negativo e tampa de alumínio
// com o corte em cruz (válvula de segurança)
export function ECap({ pos, r = 0.3, h = 0.6, color = '#1b2a6b', stripe = '#c9d2e6' }) {
  return (
    <group position={pos}>
      <mesh position={[0, h / 2, 0]} castShadow geometry={cylGeo(r, r, h, 24)} material={mat(color, 0, 0.35)} />
      <mesh position={[0, h / 2, 0]} geometry={geo(`ecapStripe${r},${h}`, () => new THREE.CylinderGeometry(r + 0.003, r + 0.003, h * 0.98, 6, 1, true, -0.45, 0.9))} material={mat(stripe, 0, 0.4)} />
      <mesh position={[0, h * 0.9, 0]} geometry={geo(`ecapGroove${r}`, () => new THREE.TorusGeometry(r * 0.98, 0.02, 6, 24).rotateX(Math.PI / 2))} material={mat(color, 0, 0.4)} />
      <mesh position={[0, h + 0.004, 0]} geometry={cylGeo(r * 0.93, r * 0.93, 0.008, 24)} material={mat(METAL.alu, 1, 0.35)} />
      <mesh position={[0, h + 0.01, 0]} geometry={mergedGeo(`ecapCross${r}`, () => [[geo('gull', () => new THREE.BoxGeometry(1, 1, 1)), [0, 0, 0], [0, 0, 0], [r * 1.3, 0.006, 0.02]], [geo('gull', () => new THREE.BoxGeometry(1, 1, 1)), [0, 0, 0], [0, 0, 0], [0.02, 0.006, r * 1.3]]])} material={mat('#8d9196', 1, 0.5)} />
    </group>
  )
}

// cristal HC-49/S (caixa de níquel oval, ao longo de x)
export function Crystal({ pos, rotY = 0, l = 1.1, h = 0.35, d = 0.45 }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.03, 0]} geometry={boxGeo([l + 0.04, 0.06, d + 0.04])} material={mat('#1a1a1a', 0, 0.6)} />
      <mesh position={[0, 0.06 + h / 2, 0]} castShadow geometry={rboxGeo([l, h, d], d / 2.2)} material={mat(METAL.nickel, 1, 0.3)} />
    </group>
  )
}

// ---------- conectores e peças comuns de placas (abertura virada para −x local) ----------
const unitBox = () => geo('gull', () => new THREE.BoxGeometry(1, 1, 1))
// USB-B (Uno, Mega): caixa de chapa niquelada com abas, boca com língua branca
export function UsbB({ pos, rotY = 0, size = [1.6, 1.1, 1.2] }) {
  const [l, h, w] = size
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow geometry={rboxGeo(size, 0.04)} material={mat(METAL.nickel, 1, 0.38)} />
      {/* reforços estampados na chapa e abas de solda */}
      <mesh geometry={mergedGeo(`usbbRib${l},${h},${w}`, () => [
        [unitBox(), [0.1, h + 0.004, 0], [0, 0, 0], [l * 0.55, 0.01, w * 0.12]],
        [unitBox(), [-l * 0.2, h + 0.004, -w * 0.3], [0, 0, 0], [l * 0.3, 0.01, 0.05]],
        [unitBox(), [-l * 0.2, h + 0.004, w * 0.3], [0, 0, 0], [l * 0.3, 0.01, 0.05]],
        [unitBox(), [l * 0.3, 0.04, -w / 2 - 0.05], [0, 0, 0], [0.25, 0.08, 0.1]],
        [unitBox(), [l * 0.3, 0.04, w / 2 + 0.05], [0, 0, 0], [0.25, 0.08, 0.1]],
      ])} material={mat('#aeb3b9', 1, 0.3)} />
      <mesh position={[-l / 2 - 0.001, h / 2, 0]} rotation={[0, -Math.PI / 2, 0]} geometry={geo('plane1', () => new THREE.PlaneGeometry(1, 1))} scale={[w * 0.7, h * 0.66, 1]} material={mat('#0c0c0c', 0, 0.9)} />
      <mesh position={[-l / 2 + 0.2, h * 0.44, 0]} geometry={boxGeo([0.4, h * 0.25, w * 0.42])} material={mat('#f0f0ec', 0, 0.5)} />
    </group>
  )
}
// micro-USB: concha metálica achatada de cantos boleados
export function MicroUsb({ pos, rotY = 0, size = [0.55, 0.28, 0.75] }) {
  const [l, h, w] = size
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow geometry={rboxGeo(size, 0.08)} material={mat(METAL.nickel, 1, 0.34)} />
      <mesh position={[-l / 2 - 0.001, h / 2, 0]} rotation={[0, -Math.PI / 2, 0]} geometry={geo('plane1', () => new THREE.PlaneGeometry(1, 1))} scale={[w * 0.82, h * 0.55, 1]} material={mat('#0a0a0a', 0, 0.9)} />
      <mesh position={[-l / 2 + 0.1, h / 2, 0]} geometry={boxGeo([0.2, 0.03, w * 0.6])} material={mat('#1a1a1a', 0, 0.6)} />
    </group>
  )
}
// jack DC 5,5/2,1 mm (preto, com o pino central)
export function BarrelJack({ pos, rotY = 0, size = [1.45, 1.1, 0.9] }) {
  const [l, h, w] = size
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0.05, h / 2, 0]} castShadow geometry={rboxGeo([l - 0.1, h, w], 0.06)} material={mat('#141414', 0, 0.45)} />
      <mesh position={[-l / 2 + 0.06, h * 0.55, 0]} rotation={[0, 0, Math.PI / 2]} geometry={cylGeo(Math.min(h, w) * 0.46, Math.min(h, w) * 0.46, 0.12, 28)} material={mat('#141414', 0, 0.45)} />
      <mesh position={[-l / 2 + 0.001, h * 0.55, 0]} rotation={[0, 0, Math.PI / 2]} geometry={cylGeo(Math.min(h, w) * 0.32, Math.min(h, w) * 0.32, 0.01, 24)} material={mat('#030303', 0, 0.9)} />
      <mesh position={[-l / 2 + 0.02, h * 0.55, 0]} rotation={[0, 0, Math.PI / 2]} geometry={cylGeo(0.06, 0.06, 0.05, 10)} material={mat(METAL.tin, 1, 0.3)} />
    </group>
  )
}
// botão tátil 6×6 SMD/THT (base metálica, corpo preto, atuador)
export function TactSwitch({ pos, size = 0.6, cap = '#1d1d1d', round = true }) {
  const s = size
  return (
    <group position={pos}>
      <mesh position={[0, 0.09, 0]} castShadow geometry={rboxGeo([s, 0.18, s], 0.02)} material={mat('#1a1a1a', 0, 0.5)} />
      <mesh position={[0, 0.19, 0]} geometry={boxGeo([s * 1.01, 0.025, s * 1.01])} material={mat(METAL.nickel, 1, 0.3)} />
      {round ? (
        <mesh position={[0, 0.25, 0]} geometry={cylGeo(s * 0.28, s * 0.28, 0.12, 20)} material={mat(cap, 0, 0.45)} />
      ) : (
        <mesh position={[0, 0.23, 0]} geometry={rboxGeo([s * 0.45, 0.08, s * 0.35], 0.02)} material={mat(cap, 0, 0.45)} />
      )}
    </group>
  )
}
// antena de PCB em meandro (cobre dourado sob a máscara) para os módulos Wi‑Fi
let ANT_TEX
function antennaTex() {
  if (!ANT_TEX) {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 256
    const x = c.getContext('2d')
    x.fillStyle = '#141414'
    x.fillRect(0, 0, 128, 256)
    x.strokeStyle = '#b8963c'
    x.lineWidth = 7
    x.beginPath()
    x.moveTo(20, 250)
    x.lineTo(20, 20)
    for (let i = 0; i < 5; i++) {
      const y = 20 + i * 44
      x.lineTo(108, y)
      x.lineTo(108, y + 22)
      x.lineTo(40, y + 22)
      x.lineTo(40, y + 44)
    }
    x.stroke()
    ANT_TEX = new THREE.CanvasTexture(c)
    ANT_TEX.colorSpace = THREE.SRGBColorSpace
    ANT_TEX.anisotropy = 4
  }
  return ANT_TEX
}
// módulo ESP-WROOM-32 (18 × 25,5 mm): substrato, blindagem niquelada gravada e antena em +x.
// pos = centro do módulo na face de cima da placa; l ao longo de x (com a antena), w em z.
export function EspModule({ pos, rotY = 0, l = 1.8, w = 1.8, title = 'ESP-WROOM-32', sub = 'Wi-Fi + BT' }) {
  const ant = Math.min(0.6, l * 0.3)
  const sl = l - ant - 0.1
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.04, 0]} castShadow geometry={rboxGeo([l, 0.08, w], 0.015)} material={pcbMat('#161616')} />
      <mesh position={[l / 2 - ant / 2 - 0.02, 0.0805, 0]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]} geometry={geo('plane1', () => new THREE.PlaneGeometry(1, 1))} scale={[w * 0.92, ant, 1]}>
        <meshStandardMaterial map={antennaTex()} roughness={0.35} metalness={0.3} />
      </mesh>
      <group position={[-l / 2 + 0.05 + sl / 2, 0.08, 0]}>
        <mesh position={[0, 0.12, 0]} castShadow geometry={rboxGeo([sl, 0.24, w - 0.12], 0.02)} material={mat(METAL.nickel, 1, 0.3)} />
        <SilkText lines={[{ text: title, font: 'bold 40px Arial', y: 40 }, { text: sub, font: '30px Arial', y: 92 }, { text: 'FCC ID: 2AC7Z-ESPWROOM32', font: '20px Arial', y: 136 }]} px={[512, 170]} pos={[0, 0.242, 0]} w={(w - 0.2)} d={(w - 0.2) / 3} rotY={-Math.PI / 2} color="#5d6166" />
      </group>
      {/* castelações (almofadas laterais) */}
      <mesh geometry={mergedGeo(`espCast${l},${w}`, () => {
        const out = []
        for (let i = 0; i < 12; i++) for (const s of [-1, 1]) out.push([unitBox(), [-l / 2 + 0.12 + i * ((l - ant - 0.2) / 11), 0.04, s * (w / 2 + 0.003)], [0, 0, 0], [0.05, 0.082, 0.012]])
        return out
      })} material={mat(METAL.gold, 1, 0.3)} />
    </group>
  )
}

// pinos macho de 0,1": espaçador de plástico de 2,5 mm (de `base` a base+0,25) e pino
// dourado de 0,64 mm que sobe ~6 mm acima do plástico. A posição do pino no catálogo
// fica logo acima do plástico (é aí que assenta a ficha fêmea do jumper).
// `up` (legado) é ignorado: o comprimento é sempre o real.
// Todos os espaçadores numa só malha e todos os pinos noutra (geometria em cache por posições).
// peça cujo modelo está a ser desenhado (Scene3D): a barra de pinos segue config.pinosDir
export const PartCtx = createContext(null)

// barra de pinos macho. Com a orientação dos pinos mudada (config.pinosDir, ver
// shared/pinOrient.js) os pinos de cabeçalho da peça desenham-se para baixo ou em ângulo reto,
// exatamente onde os fios 3D ligam (pins3d); os outros ficam como estão.
export function HeaderPins(props) {
  const ctx = useContext(PartCtx)
  const part = props.part || ctx
  const mode = part ? pinOrientMode(part) : null
  const info = mode && pinOrient(part.type)
  if (!info || mode === info.d0) return <StraightHeader {...props} />
  const bent = props.pins.filter((p) => info.roots.has(p.id))
  const rest = props.pins.filter((p) => !info.roots.has(p.id))
  return (
    <group>
      {rest.length > 0 && <StraightHeader {...props} pins={rest} />}
      {bent.length > 0 && <OrientedHeader info={info} mode={mode} ids={bent.map((p) => p.id)} color={props.color} plastic={props.plastic} />}
    </group>
  )
}

// rotação que leva +y para a direção d (eixos)
const ROT_TO = { cima: [0, 0, 0], baixo: [Math.PI, 0, 0], frente: [0, 0, -Math.PI / 2], tras: [0, 0, Math.PI / 2], direita: [Math.PI / 2, 0, 0], esquerda: [-Math.PI / 2, 0, 0] }
// barra numa orientação qualquer, a partir da geometria partilhada (headerPinGeom)
export function OrientedHeader({ info, mode, ids, color = METAL.gold, plastic = '#111' }) {
  const key = `${info.pb}|${info.pt}|${mode}|${ids.map((id) => info.roots.get(id).join(',')).join(';')}`
  const h = PIN_DIRS[mode]
  const rot = ROT_TO[mode]
  const body = mergedGeo(`ohdrB${key}`, () => {
    const b = geo('hdrBlk', () => new RoundedBoxGeometry(0.25, 0.25, 0.25, 1, 0.02))
    return ids.map((id) => {
      const g = headerPinGeom(info, id, mode)
      // plástico encostado à placa (por baixo) ou, em ângulo reto, por cima dela junto à dobra
      const c = g.bend ? [g.bend[0] + 0.2 * h[0], g.bend[1], g.bend[2] + 0.2 * h[2]] : g.pos.map((v, i) => v - 0.175 * g.dir[i])
      return [b, c]
    })
  })
  const pin = mergedGeo(`ohdrP${key}`, () => {
    const shaft = geo('hdrShaft', () => new THREE.BoxGeometry(0.064, 1, 0.064))
    const tip = 0.49 // ponta do pino para lá do sítio onde liga a ficha
    return ids.flatMap((id) => {
      const g = headerPinGeom(info, id, mode)
      const end = g.pos.map((v, i) => v + tip * g.dir[i])
      const out = []
      if (g.bend) {
        // perna vertical (atravessa a placa) + troço horizontal até à ponta
        const y0 = info.pb - 0.1
        const y1 = g.bend[1] + 0.032
        out.push([shaft, [g.bend[0], (y0 + y1) / 2, g.bend[2]], [0, 0, 0], [1, y1 - y0, 1]])
        const a = g.bend.map((v, i) => v - 0.032 * g.dir[i])
        const L = Math.hypot(end[0] - a[0], end[1] - a[1], end[2] - a[2])
        out.push([shaft, a.map((v, i) => (v + end[i]) / 2), rot, [1, L, 1]])
      } else {
        // reto: começa um pouco do outro lado da placa (ponta soldada)
        const a = mode === 'baixo' ? [g.pos[0], info.pt + 0.08, g.pos[2]] : [g.pos[0], info.pb - 0.1, g.pos[2]]
        const L = Math.abs(end[1] - a[1])
        out.push([shaft, [g.pos[0], (a[1] + end[1]) / 2, g.pos[2]], [0, 0, 0], [1, L, 1]])
      }
      out.push([pyrGeo(), end.map((v, i) => v + 0.03 * g.dir[i]), rot])
      return out
    })
  })
  return (
    <group>
      <mesh geometry={body} material={mat(plastic, 0, 0.5)} castShadow receiveShadow />
      <mesh geometry={pin} material={mat(color, 1, 0.25)} castShadow />
    </group>
  )
}

function StraightHeader({ pins, base = 0, color = METAL.gold, plastic = '#111' }) {
  const tip = 0.6
  const key = `${base}|${pins.map((p) => `${+p.pos[0].toFixed(4)},${+p.pos[2].toFixed(4)}`).join(';')}`
  const body = mergedGeo(`hdrB${key}`, () => {
    const b = geo('hdrBlk', () => new RoundedBoxGeometry(0.25, 0.25, 0.25, 1, 0.02))
    return pins.map((p) => [b, [p.pos[0], base + 0.125, p.pos[2]]])
  })
  const pin = mergedGeo(`hdrP${key}`, () => {
    const shaft = geo('hdrShaft', () => new THREE.BoxGeometry(0.064, 1, 0.064))
    const L = tip + 0.35 - 0.06
    return pins.flatMap((p) => [
      [shaft, [p.pos[0], base - 0.1 + L / 2, p.pos[2]], [0, 0, 0], [1, L, 1]],
      [pyrGeo(), [p.pos[0], base - 0.1 + L + 0.03, p.pos[2]]],
    ])
  })
  return (
    <group>
      <mesh geometry={body} material={mat(plastic, 0, 0.5)} castShadow receiveShadow />
      <mesh geometry={pin} material={mat(color, 1, 0.25)} castShadow />
    </group>
  )
}

// textura de furos quadrados para o topo de um conector fêmea de n vias
const holeTex = new Map()
function socketTexture(n, rows = 1) {
  const k = `${n}x${rows}`
  if (!holeTex.has(k)) {
    const px = 32
    const c = document.createElement('canvas')
    c.width = n * px
    c.height = rows * px
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#161616'
    ctx.fillRect(0, 0, c.width, c.height)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < rows; j++) {
        const x = i * px + px / 2
        const y = j * px + px / 2
        const g = ctx.createLinearGradient(x - 8, y - 8, x + 8, y + 8)
        g.addColorStop(0, '#000')
        g.addColorStop(1, '#2a2a2a')
        ctx.fillStyle = g
        ctx.fillRect(x - 8, y - 8, 16, 16)
        ctx.fillStyle = '#7a6a3a'
        ctx.fillRect(x - 3, y - 3, 6, 6)
      }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    holeTex.set(k, t)
  }
  return holeTex.get(k)
}
// conector fêmea (barra de n furos ao longo de x) com o topo em y = top
export function FemaleHeader({ n, rows = 1, x, z, top, h = 0.85, pitch = PITCH }) {
  const w = n * pitch
  const d = rows * pitch
  return (
    <group position={[x, top, z]}>
      <Box size={[w, h, d]} pos={[0, -h / 2, 0]} color="#151515" rough={0.55} />
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={socketTexture(n, rows)} roughness={0.6} />
      </mesh>
    </group>
  )
}

// mesh cujo brilho/cor segue uma função lida a cada frame (0..1)
export function Glow({ children, color, read, pos, rot, base = '#333', intensity = 3, light = 0, halo = 0 }) {
  const mat = useRef()
  const l = useRef()
  useFrame(() => {
    const v = Math.max(0, Math.min(1.4, read() || 0))
    if (mat.current) {
      mat.current.emissiveIntensity = v * intensity
      mat.current.color.set(v > 0.03 ? color : base)
    }
    if (l.current) l.current.intensity = v * light
  })
  return (
    <group position={pos} rotation={rot}>
      <mesh>
        {children}
        <meshStandardMaterial ref={mat} color={base} emissive={color} emissiveIntensity={0} toneMapped={false} />
      </mesh>
      {light > 0 && <pointLight ref={l} color={color} intensity={0} distance={6} />}
      {halo > 0 && <Halo size={halo} color={color} read={read} />}
    </group>
  )
}

export { PITCH, THREE, useFrame, useMemo, useRef }
