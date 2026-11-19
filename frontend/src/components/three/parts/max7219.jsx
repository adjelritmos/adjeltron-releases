// Matriz 8×8 com MAX7219: linhas em live.rows (bit 7 = coluna 0, à esquerda).
import { Box, Pcb, HeaderPins, SilkText, PITCH } from '../kit.jsx'
import { MountHoles, PinColumn } from './_gDisplays.jsx'
import def from '@shared/parts/max7219.js'
import { LED_HEX, useLiveTexture, FacePlane, rectOf } from './_groupA.jsx'

const M = 3.2 // lado do bloco de LEDs (cm)
const P = M / 8

// face da matriz 1088AS: preta, com 64 pontos difusores (branco-acinzentados apagados)
function draw(color) {
  return (ctx, w, h, L) => {
    ctx.fillStyle = '#121212'
    ctx.fillRect(0, 0, w, h)
    const c = w / 8
    for (let r = 0; r < 8; r++) {
      for (let k = 0; k < 8; k++) {
        const on = (L?.rows?.[r] ?? 0) & (0x80 >> k)
        const x = k * c + c / 2
        const y = r * c + c / 2
        ctx.beginPath()
        ctx.arc(x, y, c * 0.37, 0, Math.PI * 2)
        if (on) {
          ctx.globalAlpha = L.b ?? 1
          ctx.fillStyle = color
          ctx.shadowColor = color
          ctx.shadowBlur = c * 0.3
          ctx.fill()
        } else {
          const g = ctx.createRadialGradient(x - c * 0.08, y - c * 0.08, c * 0.05, x, y, c * 0.37)
          g.addColorStop(0, '#b9b5ad')
          g.addColorStop(1, '#7d7a74')
          ctx.fillStyle = g
          ctx.fill()
        }
        ctx.globalAlpha = 1
        ctx.shadowBlur = 0
      }
    }
  }
}

// módulo azul de 50 × 32 mm: matriz 1088AS (32 × 32 mm) encaixada em duas barras fêmea de 8 vias
// por cima do MAX7219, entrada à esquerda e saída à direita (5 pinos cada) com a serigrafia
const IN = def.pins.slice(0, 5)
const OUT = def.pins.slice(5)
function Model({ part }) {
  const color = LED_HEX[part.config?.color] || LED_HEX.red
  const tex = useLiveTexture(part.id, 256, 256, draw(color))
  const T = 0.16
  const yB = 0.49 // base da matriz (topo das barras fêmea)
  return (
    <group>
      <Pcb size={[5.0, T, 3.2]} color="#1f5f9f" holes={false} />
      <MountHoles pts={[[-2.2, -1.3], [2.2, -1.3], [-2.2, 1.3], [2.2, 1.3]]} y={T} r={0.15} ring={0.25} />
      {/* barras fêmea onde encaixam os 16 pinos da matriz */}
      {[-1.27, 1.27].map((z) => (
        <Box key={z} size={[8 * PITCH, yB - T, PITCH]} pos={[0, (T + yB) / 2, z]} color="#151515" rough={0.55} />
      ))}
      {/* matriz: corpo preto e face com os pontos */}
      <Box size={[M, 1.112 - yB, M]} pos={[0, (yB + 1.112) / 2, 0]} color="#161616" rough={0.6} />
      <FacePlane tex={tex} w={M - 0.04} d={M - 0.04} pos={[0, 1.113, 0]} />
      <PinColumn zs={IN.map((p) => p.pos[2])} names={IN.map((p) => p.id)} x={-1.9} y={T + 0.002} w={0.36} />
      <PinColumn zs={OUT.map((p) => p.pos[2])} names={OUT.map((p) => p.label || p.id)} x={1.9} y={T + 0.002} w={0.4} />
      <SilkText text="IN" pos={[-2.3, T + 0.002, -0.95]} w={0.2} d={0.12} font="bold 44px Arial" px={[64, 40]} />
      <SilkText text="OUT" pos={[2.3, T + 0.002, -0.95]} w={0.3} d={0.12} font="bold 44px Arial" px={[96, 40]} />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

function Overlay2D({ part, info, live }) {
  if (!live?.rows?.some((r) => r)) return null
  const color = LED_HEX[part.config?.color] || LED_HEX.red
  const dots = []
  for (let r = 0; r < 8; r++) {
    for (let k = 0; k < 8; k++) {
      if (!(live.rows[r] & (0x80 >> k))) continue
      const q = rectOf(info, -M / 2 + k * P, -M / 2 + r * P, -M / 2 + (k + 1) * P, -M / 2 + (r + 1) * P)
      dots.push(<circle key={r * 8 + k} cx={q.x + q.w / 2} cy={q.y + q.h / 2} r={q.w * 0.38} fill={color} opacity={0.35 + 0.65 * (live.b ?? 1)} />)
    }
  }
  return (
    <g pointerEvents="none" filter="url(#glow)">
      {dots}
    </g>
  )
}

export default { type: 'max7219', Model, Overlay2D }
