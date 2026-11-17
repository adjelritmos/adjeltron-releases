// Telhado de duas águas: duas abas com a cobertura em textura (telha lusa, ardósia, chapa),
// cumeeira de telhas, testeiras no beiral e sótão fechado (empenas) por baixo.
import { Box, Cyl, mat } from '../kit.jsx'
import { matColor } from '@shared/parts/_materials.js'
import { ACAB_COR } from '@shared/parts/_casa.js'
import { roofDims, roofUnder } from '@shared/parts/telhado.js'
import { faceGeo, finishMat, prismXGeo } from './_casaKit.jsx'

const shadeHex = (hex, k) => {
  const n = parseInt(hex.slice(1), 16)
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * (1 + k))))
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`
}

function Water({ d, cover, base }) {
  return (
    <group position={[0, d.h, 0]} rotation={[d.a, 0, 0]}>
      <Box size={[d.l, d.t, d.Ls + 0.05]} pos={[0, -d.t / 2, d.Ls / 2]} color={base} rough={0.8} />
      <mesh geometry={faceGeo([-d.l / 2, -d.Ls, d.l / 2, 0])} material={cover} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow />
      {/* testeira (tábua do beiral) */}
      <Box size={[d.l, d.t + 0.3, 0.15]} pos={[0, -d.t / 2 - 0.1, d.Ls - 0.05]} color="#f1ede4" rough={0.6} />
    </group>
  )
}

function Model({ part }) {
  const c = part.config || {}
  const d = roofDims(c)
  const kind = c.acabamento || 'telha'
  const col = c.cor || ACAB_COR[kind] || '#b4532a'
  const base = matColor(c, 'madeira')
  const cover = finishMat(kind, col, base)
  const a = d.w / 2 - d.b
  const len = d.l - 2 * d.b
  const yA = Math.max(0.02, roofUnder(d, a) - 0.02)
  const yR = Math.max(yA, roofUnder(d, 0) - 0.02)
  return (
    <group>
      <Water d={d} cover={cover} base={base} />
      <group rotation={[0, Math.PI, 0]}>
        <Water d={d} cover={cover} base={base} />
      </group>
      {/* cumeeira */}
      <Cyl r={0.42} h={d.l + 0.1} pos={[0, d.h + 0.02, 0]} rot={[0, 0, Math.PI / 2]} color={kind === 'material' ? base : shadeHex(col, -0.12)} rough={0.75} seg={16} />
      {c.sotao !== false && a > 0.2 && len > 0.2 && (
        <mesh geometry={prismXGeo([[-a, 0], [a, 0], [a, yA], [0, yR], [-a, yA]], len)} material={mat(c.corEmpena || '#efe6d2', 0, 0.92)} castShadow receiveShadow />
      )}
    </group>
  )
}

export default { type: 'telhado', Model }
