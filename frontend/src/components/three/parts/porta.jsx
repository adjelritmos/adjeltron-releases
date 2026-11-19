// Folha de porta: origem no eixo das dobradiças, em cima; a folha ocupa x ∈ [0, w] e
// y ∈ [G, G + h] (pendurada fica de cabeça para baixo: G + h é o fundo da porta).
// Porta de almofadas à moda clássica: almofadas levantadas (campo central com o chanfro à
// volta) metidas no rebaixo com o filete de sombra, nas duas faces; vidro com bites; puxador de
// manete em roseta redonda com a roseta da fechadura (buraco da chave) por baixo; três
// dobradiças de pernos com as palmelas aparafusadas e as tampas torneadas.
import { Box, RBox, Cyl, geo, mat, THREE } from '../kit.jsx'
import { matColor } from '@shared/parts/_materials.js'
import { portaDims } from '@shared/parts/porta.js'
import { Knuckle, GLASS, STEEL } from './_casaKit.jsx'

const shadeHex = (hex, k) => {
  const n = parseInt(hex.slice(1), 16)
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * (1 + k))))
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`
}

// almofada levantada: placa de pw × ph com o campo central saliente e chanfrado (extrusão em +z)
function raisedGeo(pw, ph) {
  return geo(`portaPanel${pw.toFixed(3)},${ph.toFixed(3)}`, () => {
    const b = Math.min(0.22, pw * 0.18, ph * 0.18)
    const s = new THREE.Shape()
    const x = pw / 2 - b
    const y = ph / 2 - b
    s.moveTo(-x, -y)
    s.lineTo(x, -y)
    s.lineTo(x, y)
    s.lineTo(-x, y)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.035, bevelSize: b, bevelSegments: 1 })
    // o chanfro de trás (z < 0) fica metido na folha
    return g
  })
}

// manete moderna: roseta redonda, pescoço e alavanca virada para as dobradiças (−x), numa face
// (s = ±1); por baixo (pendurada: +y) a roseta da fechadura com o buraco da chave
function Handle({ x, y, t, s }) {
  const M = { color: STEEL, metal: 0.9, rough: 0.22 }
  return (
    <group position={[x, y, s * (t / 2)]}>
      <Cyl r={0.26} r2={0.28} h={0.06} pos={[0, 0, s * 0.03]} rot={[Math.PI / 2, 0, 0]} seg={20} {...M} />
      <Cyl r={0.08} h={0.3} pos={[0, 0, s * 0.18]} rot={[Math.PI / 2, 0, 0]} seg={12} {...M} />
      <RBox size={[1.0, 0.13, 0.13]} r={0.06} pos={[-0.42, 0, s * 0.32]} {...M} />
      <group position={[0, 0.65, 0]}>
        <Cyl r={0.2} r2={0.22} h={0.05} pos={[0, 0, s * 0.025]} rot={[Math.PI / 2, 0, 0]} seg={18} {...M} />
        <Cyl r={0.045} h={0.02} pos={[0, -0.03, s * 0.05]} rot={[Math.PI / 2, 0, 0]} color="#151515" seg={10} />
        <Box size={[0.035, 0.1, 0.02]} pos={[0, 0.03, s * 0.05]} color="#151515" />
      </group>
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
  const field = mat(shadeHex(col, 0.04), 0, 0.5)
  const hh = Math.min(1.0, h * 0.08) // altura de cada dobradiça
  return (
    <group>
      <RBox size={[w, h, t]} r={0.04} pos={[w / 2, yc, 0]} color={col} rough={0.5} />
      {panels.map((p, i) =>
        p.glass ? (
          <group key={i}>
            {/* moldura do vidro (bite) dos dois lados, vidro e cruzeta */}
            <Box size={[p.w + 0.12, p.h + 0.12, t + 0.02]} pos={[p.x, p.y, 0]} color={shadeHex(col, -0.15)} rough={0.5} />
            <mesh position={[p.x, p.y, 0]} material={GLASS()}>
              <boxGeometry args={[p.w - 0.08, p.h - 0.08, t + 0.03]} />
            </mesh>
            <Box size={[0.08, p.h - 0.08, t * 0.6]} pos={[p.x, p.y, 0]} color={shadeHex(col, -0.15)} rough={0.5} />
          </group>
        ) : (
          [1, -1].map((s) => (
            <group key={`${i}${s}`}>
              {/* rebaixo (filete de sombra) e almofada levantada */}
              <Box size={[p.w + 0.08, p.h + 0.08, 0.02]} pos={[p.x, p.y, s * (t / 2 + 0.005)]} color={shadeHex(col, -0.35)} rough={0.7} />
              <mesh geometry={raisedGeo(p.w, p.h)} material={field} position={[p.x, p.y, s * (t / 2)]} rotation={[0, s > 0 ? 0 : Math.PI, 0]} castShadow receiveShadow />
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
      {/* dobradiças: nó no eixo com as tampas e a palmela aparafusada na face +z */}
      {[0.1, 0.5, 0.88].map((f, i) => (
        <group key={i}>
          <Knuckle pos={[0, y0 + f * h, 0]} h={hh} />
          {[-1, 1].map((s) => (
            <Cyl key={s} r={0.08} r2={0.11} h={0.06} pos={[0, y0 + f * h + s * (hh / 2 + 0.03), 0]} rot={[s < 0 ? Math.PI : 0, 0, 0]} color={STEEL} metal={0.85} rough={0.3} seg={12} />
          ))}
          <Box size={[0.5, hh, 0.03]} pos={[0.25, y0 + f * h, t / 2 + 0.015]} color={STEEL} metal={0.85} rough={0.3} />
          {[-0.3, 0, 0.3].map((k) => (
            <Cyl key={k} r={0.045} h={0.012} pos={[0.32, y0 + f * h + k * hh, t / 2 + 0.034]} rot={[Math.PI / 2, 0, 0]} color="#9aa1a6" metal={0.9} rough={0.35} seg={8} />
          ))}
        </group>
      ))}
    </group>
  )
}

export default { type: 'porta', Model }
