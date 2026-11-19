// Breadboard completa de 830 pontos (165 × 55 × 8,5 mm): 63 colunas, canal central a sério e 4 trilhos
// (+ vermelho, − azul).
import { Box, RBox, PITCH, useCanvasTexture } from '../kit.jsx'
import { texStripGeo } from './_boardKit.jsx'
import def, { BBF, bbfColX, BBF_RAIL_Z } from '@shared/parts/breadboardFull.js'

const [W, H, D] = def.size

function draw(ctx, w, h) {
  const S = w / W
  const X = (x) => (x + W / 2) * S
  const Z = (z) => (z + D / 2) * S
  ctx.fillStyle = '#f3f1ea'
  ctx.fillRect(0, 0, w, h)
  // canal central
  const g = ctx.createLinearGradient(0, Z(-0.2), 0, Z(0.2))
  g.addColorStop(0, '#c9c5b8')
  g.addColorStop(0.5, '#e6e2d6')
  g.addColorStop(1, '#c9c5b8')
  ctx.fillStyle = g
  ctx.fillRect(0, Z(-0.17), w, 0.34 * S)
  // riscas dos trilhos: azul (−) por fora, vermelho (+) por dentro, como os furos e os sinais
  const x0 = X(-7.6)
  const x1 = X(7.6)
  for (const [z, c] of [[-2.65, '#1e63d6'], [-1.92, '#e53935'], [1.92, '#e53935'], [2.65, '#1e63d6']]) {
    ctx.fillStyle = c
    ctx.fillRect(x0, Z(z) - 0.012 * S, x1 - x0, 0.024 * S)
  }
  for (const p of def.pins) {
    const cx = X(p.pos[0])
    const cz = Z(p.pos[2])
    const r = 0.06 * S
    ctx.fillStyle = '#d6d2c6'
    ctx.fillRect(cx - r - 2, cz - r - 2, 2 * r + 4, 2 * r + 4)
    const hg = ctx.createLinearGradient(cx - r, cz - r, cx + r, cz + r)
    hg.addColorStop(0, '#141414')
    hg.addColorStop(1, '#3a3a3a')
    ctx.fillStyle = hg
    ctx.fillRect(cx - r, cz - r, 2 * r, 2 * r)
    // lâminas de contacto niqueladas no fundo do furo
    ctx.fillStyle = '#8f9399'
    ctx.fillRect(cx - r * 0.55, cz - r * 0.12, r * 1.1, r * 0.24)
    ctx.fillStyle = '#c4c8cc'
    ctx.fillRect(cx - r * 0.4, cz - r * 0.06, r * 0.8, r * 0.1)
  }
  ctx.fillStyle = '#8a877e'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${0.11 * S}px Arial`
  for (let c = 1; c <= BBF.COLS; c += c === 1 ? 4 : 5) {
    ctx.fillText(String(c), X(bbfColX(c)), Z(-1.55))
    ctx.fillText(String(c), X(bbfColX(c)), Z(1.55))
  }
  const rows = 'abcdefghij'
  for (let r = 0; r < 10; r++) {
    const z = r < 5 ? -0.381 - (4 - r) * PITCH : 0.381 + (r - 5) * PITCH
    ctx.fillText(rows[r], X(-8.05), Z(z))
    ctx.fillText(rows[r], X(8.05), Z(z))
  }
  ctx.font = `bold ${0.16 * S}px Arial`
  for (const [z, t, c] of [[BBF_RAIL_Z.tp, '+', '#e53935'], [BBF_RAIL_Z.tn, '−', '#1e63d6'], [BBF_RAIL_Z.bp, '+', '#e53935'], [BBF_RAIL_Z.bn, '−', '#1e63d6']]) {
    ctx.fillStyle = c
    ctx.fillText(t, X(-7.95), Z(z))
    ctx.fillText(t, X(7.95), Z(z))
  }
}

// corpo em ABS: base e as duas metades do topo separadas pelo canal central (com 3 mm de fundo,
// como na peça real), encaixes em rabo de andorinha (macho em −z, fêmea em +z) e o topo com os
// furos e a serigrafia numa textura partilhada pelas duas metades.
const CH = 0.17 // meia largura do canal central
const DEPTH = 0.3
function Model() {
  const tex = useCanvasTexture(draw, ['bbf-3'], 3072, Math.round((3072 * D) / W))
  const halves = [[-D / 2, -CH], [CH, D / 2]]
  return (
    <group>
      <RBox size={[W, H - DEPTH, D]} r={0.06} pos={[0, (H - DEPTH) / 2, 0]} color="#ece9df" rough={0.65} />
      {halves.map(([z0, z1]) => (
        <group key={z0}>
          <RBox size={[W, DEPTH + 0.05, z1 - z0]} r={0.04} pos={[0, H - 0.01 - (DEPTH + 0.05) / 2, (z0 + z1) / 2]} color="#ece9df" rough={0.65} />
          <mesh position={[0, H - 0.008, 0]} receiveShadow geometry={texStripGeo(`bbf${z0}`, W, D, z0, z1)}>
            <meshStandardMaterial map={tex} roughness={0.62} />
          </mesh>
        </group>
      ))}
      {/* encaixes laterais: lingueta em rabo de andorinha (−z) e ranhura escura (+z) */}
      {[-6, -3, 0, 3, 6].map((x) => (
        <group key={x}>
          <Box size={[0.35, 0.5, 0.12]} pos={[x, 0.35, -D / 2 - 0.04]} color="#e3e0d5" />
          <Box size={[0.37, 0.52, 0.02]} pos={[x, 0.35, D / 2 + 0.002]} color="#bdb9ad" rough={0.8} />
        </group>
      ))}
    </group>
  )
}

export default { type: 'breadboardFull', Model }
