// Base do meArm em MDF: chapa com recorte, contornos gravados a laser do Uno e da mini
// breadboard, torre de 4 pilares de nylon e tabuleiro do servo da base.
import { Box, THREE } from '../kit.jsx'
import { MDF_BURN, Mdf, Screw, Spacer, extrudeXZ, holeCircle, holeRect, rrect } from './_mdfKit.jsx'
import { BMDF, baseMdfDims } from '@shared/parts/baseMdf.js'

// contorno gravado (linha escura fina) de um retângulo lx × lz centrado em (x, z)
function Engrave({ x, z, lx, lz, y }) {
  const e = 0.05
  const P = { color: MDF_BURN, rough: 0.95 }
  return (
    <group position={[x, y + 0.002, z]}>
      <Box size={[lx, 0.004, e]} pos={[0, 0, -lz / 2]} {...P} />
      <Box size={[lx, 0.004, e]} pos={[0, 0, lz / 2]} {...P} />
      <Box size={[e, 0.004, lz]} pos={[-lx / 2, 0, 0]} {...P} />
      <Box size={[e, 0.004, lz]} pos={[lx / 2, 0, 0]} {...P} />
    </group>
  )
}

function Model({ part }) {
  const c = part.config || {}
  const { l, w, t, h, towerX, deckY, deckTop, unoX, bbX, cut } = baseMdfDims(c)
  const P = BMDF.post
  const plate = extrudeXZ(`baseMdf${l},${w}`, t, () => {
    const s = rrect(new THREE.Shape(), -l / 2, -w / 2, l / 2, w / 2, 0.8)
    for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      holeCircle(s, sx * (l / 2 - 0.8), sz * (w / 2 - 0.8), 0.2)
      holeCircle(s, towerX + sx * P, sz * P, 0.17)
    }
    holeRect(s, cut.x - cut.l / 2, -cut.w / 2, cut.x + cut.l / 2, cut.w / 2, 0.2)
    // fila de furos de aligeiramento entre a breadboard e a borda de trás
    for (let i = 0; i < 4; i++) holeCircle(s, bbX - 1.5 + i * 1.0, w / 2 - 2.2, 0.3)
    return s
  })
  const D = BMDF.deck / 2
  const deck = extrudeXZ('baseMdfDeck', t, () => {
    const s = rrect(new THREE.Shape(), -D, -D, D, D, 0.6)
    for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) holeCircle(s, sx * P, sz * P, 0.17)
    // recorte do corpo do SG90 (centro do corpo a −0,55 do eixo) e furos dos parafusos das abas
    holeRect(s, -0.55 - 1.2, -0.66, -0.55 + 1.2, 0.66, 0.05)
    holeCircle(s, -0.55 - 1.42, 0, 0.1)
    holeCircle(s, -0.55 + 1.42, 0, 0.1)
    return s
  })
  const posts = [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz]) => [towerX + sx * P, sz * P])
  return (
    <group>
      <Mdf geometry={plate} cfg={c} />
      <Engrave x={unoX - 0.2} z={0} lx={7.2} lz={5.7} y={t} />
      <Engrave x={bbX} z={0} lx={3.8} lz={5.0} y={t} />
      <Mdf geometry={deck} cfg={c} pos={[towerX, deckY, 0]} />
      {posts.map(([x, z], i) => (
        <group key={i}>
          <Spacer x={x} z={z} y0={t} h={h} />
          <Screw pos={[x, deckTop, z]} len={0.5} nut={false} />
        </group>
      ))}
      {/* parafusos das abas do servo da base */}
      {[-1, 1].map((s) => (
        <Screw key={s} pos={[towerX - 0.55 + s * 1.42, deckTop + 0.25, 0]} len={0.6} />
      ))}
    </group>
  )
}

export default { type: 'baseMdf', Model }
