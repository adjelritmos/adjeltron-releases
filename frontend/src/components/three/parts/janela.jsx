// Folha de janela: caixilho com vidro (e bites opcionais), puxador de cremona e dobradiças.
// Origem no eixo das dobradiças, em cima; folha em x ∈ [0, w], y ∈ [G, G + h].
import { Box, RBox } from '../kit.jsx'
import { matColor } from '@shared/parts/_materials.js'
import { janelaDims } from '@shared/parts/janela.js'
import { Knuckle, GLASS, STEEL } from './_casaKit.jsx'

function Model({ part }) {
  const c = part.config || {}
  const { w, h, t, G, f } = janelaDims(c)
  const col = matColor(c, 'pla')
  const yc = G + h / 2
  const P = { color: col, rough: 0.4 }
  return (
    <group>
      <Box size={[f, h, t]} pos={[f / 2, yc, 0]} {...P} />
      <Box size={[f, h, t]} pos={[w - f / 2, yc, 0]} {...P} />
      <Box size={[w - 2 * f, f, t]} pos={[w / 2, G + f / 2, 0]} {...P} />
      <Box size={[w - 2 * f, f, t]} pos={[w / 2, G + h - f / 2, 0]} {...P} />
      {c.travessa !== false && (
        <group>
          <Box size={[0.12, h - 2 * f, 0.12]} pos={[w / 2, yc, 0]} {...P} />
          <Box size={[w - 2 * f, 0.12, 0.12]} pos={[w / 2, yc, 0]} {...P} />
        </group>
      )}
      <mesh position={[w / 2, yc, 0]} material={GLASS()}>
        <boxGeometry args={[w - 2 * f + 0.02, h - 2 * f + 0.02, 0.06]} />
      </mesh>
      {/* puxador (cremona) na face +z, a meio do montante que abre */}
      <RBox size={[0.18, 0.7, 0.06]} r={0.03} pos={[w - f / 2, yc, t / 2 + 0.03]} color={STEEL} metal={0.85} rough={0.25} />
      <RBox size={[0.12, 0.6, 0.12]} r={0.05} pos={[w - f / 2, yc + 0.35, t / 2 + 0.14]} color={STEEL} metal={0.85} rough={0.25} />
      {[0.15, 0.85].map((k, i) => (
        <Knuckle key={i} pos={[0, G + k * h, 0]} h={Math.min(0.8, h * 0.12)} r={0.09} />
      ))}
    </group>
  )
}

export default { type: 'janela', Model }
