// Folha de janela de batente (perfil de PVC/alumínio/madeira à europeia): aro da folha com o
// rebaixo, bites (opcionais) dos dois lados, vidro duplo com o perfil espaçador de alumínio à
// volta, puxador de cremona (roseta e manípulo) e dobradiças de pernos com as tampas.
// Origem no eixo das dobradiças, em cima; folha em x ∈ [0, w], y ∈ [G, G + h].
import { Box, RBox, Cyl, geo, mat, mergedGeo, THREE } from '../kit.jsx'
import { matColor } from '@shared/parts/_materials.js'
import { janelaDims } from '@shared/parts/janela.js'
import { GLASS, STEEL } from './_casaKit.jsx'

function Model({ part }) {
  const c = part.config || {}
  const { w, h, t, G, f } = janelaDims(c)
  const col = matColor(c, 'pla')
  const yc = G + h / 2
  const P = { color: col, rough: 0.35 }
  const gw = w - 2 * f // vão do vidro
  const gh = h - 2 * f
  const bead = Math.min(0.12, f * 0.3) // bite de vidro (rebaixo da moldura)
  // perfil espaçador (alumínio) e moldura do vidro: um anel fino à volta do vidro
  const spacer = mergedGeo(`janSpacer${gw},${gh},${bead}`, () => {
    const b = geo('janUnit', () => new THREE.BoxGeometry(1, 1, 1))
    const s = 0.05
    return [
      [b, [0, gh / 2 - s / 2, 0], [0, 0, 0], [gw, s, t * 0.42]],
      [b, [0, -gh / 2 + s / 2, 0], [0, 0, 0], [gw, s, t * 0.42]],
      [b, [gw / 2 - s / 2, 0, 0], [0, 0, 0], [s, gh, t * 0.42]],
      [b, [-gw / 2 + s / 2, 0, 0], [0, 0, 0], [s, gh, t * 0.42]],
    ]
  })
  const beads = mergedGeo(`janBead${gw},${gh},${bead},${t}`, () => {
    const b = geo('janUnit', () => new THREE.BoxGeometry(1, 1, 1))
    const out = []
    for (const z of [t / 2 - 0.04, -t / 2 + 0.04]) {
      out.push([b, [0, gh / 2 - bead / 2, z], [0, 0, 0], [gw, bead, 0.08]])
      out.push([b, [0, -gh / 2 + bead / 2, z], [0, 0, 0], [gw, bead, 0.08]])
      out.push([b, [gw / 2 - bead / 2, 0, z], [0, 0, 0], [bead, gh - 2 * bead, 0.08]])
      out.push([b, [-gw / 2 + bead / 2, 0, z], [0, 0, 0], [bead, gh - 2 * bead, 0.08]])
    }
    return out
  })
  const hingeH = Math.min(0.8, h * 0.12)
  return (
    <group>
      {/* aro da folha (montantes e travessas com arestas boleadas) */}
      <RBox size={[f, h, t]} r={0.04} pos={[f / 2, yc, 0]} {...P} />
      <RBox size={[f, h, t]} r={0.04} pos={[w - f / 2, yc, 0]} {...P} />
      <RBox size={[gw + 0.02, f, t]} r={0.04} pos={[w / 2, G + f / 2, 0]} {...P} />
      <RBox size={[gw + 0.02, f, t]} r={0.04} pos={[w / 2, G + h - f / 2, 0]} {...P} />
      {/* bites do vidro (molduras com o chanfro) nas duas faces */}
      <mesh position={[w / 2, yc, 0]} geometry={beads} material={mat(col, 0, 0.35)} />
      {/* vidro duplo: dois painéis e o perfil espaçador entre eles */}
      <mesh position={[w / 2, yc, 0]} geometry={spacer} material={mat('#9aa1a6', 0.8, 0.4)} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[w / 2, yc, s * t * 0.22]} material={GLASS()}>
          <boxGeometry args={[gw + 0.02, gh + 0.02, 0.03]} />
        </mesh>
      ))}
      {c.travessa !== false && (
        <group>
          {[-1, 1].map((s) => (
            <group key={s}>
              <Box size={[0.1, gh, 0.05]} pos={[w / 2, yc, s * (t * 0.22 + 0.04)]} {...P} />
              <Box size={[gw, 0.1, 0.05]} pos={[w / 2, yc, s * (t * 0.22 + 0.04)]} {...P} />
            </group>
          ))}
        </group>
      )}
      {/* puxador de cremona na face +z, a meio do montante que abre: roseta e manípulo */}
      <group position={[w - f / 2, yc, t / 2]}>
        <RBox size={[0.24, 0.62, 0.08]} r={0.035} pos={[0, 0.02, 0.04]} color={STEEL} metal={0.85} rough={0.25} />
        <Cyl r={0.07} h={0.12} pos={[0, 0, 0.14]} rot={[Math.PI / 2, 0, 0]} color={STEEL} metal={0.85} rough={0.25} seg={12} />
        <RBox size={[0.14, 0.62, 0.11]} r={0.05} pos={[0, 0.31, 0.2]} color={STEEL} metal={0.85} rough={0.22} />
      </group>
      {/* dobradiças: pernos com a tampa em cima e em baixo e a palmela na folha */}
      {[0.15, 0.85].map((k, i) => (
        <group key={i} position={[0, G + k * h, 0]}>
          <Cyl r={0.09} h={hingeH} color={STEEL} metal={0.85} rough={0.3} seg={12} />
          {[-1, 1].map((s) => (
            <Cyl key={s} r={0.07} r2={0.09} h={0.08} pos={[0, s * (hingeH / 2 + 0.04), 0]} rot={[s < 0 ? Math.PI : 0, 0, 0]} color={STEEL} metal={0.85} rough={0.3} seg={12} />
          ))}
          <Box size={[0.4, hingeH * 0.8, 0.03]} pos={[0.2, 0, t / 2 + 0.015]} color={STEEL} metal={0.85} rough={0.3} />
        </group>
      ))}
    </group>
  )
}

export default { type: 'janela', Model }
