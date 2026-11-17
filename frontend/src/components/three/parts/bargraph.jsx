// Barra de 10 LEDs: 10 retângulos que brilham com a corrente de cada LED.
import * as THREE from 'three'
import { Box, Leg, Glow, liveOf } from '../kit.jsx'
import def from '@shared/parts/bargraph.js'
import { LED_HEX, rectOf } from './_groupA.jsx'

const MIXED = ['green', 'green', 'green', 'green', 'green', 'yellow', 'yellow', 'yellow', 'red', 'red']
const colorOf = (cfg, i) => LED_HEX[cfg?.color === 'mixed' ? MIXED[i] : cfg?.color] || LED_HEX.red
const BX = (i) => (i - 4.5) * 0.254
// segmento apagado: difusor branco-acinzentado com um toque da cor do LED (como nas barras reais)
const offOf = (hex) => '#' + new THREE.Color('#c4c4c4').lerp(new THREE.Color(hex), 0.28).getHexString()
const H = 0.8

function Model({ part }) {
  return (
    <group>
      {def.pins.map((p) => (
        <Leg key={p.id} from={p.pos} to={[p.pos[0], 0.12, p.pos[2]]} />
      ))}
      <Box size={[2.54, H - 0.1, 1.0]} pos={[0, 0.1 + (H - 0.1) / 2, 0]} color="#1b1b1b" rough={0.8} />
      {Array.from({ length: 10 }, (_, i) => (
        <Glow key={i} pos={[BX(i), H + 0.005, 0]} color={colorOf(part.config, i)} base={offOf(colorOf(part.config, i))} intensity={2.5} read={() => liveOf(part.id)?.b?.[i] || 0}>
          <boxGeometry args={[0.16, 0.012, 0.72]} />
        </Glow>
      ))}
    </group>
  )
}

function Overlay2D({ part, info, live }) {
  if (!live?.b?.some((v) => v > 0.02)) return null
  return (
    <g pointerEvents="none" filter="url(#glow)">
      {live.b.map((v, i) => {
        if (v <= 0.02) return null
        const r = rectOf(info, BX(i) - 0.08, -0.36, BX(i) + 0.08, 0.36)
        return <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={1} fill={colorOf(part.config, i)} opacity={Math.min(1, 0.35 + v * 0.65)} />
      })}
    </g>
  )
}

export default { type: 'bargraph', Model, Overlay2D }
