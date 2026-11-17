// Modelos 3D procedurais (dimensões reais, em cm). Estado vivo lido do motor da simulação.
// Os pinos do catálogo (shared/components.js) ficam exatamente sobre os conectores,
// pernas e bornes desenhados aqui: é aí que os fios 3D encaixam.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { CHASSIS, CHASSIS4, BB, bbRowZ, bbRailZ, bbRailX, LED_COLORS, PITCH, DEFS, hidesHorn, motorWheel, vehicleLift } from '@shared/components.js'
import { useStore } from '../../contexts/store.js'
import { servoHornRotation } from '@shared/assembly.js'
import { sonarMode, sonarPcbY, sonarPin } from '@shared/sonar.js'
import { simRef } from '../../contexts/simRef.js'

import { D2R, eng, jawDeg, useCanvasTexture, useLabel, Box, RBox, Cyl, Leg, GlowLed, Halo, Standoff, powered, HeaderPins, FemaleHeader, geo, mat, pcbMat, METAL, Chip, Smd, ECap, Crystal, UsbB, BarrelJack, TactSwitch, SilkText } from './kit.jsx'
import { PART_UI } from './parts/index.js'
import { DiscWheel } from './parts/_discWheel.jsx'
import { gearGeo as gearGeoFor } from './parts/_mechKit.jsx'

const P = PITCH

// plano com textura deitado (topo de placas), centrado em (x, y, z)
// coat: a textura é a própria máscara de solda (cor + serigrafia) → leva o verniz brilhante
export function TopDecal({ tex, w, d, pos, alphaTest = 0, coat = false }) {
  return (
    <mesh position={pos} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[w, d]} />
      {coat ? (
        <meshPhysicalMaterial map={tex} transparent={!alphaTest} alphaTest={alphaTest} roughness={0.55} clearcoat={0.7} clearcoatRoughness={0.22} envMapIntensity={0.8} polygonOffset polygonOffsetFactor={-1} />
      ) : (
        <meshStandardMaterial map={tex} transparent={!alphaTest} alphaTest={alphaTest} roughness={0.55} polygonOffset polygonOffsetFactor={-1} />
      )}
    </mesh>
  )
}
// placa com contorno arbitrário (pontos [x, z]) extrudida para baixo a partir de `top`
export function ShapePlate({ pts, top, t, color, rough = 0.5, holes = [] }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape()
    pts.forEach(([x, z], i) => (i ? s.lineTo(x, z) : s.moveTo(x, z)))
    for (const [hx, hz, r] of holes) {
      const h = new THREE.Path()
      h.absarc(hx, hz, r, 0, Math.PI * 2, true)
      s.holes.push(h)
    }
    return s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(pts), JSON.stringify(holes)])
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, top, 0]} castShadow receiveShadow>
      <extrudeGeometry args={[shape, { depth: t, bevelEnabled: false, curveSegments: 10 }]} />
      {/* máscara de solda com verniz (rough mantido por compatibilidade) */}
      <primitive object={pcbMat(color)} attach="material" />
    </mesh>
  )
}

// ---------- Arduino Uno R3 ----------
// Contorno real (68,6 × 53,3 mm) com a USB-B e o jack à esquerda (−x). Pinos digitais em
// cima (z −), alimentação e analógicos em baixo (z +), como na vista 2D.
export const UNO = { T: 1.16, B: 1.0, X0: -3.429, Z0: 2.667 }
const unoXZ = ([xmm, ymm]) => [xmm / 10 + UNO.X0, UNO.Z0 - ymm / 10]
export const UNO_OUTLINE = [[0, 0], [66.04, 0], [66.04, 1.27], [68.58, 3.81], [68.58, 36.83], [66.04, 39.37], [66.04, 51.82], [64.52, 53.34], [0, 53.34]].map(unoXZ)
export const UNO_HOLES = [[13.97, 2.54], [15.24, 50.8], [66.04, 7.62], [66.04, 35.56]].map(unoXZ)
const UNO_PINS = DEFS.arduino.pins
const unoPin = (id) => UNO_PINS.find((p) => p.id === id).pos
// conectores (incluem os pinos que não são simulados: AREF, SDA, SCL, IOREF, RESET, NC)
export const UNO_HEADERS = (() => {
  const d1 = [unoPin('D7')[0], unoPin('D0')[0]]
  const d2 = [unoPin('GND.1')[0] - 3 * P, unoPin('D8')[0]]
  const pw = [unoPin('3V3')[0] - 3 * P, unoPin('VIN')[0]]
  const an = [unoPin('A0')[0], unoPin('A5')[0]]
  const zt = unoPin('D0')[2]
  const zb = unoPin('A0')[2]
  const h = (r, z) => ({ n: Math.round((r[1] - r[0]) / P) + 1, x: (r[0] + r[1]) / 2, z })
  return [h(d1, zt), h(d2, zt), h(pw, zb), h(an, zb)]
})()
const UNO_EXTRA = (() => {
  const g = unoPin('GND.1')
  const v = unoPin('3V3')
  return [
    ...['AREF', 'SDA', 'SCL'].map((t, i) => ({ t, pos: [g[0] - (i + 1) * P, 0, g[2]] })),
    ...['RESET', 'IOREF', ''].map((t, i) => ({ t, pos: [v[0] - (i + 1) * P, 0, v[2]] })),
  ]
})()

function drawUnoSilk(ctx, w, h) {
  const PX = w / 6.858
  const X = (x) => (x - UNO.X0) * PX
  const Z = (z) => (z + UNO.Z0) * PX
  // contorno + cor da placa
  ctx.beginPath()
  UNO_OUTLINE.forEach(([x, z], i) => (i ? ctx.lineTo(X(x), Z(z)) : ctx.moveTo(X(x), Z(z))))
  ctx.closePath()
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, '#04909b')
  g.addColorStop(1, '#037e8a')
  ctx.fillStyle = g
  ctx.fill()
  ctx.save()
  ctx.clip()
  // pistas de cobre (por baixo da máscara: só ligeiramente visíveis)
  ctx.strokeStyle = 'rgba(8,90,104,0.9)'
  ctx.lineWidth = 0.035 * PX
  let s = 7
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 60; i++) {
    const x0 = rnd() * w
    const y0 = rnd() * h
    const L = (0.4 + rnd() * 1.6) * PX
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    if (rnd() > 0.5) {
      ctx.lineTo(x0 + L, y0)
      ctx.lineTo(x0 + L + 0.2 * PX, y0 + 0.2 * PX)
    } else {
      ctx.lineTo(x0, y0 + L)
      ctx.lineTo(x0 + 0.2 * PX, y0 + L + 0.2 * PX)
    }
    ctx.stroke()
  }
  // furos de fixação
  for (const [x, z] of UNO_HOLES) {
    ctx.fillStyle = '#d9c27a'
    ctx.beginPath()
    ctx.arc(X(x), Z(z), 0.28 * PX, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#222'
    ctx.beginPath()
    ctx.arc(X(x), Z(z), 0.16 * PX, 0, Math.PI * 2)
    ctx.fill()
  }
  // serigrafia
  ctx.fillStyle = '#f4f8f8'
  ctx.strokeStyle = '#f4f8f8'
  ctx.textBaseline = 'middle'
  const vtext = (t, x, z, align, size = 0.12) => {
    ctx.save()
    ctx.translate(X(x), Z(z))
    ctx.rotate(-Math.PI / 2)
    ctx.textAlign = align
    ctx.font = `bold ${size * PX}px Arial`
    ctx.fillText(t, 0, 0)
    ctx.restore()
  }
  const PWM = new Set(['D3', 'D5', 'D6', 'D9', 'D10', 'D11'])
  for (const p of UNO_PINS) {
    const lab = p.id.startsWith('D') ? (PWM.has(p.id) ? '~' : '') + p.id.slice(1) : p.id.split('.')[0]
    if (p.pos[2] < 0) vtext(lab === '0' ? 'RX◂0' : lab === '1' ? 'TX▸1' : lab, p.pos[0], p.pos[2] + 0.2, 'right')
    else vtext(lab, p.pos[0], p.pos[2] - 0.2, 'left')
  }
  for (const e of UNO_EXTRA) if (e.t) e.pos[2] < 0 ? vtext(e.t, e.pos[0], e.pos[2] + 0.2, 'right') : vtext(e.t, e.pos[0], e.pos[2] - 0.2, 'left')
  ctx.textAlign = 'center'
  ctx.font = `bold ${0.16 * PX}px Arial`
  ctx.fillText('DIGITAL (PWM~)', X(0.9), Z(-1.55))
  ctx.fillText('POWER', X(-0.55), Z(1.55))
  ctx.fillText('ANALOG IN', X(1.95), Z(1.85) + 0.05 * PX)
  // linhas por cima dos grupos de pinos
  ctx.lineWidth = 0.02 * PX
  ctx.beginPath()
  ctx.moveTo(X(-1.75), Z(-1.7))
  ctx.lineTo(X(3.05), Z(-1.7))
  ctx.stroke()
  // logótipo
  ctx.lineWidth = 0.075 * PX
  for (const dx of [-0.24, 0.24]) {
    ctx.beginPath()
    ctx.arc(X(1.75 + dx), Z(-0.75), 0.24 * PX, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.font = `bold ${0.2 * PX}px Arial`
  ctx.fillText('−', X(1.51), Z(-0.75))
  ctx.fillText('+', X(1.99), Z(-0.75))
  ctx.font = `bold ${0.5 * PX}px Arial`
  ctx.fillText('UNO', X(1.75), Z(0.05))
  ctx.font = `bold ${0.22 * PX}px Arial`
  ctx.fillText('ARDUINO', X(1.75), Z(-0.35))
  ctx.font = `bold ${0.11 * PX}px Arial`
  ctx.fillText('ON', X(2.62), Z(-0.25))
  ctx.fillText('L', X(-0.98), Z(-1.85))
  ctx.fillText('TX', X(-0.98), Z(-1.45))
  ctx.fillText('RX', X(-0.98), Z(-1.25))
  ctx.fillText('ICSP', X(2.7), Z(0.62))
  ctx.fillText('RESET', X(-2.85), Z(-1.85))
  ctx.restore()
}

export function ArduinoModel({ part }) {
  const silk = useCanvasTexture(drawUnoSilk, ['uno-silk-3'], 1372, 1068)
  const chipTex = useLabel([{ text: 'ATMEGA328P-PU', font: 'bold 34px Arial' }], 512, 96)
  const { T, B } = UNO
  const pin13 = () => {
    const e = eng()
    if (!e || !e.arduinoRunning()) return 0
    const p = e.pins[13]
    return p.mode === 'OUTPUT' ? (p.pwm ? p.duty : p.out) : 0
  }
  const icsp = []
  for (const dx of [-P / 2, P / 2]) for (const dz of [-P, 0, P]) icsp.push({ id: `${dx},${dz}`, pos: [3.0 + dx, 0, 0.05 + dz] })
  const icsp2 = icsp.map((p) => ({ id: p.id, pos: [p.pos[0] - 4.85, 0, p.pos[2] - 1.6] }))
  return (
    <group>
      {/* espaçadores de nylon nos 4 furos */}
      {UNO_HOLES.map(([x, z], i) => (
        <group key={i}>
          <Cyl r={0.22} h={B} pos={[x, B / 2, z]} color="#efefea" rough={0.6} seg={12} />
          <Cyl r={0.2} h={0.08} pos={[x, T + 0.04, z]} color="#bfc3c7" metal={0.85} rough={0.3} seg={12} />
        </group>
      ))}
      <ShapePlate pts={UNO_OUTLINE} top={T - 0.002} t={T - B} color="#03808b" />
      <TopDecal tex={silk} w={6.858} d={5.334} pos={[0, T, 0]} alphaTest={0.5} coat />
      {/* USB-B (chapa niquelada) e jack de alimentação */}
      <UsbB pos={[-3.15, T, -1.2]} />
      <BarrelJack pos={[-3.0, T, 1.85]} />
      {/* regulador NCP1117 (SOT-223) com a aba de dissipação, díodo M7 e condensadores
          eletrolíticos SMD de 47 µF (lata de alumínio sobre base preta) */}
      <Chip pos={[-1.95, T, 0.95]} size={[0.65, 0.16, 0.36]} n={3} label="1117" />
      <Box size={[0.3, 0.03, 0.36]} pos={[-2.32, T + 0.03, 0.95]} color={METAL.tin} metal={1} rough={0.3} />
      <Box size={[0.42, 0.2, 0.26]} pos={[-2.55, T + 0.1, 0.35]} color="#202020" rough={0.5} />
      <Box size={[0.06, 0.205, 0.265]} pos={[-2.68, T + 0.1, 0.35]} color="#b8bcc2" rough={0.5} />
      {[[-2.05, 1.95], [-1.4, 1.95]].map(([x, z], i) => (
        <group key={i}>
          <RBox size={[0.64, 0.1, 0.64]} r={0.03} pos={[x, T + 0.05, z]} color="#161616" rough={0.55} />
          <Cyl r={0.3} h={0.5} pos={[x, T + 0.35, z]} color={METAL.alu} metal={1} rough={0.35} seg={28} />
          <Cyl r={0.302} h={0.2} pos={[x, T + 0.5, z - 0.0]} color="#1b1b1b" rough={0.5} seg={6} />
          <Cyl r={0.26} h={0.02} pos={[x, T + 0.6, z]} color="#c5c9ce" metal={1} rough={0.4} seg={24} />
        </group>
      ))}
      {/* passivos SMD 0805 (resistências pretas, condensadores castanhos) */}
      {[[-1.35, -0.35, 0, 0], [-1.35, -0.62, 0, 1], [-1.0, 0.15, 1, 0], [-2.45, -0.45, 1, 1], [-2.45, 0.05, 0, 0], [0.45, 0.35, 1, 1], [-0.75, -0.55, 0, 0], [-0.95, -1.05, 0, 0], [2.95, -0.62, 0, 1], [2.35, 0.55, 1, 0]].map(([x, z, r, c], i) => (
        <Smd key={i} pos={[x, T, z]} rotY={r ? Math.PI / 2 : 0} color={c ? '#8a6a48' : '#1c1c1c'} />
      ))}
      {/* ATmega328P DIP-28 no suporte */}
      <Box size={[3.62, 0.12, 0.92]} pos={[0.95, T + 0.06, 1.3]} color="#1d1d1d" />
      <RBox size={[3.56, 0.35, 0.74]} r={0.03} pos={[0.95, T + 0.3, 1.3]} color="#1b1b1b" rough={0.5} />
      <TopDecal tex={chipTex} w={2.4} d={0.45} pos={[1.05, T + 0.476, 1.3]} />
      <Cyl r={0.06} h={0.02} pos={[-0.68, T + 0.47, 1.3]} color="#090909" seg={12} />
      {Array.from({ length: 14 }).map((_, i) => (
        <group key={i}>
          <Box size={[0.06, 0.2, 0.08]} pos={[0.95 + (i - 6.5) * P, T + 0.2, 1.3 - 0.4]} color={METAL.tin} metal={1} rough={0.3} />
          <Box size={[0.06, 0.2, 0.08]} pos={[0.95 + (i - 6.5) * P, T + 0.2, 1.3 + 0.4]} color={METAL.tin} metal={1} rough={0.3} />
        </group>
      ))}
      {/* cristal 16 MHz (HC-49), ATmega16U2 (QFN-32), botão de reset */}
      <Crystal pos={[-0.25, T, 0.35]} l={1.05} h={0.3} d={0.42} />
      <SilkText text="16.000" pos={[-0.25, T + 0.362, 0.35]} w={0.5} d={0.13} color="#7d8288" font="bold 44px Arial" />
      <Chip pos={[-1.9, T, -0.45]} size={[0.5, 0.08, 0.5]} pkg="qfn" n={8} rotY={Math.PI / 4} label="16U2" />
      <TactSwitch pos={[-2.85, T, -2.25]} cap="#b71c1c" />
      <HeaderPins pins={icsp} base={T} />
      <HeaderPins pins={icsp2} base={T} />
      {/* conectores fêmea (topo = posição dos pinos do catálogo) */}
      {UNO_HEADERS.map((hd, i) => (
        <FemaleHeader key={i} n={hd.n} x={hd.x} z={hd.z} top={UNO_PINS[0].pos[1]} h={UNO_PINS[0].pos[1] - T} />
      ))}
      {/* LEDs */}
      <GlowLed pos={[2.62, T + 0.03, -0.45]} size={[0.16, 0.06, 0.08]} color="#33ff66" read={() => (eng()?.arduinoRunning() ? 1 : 0)} />
      <GlowLed pos={[-0.7, T + 0.03, -1.85]} size={[0.16, 0.06, 0.08]} color="#ffaa00" read={pin13} />
      <GlowLed pos={[-0.7, T + 0.03, -1.45]} size={[0.16, 0.06, 0.08]} color="#ffcc33" read={() => 0} />
      <GlowLed pos={[-0.7, T + 0.03, -1.25]} size={[0.16, 0.06, 0.08]} color="#ffcc33" read={() => 0} />
    </group>
  )
}

// ---------- Breadboard (meia, 400 pontos) ----------
function drawBreadboard(ctx, w, h) {
  const S = w / 8.45
  const X = (x) => (x + 4.1) * S
  const Z = (z) => (z + 2.75) * S
  ctx.fillStyle = '#f3f1ea'
  ctx.fillRect(0, 0, w, h)
  // canal central
  const g = ctx.createLinearGradient(0, Z(-0.2), 0, Z(0.2))
  g.addColorStop(0, '#c9c5b8')
  g.addColorStop(0.5, '#e6e2d6')
  g.addColorStop(1, '#c9c5b8')
  ctx.fillStyle = g
  ctx.fillRect(0, Z(-0.17), w, 0.34 * S)
  // ranhuras entre os trilhos e a área central
  ctx.fillStyle = '#e2ded2'
  ctx.fillRect(0, Z(-1.85), w, 0.06 * S)
  ctx.fillRect(0, Z(1.79), w, 0.06 * S)
  // linhas dos trilhos: azul (−) por fora, vermelho (+) por dentro
  ctx.lineWidth = 0.035 * S
  for (const [z, c] of [[-2.62, '#1e63d6'], [-1.95, '#d62828'], [1.95, '#d62828'], [2.62, '#1e63d6']]) {
    ctx.strokeStyle = c
    ctx.beginPath()
    ctx.moveTo(X(-3.75), Z(z))
    ctx.lineTo(X(3.95), Z(z))
    ctx.stroke()
  }
  ctx.font = `bold ${0.2 * S}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const [z, t, c] of [[bbRailZ.tn, '−', '#1e63d6'], [bbRailZ.tp, '+', '#d62828'], [bbRailZ.bp, '+', '#d62828'], [bbRailZ.bn, '−', '#1e63d6']]) {
    ctx.fillStyle = c
    ctx.fillText(t, X(-3.88), Z(z))
    ctx.fillText(t, X(4.12), Z(z))
  }
  const hole = (x, z) => {
    const cx = X(x)
    const cz = Z(z)
    const r = 0.06 * S
    ctx.fillStyle = '#d6d2c6'
    ctx.fillRect(cx - r - 2, cz - r - 2, 2 * r + 4, 2 * r + 4)
    const hg = ctx.createLinearGradient(cx - r, cz - r, cx + r, cz + r)
    hg.addColorStop(0, '#141414')
    hg.addColorStop(1, '#3a3a3a')
    ctx.fillStyle = hg
    ctx.fillRect(cx - r, cz - r, 2 * r, 2 * r)
    // lâminas de contacto (bronze fosforoso niquelado) a brilhar no fundo do furo
    ctx.fillStyle = '#8f9399'
    ctx.fillRect(cx - r * 0.55, cz - r * 0.12, r * 1.1, r * 0.24)
    ctx.fillStyle = '#c4c8cc'
    ctx.fillRect(cx - r * 0.4, cz - r * 0.06, r * 0.8, r * 0.1)
  }
  for (let c = 1; c <= BB.cols; c++) for (let r = 0; r < 10; r++) hole((c - 15) * PITCH, bbRowZ(r))
  for (const rail of BB.rails) for (let k = 0; k < 25; k++) hole(bbRailX(k), bbRailZ[rail])
  ctx.fillStyle = '#8a877e'
  ctx.font = `${0.13 * S}px Arial`
  for (let c = 1; c <= BB.cols; c++) {
    if (c % 5 && c !== 1) continue
    ctx.fillText(String(c), X((c - 15) * PITCH), Z(-1.63))
    ctx.fillText(String(c), X((c - 15) * PITCH), Z(1.63))
  }
  'abcdefghij'.split('').forEach((r, i) => {
    ctx.fillText(r, X(-3.86), Z(bbRowZ(i)))
    ctx.fillText(r, X(4.12), Z(bbRowZ(i)))
  })
}
export function BreadboardModel() {
  const tex = useCanvasTexture(drawBreadboard, ['bb-3'], 2048, Math.round((2048 * 5.5) / 8.45))
  return (
    <group>
      <RBox size={[8.45, 0.84, 5.5]} r={0.06} pos={[0.125, 0.42, 0]} color="#ece9df" rough={0.65} />
      {/* encaixes laterais (rabo de andorinha) */}
      {[-2.2, -0.8, 0.8, 2.2].map((x) => (
        <Box key={x} size={[0.35, 0.5, 0.12]} pos={[x + 0.125, 0.35, -2.79]} color="#e3e0d5" />
      ))}
      <mesh position={[0.125, 0.851, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8.45, 5.5]} />
        <meshStandardMaterial map={tex} roughness={0.62} />
      </mesh>
    </group>
  )
}

// ---------- Resistência (corpo "osso de cão", riscas com o código de cores) ----------
const BAND = ['#000000', '#7b3f00', '#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#9e9e9e', '#ffffff']
export function resistorBands(ohms) {
  const e = Math.max(0, Math.floor(Math.log10(ohms)) - 1)
  const sig = Math.round(ohms / Math.pow(10, e))
  return [BAND[Math.floor(sig / 10) % 10], BAND[sig % 10], BAND[e], '#c8a24a']
}
const RES_L = 0.63
const resProfile = (x) => {
  // raio ao longo do corpo (x de −L/2 a L/2): pontas bojudas, meio mais fino
  const u = Math.abs(x) / (RES_L / 2)
  return u > 0.97 ? 0.04 + 0.08 * Math.sqrt(Math.max(0, (1 - u) / 0.03)) : u > 0.62 ? 0.12 : u > 0.5 ? 0.12 - ((0.62 - u) / 0.12) * 0.018 : 0.102
}
const resBodyGeo = () =>
  geo('resBody', () => {
    const pts = []
    for (let i = 0; i <= 40; i++) {
      const x = -RES_L / 2 + (i / 40) * RES_L
      pts.push(new THREE.Vector2(resProfile(x), x))
    }
    return new THREE.LatheGeometry(pts, 20)
  })
export function ResistorModel({ part }) {
  const bands = resistorBands(part.config?.ohms ?? 220)
  const y = 0.3
  const bx = [-0.19, -0.11, -0.03, 0.17]
  return (
    <group>
      <Leg from={[-0.508, 0, 0]} to={[-0.508, y - 0.05, 0]} r={0.03} />
      <Leg from={[-0.508, y - 0.05, 0]} to={[-0.45, y, 0]} r={0.03} />
      <Leg from={[-0.45, y, 0]} to={[0.45, y, 0]} r={0.03} />
      <Leg from={[0.45, y, 0]} to={[0.508, y - 0.05, 0]} r={0.03} />
      <Leg from={[0.508, 0, 0]} to={[0.508, y - 0.05, 0]} r={0.03} />
      <group position={[0, y, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <mesh geometry={resBodyGeo()} material={mat('#dcc79c', 0, 0.62)} castShadow />
        {bands.map((c, i) => (
          <mesh key={i} position={[0, bx[i], 0]} geometry={geo(`resBand${i}`, () => new THREE.CylinderGeometry(resProfile(bx[i]) + 0.004, resProfile(bx[i]) + 0.004, 0.045, 20))} material={mat(c, i === 3 ? 1 : 0, i === 3 ? 0.35 : 0.7)} />
        ))}
      </group>
    </group>
  )
}

// ---------- LED 5 mm (cúpula, aba com o lado plano no cátodo, pernas) ----------
const ledFlangeGeo = () =>
  geo('ledFlange', () => {
    const r = 0.29
    const a = Math.acos(0.25 / r)
    const s = new THREE.Shape()
    s.absarc(0, 0, r, a, Math.PI * 2 - a, false)
    s.lineTo(0.25, Math.sin(a) * r)
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false, curveSegments: 24 })
    g.rotateX(Math.PI / 2) // extrusão para baixo, forma no plano xz
    return g
  })
export function LedModel({ part }) {
  const mats = useRef([])
  const light = useRef()
  const color = LED_COLORS[part.config?.color]?.hex || '#ff2a2a'
  useFrame(() => {
    const l = eng()?.leds.find((x) => x.part.id === part.id)
    const b = l ? l.b : 0
    for (const m of mats.current) {
      if (!m) continue
      m.emissiveIntensity = b * 4
      m.color.set(l?.burned ? '#3a2a2a' : color)
    }
    if (light.current) light.current.intensity = b * 5
  })
  const epoxy = (i) => <meshStandardMaterial ref={(m) => (mats.current[i] = m)} color={color} emissive={color} emissiveIntensity={0} transparent opacity={0.74} roughness={0.05} toneMapped={false} />
  return (
    <group>
      {/* ânodo (perna mais comprida, com dobra) e cátodo */}
      <Leg from={[-0.127, 0, 0]} to={[-0.127, 0.2, 0]} r={0.025} />
      <Leg from={[-0.127, 0.2, 0]} to={[-0.1, 0.27, 0]} r={0.025} />
      <Leg from={[-0.1, 0.27, 0]} to={[-0.1, 0.5, 0]} r={0.025} />
      <Leg from={[0.127, 0, 0]} to={[0.127, 0.5, 0]} r={0.025} />
      {/* armação interna (bigorna no cátodo) */}
      <Box size={[0.1, 0.18, 0.05]} pos={[0.09, 0.62, 0]} color={METAL.tin} metal={1} rough={0.3} />
      <Box size={[0.04, 0.16, 0.04]} pos={[-0.09, 0.62, 0]} color={METAL.tin} metal={1} rough={0.3} />
      {/* taça refletora com o chip e o fio de ouro até ao poste do ânodo */}
      <Cyl r={0.06} r2={0.04} h={0.04} pos={[0.07, 0.73, 0]} color={METAL.tin} metal={1} rough={0.2} seg={12} />
      <Leg from={[0.06, 0.75, 0]} to={[-0.09, 0.71, 0]} r={0.006} color={METAL.gold} />
      <mesh position={[0, 0.55, 0]} geometry={ledFlangeGeo()}>
        {epoxy(0)}
      </mesh>
      <mesh position={[0, 0.775, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.45, 24, 1, true]} />
        {epoxy(1)}
      </mesh>
      <mesh position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.25, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {epoxy(2)}
      </mesh>
      <pointLight ref={light} position={[0, 1.4, 0]} color={color} intensity={0} distance={6} />
      <Halo pos={[0, 0.85, 0]} size={3} color={color} read={() => eng()?.leds.find((x) => x.part.id === part.id)?.b || 0} />
    </group>
  )
}

// ---------- Botão de pressão 6×6 mm ----------
export function ButtonModel({ part }) {
  const cap = useRef()
  useFrame(() => {
    const pressed = !!simRef.inputs[part.id]?.pressed
    if (cap.current) cap.current.position.y = pressed ? 0.47 : 0.52
  })
  return (
    <group>
      {[[-0.254, -0.381], [0.254, -0.381], [-0.254, 0.381], [0.254, 0.381]].map(([x, z], i) => (
        <group key={i}>
          <Leg from={[x, 0, z]} to={[x, 0.12, z]} r={0.03} color="#cfd2d6" />
          <Leg from={[x, 0.12, z]} to={[x, 0.16, z * 0.78]} r={0.03} color="#cfd2d6" />
        </group>
      ))}
      <RBox size={[0.6, 0.3, 0.6]} r={0.03} pos={[0, 0.16 + 0.15, 0]} color="#1c1c1c" rough={0.5} />
      <Box size={[0.62, 0.025, 0.62]} pos={[0, 0.475, 0]} color={METAL.nickel} metal={1} rough={0.35} />
      {[-1, 1].map((sz) => (
        <Box key={sz} size={[0.2, 0.3, 0.02]} pos={[0, 0.33, sz * 0.31]} color={METAL.nickel} metal={1} rough={0.35} />
      ))}
      <group ref={cap} position={[0, 0.52, 0]}>
        <Cyl r={0.17} h={0.16} color={part.config?.color || '#e53935'} rough={0.45} seg={20} />
      </group>
    </group>
  )
}

// ---------- Potenciómetro rotativo ----------
export function PotModel({ part }) {
  const knob = useRef()
  useFrame(() => {
    const v = simRef.inputs[part.id]?.value ?? part.config?.value ?? 0.5
    if (knob.current) knob.current.rotation.y = (0.5 - v) * 1.5 * Math.PI
  })
  return (
    <group>
      {[-P, 0, P].map((x) => (
        <group key={x}>
          <Leg from={[x, 0, 0.508]} to={[x, 0.18, 0.508]} r={0.035} color="#cfd2d6" />
          <Leg from={[x, 0.18, 0.508]} to={[x, 0.22, 0.42]} r={0.035} color="#cfd2d6" />
        </group>
      ))}
      <RBox size={[0.98, 0.42, 0.95]} r={0.05} pos={[0, 0.39, -0.05]} color="#1f5fbf" rough={0.5} />
      <Box size={[1.0, 0.04, 0.97]} pos={[0, 0.6, -0.05]} color={METAL.nickel} metal={1} rough={0.35} />
      <Cyl r={0.2} h={0.25} pos={[0, 0.74, -0.05]} color="#c9a64a" metal={0.85} rough={0.3} />
      <group ref={knob} position={[0, 1.04, -0.05]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.3, 0.33, 0.38, 18]} />
          <meshStandardMaterial color="#202020" roughness={0.55} flatShading />
        </mesh>
        <Box size={[0.06, 0.02, 0.24]} pos={[0, 0.2, -0.15]} color="#f2f2f2" />
      </group>
    </group>
  )
}

// ---------- Buzzer ativo ----------
export function BuzzerModel() {
  return (
    <group>
      <Leg from={[-0.381, 0, 0]} to={[-0.381, 0.1, 0]} r={0.03} />
      <Leg from={[0.381, 0, 0]} to={[0.381, 0.1, 0]} r={0.03} />
      <Cyl r={0.6} h={0.82} pos={[0, 0.51, 0]} color="#151515" rough={0.35} seg={32} />
      <Cyl r={0.56} h={0.02} pos={[0, 0.93, 0]} color="#1d1d1d" rough={0.5} seg={32} />
      <Cyl r={0.1} h={0.03} pos={[0, 0.935, 0]} color="#050505" seg={16} />
      <Box size={[0.16, 0.012, 0.04]} pos={[-0.32, 0.945, 0]} color="#ddd" />
      <Box size={[0.04, 0.012, 0.16]} pos={[-0.32, 0.945, 0]} color="#ddd" />
    </group>
  )
}

// ---------- Bateria 2x18650 ----------
export function BatteryModel({ part }) {
  const c = part.config?.charge ?? 90
  const lab = useLabel([{ text: '3.7V 18650', font: 'bold 64px Arial' }], 512, 96)
  return (
    <group>
      <RBox size={[7.7, 0.25, 4.1]} r={0.06} pos={[0, 0.125, 0]} color="#151515" />
      <RBox size={[7.7, 1.3, 0.2]} r={0.05} pos={[0, 0.65, -1.95]} color="#151515" />
      <RBox size={[7.7, 1.3, 0.2]} r={0.05} pos={[0, 0.65, 1.95]} color="#151515" />
      <RBox size={[0.25, 1.3, 4.1]} r={0.05} pos={[-3.73, 0.65, 0]} color="#151515" />
      <RBox size={[0.25, 1.3, 4.1]} r={0.05} pos={[3.73, 0.65, 0]} color="#151515" />
      {[-0.93, 0.93].map((z, i) => (
        <group key={z}>
          <Cyl r={0.9} h={6.5} pos={[0, 1.1, z]} rot={[0, 0, Math.PI / 2]} color={i ? '#1e8e3e' : '#1565c0'} rough={0.3} seg={32} />
          <Cyl r={0.4} h={0.2} pos={[i ? -3.3 : 3.3, 1.1, z]} rot={[0, 0, Math.PI / 2]} color="#ddd" metal={0.9} rough={0.25} />
          <Cyl r={0.5} h={0.05} pos={[i ? 3.55 : -3.55, 1.1, z]} rot={[0, 0, Math.PI / 2]} color="#c0c4c8" metal={0.9} rough={0.3} />
        </group>
      ))}
      <mesh position={[0, 2.005, -0.93]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 0.55]} />
        <meshBasicMaterial map={lab} transparent />
      </mesh>
      <mesh position={[0, 2.005, 0.93]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 0.55]} />
        <meshBasicMaterial map={lab} transparent />
      </mesh>
      {/* fios de saída (+ vermelho, − preto) */}
      <Cyl r={0.08} h={0.6} pos={[3.95, 1.0, -0.6]} rot={[0, 0, Math.PI / 2]} color="#e53935" rough={0.45} />
      <Cyl r={0.08} h={0.6} pos={[3.95, 1.0, 0.6]} rot={[0, 0, Math.PI / 2]} color="#212121" rough={0.45} />
      <RBox size={[1.0, 0.5, 0.5]} r={0.05} pos={[-2.5, 0.5, -2.3]} color="#333" />
      <GlowLed pos={[-2.5, 0.8, -2.3]} size={[0.3, 0.12, 0.2]} color={c > 25 ? '#33ff66' : '#ff4422'} read={() => (eng() ? 1 : 0)} />
    </group>
  )
}

// ---------- Regulador LM2596 ----------
export function BuckModel({ part }) {
  const lab = useLabel([{ text: 'LM2596', font: 'bold 60px Arial' }], 256, 96)
  return (
    <group>
      <mesh position={[0, 0.33, 0]} castShadow geometry={geo('buckPcb', () => new RoundedBoxGeometry(4.3, 0.16, 2.1, 2, 0.03))} material={pcbMat('#1a4fb8')} />
      {[[-1.9, -0.8], [1.9, -0.8], [-1.9, 0.8], [1.9, 0.8]].map(([x, z], i) => (
        <Standoff key={i} x={x} z={z} h={0.25} />
      ))}
      <Box size={[1.2, 0.45, 1.0]} pos={[0.2, 0.635, 0]} color="#2b2b2b" />
      <Box size={[0.5, 0.05, 1.0]} pos={[0.2, 0.43, 0.75]} color="#c9ccd1" metal={0.9} />
      <mesh position={[0.2, 0.862, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.0, 0.38]} />
        <meshBasicMaterial map={lab} transparent />
      </mesh>
      <Cyl r={0.42} h={0.55} pos={[0.2, 0.68, -0.0]} color="#2e2e2e" rough={0.6} seg={8} />
      <ECap pos={[-1.1, 0.41, 0.45]} r={0.4} h={0.9} color="#161616" stripe="#8d939a" />
      <ECap pos={[1.3, 0.41, 0.45]} r={0.35} h={0.8} color="#161616" stripe="#8d939a" />
      <Box size={[0.5, 0.5, 0.5]} pos={[1.3, 0.66, -0.5]} color="#2a62d8" />
      <Cyl r={0.12} h={0.08} pos={[1.3, 0.93, -0.5]} color="#e0c46a" metal={0.85} rough={0.3} />
      {['IN+', 'IN-', 'OUT+', 'OUT-'].map((_, i) => (
        <group key={i}>
          <Cyl r={0.16} h={0.03} pos={[i < 2 ? -1.95 : 1.95, 0.42, i % 2 ? 0.6 : -0.6]} color="#d4af37" metal={0.85} rough={0.3} seg={14} />
          <Cyl r={0.06} h={0.34} pos={[i < 2 ? -1.95 : 1.95, 0.58, i % 2 ? 0.6 : -0.6]} color="#c9a24a" metal={0.8} seg={8} />
        </group>
      ))}
      <GlowLed pos={[-0.6, 0.44, -0.7]} color="#3366ff" read={() => (powered(part.id) ? 1 : 0)} />
    </group>
  )
}

// ---------- L298N ----------
// bloco de bornes de parafuso (azul) com n vias ao longo de x; entrada dos fios em −z
function Terminal({ pos, n, rotY = 0, base }) {
  const w = n * 0.5 + 0.06
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <RBox size={[w, 0.85, 0.75]} r={0.03} pos={[0, base + 0.425, 0]} color="#1f6fd1" rough={0.45} />
      {Array.from({ length: n }).map((_, i) => {
        const x = (i - (n - 1) / 2) * 0.5
        return (
          <group key={i}>
            <Cyl r={0.15} h={0.05} pos={[x, base + 0.86, 0.12]} color="#cfd2d6" metal={0.9} rough={0.25} seg={16} />
            <Box size={[0.24, 0.02, 0.04]} pos={[x, base + 0.89, 0.12]} color="#555" />
            {/* entrada do fio */}
            <Box size={[0.3, 0.28, 0.02]} pos={[x, base + 0.24, -0.376]} color="#0d0d0d" />
            <Box size={[0.26, 0.04, 0.02]} pos={[x, base + 0.13, -0.38]} color="#bfc3c7" metal={0.9} />
          </group>
        )
      })}
    </group>
  )
}
function drawL298(ctx, w, h) {
  const S = w / 4.3
  const X = (x) => (x + 2.15) * S
  const Z = (z) => (z + 2.15) * S
  ctx.fillStyle = '#b81d23'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(120,10,15,0.9)'
  ctx.lineWidth = 0.04 * S
  for (let i = 0; i < 9; i++) {
    ctx.beginPath()
    ctx.moveTo(X(0.2), Z(-1.2 + i * 0.3))
    ctx.lineTo(X(1.3), Z(-1.2 + i * 0.3))
    ctx.lineTo(X(1.5), Z(-1.0 + i * 0.3))
    ctx.stroke()
  }
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `bold ${0.3 * S}px Arial`
  ctx.fillText('L298N', X(0.75), Z(-0.25))
  ctx.font = `bold ${0.14 * S}px Arial`
  ctx.fillText('OUT1  OUT2', X(0), Z(-1.2))
  ctx.fillText('OUT4  OUT3', X(0), Z(1.2))
  ctx.save()
  ctx.translate(X(1.25), Z(-1.1))
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('+12V GND +5V', 0, 0)
  ctx.restore()
  ctx.save()
  ctx.translate(X(1.45), Z(1.14))
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('ENA IN1 IN2 IN3 IN4 ENB', 0, 0)
  ctx.restore()
  for (const [x, z] of [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]]) {
    ctx.fillStyle = '#d4af37'
    ctx.beginPath()
    ctx.arc(X(x), Z(z), 0.2 * S, 0, Math.PI * 2)
    ctx.fill()
  }
}
export function L298NModel({ part }) {
  const silk = useCanvasTexture(drawL298, ['l298-2'], 512, 512)
  const chip = useLabel([{ text: 'L298N', font: 'bold 64px Arial' }], 256, 96)
  const cfg = part.config || {}
  const T = 1.06
  const logic = DEFS.l298n.pins.filter((p) => !p.conn)
  const zOf = (id) => DEFS.l298n.pins.find((p) => p.id === id).pos[2]
  return (
    <group>
      {[[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]].map(([x, z], i) => (
        <group key={i}>
          <Cyl r={0.17} h={0.9} pos={[x, 0.45, z]} color="#c6a24a" metal={0.8} rough={0.3} seg={6} />
          <Cyl r={0.15} h={0.06} pos={[x, T + 0.03, z]} color="#c6a24a" metal={0.8} rough={0.3} seg={6} />
        </group>
      ))}
      <mesh position={[0, 0.98, 0]} castShadow geometry={geo('l298Pcb', () => new RoundedBoxGeometry(4.3, 0.16, 4.3, 2, 0.04))} material={pcbMat('#a3161c')} />
      <TopDecal tex={silk} w={4.3} d={4.3} pos={[0, T + 0.001, 0]} coat />
      {/* dissipador com alhetas + circuito L298 (Multiwatt) */}
      <Box size={[1.5, 0.3, 2.6]} pos={[-1.05, T + 0.15, 0]} color="#1e1e1e" metal={0.6} rough={0.45} />
      {Array.from({ length: 10 }).map((_, i) => (
        <Box key={i} size={[1.5, 1.55, 0.09]} pos={[-1.05, T + 1.05, -1.25 + i * (2.5 / 9)]} color="#262626" metal={0.6} rough={0.4} />
      ))}
      <RBox size={[0.45, 1.0, 2.0]} r={0.03} pos={[-0.08, T + 0.8, 0]} color="#151515" rough={0.45} />
      <mesh position={[0.15, T + 0.85, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.4, 0.5]} />
        <meshBasicMaterial map={chip} transparent />
      </mesh>
      {Array.from({ length: 15 }).map((_, i) => (
        <Box key={`l${i}`} size={[0.35, 0.04, 0.06]} pos={[0.25, T + 0.15, -0.9 + i * 0.13]} color="#c9ccd1" metal={0.9} />
      ))}
      {/* condensadores, regulador 78M05, díodos */}
      <ECap pos={[0.85, T, 0.95]} r={0.33} h={0.85} color="#1b2a6b" />
      <ECap pos={[0.85, T, -0.75]} r={0.33} h={0.85} color="#1b2a6b" />
      <Chip pos={[1.15, T, 0.15]} size={[0.65, 0.23, 0.6]} n={3} label="78M05" />
      {Array.from({ length: 8 }).map((_, i) => (
        <Smd key={`d${i}`} pos={[0.45 + (i % 2) * 0.3, T, -1.45 + Math.floor(i / 2) * 0.3 + (i > 3 ? 1.6 : 0)]} len={0.24} wid={0.13} h={0.08} color="#141414" />
      ))}
      {/* bornes: motores (OUT1/2 em −z, OUT3/4 em +z) e alimentação (+x) */}
      <Terminal pos={[0, 0, -1.75]} n={2} base={T} />
      <Terminal pos={[0, 0, 1.75]} n={2} rotY={Math.PI} base={T} />
      <Terminal pos={[1.75, 0, -1.1]} n={3} rotY={-Math.PI / 2} base={T} />
      {/* pinos de controlo (machos) com espaçador alto */}
      {logic.map((p) => (
        <group key={p.id} position={[p.pos[0], 0, p.pos[2]]}>
          <Box size={[0.254, p.pos[1] - 0.05 - T, 0.254]} pos={[0, (T + p.pos[1] - 0.05) / 2, 0]} color="#111" rough={0.5} />
          <Box size={[0.064, 0.95, 0.064]} pos={[0, p.pos[1] + 0.12, 0]} color="#d4af37" metal={0.9} rough={0.25} />
        </group>
      ))}
      {cfg.enaJumper && <RBox size={[0.27, 0.6, 0.55]} r={0.03} pos={[1.85, 1.85, zOf('ENA') - 0.13]} color="#111" />}
      {cfg.enbJumper && <RBox size={[0.27, 0.6, 0.55]} r={0.03} pos={[1.85, 1.85, zOf('ENB') + 0.13]} color="#111" />}
      {cfg.reg5v !== false && <RBox size={[0.27, 0.55, 0.52]} r={0.03} pos={[1.0, T + 0.4, -1.85]} color="#111" />}
      <GlowLed pos={[0.35, T + 0.04, 1.2]} color="#ff2222" read={() => (powered(part.id) ? 1 : 0)} />
    </group>
  )
}

// ---------- Motor TT + roda (roda sempre do lado −z local) ----------
// Caixa redutora amarela, motor metálico atrás (−x) com as patilhas de solda na tampa.
export function MotorModel({ part }) {
  const wheel = useRef()
  useFrame(() => {
    const m = eng()?.motors.find((x) => x.part.id === part.id)
    if (wheel.current) wheel.current.rotation.z = m ? -m.angle : 0
  })
  // eixo sempre à altura normal (Ra) no chassi; a roda escolhida tem raio R e largura W e
  // cresce para fora (a face de dentro fica onde estava); com R > Ra o chassi sobe (vehicleLift)
  const Ra = CHASSIS.wheelRadius
  const wh = motorWheel(part.config)
  const R = wh.r
  const W = wh.w
  const wheelZ = -(CHASSIS.trackWidth / 2 - CHASSIS.motorZ) - (W - CHASSIS.wheelWidth) / 2
  const pins = DEFS.motor.pins
  return (
    <group>
      {/* caixa redutora */}
      <RBox size={[4.4, 2.2, 1.9]} r={0.15} pos={[0.5, Ra, 0]} color="#f2c21b" rough={0.5} />
      <Cyl r={0.55} h={0.25} pos={[0, Ra, -1.05]} rot={[Math.PI / 2, 0, 0]} color="#e6b512" rough={0.5} />
      <Cyl r={0.55} h={0.25} pos={[0, Ra, 1.05]} rot={[Math.PI / 2, 0, 0]} color="#e6b512" rough={0.5} />
      {[[-1.2, 0.8], [1.9, 0.8], [1.9, -0.8], [-1.2, -0.8]].map(([x, dy], i) => (
        <Cyl key={i} r={0.1} h={1.95} pos={[x, Ra + dy, 0]} rot={[Math.PI / 2, 0, 0]} color="#9aa0a6" metal={0.8} seg={8} />
      ))}
      {/* motor (lata metálica) com tampa de plástico e patilhas */}
      <Cyl r={1.0} h={2.3} pos={[-2.95, Ra, 0]} rot={[0, 0, Math.PI / 2]} color="#c8ccd2" metal={0.9} rough={0.28} seg={28} />
      <Cyl r={0.88} h={0.16} pos={[-4.18, Ra, 0]} rot={[0, 0, Math.PI / 2]} color="#2a2a2a" rough={0.5} seg={24} />
      {pins.map((p) => (
        <group key={p.id}>
          <Box size={[0.22, 0.3, 0.12]} pos={[p.pos[0] + 0.06, p.pos[1], p.pos[2]]} color="#d9a441" metal={0.9} rough={0.3} />
          <Cyl r={0.06} h={0.08} pos={[p.pos[0] - 0.02, p.pos[1], p.pos[2]]} rot={[0, 0, Math.PI / 2]} color="#cfd2d6" metal={0.7} rough={0.4} seg={10} />
        </group>
      ))}
      {/* suporte de fixação à placa */}
      <RBox size={[0.35, 1.3, 1.8]} r={0.04} pos={[1.5, CHASSIS.plateBottom - 0.65, 0]} color="#1c1c1c" />
      <RBox size={[0.35, 1.3, 1.8]} r={0.04} pos={[-1.6, CHASSIS.plateBottom - 0.65, 0]} color="#1c1c1c" />
      {/* veio */}
      <Cyl r={0.27} h={Math.abs(wheelZ)} pos={[0, Ra, wheelZ / 2]} rot={[Math.PI / 2, 0, 0]} color="#fafafa" />
      {wh.disc && (
        <group ref={wheel} position={[0, Ra, wheelZ]}>
          {/* disco impresso: eixo da roda = −z local do motor (o DiscWheel cresce para +y) */}
          <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -W / 2]}>
            <DiscWheel R={R} W={W} color={part.config?.wheelColor || wh.rim} />
          </group>
        </group>
      )}
      <group ref={wh.disc ? undefined : wheel} position={[0, Ra, wheelZ]} visible={!wh.disc}>
        {/* pneu com flancos arredondados e piso */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow geometry={geo(`tire${R},${W}`, () => new THREE.CylinderGeometry(R, R, Math.max(0.2, W - 0.5), 48))} material={mat('#1b1b1b', 0, 0.95)} />
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, 0, (s * Math.max(0.2, W - 0.5)) / 2]} geometry={geo(`tireSide${R}`, () => new THREE.TorusGeometry(R - 0.25, 0.25, 10, 48))} material={mat('#1b1b1b', 0, 0.95)} castShadow />
        ))}
        {[-1, 1].map((s) => (
          <mesh key={`w${s}`} position={[0, 0, (s * W) / 2]} rotation={[Math.PI / 2, 0, 0]} geometry={geo(`tireWall${R}`, () => new THREE.CylinderGeometry(R - 0.25, R - 0.25, 0.02, 48))} material={mat('#222', 0, 0.9)} />
        ))}
        {/* jante amarela com raios */}
        <mesh rotation={[Math.PI / 2, 0, 0]} geometry={geo(`rim${R},${W}`, () => new THREE.CylinderGeometry(R * 0.66, R * 0.66, W + 0.08, 36))} material={mat(part.config?.wheelColor || wh.rim, 0, 0.45)} />
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 3]} position={[0, 0, -(W / 2 + 0.06)]} geometry={geo(`spoke${R}`, () => new THREE.BoxGeometry(R * 1.25, 0.32, 0.12))} material={mat('#d9a514', 0, 0.5)} />
        ))}
        <Cyl r={0.45} h={W + 0.3} rot={[Math.PI / 2, 0, 0]} color="#e0b010" rough={0.45} />
        {Array.from({ length: 20 }).map((_, i) => {
          const a = (i / 20) * Math.PI * 2
          return (
            <mesh key={`t${i}`} position={[Math.cos(a) * (R + 0.01), Math.sin(a) * (R + 0.01), 0]} rotation={[0, 0, a]} geometry={geo(`tread${W}`, () => new THREE.BoxGeometry(0.1, 0.32, W * 0.82))} material={mat('#2c2c2c', 0, 0.9)} />
          )
        })}
      </group>
    </group>
  )
}

// ---------- Servos ----------
// (exportado: os micro servos do grupo G reaproveitam o corpo; dims.angleOf(id) dá o ângulo
// de servos que não são do engine — ex.: rotação contínua via live.mountAngle)
export function ServoBody({ part, dims }) {
  const { L, H, W, hornX, tabY, color, label, metalGear } = dims
  const big = L > 3 // MG996R e afins: orelhas com 2 furos, ilhós de borracha e casquilhos de latão
  const horn = useRef()
  const tex = useLabel(
    [
      { text: label, font: 'bold 74px Arial', y: 58 },
      { text: metalGear ? (big ? 'HIGH TORQUE · METAL GEAR' : 'METAL GEAR · 9g') : 'MICRO SERVO · 9g', font: 'bold 26px Arial', y: 108 },
    ],
    512,
    128,
  )
  useFrame(() => {
    const s = eng()?.servoOf?.get(part.id)
    const a = dims.angleOf ? dims.angleOf(part.id) : s ? s.angle : 90
    if (horn.current) horn.current.rotation.y = servoHornRotation(a)[1] * D2R
  })
  const pins = servoPins(part.type)
  const cy = pins[0].pos[1]
  // engrenagem/polia/roda no veio ou peça do grupo Materiais no braço: o braço deixa de se ver
  const noHorn = useStore((st) => st.parts.some((q) => q.parent?.id === part.id && q.parent.mount === 'horn' && hidesHorn(q.type)))
  const seam = mat('#000000', 0, 0.8, { transparent: true, opacity: 0.35, depthWrite: false })
  const holes = big ? [-0.27, 0.27].map((z) => z * W * 1.3) : [0]
  return (
    <group>
      {/* caixa em 3 partes (tampa, corpo, fundo): juntas marcadas por uma linha escura */}
      <RBox size={[L, H, W]} r={0.06} pos={[0, H / 2, 0]} color={color} rough={0.32} />
      {[H * 0.12, tabY + 0.2, H - 0.06].map((y) => (
        <mesh key={y} position={[0, y, 0]} geometry={geo(`servoSeam${L},${W}`, () => new THREE.BoxGeometry(L + 0.006, 0.018, W + 0.006))} material={seam} />
      ))}
      <RBox size={[L + 1.0, 0.25, W]} r={0.04} pos={[0, tabY, 0]} color={color} rough={0.32} />
      {[-1, 1].map((s) =>
        holes.map((z) => (
          <group key={`${s}${z}`} position={[s * (L / 2 + 0.27), tabY, z]}>
            {big ? (
              <>
                {/* ilhó de borracha (à volta da orelha) e casquilho de latão */}
                <Cyl r={0.17} h={0.42} color="#1a1a1a" rough={0.85} seg={16} />
                <Cyl r={0.2} h={0.06} pos={[0, 0.2, 0]} color="#1a1a1a" rough={0.85} seg={16} />
                <Cyl r={0.2} h={0.06} pos={[0, -0.2, 0]} color="#1a1a1a" rough={0.85} seg={16} />
                <Cyl r={0.09} h={0.48} color={METAL.brass} metal={1} rough={0.3} seg={12} />
                <Cyl r={0.055} h={0.5} color="#0a0a0a" seg={10} />
              </>
            ) : (
              <>
                <Cyl r={0.1} h={0.27} color="#0a0a0a" seg={12} />
                <Box size={[0.2, 0.27, 0.06]} pos={[s * 0.12, 0, 0]} color="#0a0a0a" />
              </>
            )}
          </group>
        )),
      )}
      {/* etiqueta lateral */}
      <mesh position={[0, H * 0.55, W / 2 + 0.002]}>
        <planeGeometry args={[L * 0.9, L * 0.22]} />
        <meshBasicMaterial map={tex} transparent />
      </mesh>
      {/* parafusos compridos que fecham a caixa (por baixo) */}
      {[-1, 1].map((s) => (
        <Cyl key={`p${s}`} r={0.07} h={0.02} pos={[s * (L / 2 - 0.15), -0.005, s * (W / 2 - 0.15)]} color={METAL.nickel} metal={1} rough={0.35} seg={10} />
      ))}
      {/* tampa das engrenagens */}
      <Cyl r={W * 0.48} h={0.35} pos={[hornX, H + 0.17, 0]} color={color} rough={0.4} seg={28} />
      <Cyl r={W * 0.26} h={0.25} pos={[hornX - W * 0.5, H + 0.12, 0]} color={color} rough={0.4} seg={20} />
      <Cyl r={0.13} h={0.3} pos={[hornX, H + 0.42, 0]} color={metalGear ? '#d4af37' : '#f0f0f0'} metal={metalGear ? 0.8 : 0} rough={0.4} seg={12} />
      {/* braço do servo (roda com o ângulo) */}
      <group ref={horn} position={[hornX, H + 0.45, 0]} visible={!noHorn}>
        <Cyl r={0.34} h={0.16} color="#f5f5f5" rough={0.5} />
        <Cyl r={0.1} h={0.02} pos={[0, 0.085, 0]} color={METAL.nickel} metal={1} rough={0.35} seg={12} />
        <RBox size={[1.75, 0.13, 0.42]} r={0.05} pos={[0.72, 0, 0]} color="#f5f5f5" rough={0.5} />
        <RBox size={[0.42, 0.13, 1.45]} r={0.05} pos={[0, 0, 0]} color="#f5f5f5" rough={0.5} />
        {[0.45, 0.8, 1.15, 1.5].map((x) => (
          <Cyl key={x} r={0.04} h={0.14} pos={[x, 0, 0]} color="#7a7a7a" seg={8} />
        ))}
      </group>
      {/* cabo (castanho, vermelho, laranja) e ficha fêmea de 3 vias: a face de trás (−x) é onde entra o jumper */}
      {pins.map((p, i) => (
        <Leg key={p.id} from={[-L / 2 + 0.05, 0.42, (i - 1) * 0.1]} to={[p.pos[0] + 0.42, cy, p.pos[2]]} r={0.05} color={['#6d4c41', '#e53935', '#fb8c00'][i]} />
      ))}
      <RBox size={[0.42, 0.26, 0.78]} r={0.02} pos={[p0(pins) + 0.21, cy, 0]} color="#111" rough={0.5} />
      {pins.map((p) => (
        <Box key={`h${p.id}`} size={[0.02, 0.12, 0.12]} pos={[p.pos[0] - 0.001, cy, p.pos[2]]} color="#000" />
      ))}
    </group>
  )
}
const p0 = (pins) => pins[0].pos[0]
const servoPins = (type) => DEFS[type].pins
export const ServoModel = ({ part }) => <ServoBody part={part} dims={{ L: 2.3, H: 2.27, W: 1.22, hornX: 0.55, tabY: 1.6, color: '#2a62d8', label: 'SG90', pinX: -2.3 }} />
export const ServoMGModel = ({ part }) => <ServoBody part={part} dims={{ L: 4.07, H: 3.75, W: 1.98, hornX: 1.0, tabY: 2.75, color: '#151515', label: 'MG996R', pinX: -3.4, metalGear: true }} />

// ---------- Garra ----------
// Garra com micro servo, como as garras impressas em 3D (PETG preto): base com o SG90 dentro,
// 4 engrenagens com rolamentos de aço que rodam com a abertura e dois dedos curvos em C com
// almofada de borracha na zona de aperto. Os dedos deslizam como na física (def.jaws).
const PRINT = '#1c1d1f'
function gripFingerShape() {
  // lado +z (no plano da forma y = −z: o lado de dentro é +y); a almofada fica em y = 0,125
  const s = new THREE.Shape()
  s.moveTo(2.1, -0.3)
  s.bezierCurveTo(2.9, -0.75, 3.7, -0.95, 4.6, -0.85)
  s.bezierCurveTo(5.6, -0.75, 6.3, -0.45, 6.5, 0.0)
  s.lineTo(6.45, 0.125)
  s.lineTo(4.8, 0.125)
  s.bezierCurveTo(4.4, -0.3, 3.7, -0.45, 3.1, -0.38)
  s.bezierCurveTo(2.7, -0.3, 2.35, -0.05, 2.1, 0.1)
  s.lineTo(2.1, -0.3)
  return s
}
export function GripperModel({ part }) {
  const a = useRef()
  const b = useRef()
  const gears = [useRef(), useRef(), useRef(), useRef()]
  useFrame(() => {
    const opening = 0.4 + (jawDeg(part.id) / 180) * 4
    if (a.current) a.current.position.z = -opening / 2 - 0.15
    if (b.current) b.current.position.z = opening / 2 + 0.15
    // engrenagens: rodam com a abertura (alternando o sentido, como engrenadas em linha)
    gears.forEach((g, i) => g.current && (g.current.rotation.y = (i % 2 ? -1 : 1) * opening * 0.9))
  })
  const pins = DEFS.gripper.pins
  const cy = pins[0].pos[1]
  const finger = geo('gripFinger', () => {
    const g = new THREE.ExtrudeGeometry(gripFingerShape(), { depth: 0.5, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 24 })
    g.rotateX(-Math.PI / 2)
    return g
  })
  const gearG = gearGeoFor(11, 0.1, 0.32)
  const steel = mat('#d0d4d8', 0.95, 0.25)
  return (
    <group>
      {/* base impressa e caixa do servo */}
      <RBox size={[3.4, 0.3, 4.6]} r={0.15} pos={[1.6, 0.15, 0]} color={PRINT} rough={0.7} />
      <RBox size={[1.9, 1.0, 1.0]} r={0.08} pos={[1.0, 0.8, 0]} color={PRINT} rough={0.7} />
      <RBox size={[1.2, 0.22, 4.4]} r={0.08} pos={[2.1, 1.1, 0]} color={PRINT} rough={0.7} />
      {/* 4 engrenagens com rolamento (as das pontas) */}
      {[-1.65, -0.55, 0.55, 1.65].map((z, i) => (
        <group key={z} ref={gears[i]} position={[1.75, 1.22, z]}>
          <mesh geometry={gearG} material={mat(PRINT, 0, 0.7)} castShadow receiveShadow />
          {(i === 0 || i === 3) && (
            <>
              <Cyl r={0.33} h={0.36} pos={[0, 0.17, 0]} color="#c9ccd0" metal={0.95} rough={0.3} seg={24} />
              <Cyl r={0.24} h={0.37} pos={[0, 0.17, 0]} color="#2a2a2a" rough={0.5} seg={24} />
              <Cyl r={0.14} h={0.38} pos={[0, 0.17, 0]} color="#c9ccd0" metal={0.95} rough={0.3} seg={16} />
            </>
          )}
          {(i === 1 || i === 2) && <Cyl r={0.09} h={0.4} pos={[0, 0.17, 0]} color="#111" seg={10} />}
        </group>
      ))}
      <mesh geometry={geo('gripScrewHead', () => new THREE.CylinderGeometry(0.15, 0.15, 0.08, 6))} material={steel} position={[1.75, 1.6, -0.55]} />
      {/* cabo do servo */}
      <RBox size={[0.42, 0.26, 0.78]} r={0.02} pos={[pins[0].pos[0] + 0.21, cy, 0]} color="#111" />
      {pins.map((p, i) => (
        <Leg key={p.id} from={[p.pos[0] + 0.42, cy, p.pos[2]]} to={[0.05, 0.6, (i - 1) * 0.1]} r={0.045} color={['#6d4c41', '#e53935', '#fb8c00'][i]} />
      ))}
      {/* dedos curvos (deslizam) com almofada de borracha */}
      {[a, b].map((ref, i) => {
        const sz = i ? 1 : -1
        return (
          <group key={i} ref={ref} position={[0, 0, sz * 1.15]}>
            <group scale={[1, 1, sz]}>
              <mesh geometry={finger} position={[0, 0.35, 0]} material={mat(PRINT, 0, 0.7)} castShadow receiveShadow />
              <RBox size={[1.6, 0.5, 0.05]} r={0.02} pos={[5.6, 0.6, -0.15]} color="#3a3a3a" rough={0.95} />
            </group>
          </group>
        )
      })}
    </group>
  )
}

// ---------- Mecânica ----------
export function ArmLinkModel({ part }) {
  const L = part.config?.length ?? 10
  return (
    <group>
      <RBox size={[L + 1.6, 0.3, 2.0]} r={0.06} pos={[L / 2, 0.15, 0]} color="#cfd4da" metal={0.85} rough={0.3} />
      {Array.from({ length: Math.floor(L / 1.5) + 1 }).map((_, i) => (
        <Cyl key={i} r={0.18} h={0.32} pos={[i * 1.5, 0.15, 0]} color="#3a3f45" />
      ))}
    </group>
  )
}
export function ArmBaseModel() {
  return (
    <group>
      <Cyl r={6} h={1.2} pos={[0, 0.6, 0]} color="#2b2f36" metal={0.4} rough={0.5} seg={48} />
      <Cyl r={6.1} h={0.15} pos={[0, 0.08, 0]} color="#111" seg={48} />
      {Array.from({ length: 6 }).map((_, i) => (
        <Cyl key={i} r={0.25} h={0.05} pos={[Math.cos((i * Math.PI) / 3) * 5, 1.22, Math.sin((i * Math.PI) / 3) * 5]} color="#888" metal={0.9} />
      ))}
    </group>
  )
}
export function CubeModel({ part }) {
  return <RBox size={[2.5, 2.5, 2.5]} r={0.12} pos={[0, 1.25, 0]} color={part.config?.color || '#ff7043'} rough={0.6} />
}

// ---------- Sensor IR TCRT5000 (módulo com LM393) ----------
const IR_PCB = { y0: 1.44, y1: 1.56 }
export function IRModel({ part }) {
  const onChassis = part.parent?.mount === 'bottom'
  const beyond = onChassis && part.pos[0] > CHASSIS.plateX[1] - 0.5
  const pins = DEFS.ir.pins
  const { y0, y1 } = IR_PCB
  const sx = -0.55 // furo de fixação (espaçador até ao chassi)
  return (
    <group>
      <mesh position={[0, (y0 + y1) / 2, 0]} castShadow geometry={geo('irPcb', () => new RoundedBoxGeometry(3.2, y1 - y0, 1.4, 2, 0.02))} material={pcbMat('#1a4fb8')} />
      {/* TCRT5000 por baixo, virado para o chão */}
      <RBox size={[0.58, 0.62, 1.02]} r={0.03} pos={[1.05, y0 - 0.31, 0]} color="#151515" rough={0.45} />
      <Cyl r={0.2} h={0.18} pos={[1.05, y0 - 0.7, -0.25]} color="#5c7cff" rough={0.15} />
      <Cyl r={0.2} h={0.18} pos={[1.05, y0 - 0.7, 0.25]} color="#0a0a0a" rough={0.15} />
      {/* em cima: LM393, potenciómetro de ajuste, resistências, LEDs */}
      <Box size={[0.5, 0.15, 0.4]} pos={[0.2, y1 + 0.075, 0.35]} color="#111" />
      <RBox size={[0.62, 0.45, 0.62]} r={0.04} pos={[0.6, y1 + 0.225, -0.3]} color="#2a62d8" />
      <Cyl r={0.17} h={0.1} pos={[0.6, y1 + 0.5, -0.3]} color="#e0c46a" metal={0.8} rough={0.3} />
      <Box size={[0.25, 0.02, 0.04]} pos={[0.6, y1 + 0.555, -0.3]} color="#6b5a20" />
      {[[-0.35, -0.4], [-0.35, -0.2], [-0.15, 0.55]].map(([x, z], i) => (
        <Box key={i} size={[0.18, 0.06, 0.1]} pos={[x, y1 + 0.03, z]} color="#222" />
      ))}
      <HeaderPins pins={pins.map((p) => ({ id: p.id, pos: p.pos }))} base={y1} />
      <GlowLed pos={[0.0, y1 + 0.04, -0.45]} size={[0.15, 0.08, 0.12]} color="#ff3333" read={() => (powered(part.id) ? 1 : 0)} />
      <GlowLed
        pos={[0.25, y1 + 0.04, -0.45]}
        size={[0.15, 0.08, 0.12]}
        color="#33ff55"
        read={() => {
          const s = eng()?.irs.find((x) => x.part.id === part.id)
          return powered(part.id) && s && s.do === 0 ? 1 : 0
        }}
      />
      {onChassis && <Cyl r={0.17} h={CHASSIS.plateBottom - y1} pos={[beyond ? 0 : sx, (CHASSIS.plateBottom + y1) / 2, 0]} color="#c6a24a" metal={0.75} rough={0.3} seg={6} />}
      {beyond && (
        <RBox size={[part.pos[0] - CHASSIS.plateX[1] + 1.5, 0.25, 1.0]} r={0.03} pos={[-(part.pos[0] - CHASSIS.plateX[1] + 1.5) / 2, CHASSIS.plateBottom - 0.125, 0]} color="#222" />
      )}
    </group>
  )
}

// ---------- HC-SR04 (de pé, transdutores virados para +x) ----------
// Como o módulo real (e o desenho do wokwi/Velxio): placa azul de 4,5 × 2 cm, barra de 4 pinos
// no bordo de baixo, a meio, com o plástico preto atrás da placa e os pinos direitos para baixo
// (VCC, Trig, Echo, GND), ou em ângulo reto / a 45° para trás (config.pinosDir, shared/sonar.js).
// Com os pinos para baixo a placa fica 0,6 cm acima das pontas; nas outras assenta na mesa.
export function SonarModel({ part }) {
  const tex = useLabel([{ text: 'HC-SR04', font: 'bold 60px Arial' }], 512, 128)
  const tr = useLabel([{ text: 'T', font: 'bold 80px Arial', x: 30 }, { text: 'Vcc  Trig  Echo  Gnd', font: 'bold 38px Arial' }, { text: 'R', font: 'bold 80px Arial', x: 482 }], 512, 128)
  const mesh = useCanvasTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#0d0d0d'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = '#8a8d91'
      ctx.lineWidth = 2.2
      for (let i = 0; i < w; i += 8) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i, h)
        ctx.moveTo(0, i)
        ctx.lineTo(w, i)
        ctx.stroke()
      }
    },
    ['sonar-mesh-2'],
    256,
    256,
  )
  const pins = DEFS.hcsr04.pins
  const mode = sonarMode(part?.config)
  const pb = sonarPcbY(part?.config)
  const Y = pb - 0.2 // as medidas abaixo são do bordo de baixo da placa a 0,2 cm
  return (
    <group>
      <mesh position={[0, 1.2 + Y, 0]} castShadow geometry={geo('sonarPcb', () => new RoundedBoxGeometry(0.16, 2.0, 4.5, 2, 0.03))} material={pcbMat('#1a4fb8')} />
      <mesh position={[0.085, 2.0 + Y, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.8, 0.45]} />
        <meshBasicMaterial map={tex} transparent />
      </mesh>
      <mesh position={[0.085, 0.45 + Y, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[4.2, 0.35]} />
        <meshBasicMaterial map={tr} transparent />
      </mesh>
      {[-1.3, 1.3].map((z) => (
        <group key={z}>
          {/* lata de alumínio com o bordo enrolado; rede metálica recuada sobre feltro preto */}
          <Cyl r={0.8} h={1.2} pos={[0.68, 1.15 + Y, z]} rot={[0, 0, Math.PI / 2]} color={METAL.alu} metal={1} rough={0.38} seg={40} />
          <mesh position={[1.27, 1.15 + Y, z]} rotation={[0, Math.PI / 2, 0]} geometry={geo('sonarLip', () => new THREE.TorusGeometry(0.74, 0.06, 8, 40))} material={mat(METAL.alu, 1, 0.3)} />
          <Cyl r={0.82} h={0.08} pos={[0.12, 1.15 + Y, z]} rot={[0, 0, Math.PI / 2]} color="#1a1a1a" rough={0.7} seg={32} />
          <mesh position={[1.284, 1.15 + Y, z]} rotation={[0, Math.PI / 2, 0]}>
            <circleGeometry args={[0.7, 32]} />
            <meshStandardMaterial map={mesh} roughness={0.55} metalness={0.6} />
          </mesh>
        </group>
      ))}
      {/* atrás: cristal e circuitos */}
      <RBox size={[0.2, 0.36, 0.95]} r={0.08} pos={[-0.18, 1.95 + Y, 0]} color="#d3d6da" metal={0.9} rough={0.25} />
      {[-1.3, 0, 1.3].map((z) => (
        <Box key={z} size={[0.12, 0.5, 0.4]} pos={[-0.14, 1.15 + Y, z]} color="#151515" />
      ))}
      {/* barra de 4 pinos: plástico preto encostado atrás da placa, no bordo de baixo */}
      <Box size={[0.25, 0.25, 4 * P]} pos={[-0.2, pb + 0.12, 0]} color="#111" />
      {pins.map((p, i) => {
        const g = sonarPin(i, mode)
        const z = p.pos[2]
        // ponta soldada: atravessa o bordo da placa até 0,4 cm acima dele, com a pinta de solda
        const solder = (
          <>
            <Box size={[0.12, 0.06, 0.064]} pos={[-0.12, pb + 0.37, z]} color="#c0c0c0" metal={0.9} rough={0.3} />
          </>
        )
        if (!g.bend) {
          // direito para baixo até ao chão (a ponta é onde o fio liga / entra na breadboard)
          return (
            <group key={p.id}>
              <Box size={[0.064, pb + 0.4, 0.064]} pos={[-0.2, (pb + 0.4) / 2, z]} color="#d4af37" metal={0.9} rough={0.25} />
              {solder}
            </group>
          )
        }
        // dobrado no plástico: perna vertical até à dobra e troço para trás até à ponta
        const end = g.pos.map((v, k) => v + 0.49 * g.dir[k])
        const L = Math.hypot(end[0] - g.bend[0], end[1] - g.bend[1])
        const ang = Math.atan2(g.dir[1], g.dir[0]) // no plano x-y
        return (
          <group key={p.id}>
            <Box size={[0.064, 0.4 - 0.12 + 0.032, 0.064]} pos={[-0.2, pb + 0.12 + (0.4 - 0.12) / 2, z]} color="#d4af37" metal={0.9} rough={0.25} />
            <Box size={[L, 0.064, 0.064]} pos={[(g.bend[0] + end[0]) / 2, (g.bend[1] + end[1]) / 2, z]} rot={[0, 0, ang - Math.PI]} color="#d4af37" metal={0.9} rough={0.25} />
            {solder}
          </group>
        )
      })}
    </group>
  )
}

// ---------- Chassi 2WD (acrílico) ----------
export function ChassisModel({ part }) {
  const dl = useStore((st) => vehicleLift(part, st.parts))
  const shape = useMemo(() => {
    const [x0, x1] = CHASSIS.plateX
    const [z0, z1] = CHASSIS.plateZ
    const r = CHASSIS.cornerR
    const s = new THREE.Shape()
    s.moveTo(x0 + r, z0)
    s.lineTo(x1 - r, z0)
    s.quadraticCurveTo(x1, z0, x1, z0 + r)
    s.lineTo(x1, z1 - r)
    s.quadraticCurveTo(x1, z1, x1 - r, z1)
    s.lineTo(x0 + r, z1)
    s.quadraticCurveTo(x0, z1, x0, z1 - r)
    s.lineTo(x0, z0 + r)
    s.quadraticCurveTo(x0, z0, x0 + r, z0)
    const circle = (hx, hz, rr) => {
      const h = new THREE.Path()
      h.absarc(hx, hz, rr, 0, Math.PI * 2, true)
      s.holes.push(h)
    }
    const slot = (hx, hz, len, rr) => {
      // rasgo alongado ao longo de x
      const h = new THREE.Path()
      h.absarc(hx - len / 2, hz, rr, Math.PI / 2, (3 * Math.PI) / 2, false)
      h.absarc(hx + len / 2, hz, rr, -Math.PI / 2, Math.PI / 2, false)
      s.holes.push(h)
    }
    // passagens para fios
    for (const [hx, hz] of CHASSIS.holes) circle(hx, hz, 0.5)
    // rasgos e furos de fixação (decorativos, longe das peças)
    slot(-3.5, -4.9, 1.6, 0.18)
    slot(-3.5, 4.9, 1.6, 0.18)
    slot(5.0, -4.9, 1.2, 0.18)
    slot(5.0, 4.9, 1.2, 0.18)
    for (const [hx, hz] of [[-1, 0], [CHASSIS.casterX, 1.2], [CHASSIS.casterX, -1.2], [-8.0, -2.5], [-8.0, 2.5], [9.1, -2.5], [9.1, 2.5]]) circle(hx, hz, 0.17)
    return s
  }, [])
  const t = CHASSIS.plateTop - CHASSIS.plateBottom
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, CHASSIS.plateTop, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[shape, { depth: t, bevelEnabled: false, curveSegments: 16 }]} />
        <meshStandardMaterial color="#ffd36e" transparent opacity={0.62} roughness={0.08} metalness={0.05} />
      </mesh>
      {/* roda livre (esfera) com suporte e espaçadores */}
      {/* rodas maiores: o chassi sobe (dl) e os espaçadores do rodízio ficam mais compridos */}
      {[-1.2, 1.2].map((z) => (
        <Cyl key={z} r={0.2} h={CHASSIS.plateBottom - 2.0 + dl} pos={[CHASSIS.casterX, (CHASSIS.plateBottom + 2.0 - dl) / 2, z]} color="#c6a24a" metal={0.8} rough={0.3} seg={6} />
      ))}
      <RBox size={[1.6, 0.3, 3.0]} r={0.05} pos={[CHASSIS.casterX, 1.95 - dl, 0]} color="#2b2b2b" metal={0.3} />
      <Cyl r={1.0} r2={0.8} h={0.7} pos={[CHASSIS.casterX, 1.45 - dl, 0]} color="#3a3a3a" metal={0.5} rough={0.4} seg={24} />
      <mesh position={[CHASSIS.casterX, 0.9 - dl, 0]} castShadow>
        <sphereGeometry args={[0.9, 24, 18]} />
        <meshStandardMaterial color="#e0e0e0" metalness={1} roughness={0.12} />
      </mesh>
    </group>
  )
}

// ---------- Chassi 4WD (duas placas de acrílico + espaçadores de latão) ----------
function plate4Shape(holes, extra = []) {
  const [x0, x1] = CHASSIS4.plateX
  const [z0, z1] = CHASSIS4.plateZ
  const r = CHASSIS4.cornerR
  const s = new THREE.Shape()
  s.moveTo(x0 + r, z0)
  s.lineTo(x1 - r, z0)
  s.quadraticCurveTo(x1, z0, x1, z0 + r)
  s.lineTo(x1, z1 - r)
  s.quadraticCurveTo(x1, z1, x1 - r, z1)
  s.lineTo(x0 + r, z1)
  s.quadraticCurveTo(x0, z1, x0, z1 - r)
  s.lineTo(x0, z0 + r)
  s.quadraticCurveTo(x0, z0, x0 + r, z0)
  const circle = (hx, hz, rr) => {
    const h = new THREE.Path()
    h.absarc(hx, hz, rr, 0, Math.PI * 2, true)
    s.holes.push(h)
  }
  for (const [hx, hz] of holes) circle(hx, hz, 0.5)
  for (const [hx, hz] of CHASSIS4.standoffs) circle(hx, hz, 0.17)
  for (const [hx, hz, rr] of extra) circle(hx, hz, rr)
  return s
}
const ACRYLIC4 = { color: '#f6d77a', transparent: true, opacity: 0.55, roughness: 0.12, metalness: 0 }

export function Chassis4Model() {
  // placa de baixo: passagens dos fios dos motores e furos de fixação (padrão de kit)
  const low = useMemo(() => plate4Shape([[-3.2, 0], [3.2, 0], [0, -2.6], [0, 2.6], [10.3, 0]], [[-8, -2], [-8, 2], [8, -2], [8, 2], [-5, 0], [5, 0]].map(([x, z]) => [x, z, 0.17])), [])
  // placa de cima: furos para as placas e rasgo central para os fios
  const deck = useMemo(() => plate4Shape(CHASSIS4.holes.filter(([x]) => Math.abs(x) > 5), [[-6.5, -2.4, 0.17], [-6.5, 2.4, 0.17], [6.5, -2.4, 0.17], [6.5, 2.4, 0.17], [0, 0, 1.1]]), [])
  const t = CHASSIS4.plateTop - CHASSIS4.plateBottom
  const sh = CHASSIS4.deckBottom - CHASSIS4.plateTop
  return (
    <group>
      {[
        [low, CHASSIS4.plateTop],
        [deck, CHASSIS4.deckTop],
      ].map(([shape, y], i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]} position={[0, y, 0]} castShadow receiveShadow>
          <extrudeGeometry args={[shape, { depth: t, bevelEnabled: false, curveSegments: 14 }]} />
          <meshStandardMaterial {...ACRYLIC4} />
        </mesh>
      ))}
      {/* espaçadores sextavados de latão M3 com parafusos */}
      {CHASSIS4.standoffs.map(([x, z]) => (
        <group key={`${x},${z}`}>
          <Cyl r={0.28} h={sh} pos={[x, CHASSIS4.plateTop + sh / 2, z]} color="#c9a227" metal={0.9} rough={0.32} seg={6} />
          <Cyl r={0.27} h={0.12} pos={[x, CHASSIS4.deckTop + 0.06, z]} color="#b8bcc0" metal={1} rough={0.3} seg={16} />
          <Cyl r={0.27} h={0.12} pos={[x, CHASSIS4.plateBottom - 0.06, z]} color="#b8bcc0" metal={1} rough={0.3} seg={16} />
        </group>
      ))}
    </group>
  )
}

// uma só placa (mesma furação; os espaçadores ficam só com as porcas)
export function Chassis4OneModel() {
  const plate = useMemo(() => plate4Shape(CHASSIS4.holes, [[-8, -2], [-8, 2], [8, -2], [8, 2], [-6.5, -2.4], [-6.5, 2.4], [6.5, -2.4], [6.5, 2.4]].map(([x, z]) => [x, z, 0.17])), [])
  const t = CHASSIS4.plateTop - CHASSIS4.plateBottom
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, CHASSIS4.plateTop, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[plate, { depth: t, bevelEnabled: false, curveSegments: 14 }]} />
        <meshStandardMaterial {...ACRYLIC4} />
      </mesh>
      {CHASSIS4.standoffs.map(([x, z]) => (
        <Cyl key={`${x},${z}`} r={0.27} h={0.12} pos={[x, CHASSIS4.plateTop + 0.06, z]} color="#b8bcc0" metal={1} rough={0.3} seg={16} />
      ))}
    </group>
  )
}

export const MODELS = {
  arduino: ArduinoModel,
  breadboard: BreadboardModel,
  resistor: ResistorModel,
  led: LedModel,
  button: ButtonModel,
  pot: PotModel,
  buzzer: BuzzerModel,
  battery: BatteryModel,
  buck: BuckModel,
  l298n: L298NModel,
  motor: MotorModel,
  servo: ServoModel,
  servoMG: ServoMGModel,
  ir: IRModel,
  hcsr04: SonarModel,
  chassis: ChassisModel,
  chassis4wd: Chassis4Model,
  chassis4wd1: Chassis4OneModel,
  armBase: ArmBaseModel,
  armLink: ArmLinkModel,
  gripper: GripperModel,
  cube: CubeModel,
  // componentes em plugin (three/parts)
  ...Object.fromEntries(Object.entries(PART_UI).map(([type, ui]) => [type, ui.Model])),
}
