// OLED SSD1306 128×64. A imagem (1 bit por ponto) chega em live.fb (base64) e só
// muda quando o programa chama display(): live.ver é incrementado.
import { useMemo } from 'react'
import { Pcb, HeaderPins } from '../kit.jsx'
import def from '@shared/parts/ssd1306.js'
import { useLiveTexture, rectOf } from './_groupA.jsx'
import { DisplayPanel, MountHoles, PinLabels } from './_gDisplays.jsx'

// área ativa 21,7 × 10,9 mm
const ACT = { x: [-1.087, 1.087], z: [-0.45, 0.636] }
const INK = { white: ['#eaf6ff', '#eaf6ff'], blue: ['#56c8ff', '#56c8ff'], yellowblue: ['#ffd84a', '#56c8ff'] }

// pinta a imagem num canvas 128×64 (pontos apagados transparentes se `transparent`)
export function paintOled(ctx, L, color, transparent = false) {
  const img = ctx.createImageData(128, 64)
  const on = L?.powered && L.on && L.fb
  if (on) {
    const bytes = Uint8Array.from(atob(L.fb), (c) => c.charCodeAt(0))
    const [top, rest] = (INK[color] || INK.white).map((h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16)))
    const k = L.dim ? 0.55 : 1
    for (let y = 0; y < 64; y++) {
      const ink = y < 16 ? top : rest
      for (let x = 0; x < 128; x++) {
        let bit = (bytes[y * 16 + (x >> 3)] >> (7 - (x & 7))) & 1
        if (L.inv) bit ^= 1
        const o = (y * 128 + x) * 4
        if (bit) {
          img.data[o] = ink[0] * k
          img.data[o + 1] = ink[1] * k
          img.data[o + 2] = ink[2] * k
          img.data[o + 3] = 255
        } else if (!transparent) {
          img.data[o + 3] = 255
        }
      }
    }
  } else if (!transparent) {
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255
  }
  ctx.putImageData(img, 0, 0)
}

// vidro do painel 0,96" (a saliência com o CI fica do lado da fita, em baixo) e furos M2
const GLASS = { x: [-1.335, 1.335], z: [-0.62, 1.02] }
const HOLES = [[-1.175, -1.19], [1.175, -1.19], [-1.175, 1.19], [1.175, 1.19]]

function Model({ part }) {
  const color = part.config?.color || 'white'
  const tex = useLiveTexture(part.id, 128, 64, (ctx, w, h, L) => paintOled(ctx, L, color), {
    nearest: true,
    key: (L) => (L ? `${L.powered}|${L.on}|${L.ver}|${L.inv}|${L.dim}` : ''),
  })
  return (
    <group>
      <Pcb size={[2.73, 0.12, 2.78]} color="#1d3f8f" holes={false} />
      <MountHoles pts={HOLES} y={0.12} r={0.1} ring={0.17} />
      {/* painel OLED (vidro duplo preto) colado com fita, fita flexível dobrada no bordo de baixo */}
      <DisplayPanel glass={GLASS} act={ACT} y0={0.12} h={0.14} tex={tex} ledge={1} fpc={{ w: 1.2, edge: 1.39, y: 0.12 }} />
      <PinLabels xs={def.pins.map((p) => p.pos[0])} names={def.pins.map((p) => p.id)} z={-0.86} y={0.122} />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

function Overlay2D({ part, info, live }) {
  const color = part.config?.color || 'white'
  const url = useMemo(() => {
    if (!live?.powered || !live.on || !live.fb) return null
    const c = Object.assign(document.createElement('canvas'), { width: 128, height: 64 })
    paintOled(c.getContext('2d'), live, color, false)
    return c.toDataURL()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live?.ver, live?.powered, live?.on, live?.inv, live?.dim, color])
  if (!url) return null
  const r = rectOf(info, ACT.x[0], ACT.z[0], ACT.x[1], ACT.z[1])
  return <image href={url} x={r.x} y={r.y} width={r.w} height={r.h} preserveAspectRatio="none" style={{ imageRendering: 'pixelated' }} pointerEvents="none" />
}

export default { type: 'ssd1306', Model, Overlay2D }
