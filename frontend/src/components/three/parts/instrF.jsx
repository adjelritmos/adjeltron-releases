// Instrumentos de bancada: gerador de sinais DDS e fonte regulada de laboratório. Caixa de
// chapa pintada com os cantos boleados, grelhas de ventilação e pés de borracha; painel por
// cima (ecrã com moldura e os valores atuais, botões serrilhados, teclas de borracha) e os
// bornes de 4 mm à frente (+x).
import INSTR_DEFS, { WAVES } from '@shared/parts/instrF.js'
import { SCREEN_TINT, THREE, geo, mat, mergedGeo, liveOf, inputOf, SilkText } from '../kit.jsx'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { useLiveCanvas, BindingPost, knobGeo } from './_groupF.jsx'
import { Badge, fmt } from './group-c-ui.jsx'

const [, , D] = INSTR_DEFS[0].size
const BX = [-1.95, 1.85] // caixa em x
const H = 1.5 // altura da caixa
const SCREEN = { x: -0.5, z: -0.75, w: 2.2, d: 2.6 } // ecrã no topo (centro, tamanho em cm)
const waveName = (k) => WAVES.find((w) => w[0] === k)?.[1] || k

const cur = (part, k, d) => inputOf(part.id)[k] ?? part.config?.[k] ?? d

function drawWave(ctx, kind, x0, y0, w, h, duty) {
  ctx.beginPath()
  for (let i = 0; i <= 120; i++) {
    const ph = ((i / 120) * 2) % 1
    let v
    if (kind === 'square') v = ph < duty ? 1 : -1
    else if (kind === 'triangle') v = ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph
    else if (kind === 'sawtooth') v = 2 * ph - 1
    else if (kind === 'dc') v = 0.4
    else v = Math.sin(ph * Math.PI * 2)
    const x = x0 + (i / 120) * w
    const y = y0 + h / 2 - (v * h) / 2.4
    if (i) ctx.lineTo(x, y)
    else ctx.moveTo(x, y)
  }
  ctx.stroke()
}

function drawSig(ctx, w, h, d) {
  ctx.fillStyle = '#061a24'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = '#123848'
  ctx.lineWidth = 2
  for (let i = 1; i < 6; i++) {
    ctx.beginPath()
    ctx.moveTo((i * w) / 6, h * 0.08)
    ctx.lineTo((i * w) / 6, h * 0.5)
    ctx.stroke()
  }
  ctx.strokeStyle = '#ffd34d'
  ctx.lineWidth = 6
  drawWave(ctx, d.wave, w * 0.06, h * 0.08, w * 0.88, h * 0.42, d.duty / 100)
  ctx.fillStyle = '#7fe3ff'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = `bold ${Math.round(h * 0.08)}px monospace`
  ctx.fillText(`${waveName(d.wave).toUpperCase()}`, w * 0.06, h * 0.6)
  ctx.font = `bold ${Math.round(h * 0.1)}px monospace`
  ctx.fillText(`${fmt(d.freq, d.freq < 10 ? 2 : 1)} Hz`, w * 0.06, h * 0.73)
  ctx.font = `${Math.round(h * 0.062)}px monospace`
  ctx.fillText(`A ${fmt(d.amp, 2)} Vp  OFS ${fmt(d.offset, 2)} V`, w * 0.06, h * 0.86)
  ctx.fillStyle = d.on ? '#4ade80' : '#355'
  ctx.textAlign = 'right'
  ctx.fillText(d.on ? 'OUT ON' : 'OUT', w * 0.95, h * 0.6)
}

function drawPsu(ctx, w, h, d) {
  ctx.fillStyle = '#0b0b0b'
  ctx.fillRect(0, 0, w, h)
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.font = `bold ${Math.round(h * 0.17)}px monospace`
  ctx.fillStyle = '#ff4d3d'
  ctx.fillText(`${d.v.toFixed(2)}`, w * 0.8, h * 0.25)
  ctx.fillStyle = '#4ade80'
  ctx.fillText(`${d.i.toFixed(3)}`, w * 0.8, h * 0.6)
  ctx.font = `bold ${Math.round(h * 0.1)}px monospace`
  ctx.fillStyle = '#ff4d3d'
  ctx.fillText('V', w * 0.95, h * 0.27)
  ctx.fillStyle = '#4ade80'
  ctx.fillText('A', w * 0.95, h * 0.62)
  ctx.textAlign = 'left'
  ctx.font = `bold ${Math.round(h * 0.075)}px monospace`
  ctx.fillStyle = d.mode === 'CC' ? '#ff4d3d' : '#555'
  ctx.fillText('CC', w * 0.06, h * 0.88)
  ctx.fillStyle = d.mode === 'CV' ? '#4ade80' : '#555'
  ctx.fillText('CV', w * 0.3, h * 0.88)
  ctx.fillStyle = '#9ca3af'
  ctx.fillText(`lim ${d.ilim.toFixed(2)} A`, w * 0.52, h * 0.88)
}

// carcaça: caixa de chapa pintada com os cantos boleados, grelhas de ventilação nos lados e
// pés de borracha
const caseGeo = () => geo('instrBody', () => new RoundedBoxGeometry(BX[1] - BX[0], H, D, 3, 0.12).translate((BX[0] + BX[1]) / 2, H / 2, 0))
const ventGeo = () =>
  mergedGeo('instrVents', () => {
    const u = geo('gull', () => new THREE.BoxGeometry(1, 1, 1))
    const out = []
    for (const sz of [-1, 1]) for (let i = 0; i < 9; i++) out.push([u, [-1.6 + i * 0.3, H * 0.55, sz * (D / 2 + 0.001)], [0, 0, 0], [0.12, H * 0.5, 0.004]])
    return out
  })
const feetGeo = () =>
  mergedGeo('instrFeet', () => {
    const f = geo('instrFoot', () => new THREE.CylinderGeometry(0.22, 0.25, 0.08, 16))
    const cx = (BX[0] + BX[1]) / 2
    return [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [f, [cx + sx * 1.45, 0.04, sz * (D / 2 - 0.45)]]))
  })

function Case({ part, kind, children }) {
  const sig = kind === 'sig'
  const tex = useLiveCanvas(
    440,
    520,
    (ctx, w, h, d) => (sig ? drawSig(ctx, w, h, d) : drawPsu(ctx, w, h, d)),
    () => {
      const l = liveOf(part.id)
      if (sig) return { wave: cur(part, 'wave', 'sine'), freq: +cur(part, 'freq', 2), amp: +cur(part, 'amp', 2), offset: +cur(part, 'offset', 0), duty: +cur(part, 'duty', 50), on: !!l }
      return { v: l?.v ?? 0, i: l?.i ?? 0, mode: l?.mode ?? 'off', ilim: +cur(part, 'ilim', 1) }
    },
  )
  const w = BX[1] - BX[0]
  const cx = (BX[0] + BX[1]) / 2
  const title = sig ? 'DDS SIGNAL GENERATOR' : 'DC POWER SUPPLY  0-30V 0-5A'
  return (
    <group>
      {/* caixa assente nos pés (0,8 mm) */}
      <mesh geometry={caseGeo()} material={mat(sig ? '#d8dadd' : '#2b2f36', 0.15, 0.5)} position={[0, 0.08, 0]} scale={[1, (H - 0.08) / H, 1]} castShadow receiveShadow />
      <mesh geometry={ventGeo()} material={mat('#0b0c0e', 0, 0.9)} />
      {/* painel do topo (plástico) e moldura escura do ecrã */}
      <mesh position={[cx, H + 0.006, 0]} geometry={geo(`instrPanel${w}`, () => new RoundedBoxGeometry(w - 0.2, 0.02, D - 0.2, 1, 0.008))} material={mat(sig ? '#2b3138' : '#1a1d22', 0, 0.6)} />
      <mesh position={[SCREEN.x, H + 0.02, SCREEN.z]} geometry={geo('instrBezel', () => new RoundedBoxGeometry(SCREEN.w + 0.16, 0.02, SCREEN.d + 0.16, 1, 0.008))} material={mat('#0a0a0a', 0, 0.35)} />
      {/* ecrã (lê-se de cima, como na vista 2D) */}
      <mesh position={[SCREEN.x, H + 0.031, SCREEN.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SCREEN.w, SCREEN.d]} />
        <meshBasicMaterial map={tex} color={SCREEN_TINT} toneMapped={false} />
      </mesh>
      <SilkText lines={[{ text: title, font: 'bold 34px Arial' }]} px={[512, 48]} pos={[1.15, H + 0.017, -0.75]} w={2.4} d={0.225} rotY={Math.PI / 2} color={sig ? '#cfd6de' : '#9ca3af'} />
      {children}
      {/* pés de borracha */}
      <mesh geometry={feetGeo()} material={mat('#111', 0, 0.85)} />
    </group>
  )
}

// borne de 4 mm no painel da frente (+x): anilha sextavada e capa da cor do polo
function Jack({ pin, color }) {
  return <BindingPost pos={pin.pos} color={color} panel={BX[1]} />
}
// botão rotativo serrilhado com o risco do índice
function Knob({ x, z, r = 0.32 }) {
  return (
    <group>
      <mesh position={[x, H, z]} geometry={knobGeo(r, 0.22)} material={mat('#141414', 0, 0.38)} castShadow />
      <mesh position={[x + r * 0.45, H + 0.222, z]} geometry={geo(`instrPtr${r}`, () => new THREE.BoxGeometry(r * 0.75, 0.008, 0.05))} material={mat('#e5e5e5', 0, 0.5)} />
    </group>
  )
}
// tecla de borracha (boleada) com a cor da função
function Key({ x, z, color }) {
  return <mesh position={[x, H + 0.05, z]} geometry={geo('instrKey', () => new RoundedBoxGeometry(0.42, 0.1, 0.32, 2, 0.04))} material={mat(color, 0, 0.55)} castShadow />
}

function SigModel({ part }) {
  const def = INSTR_DEFS[0]
  return (
    <Case part={part} kind="sig">
      <Knob x={1.1} z={1.55} r={0.42} />
      {[-1.2, -0.55, 0.1].map((x, i) => (
        <Key key={x} x={x} z={1.62} color={i === 0 ? '#1e88e5' : '#444'} />
      ))}
      <Jack pin={def.pins[0]} color="#d32f2f" />
      <Jack pin={def.pins[1]} color="#151515" />
    </Case>
  )
}

function PsuModel({ part }) {
  const def = INSTR_DEFS[1]
  return (
    <Case part={part} kind="psu">
      <Knob x={-0.6} z={1.55} />
      <Knob x={0.4} z={1.55} />
      <Key x={1.25} z={1.62} color="#c62828" />
      <Jack pin={def.pins[0]} color="#d32f2f" />
      <Jack pin={def.pins[1]} color="#151515" />
    </Case>
  )
}

function SigOverlay({ info, live }) {
  if (!live) return null
  return <Badge info={info} text={`${fmt(live.out, 2)} V`} />
}
function PsuOverlay({ info, live }) {
  if (!live || live.mode === 'off') return null
  return <Badge info={info} text={`${fmt(live.v, 2)} V · ${fmt(live.i, 3)} A ${live.mode}`} color={live.mode === 'CC' ? '#dc2626' : '#f5f5f5'} />
}

export default [
  { type: 'sigGen', Model: SigModel, Overlay2D: SigOverlay },
  { type: 'benchPsu', Model: PsuModel, Overlay2D: PsuOverlay },
]
