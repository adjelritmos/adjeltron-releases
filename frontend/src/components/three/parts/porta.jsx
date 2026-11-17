// Folha de porta: origem no eixo das dobradiças, em cima; a folha ocupa x ∈ [0, w] e
// y ∈ [G, G + h] (pendurada fica de cabeça para baixo: G + h é o fundo da porta).
// Almofadas salientes nas duas faces, puxador de manete com espelho e três dobradiças.
import { Box, RBox, Cyl } from '../kit.jsx'
import { matColor } from '@shared/parts/_materials.js'
import { portaDims } from '@shared/parts/porta.js'
import { Knuckle, GLASS, STEEL } from './_casaKit.jsx'

const shadeHex = (hex, k) => {
  const n = parseInt(hex.slice(1), 16)
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * (1 + k))))
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`
}

// manete: espelho + alavanca virada para as dobradiças (−x), numa face (s = ±1)
function Handle({ x, y, t, s }) {
  return (
    <group position={[x, y, s * (t / 2)]}>
      <RBox size={[0.32, 1.1, 0.06]} r={0.03} pos={[0, 0.15, s * 0.03]} color={STEEL} metal={0.85} rough={0.25} />
      <Cyl r={0.07} h={0.3} pos={[0, 0, s * 0.18]} rot={[Math.PI / 2, 0, 0]} color={STEEL} metal={0.85} rough={0.25} seg={12} />
      <RBox size={[1.0, 0.14, 0.12]} r={0.05} pos={[-0.42, 0, s * 0.32]} color={STEEL} metal={0.85} rough={0.25} />
      <Cyl r={0.06} h={0.05} pos={[0, 0.55, s * 0.07]} rot={[Math.PI / 2, 0, 0]} color="#222" seg={10} />
    </group>
  )
}

function Model({ part }) {
  const c = part.config || {}
  const { w, h, t, G } = portaDims(c)
  const col = matColor(c, 'madeira')
  const estilo = c.estilo || 'almofadas'
  const y0 = G
  const yc = G + h / 2
  const m = 0.12 * w // margem das almofadas
  const panels = []
  if (estilo === 'almofadas' || estilo === 'vidro') {
    const pw = (w - 3 * m) / 2
    const rows = [[0.08, 0.36], [0.5, 0.92]] // fração da altura (a partir do topo, y = G)
    for (const [f0, f1] of rows)
      for (let i = 0; i < 2; i++) {
        // pendurada, G + h é o fundo: o vidro fica nas almofadas de cima (y perto de G)
        panels.push({ x: m + pw / 2 + i * (pw + m), y: y0 + ((f0 + f1) / 2) * h, w: pw, h: (f1 - f0) * h, glass: estilo === 'vidro' && f0 < 0.4 })
      }
  }
  const grooves = estilo === 'garagem' ? Array.from({ length: Math.max(2, Math.floor(h / 2.2)) }, (_, i) => y0 + ((i + 1) * h) / (Math.floor(h / 2.2) + 1)) : []
  return (
    <group>
      <RBox size={[w, h, t]} r={0.04} pos={[w / 2, yc, 0]} color={col} rough={0.55} />
      {panels.map((p, i) =>
        p.glass ? (
          <group key={i}>
            <Box size={[p.w + 0.12, p.h + 0.12, t + 0.02]} pos={[p.x, p.y, 0]} color={shadeHex(col, -0.15)} rough={0.5} />
            <mesh position={[p.x, p.y, 0]} material={GLASS()}>
              <boxGeometry args={[p.w - 0.08, p.h - 0.08, t + 0.03]} />
            </mesh>
          </group>
        ) : (
          [1, -1].map((s) => (
            <group key={`${i}${s}`}>
              <Box size={[p.w, p.h, 0.04]} pos={[p.x, p.y, s * (t / 2 + 0.02)]} color={shadeHex(col, -0.18)} rough={0.6} />
              <Box size={[p.w - 0.3, p.h - 0.3, 0.06]} pos={[p.x, p.y, s * (t / 2 + 0.03)]} color={shadeHex(col, 0.06)} rough={0.5} />
            </group>
          ))
        ),
      )}
      {grooves.map((y, i) => (
        <group key={i}>
          <Box size={[w - 0.1, 0.08, t + 0.02]} pos={[w / 2, y, 0]} color={shadeHex(col, -0.3)} rough={0.6} />
        </group>
      ))}
      {/* puxador a ~1 m do chão (pendurada: y = G + 0,52 h) */}
      <Handle x={w - 0.65} y={y0 + 0.52 * h} t={t} s={1} />
      <Handle x={w - 0.65} y={y0 + 0.52 * h} t={t} s={-1} />
      {/* dobradiças (nós no eixo) */}
      {[0.1, 0.5, 0.88].map((f, i) => (
        <group key={i}>
          <Knuckle pos={[0, y0 + f * h, 0]} h={Math.min(1.0, h * 0.08)} />
          <Box size={[0.5, Math.min(1.0, h * 0.08), 0.03]} pos={[0.25, y0 + f * h, t / 2 + 0.015]} color={STEEL} metal={0.85} rough={0.3} />
        </group>
      ))}
    </group>
  )
}

export default { type: 'porta', Model }
