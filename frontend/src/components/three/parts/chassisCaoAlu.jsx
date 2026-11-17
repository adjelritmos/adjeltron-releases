// Chassi de alumínio do cão robô: placas laterais cheias de furos (com janela para o corpo do
// servo da anca), tampa, fundo, para-choques, espaçadores sextavados e parafusos de embeber.
import { CAO, CAO_ZIN, CAO_ZOUT, CAO_TOP } from '@shared/parts/chassisCaoAlu.js'
import { servoDims } from '@shared/parts/_servoDims.js'
import { partAluMat, plateGeo, flatPlateGeo, roundRectShape, circleHole, slotHole, rectHole, Screws, HexStandoffZ } from './_caoKit.jsx'

const { L, H, T, deck, hipX, hipY, Zh } = CAO
const XE = CAO.bumperX // fim das chapas de cima/baixo e posição dos para-choques

// janelas dos servos das ancas na placa lateral (x, y do centro; meia largura/altura)
const windows = (s) => [-1, 1].map((sx) => ({ x: sx * (hipX - s.hornX), y: hipY, hx: s.L / 2 + 0.06, hy: s.W / 2 + 0.06 }))

function sideShape(s) {
  const sh = roundRectShape(-L / 2, 0, L / 2, H, 1.3)
  const win = windows(s)
  for (const w of win) rectHole(sh, w.x - w.hx, w.y - w.hy, w.x + w.hx, w.y + w.hy, 0.2)
  const busy = (x, y, r) =>
    win.some((w) => Math.abs(x - w.x) < w.hx + r + 0.35 && Math.abs(y - w.y) < w.hy + r + 0.35) ||
    // espaçadores e postes dos servos
    STANDOFFS.some(([sx, sy]) => Math.hypot(x - sx, y - sy) < r + 0.45)
  // fila de furos grandes ao meio e furos pequenos em cima e em baixo
  for (let x = -L / 2 + 1.6; x <= L / 2 - 1.6 + 1e-6; x += 1.15) {
    for (const [y, r] of [[0.85, 0.24], [H - 0.85, 0.24]]) if (!busy(x, y, r)) circleHole(sh, x, y, r)
  }
  for (let x = -4.0; x <= 4.0 + 1e-6; x += 2.0) if (!busy(x, H / 2, 0.62)) circleHole(sh, x, H / 2, 0.62)
  // rasgos de passagem de cabos nas pontas
  slotHole(sh, -L / 2 + 1.3, -L / 2 + 1.9, H / 2, 0.3)
  slotHole(sh, L / 2 - 1.9, L / 2 - 1.3, H / 2, 0.3)
  return sh
}

// espaçadores sextavados entre as placas laterais (x, y)
const STANDOFFS = [[-XE + 0.4, 0.9], [-XE + 0.4, H - 0.9], [XE - 0.4, 0.9], [XE - 0.4, H - 0.9], [-3, H - 0.6], [3, H - 0.6], [-3, 0.6], [3, 0.6]]

function deckShape(top) {
  const sh = roundRectShape(-XE, -CAO_ZOUT, XE, CAO_ZOUT, 0.6)
  // furação para placas (grelha de 1 cm, como as chapas dos kits) e rasgos de cabos
  for (let x = -XE + 1.0; x <= XE - 1.0 + 1e-6; x += 1.0)
    for (const z of [-CAO_ZOUT + 0.7, CAO_ZOUT - 0.7]) circleHole(sh, x, z, 0.14)
  if (top) {
    slotHole(sh, -6.5, -3.5, 0, 0.45)
    slotHole(sh, 3.5, 6.5, 0, 0.45)
    for (const [x, z] of [[-2.9, -2.45], [2.9, -2.45], [-2.9, 2.45], [2.9, 2.45]]) circleHole(sh, x, z, 0.15)
  } else {
    rectHole(sh, -4.6, -1.6, 4.6, 1.6, 0.4)
  }
  return sh
}

function bumperShape() {
  // perfil no plano (z, y), de lado a lado entre as placas
  const sh = roundRectShape(-CAO_ZIN, 0.25, CAO_ZIN, H - 0.05, 0.25)
  slotHole(sh, -2.6, 2.6, H / 2, 0.55)
  for (const z of [-3.6, 3.6]) circleHole(sh, z, H / 2, 0.3)
  return sh
}

function Model({ part }) {
  const c = part.config || {}
  const s = servoDims(c)
  const M = partAluMat(c)
  const sideG = plateGeo(`caoSide${c.servo || 'mg996'}`, () => sideShape(s), T, 0.04)
  const topG = flatPlateGeo('caoDeckTop', () => deckShape(true), deck, 0.03)
  const botG = flatPlateGeo('caoDeckBot', () => deckShape(false), deck, 0.03)
  const bumpG = plateGeo('caoBumper', bumperShape, 0.25, 0.03)
  const win = windows(s)
  // postes que seguram as abas dos servos das ancas contra a placa lateral
  const tabZ = Zh - s.hornY + s.tabY
  const posts = win.flatMap((w) => [-1, 1].map((k) => [w.x + k * (s.L / 2 + 0.27), hipY]))
  return (
    <group>
      {/* placas laterais (face exterior em ±CAO_ZOUT) */}
      <mesh geometry={sideG} material={M} position={[0, 0, CAO_ZIN]} castShadow receiveShadow />
      <mesh geometry={sideG} material={M} position={[0, 0, -CAO_ZOUT]} castShadow receiveShadow />
      {/* tampa e fundo */}
      <mesh geometry={topG} material={M} position={[0, H, 0]} castShadow receiveShadow />
      <mesh geometry={botG} material={M} position={[0, 0, 0]} castShadow receiveShadow />
      {/* para-choques à frente e atrás */}
      {[1, -1].map((sx) => (
        <mesh key={sx} geometry={bumpG} material={M} position={[sx * (XE + (sx > 0 ? 0 : 0.25)), 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow />
      ))}
      {/* espaçadores sextavados pretos entre as placas */}
      {STANDOFFS.map(([x, y], i) => (
        <HexStandoffZ key={i} x={x} y={y} z1={-CAO_ZIN} z2={CAO_ZIN} />
      ))}
      {/* postes das abas dos servos (de cada lado) */}
      {[-1, 1].map((sz) =>
        posts.map(([x, y], i) => <HexStandoffZ key={`${sz}${i}`} x={x} y={y} z1={sz * (tabZ + 0.13)} z2={sz * CAO_ZIN} color="#9aa3a9" />),
      )}
      {/* parafusos de embeber nas faces exteriores */}
      {[-1, 1].map((sz) => (
        <Screws key={sz} axis={sz > 0 ? 'z' : '-z'} pts={[...STANDOFFS, ...posts].map(([x, y]) => [x, y, sz * CAO_ZOUT])} />
      ))}
      <Screws pts={[[-XE + 0.45, 0, -CAO_ZOUT + 0.35], [XE - 0.45, 0, -CAO_ZOUT + 0.35], [-XE + 0.45, 0, CAO_ZOUT - 0.35], [XE - 0.45, 0, CAO_ZOUT - 0.35]].map(([x, , z]) => [x, CAO_TOP, z])} r={0.14} />
      <Screws axis="-y" pts={[[-XE + 0.45, 0, -CAO_ZOUT + 0.35], [XE - 0.45, 0, -CAO_ZOUT + 0.35], [-XE + 0.45, 0, CAO_ZOUT - 0.35], [XE - 0.45, 0, CAO_ZOUT - 0.35]]} r={0.14} />
      {[1, -1].map((sx) => (
        <Screws key={sx} axis={sx > 0 ? 'x' : '-x'} pts={[-3.6, 3.6].map((z) => [sx * (XE + 0.25), H - 0.6, z])} r={0.14} />
      ))}
    </group>
  )
}

export default { type: 'chassisCaoAlu', Model }
