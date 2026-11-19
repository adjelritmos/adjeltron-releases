// Mini breadboard de 170 pontos (17 × 10, 47 × 35 × 8,5 mm), sem trilhos, com o canal central.
import { Box, RBox, PITCH, useCanvasTexture } from '../kit.jsx'
import { texStripGeo } from './_boardKit.jsx'
import def, { BBM_COLS } from '@shared/parts/breadboardMini.js'

const [W, H, D] = def.size

function draw(ctx, w, h) {
  const S = w / W
  const X = (x) => (x + W / 2) * S
  const Z = (z) => (z + D / 2) * S
  ctx.fillStyle = '#f3f1ea'
  ctx.fillRect(0, 0, w, h)
  const g = ctx.createLinearGradient(0, Z(-0.2), 0, Z(0.2))
  g.addColorStop(0, '#c9c5b8')
  g.addColorStop(0.5, '#e6e2d6')
  g.addColorStop(1, '#c9c5b8')
  ctx.fillStyle = g
  ctx.fillRect(0, Z(-0.17), w, 0.34 * S)
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
  ctx.font = `${0.12 * S}px Arial`
  for (let c = 1; c <= BBM_COLS; c += 2) {
    ctx.fillText(String(c), X((c - 9) * PITCH), Z(-1.6))
    ctx.fillText(String(c), X((c - 9) * PITCH), Z(1.6))
  }
  const rows = 'abcdefghij'
  for (let r = 0; r < 10; r++) {
    const z = r < 5 ? -0.381 - (4 - r) * PITCH : 0.381 + (r - 5) * PITCH
    ctx.fillText(rows[r], X(-2.22), Z(z))
    ctx.fillText(rows[r], X(2.22), Z(z))
  }
}

// corpo em ABS: base e as duas metades do topo separadas pelo canal central (com 3 mm de fundo,
// como na peça real), ranhuras de encaixe nos lados e o topo com os furos e a serigrafia numa
// textura partilhada pelas duas metades.
const CH = 0.17 // meia largura do canal central
const DEPTH = 0.3
function Model() {
  const tex = useCanvasTexture(draw, ['bbm-2'], 1024, Math.round((1024 * D) / W))
  const halves = [[-D / 2, -CH], [CH, D / 2]]
  return (
    <group>
      <RBox size={[W, H - DEPTH, D]} r={0.06} pos={[0, (H - DEPTH) / 2, 0]} color="#ece9df" rough={0.65} />
      {halves.map(([z0, z1]) => (
        <group key={z0}>
          <RBox size={[W, DEPTH + 0.05, z1 - z0]} r={0.04} pos={[0, H - 0.01 - (DEPTH + 0.05) / 2, (z0 + z1) / 2]} color="#ece9df" rough={0.65} />
          <mesh position={[0, H - 0.008, 0]} receiveShadow geometry={texStripGeo(`bbm${z0}`, W, D, z0, z1)}>
            <meshStandardMaterial map={tex} roughness={0.62} />
          </mesh>
        </group>
      ))}
      {/* ranhuras de encaixe em rabo de andorinha nos 4 lados */}
      {[-1.2, 1.2].map((x) => [-1, 1].map((s) => <Box key={`${x}${s}`} size={[0.37, 0.52, 0.02]} pos={[x, 0.33, s * (D / 2 + 0.002)]} color="#bdb9ad" rough={0.8} />))}
      {[-1, 1].map((s) => <Box key={s} size={[0.02, 0.52, 0.37]} pos={[s * (W / 2 + 0.002), 0.33, 0]} color="#bdb9ad" rough={0.8} />)}
    </group>
  )
}

export default { type: 'breadboardMini', Model }
