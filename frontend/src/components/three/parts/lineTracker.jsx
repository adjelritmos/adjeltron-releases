// Seguidores de linha de 3 e 5 canais: barra preta com TCRT5000 (por baixo, vistos de
// cima pelo recorte), um LED indicador por canal e a fita preta da simulação no 2D.
import { Box, Cyl, Pcb, HeaderPins, liveOf } from '../kit.jsx'
import { lineTracker5 as def5, lineTracker3 as d3, TRACKER_Z, LINE_W } from '@shared/parts/lineTracker.js'
import { Smd, Led, Silk } from './_groupG.jsx'

const T = 0.16

function make(def) {
  const zs = TRACKER_Z[def.type]
  const W = def.size[2]
  function Model({ part }) {
    return (
      <group>
        <Pcb size={[2.0, T, W]} color="#141414" />
        {zs.map((z, i) => (
          <group key={z}>
            {/* TCRT5000 visto pela janela da placa: emissor azul + recetor preto */}
            <Box size={[0.6, 0.6, 1.0]} pos={[0.55, -0.3, z]} color="#111" />
            <Cyl r={0.15} h={0.05} pos={[0.55, T + 0.02, z - 0.22]} color="#3b5bdb" seg={14} />
            <Cyl r={0.15} h={0.05} pos={[0.55, T + 0.02, z + 0.22]} color="#0b0b0b" seg={14} />
            <Led pos={[-0.15, T, z]} color="#ff3030" read={() => (liveOf(part.id)?.black?.[i] ? 1 : 0)} />
            <Smd pos={[0.05, T, z + 0.3]} />
          </group>
        ))}
        <Silk text={`${zs.length}CH TRACKER`} pos={[-0.45, T + 0.003, 0]} w={Math.min(2.6, W - 0.6)} h={0.2} rot={Math.PI / 2} />
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
