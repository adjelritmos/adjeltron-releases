// Voltímetro e amperímetro de painel: caixa de ABS preto com a aba do painel, mostrador LED
// vermelho de 4 dígitos de 7 segmentos atrás de um filtro de acrílico (lê-se de cima, como na
// vista 2D), seletor de alcance serrilhado, grelhas de ventilação e bornes de 4 mm à frente.
import { MEDIDOR_DEFS } from '@shared/parts/medidores.js'
import { SCREEN_TINT, THREE, geo, mat, mergedGeo, liveOf, SilkText } from '../kit.jsx'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { useLiveCanvas, BindingPost, knobGeo } from './_groupF.jsx'
import { drawDigit } from './_groupA.jsx'
import { Badge } from './group-c-ui.jsx'

const H = 1.2
const BX = [-1.3, 1.3]
const D = 2.6

// valor com unidade automática (mV/V, mA/A) e 4 algarismos
export function leitura(v, unit, fuse) {
  if (fuse) return { txt: 'FUSE', unit: '' }
  const a = Math.abs(v ?? 0)
  const sign = v < 0 ? '-' : ''
  if (a < 0.0005) return { txt: '0.000', unit }
  if (a < 1) return { txt: sign + (a * 1000).toFixed(a * 1000 < 10 ? 2 : a * 1000 < 100 ? 1 : 0), unit: `m${unit}` }
  return { txt: sign + a.toFixed(a < 10 ? 3 : a < 100 ? 2 : 1), unit }
}

// segmentos acesos de cada carácter (a…g) no mostrador de 7 segmentos
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', F: 'aefg', U: 'bcdef', S: 'acdfg', E: 'adefg', ' ': '' }
const KEYS = 'abcdefg'
// texto → células [{ c, dp }] (o ponto acende o DP do dígito anterior), alinhadas à direita
function cells(txt, n) {
  const out = []
  for (const ch of txt) {
    if (ch === '.' && out.length) out[out.length - 1].dp = 1
    else out.push({ c: ch, dp: 0 })
  }
  while (out.length < n) out.unshift({ c: ' ', dp: 0 })
  return out
}

// mostrador LED vermelho de 7 segmentos (os segmentos apagados vêem-se por trás do filtro)
function draw(ctx, w, h, d) {
  ctx.fillStyle = '#0d0505'
  ctx.fillRect(0, 0, w, h)
  const cs = cells(d.txt, 4)
  const s = Math.min(h * 0.33, (w * 0.78) / (cs.length * 1.5))
  const x0 = w * 0.78 - (cs.length - 0.5) * s * 1.5
  const col = d.fuse ? '#ff9a3d' : '#ff3b2f'
  cs.forEach((cell, i) => {
    const on = SEG[cell.c] ?? ''
    const lit = [...KEYS].map((k) => (on.includes(k) ? 1 : 0))
    lit.push(cell.dp)
    drawDigit(ctx, x0 + i * s * 1.5, h * 0.5, s, lit, col, '#2a0e0c')
  })
  ctx.font = `bold ${Math.round(h * 0.24)}px Arial`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = col
  ctx.fillText(d.unit, w * 0.83, h * 0.62)
}

// carcaça: corpo de ABS, aba do painel à volta do topo e os pés
const caseGeo = () =>
  mergedGeo('medCase', () => {
    const u = geo('gull', () => new THREE.BoxGeometry(1, 1, 1))
    const w = BX[1] - BX[0]
    return [
      [geo(`medBody${w}`, () => new RoundedBoxGeometry(w, H - 0.1, D - 0.12, 2, 0.06)), [0, (H - 0.1) / 2, 0]],
      [geo(`medBezel${w}`, () => new RoundedBoxGeometry(w, 0.12, D, 2, 0.05)), [0, H - 0.06, 0]],
      ...[-1, 1].map((sx) => [u, [sx * 0.9, 0.03, 0], [0, 0, 0], [0.25, 0.06, D - 0.5]]),
    ]
  })
// grelhas de ventilação nos dois lados
const ventGeo = () =>
  mergedGeo('medVents', () => {
    const u = geo('gull', () => new THREE.BoxGeometry(1, 1, 1))
    const out = []
    for (const sz of [-1, 1]) for (let i = 0; i < 6; i++) out.push([u, [-0.75 + i * 0.3, 0.55, sz * (D / 2 - 0.058)], [0, 0, 0], [0.12, 0.5, 0.01]])
    return out
  })

function make(def) {
  const amp = def.type === 'amperimetro'
  function Model({ part }) {
    const tex = useLiveCanvas(400, 160, draw, () => {
      const l = liveOf(part.id)
      return leitura(l?.value ?? 0, amp ? 'A' : 'V', l?.fuse)
    })
    return (
      <group>
        <mesh geometry={caseGeo()} material={mat('#1c1f24', 0, 0.55)} castShadow receiveShadow />
        <mesh geometry={ventGeo()} material={mat('#07080a', 0, 0.9)} />
        {/* janela do mostrador: moldura, LEDs e filtro de acrílico vermelho brilhante */}
        <mesh position={[-0.05, H + 0.005, -0.4]} geometry={geo('medWin', () => new RoundedBoxGeometry(2.0, 0.03, 0.95, 1, 0.012))} material={mat('#050505', 0, 0.6)} />
        <mesh position={[-0.05, H + 0.022, -0.4]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.9, 0.76]} />
          <meshBasicMaterial map={tex} color={SCREEN_TINT} toneMapped={false} />
        </mesh>
        <mesh position={[-0.05, H + 0.026, -0.4]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('medFilter', () => new THREE.PlaneGeometry(1.92, 0.8))} material={mat('#5a0f0f', 0, 0.05, { transparent: true, opacity: 0.14, depthWrite: false })} />
        {/* seletor de alcance (botão serrilhado com risco) e etiqueta V / A */}
        <mesh position={[-0.55, H, 0.62]} geometry={knobGeo(0.3, 0.16)} material={mat('#262626', 0, 0.4)} castShadow />
        <mesh position={[-0.43, H + 0.162, 0.62]} geometry={geo('medPtr', () => new THREE.BoxGeometry(0.2, 0.008, 0.04))} material={mat('#e5e5e5', 0, 0.5)} />
        <mesh position={[0.55, H + 0.01, 0.62]} geometry={geo('medTag', () => new RoundedBoxGeometry(0.6, 0.02, 0.45, 1, 0.008))} material={mat(amp ? '#1565c0' : '#c62828', 0, 0.45)} />
        <SilkText lines={[{ text: amp ? 'A' : 'V', font: 'bold 80px Arial' }]} px={[128, 96]} pos={[0.55, H + 0.021, 0.62]} w={0.4} d={0.3} />
        <SilkText lines={[{ text: amp ? 'DC AMPERE METER' : 'DC VOLT METER', font: 'bold 40px Arial' }]} px={[512, 64]} pos={[-0.05, H + 0.002, 0.12]} w={1.6} d={0.2} color="#9ca3af" />
        <BindingPost pos={def.pins[0].pos} color="#d32f2f" panel={BX[1]} />
        <BindingPost pos={def.pins[1].pos} color="#151515" panel={BX[1]} />
      </group>
    )
  }
  function Overlay2D({ info, live }) {
    if (!live) return null
    const r = leitura(live.value, amp ? 'A' : 'V', live.fuse)
    return <Badge info={info} text={`${r.txt.replace('.', ',')} ${r.unit}`} color={live.fuse ? '#f97316' : '#ff4d3d'} />
  }
  return { type: def.type, Model, Overlay2D }
}

export default MEDIDOR_DEFS.map(make)
