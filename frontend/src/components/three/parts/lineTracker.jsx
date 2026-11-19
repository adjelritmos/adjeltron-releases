// Seguidores de linha de 3 e 5 canais: barra preta de 20 mm com os TCRT5000 por baixo (corpo
// preto, lente azul do emissor IV e lente preta do fototransístor viradas para o chão), as
// soldas das 4 pernas de cada um por cima, um LED vermelho e uma resistência por canal, os
// comparadores LM339/LM393 SOIC, furos de fixação e a serigrafia dos pinos; a fita preta da
// simulação aparece no 2D.
import { Chip, RBox, HeaderPins, liveOf, geo, mat, mergedGeo, METAL, THREE } from '../kit.jsx'
import { lineTracker5 as def5, lineTracker3 as d3, TRACKER_Z, LINE_W } from '@shared/parts/lineTracker.js'
import { ShapedPcb, Art, SmdField, SmdLed } from './mq2.jsx'

const T = 0.16
const SX = 0.55 // eixo dos TCRT5000 (x)

function make(def) {
  const zs = TRACKER_Z[def.type]
  const W = def.size[2]
  const n = zs.length
  // comparadores entre canais (LM339 entre o 1.º e o 2.º do meio; no de 5, um LM393 a mais)
  const chips = n === 5 ? [[(zs[1] + zs[2]) / 2, 7, 'LM339'], [(zs[3] + zs[4]) / 2, 4, 'LM393']] : [[(zs[0] + zs[1]) / 2, 7, 'LM339']]
  const chipGap = (a, b) => chips.some(([cz]) => cz > Math.min(a, b) && cz < Math.max(a, b))
  // resistência do LED de cada canal do lado onde não há chip
  const side = zs.map((z, i) => (i < n - 1 && chipGap(z, zs[i + 1]) ? -1 : 1))
  const holes = [
    [0, -W / 2 + 0.35, 0.16],
    [0, W / 2 - 0.35, 0.16],
  ]
  const draw = (p) => {
    for (const [x, z] of holes) p.ring(x, z, 0.16, 0.28)
    for (const pin of def.pins) p.text(pin.id, -0.44, pin.pos[2], 0.1)
    zs.forEach((z, i) => {
      // contorno do TCRT5000 e as 4 almofadas
      p.rect(SX, z, 0.64, 1.06, { lw: 0.014 })
      p.line([[SX - 0.32, z - 0.05], [SX + 0.32, z - 0.05]], { lw: 0.012 })
      for (const dz of [-0.27, 0.27]) for (const dx of [-0.127, 0.127]) p.circle(SX + dx, z + dz, 0.06, { fill: '#c9cdd1', stroke: null })
      // pista do comparador ao LED
      p.line([[-0.15, z], [0.05, z], [0.05, z + side[i] * 0.4]], { lw: 0.03, stroke: '#2b2b2b' })
    })
    p.text(`TCRT5000 × ${n}`, 0.94, 0, 0.1, { rot: -Math.PI / 2 })
  }
  // soldas das pernas dos TCRT5000 (todas numa malha)
  const solder = () =>
    mergedGeo(`lt:solder:${def.type}`, () => {
      const dome = geo('lt:dome', () => new THREE.SphereGeometry(0.055, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2))
      return zs.flatMap((z) => [-0.27, 0.27].flatMap((dz) => [-0.127, 0.127].map((dx) => [dome, [SX + dx, T, z + dz], [0, 0, 0], [1, 0.7, 1]])))
    })
  // corpos dos TCRT5000 por baixo da placa e as lentes viradas para o chão
  const bodies = () => mergedGeo(`lt:tcrt:${def.type}`, () => zs.map((z) => [geo('lt:tcrtBody', () => new THREE.BoxGeometry(0.58, 0.6, 1.0)), [SX, -0.3, z]]))
  const lens = (dz) =>
    mergedGeo(`lt:lens${dz}:${def.type}`, () => zs.map((z) => [geo('lt:lensG', () => new THREE.CylinderGeometry(0.15, 0.15, 0.04, 16)), [SX, -0.6, z + dz]]))
  function Model({ part }) {
    return (
      <group>
        <ShapedPcb id={`lt:${def.type}`} w={2.0} d={W} t={T} r={0.12} holes={holes} color="#151515" />
        <Art id={`lt:${def.type}`} w={2.0} d={W} pos={[0, T + 0.0015, 0]} draw={draw} ppc={150} />
        <mesh geometry={bodies()} material={mat('#121212', 0, 0.55)} castShadow />
        <mesh geometry={lens(-0.25)} material={mat('#3a5bd0', 0, 0.15)} />
        <mesh geometry={lens(0.25)} material={mat('#0a0a0a', 0, 0.15)} />
        <mesh geometry={solder()} material={mat(METAL.tin, 1, 0.3)} />
        {chips.map(([cz, k, label]) => (
          <Chip key={cz} pos={[0.1, T, cz]} rotY={Math.PI / 2} size={[k === 7 ? 0.87 : 0.49, 0.15, 0.39]} n={k} label={label} />
        ))}
        {zs.map((z, i) => (
          <SmdLed key={z} pos={[-0.15, T, z]} rotY={Math.PI / 2} color="#ff3030" read={() => (liveOf(part.id)?.black?.[i] ? 1 : 0)} />
        ))}
        <SmdField id={`lt:${def.type}`} y={T} items={zs.map((z, i) => [-0.15, z + side[i] * 0.27, 0])} />
        {/* condensador de desacoplamento junto aos pinos de alimentação */}
        <RBox size={[0.2, 0.09, 0.125]} r={0.01} pos={[-0.42, T + 0.045, W / 2 - 0.9]} color="#a98b5d" />
        <HeaderPins pins={def.pins} base={0} up={0.45} />
      </group>
    )
  }
  function Overlay2D({ info, live }) {
    if (!live) return null
    const [, y0] = info.project([0, 0, -W / 2 - 0.05])
    const [, y1] = info.project([0, 0, W / 2 + 0.05])
    const line = live.line ?? 0
    const [, ya] = info.project([0, 0, line - LINE_W / 2])
    const [, yb] = info.project([0, 0, line + LINE_W / 2])
    const [xs] = info.project([0.55, 0, 0])
    const top = Math.max(y0, Math.min(y1, ya))
    const bot = Math.max(y0, Math.min(y1, yb))
    return (
      <g pointerEvents="none">
        {bot > top && <rect x={xs - 18} y={top} width={36} height={bot - top} fill="#000" opacity={0.55} />}
        {zs.map((z, i) => {
          const [x, y] = info.project([-0.15, 0, z])
          return live.black?.[i] ? <circle key={z} cx={x} cy={y} r={5} fill="#ff3030" opacity={0.9} filter="url(#glow)" /> : null
        })}
      </g>
    )
  }
  return { type: def.type, Model, Overlay2D }
}

export const lineTracker3 = make(d3)
export const lineTracker5 = make(def5)
