// Televisão LED de ecrã plano (~40"): pé central de alumínio escovado com coluna, painel fino
// com a moldura estreita, caixa traseira com as grelhas de ventilação, os furos VESA e o painel
// de ligações, barra de baixo com o logótipo, o recetor IV e o LED de presença; ecrã virado
// para +x. Ligada, o ecrã mostra o logótipo de arranque e depois um programa animado desenhado
// num canvas (desenhos animados, futebol, notícias ou barras de cor) e ilumina a sala com uma
// luz azulada.
import { Box, RBox, geo, mat, mergedGeo, liveOf, useFrame, useMemo, useRef, THREE } from '../kit.jsx'
import { Bornes } from './_casaKit.jsx'
import { TV } from '@shared/parts/televisao.js'

const CW = 256
const CH = 148

// ---------- programas (t em segundos) ----------
function desenhos(g, t) {
  const sky = g.createLinearGradient(0, 0, 0, CH)
  sky.addColorStop(0, '#5ec8ff')
  sky.addColorStop(1, '#c8f0ff')
  g.fillStyle = sky
  g.fillRect(0, 0, CW, CH)
  // sol e nuvens
  g.fillStyle = '#ffd84a'
  g.beginPath()
  g.arc(210, 30, 16, 0, 7)
  g.fill()
  g.fillStyle = '#ffffff'
  for (let i = 0; i < 3; i++) {
    const x = ((t * 12 + i * 110) % (CW + 80)) - 40
    g.beginPath()
    g.ellipse(x, 28 + i * 9, 22, 8, 0, 0, 7)
    g.ellipse(x + 14, 22 + i * 9, 14, 9, 0, 0, 7)
    g.fill()
  }
  // colinas
  g.fillStyle = '#55b84a'
  g.beginPath()
  g.moveTo(0, CH)
  for (let x = 0; x <= CW; x += 8) g.lineTo(x, 108 + Math.sin(x / 34) * 9)
  g.lineTo(CW, CH)
  g.fill()
  // personagem a saltar (bola com olhos)
  const x = 40 + ((t * 40) % (CW - 80))
  const y = 98 - Math.abs(Math.sin(t * 4)) * 40
  g.fillStyle = '#ff5a5f'
  g.beginPath()
  g.ellipse(x, y, 15, 15 - Math.max(0, 4 - Math.abs(Math.sin(t * 4)) * 20), 0, 0, 7)
  g.fill()
  g.fillStyle = '#fff'
  g.beginPath()
  g.arc(x + 5, y - 4, 4.5, 0, 7)
  g.arc(x - 4, y - 4, 4.5, 0, 7)
  g.fill()
  g.fillStyle = '#222'
  g.beginPath()
  g.arc(x + 6, y - 4, 2, 0, 7)
  g.arc(x - 3, y - 4, 2, 0, 7)
  g.fill()
}
function futebol(g, t) {
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? '#3f9b45' : '#47a84d'
    g.fillRect(i * 32, 0, 32, CH)
  }
  g.strokeStyle = '#eaf6e8'
  g.lineWidth = 2
  g.strokeRect(8, 10, CW - 16, CH - 20)
  g.beginPath()
  g.moveTo(CW / 2, 10)
  g.lineTo(CW / 2, CH - 10)
  g.stroke()
  g.beginPath()
  g.arc(CW / 2, CH / 2, 20, 0, 7)
  g.stroke()
  const bx = CW / 2 + Math.sin(t * 1.3) * 90
  const by = CH / 2 + Math.sin(t * 2.1) * 40
  for (let i = 0; i < 10; i++) {
    const team = i % 2
    const px = bx + Math.sin(t * 0.9 + i * 1.7) * (30 + i * 6)
    const py = by + Math.cos(t * 1.1 + i * 2.3) * (18 + i * 3)
    g.fillStyle = team ? '#d62828' : '#1d4ed8'
    g.beginPath()
    g.arc(px, py, 5, 0, 7)
    g.fill()
  }
  g.fillStyle = '#fff'
  g.beginPath()
  g.arc(bx, by, 3, 0, 7)
  g.fill()
  g.fillStyle = 'rgba(0,0,0,0.6)'
  g.fillRect(6, 4, 74, 16)
  g.fillStyle = '#fff'
  g.font = 'bold 11px Arial'
  g.fillText(`POR 2-1 ESP  ${String(Math.floor(t / 2) % 90).padStart(2, '0')}'`, 10, 16)
}
function noticias(g, t) {
  const bg = g.createLinearGradient(0, 0, CW, CH)
  bg.addColorStop(0, '#0d2b5e')
  bg.addColorStop(1, '#1b5fa8')
  g.fillStyle = bg
  g.fillRect(0, 0, CW, CH)
  // pivô
  g.fillStyle = '#26303a'
  g.beginPath()
  g.ellipse(128, 128, 46, 34, 0, Math.PI, 0)
  g.fill()
  g.fillStyle = '#e2b48d'
  g.beginPath()
  g.arc(128, 70 + Math.sin(t * 6) * 0.8, 20, 0, 7)
  g.fill()
  g.fillStyle = '#3a2618'
  g.beginPath()
  g.arc(128, 64, 21, Math.PI, 0)
  g.fill()
  // oráculo a passar
  g.fillStyle = '#c62828'
  g.fillRect(0, CH - 30, 60, 18)
  g.fillStyle = '#fff'
  g.fillRect(60, CH - 30, CW, 18)
  g.font = 'bold 11px Arial'
  g.fillText('ÚLTIMA HORA', 4, CH - 17)
  g.save()
  g.beginPath()
  g.rect(60, CH - 30, CW, 18)
  g.clip()
  g.fillStyle = '#111'
  const msg = 'Casa inteligente: a luz acende sozinha quando alguém entra na sala  •  Temperatura amena em todo o país  •  '
  const w = g.measureText(msg).width
  const x = 64 - ((t * 40) % w)
  g.fillText(msg + msg, x, CH - 17)
  g.restore()
  g.fillStyle = '#fff'
  g.font = 'bold 12px Arial'
  g.fillText('NOTÍCIAS 24', 8, 18)
}
const BARS = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0']
function barras(g, t) {
  BARS.forEach((c, i) => {
    g.fillStyle = c
    g.fillRect((i * CW) / 7, 0, CW / 7 + 1, CH * 0.72)
  })
  for (let i = 0; i < 6; i++) {
    const v = Math.round((i / 5) * 255)
    g.fillStyle = `rgb(${v},${v},${v})`
    g.fillRect((i * CW) / 6, CH * 0.72, CW / 6 + 1, CH * 0.28)
  }
  g.fillStyle = 'rgba(0,0,0,0.65)'
  g.fillRect(CW / 2 - 40, CH / 2 - 12, 80, 22)
  g.fillStyle = '#fff'
  g.font = 'bold 12px monospace'
  g.textAlign = 'center'
  g.fillText(new Date(1700000000000 + t * 1000).toISOString().slice(11, 19), CW / 2, CH / 2 + 4)
  g.textAlign = 'start'
}
const PROG = { desenhos, futebol, noticias, barras }

function logo(g, k) {
  g.fillStyle = '#000'
  g.fillRect(0, 0, CW, CH)
  g.globalAlpha = Math.min(1, k * 2)
  g.fillStyle = '#e8f1ff'
  g.font = 'bold 26px Arial'
  g.textAlign = 'center'
  g.fillText('adjeltron', CW / 2, CH / 2 + 4)
  g.fillStyle = '#3b82f6'
  g.fillRect(CW / 2 - 50, CH / 2 + 16, 100 * k, 4)
  g.textAlign = 'start'
  g.globalAlpha = 1
}

function Model({ part }) {
  const c = part.config || {}
  const { W, H, T, Y0 } = TV
  const scr = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = CW
    cv.height = CH
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    return { cv, tex, m: new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), off: mat('#07090c', 0.2, 0.12), acc: 0, t: 0 }
  }, [])
  const screen = useRef()
  const light = useRef()
  const led = useRef()
  useFrame((_, dt) => {
    const L = liveOf(part.id)
    const on = !!L?.on
    const s = screen.current
    if (s) s.material = on ? scr.m : scr.off
    if (led.current) led.current.color.set(on ? '#3bff6a' : '#5a1212')
    if (light.current) light.current.intensity = on ? 18 * Math.min(1, (L?.boot ?? 1) * 1.5) : 0
    if (!on) {
      scr.t = 0
      return
    }
    scr.t += Math.min(dt, 0.1)
    scr.acc += dt
    if (scr.acc < 1 / 20) return
    scr.acc = 0
    const g = scr.cv.getContext('2d')
    if ((L?.boot ?? 1) < 1) logo(g, L.boot)
    else (PROG[c.canal] || desenhos)(g, scr.t)
    scr.tex.needsUpdate = true
  })
  const frame = c.moldura || '#16181b'
  // traseira: grelhas de ventilação, furos VESA e o painel de ligações (uma malha cada)
  const vents = mergedGeo(`tvVents${W},${H}`, () => {
    const u = geo('tvUnit', () => new THREE.BoxGeometry(1, 1, 1))
    const out = []
    for (const zs of [-1, 1])
      for (let i = 0; i < 10; i++) out.push([u, [-0.375, Y0 + H * 0.7, zs * (W * 0.12 + i * 0.13)], [0, 0, 0], [0.01, 0.5, 0.05]])
    return out
  })
  const vesa = mergedGeo(`tvVesa${H}`, () => {
    const cg = geo('tvVesaC', () => new THREE.CylinderGeometry(0.05, 0.05, 0.02, 10).rotateZ(Math.PI / 2))
    return [-1, 1].flatMap((a) => [-1, 1].map((b) => [cg, [-0.375, Y0 + H / 2 + a * 0.85, b * 0.85]]))
  })
  const ports = mergedGeo(`tvPorts${W}`, () => {
    const u = geo('tvUnit', () => new THREE.BoxGeometry(1, 1, 1))
    return [0, 1, 2, 3].map((i) => [u, [-0.24, Y0 + 0.6 + i * 0.32, -W * 0.35 - 0.001], [0, 0, 0], [0.12, 0.08, 0.01]])
  })
  return (
    <group>
      {/* pé central: base de alumínio escovado com o ressalto e a coluna */}
      <RBox size={[1.5, 0.08, 3.0]} r={0.035} pos={[0, 0.04, 0]} color="#2a2d31" metal={0.75} rough={0.32} />
      <RBox size={[0.7, 0.1, 1.1]} r={0.04} pos={[-0.1, 0.12, 0]} color="#2a2d31" metal={0.75} rough={0.32} />
      <RBox size={[0.22, Y0, 0.5]} r={0.05} pos={[-0.1, Y0 / 2 + 0.12, 0]} color="#2a2d31" metal={0.75} rough={0.32} />
      {/* caixa traseira (mais grossa em baixo, onde estão a fonte e a placa) e moldura */}
      <RBox size={[0.3, H * 0.7, W * 0.7]} r={0.1} pos={[-0.22, Y0 + H * 0.45, 0]} color="#1e2125" rough={0.55} />
      <mesh geometry={vents} material={mat('#0b0c0e', 0, 0.9)} />
      <mesh geometry={vesa} material={mat('#9aa0a6', 0.9, 0.35)} />
      <mesh geometry={ports} material={mat('#0b0c0e', 0, 0.9)} />
      <RBox size={[T * 0.55, H, W]} r={0.05} pos={[-T * 0.22, Y0 + H / 2, 0]} color="#1e2125" rough={0.5} />
      <RBox size={[T * 0.5, H, W]} r={0.03} pos={[T * 0.25, Y0 + H / 2, 0]} color={frame} metal={0.3} rough={0.3} />
      {/* ecrã (plano virado para +x) */}
      <mesh ref={screen} position={[T / 2 + 0.006, Y0 + H / 2 + 0.05, 0]} rotation={[0, Math.PI / 2, 0]} geometry={geo(`tvScr${W},${H}`, () => new THREE.PlaneGeometry(W - 0.3, H - 0.4))} material={scr.off} />
      {/* barra de baixo: logótipo, janela do recetor IV e LED de presença */}
      <Box size={[0.02, 0.06, 0.7]} pos={[T / 2 + 0.005, Y0 + 0.1, 0]} color="#8a8f96" metal={0.8} rough={0.3} />
      <Box size={[0.02, 0.07, 0.3]} pos={[T / 2 + 0.004, Y0 + 0.1, W / 2 - 0.65]} color="#050608" rough={0.08} />
      <mesh position={[T / 2 + 0.01, Y0 + 0.1, W / 2 - 0.5]}>
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshBasicMaterial ref={led} color="#5a1212" toneMapped={false} />
      </mesh>
      {/* bornes atrás */}
      <Bornes pos={[-0.55, 0.2, 0]} size={[0.4, 0.3, 1.0]} />
      <pointLight ref={light} position={[2.5, Y0 + H / 2, 0]} color="#9cc7ff" intensity={0} distance={40} decay={2} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.on) return null
  const [x, y] = info.project([0.2, 0, 0])
  return (
    <g pointerEvents="none">
      <rect x={x - 14} y={y - 52} width={28} height={104} rx={4} fill="#60a5fa" opacity={0.35} filter="url(#glow)" />
      <text x={x + 22} y={y + 4} fontSize={10} fill="#93c5fd" fontFamily="monospace">
        {live.boot < 1 ? 'a ligar…' : 'TV ON'}
      </text>
    </g>
  )
}

export default { type: 'televisao', Model, Overlay2D }
