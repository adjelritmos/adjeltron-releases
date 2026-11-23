// Pilhas do grupo F: AA alcalina (LR6, Ø 14,5 × 50,5 mm) num suporte de ABS preto de uma
// pilha com a mola cónica no − e a lâmina com covinha no +, com fios; CR2032 (Ø 20 × 3,2 mm)
// num suporte de breadboard (anel preto aberto e a lâmina de mola niquelada do + por cima).
import CELL_DEFS from '@shared/parts/cellF.js'
import { THREE, geo, mat, mergedGeo, METAL } from '../kit.jsx'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { Mark, Wires } from './_dip.jsx'
import { LeadPair } from './battery9v.jsx'
import { Badge, fmt } from './group-c-ui.jsx'

const [AA, COIN] = CELL_DEFS
const unitBox = () => geo('gull', () => new THREE.BoxGeometry(1, 1, 1))
const rbox = (w, h, d, r) => geo(`cellRb${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 2, r))

// ---------- AA ----------
const L = 5.8
const YC = 0.85 // eixo da pilha
const RA = 0.725
const XP = -2.62 // ombro do + (o pino do + vai até XP − 0,1)
const XN = 2.3 // fundo do −

// suporte: base, paredes laterais e topos numa só malha
const holderGeo = () =>
  mergedGeo('aaHolder', () => [
    [rbox(L, 0.12, 1.7, 0.04), [0, 0.06, 0]],
    ...[-1, 1].map((s) => [rbox(L - 0.2, 0.8, 0.11, 0.035), [0, 0.5, s * 0.795]]),
    ...[-1, 1].map((s) => [rbox(0.16, 1.3, 1.7, 0.05), [s * (L / 2 - 0.08), 0.65, 0]]),
    // berço curvo por baixo da pilha (nervuras transversais)
    ...[-1.6, -0.5, 0.6, 1.7].map((x) => [unitBox(), [x, 0.16, 0], [0, 0, 0], [0.08, 0.1, 1.2]]),
  ])
// pilha: perfil de revolução ao longo de x (fundo − cravado, corpo, ombro e pino do +)
const cellGeo = () =>
  geo('aaCell', () => {
    const p = [
      [0.001, XN + 0.005], [RA * 0.62, XN + 0.005], [RA * 0.66, XN - 0.01], [RA - 0.03, XN - 0.012], [RA, XN - 0.05],
      [RA, XP + 0.05], [RA - 0.04, XP], [0.38, XP - 0.005], [0.27, XP - 0.01], [0.26, XP - 0.09], [0.22, XP - 0.105], [0.001, XP - 0.105],
    ]
    // eixo y do torno → −x (para o + ficar em −x): y' = −x
    const g = new THREE.LatheGeometry(p.map(([r, x]) => new THREE.Vector2(r, -x)), 36)
    g.rotateZ(Math.PI / 2)
    g.computeVertexNormals()
    return g
  })
// rótulo da manga: faixa prateada junto ao +, texto ao longo do eixo
const AA_LABEL = new Map()
function aaLabelMat(color = '#1b2433') {
  let m = AA_LABEL.get(color)
  if (!m) {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 512
    const x = c.getContext('2d')
    // v = 1 (topo da tela) no lado do + (−x)
    x.fillStyle = color
    x.fillRect(0, 0, 512, 512)
    const g = x.createLinearGradient(0, 0, 0, 120)
    g.addColorStop(0, '#d5d9de')
    g.addColorStop(1, '#8d949c')
    x.fillStyle = g
    x.fillRect(0, 0, 512, 110)
    x.fillStyle = '#c0392b'
    x.fillRect(0, 110, 512, 14)
    x.save()
    x.translate(128, 300)
    x.rotate(Math.PI / 2)
    x.fillStyle = '#f2f2f2'
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    x.font = 'bold 54px Arial'
    x.fillText('ALKALINE  AA', 0, -24)
    x.font = 'bold 34px Arial'
    x.fillText('LR6  1.5V', 0, 26)
    x.restore()
    x.save()
    x.translate(128, 56)
    x.fillStyle = color
    x.font = 'bold 70px Arial'
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    x.fillText('+', 0, 4)
    x.restore()
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.32, metalness: 0.15 })
    AA_LABEL.set(color, m)
  }
  return m
}
// mola cónica do − (fio de aço niquelado em espiral)
const springGeo = () =>
  geo('aaSpring', () => {
    const pts = []
    const turns = 4.5
    for (let i = 0; i <= 90; i++) {
      const t = i / 90
      const a = t * turns * Math.PI * 2
      const r = 0.42 - 0.24 * t
      pts.push(new THREE.Vector3(2.73 - t * 0.42, YC + r * Math.sin(a), r * Math.cos(a)))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 140, 0.028, 6, false)
  })

function AaModel({ part }) {
  const color = part?.config?.color || '#1b2433'
  const body = XN - XP - 0.1
  return (
    <group>
      <mesh geometry={holderGeo()} material={mat('#141414', 0, 0.55)} castShadow receiveShadow />
      {/* lâmina do + (contra a parede −x), mola cónica e lâmina do − */}
      <mesh position={[-L / 2 + 0.18, YC, 0]} geometry={unitBox()} scale={[0.03, 0.9, 0.9]} material={mat(METAL.nickel, 1, 0.3)} />
      <mesh geometry={springGeo()} material={mat(METAL.nickel, 1, 0.32)} castShadow />
      <mesh position={[L / 2 - 0.18, YC, 0]} geometry={unitBox()} scale={[0.03, 0.9, 0.9]} material={mat(METAL.nickel, 1, 0.3)} />
      {/* pilha */}
      <mesh position={[0, YC, 0]} geometry={cellGeo()} material={mat('#c3c7cc', 1, 0.3)} castShadow />
      <mesh position={[(XN + XP) / 2, YC, 0]} rotation={[0, 0, Math.PI / 2]} geometry={geo('aaSleeve', () => new THREE.CylinderGeometry(RA + 0.004, RA + 0.004, body, 40, 1, true))} material={aaLabelMat(color)} />
      <LeadPair from={[L / 2, 0.35, 0]} pins={AA.pins} />
    </group>
  )
}

// ---------- CR2032 ----------
const CY = 0.15
// pilha-botão: face + larga em cima (aresta boleada), face − mais estreita por baixo
const coinGeo = () =>
  geo('coinCell', () => {
    const p = [[0.001, 0], [0.9, 0], [0.93, 0.02], [0.96, 0.05], [1.0, 0.07], [1.0, 0.29], [0.985, 0.315], [0.96, 0.32], [0.001, 0.32]]
    const g = new THREE.LatheGeometry(p.map(([r, y]) => new THREE.Vector2(r, y)), 48)
    g.computeVertexNormals()
    return g
  })
const coinHolderGeo = () =>
  mergedGeo('coinHolder', () => [
    [geo('coinBase', () => new THREE.CylinderGeometry(1.18, 1.18, 0.18, 40)), [0, CY + 0.09, 0]],
    [rbox(0.5, 0.18, 1.0, 0.04), [-1.05, CY + 0.09, 0]],
    [rbox(0.4, 0.18, 0.8, 0.04), [1.05, CY + 0.09, 0]],
    // anel aberto num dos lados (por onde a pilha entra de lado)
    [geo('coinRing', () => new THREE.CylinderGeometry(1.18, 1.18, 0.36, 40, 1, false, 0.5, Math.PI * 2 - 1.0)), [0, CY + 0.36, 0]],
  ])
// lâmina de mola do + que vem do pino −x e pressiona o centro da pilha
const clipGeo = () =>
  mergedGeo('coinClip', () => [
    [unitBox(), [-1.0, CY + 0.36, 0], [0, 0, 0], [0.04, 0.38, 0.4]],
    [unitBox(), [-0.7, CY + 0.545, 0], [0, 0, -0.06], [0.62, 0.035, 0.4]],
    [unitBox(), [-0.25, CY + 0.52, 0], [0, 0, 0.12], [0.36, 0.035, 0.3]],
  ])

function CoinModel({ part }) {
  return (
    <group>
      <Wires id="coinPins" r={0.03} lines={COIN.pins.map((p) => [p.pos, [p.pos[0], CY + 0.05, p.pos[2]]])} />
      <mesh geometry={coinHolderGeo()} material={mat(part?.config?.color || '#161616', 0, 0.55)} castShadow receiveShadow />
      <mesh position={[0, CY + 0.18, 0]} geometry={coinGeo()} material={mat('#cfd3d8', 1, 0.24)} castShadow />
      <Mark lines={[{ text: 'CR2032', font: 'bold 60px Arial', y: 92 }, { text: '3V  LITHIUM', font: 'bold 32px Arial', y: 150 }, { text: '+', font: 'bold 56px Arial', y: 210 }]} px={[256, 256]} pos={[0.2, CY + 0.502, 0]} rot={[-Math.PI / 2, 0, 0]} w={1.2} h={1.2} color="#5c6066" />
      <mesh geometry={clipGeo()} material={mat(METAL.nickel, 1, 0.3)} castShadow />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  return <Badge info={info} text={`${fmt(live.v, 2)} V${live.i > 0.0005 ? ` · ${fmt(live.i * 1000, 0)} mA` : ''}`} color={live.hot ? '#dc2626' : '#f5f5f5'} />
}

export default [
  { type: 'aaCell', Model: AaModel, Overlay2D },
  { type: 'cr2032', Model: CoinModel, Overlay2D },
]
