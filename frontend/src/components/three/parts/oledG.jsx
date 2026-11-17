// OLED SH1106 1,3" (I2C, 4 pinos) e SSD1306 SPI de 7 pinos. Mesma imagem que o ssd1306.jsx
// (live.fb, 1 bit por ponto, só muda quando o programa envia a memória).
import { useMemo } from 'react'
import { Box, Pcb, HeaderPins, Cyl } from '../kit.jsx'
import shDef, { SH1106_GLASS as SG, SH1106_ACT as SA } from '@shared/parts/sh1106.js'
import spiDef from '@shared/parts/ssd1306spi.js'
import { useLiveTexture, FacePlane, rectOf } from './_groupA.jsx'
import { paintOled } from './ssd1306.jsx'

const SPI_ACT = { x: [-1.087, 1.087], z: [-0.45, 0.636] }
const keyOf = (L) => (L ? `${L.powered}|${L.on}|${L.ver}|${L.inv}|${L.dim}` : '')

function OledTex({ part, act, y }) {
  const color = part.config?.color || 'white'
  const tex = useLiveTexture(part.id, 128, 64, (ctx, w, h, L) => paintOled(ctx, L, color), { nearest: true, key: keyOf })
  return <FacePlane tex={tex} w={act.x[1] - act.x[0]} d={act.z[1] - act.z[0]} pos={[(act.x[0] + act.x[1]) / 2, y, (act.z[0] + act.z[1]) / 2]} />
}

function overlay(act) {
  return function Overlay2D({ part, info, live }) {
    const color = part.config?.color || 'white'
    const url = useMemo(() => {
      if (!live?.powered || !live.on || !live.fb) return null
      const c = Object.assign(document.createElement('canvas'), { width: 128, height: 64 })
      paintOled(c.getContext('2d'), live, color, false)
      return c.toDataURL()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [live?.ver, live?.powered, live?.on, live?.inv, live?.dim, color])
    if (!url) return null
    const r = rectOf(info, act.x[0], act.z[0], act.x[1], act.z[1])
    return <image href={url} x={r.x} y={r.y} width={r.w} height={r.h} preserveAspectRatio="none" style={{ imageRendering: 'pixelated' }} pointerEvents="none" />
  }
}

function ShModel({ part }) {
  const gw = SG.x[1] - SG.x[0]
  const gd = SG.z[1] - SG.z[0]
  return (
    <group>
      <Pcb size={[3.54, 0.12, 3.35]} color="#1d3f8f" />
      <Box size={[gw, 0.14, gd]} pos={[0, 0.19, (SG.z[0] + SG.z[1]) / 2]} color="#0b0b0d" rough={0.25} />
      <Box size={[1.2, 0.03, 0.3]} pos={[0, 0.14, SG.z[1] + 0.12]} color="#a8742a" />
      <OledTex part={part} act={SA} y={0.265} />
      {/* condensadores e regulador por cima dos pinos */}
      <Box size={[0.3, 0.12, 0.16]} pos={[1.15, 0.18, -1.38]} color="#222" />
      <Box size={[0.16, 0.08, 0.08]} pos={[-1.2, 0.16, -1.4]} color="#b08850" />
      {[-1, 1].map((sx) => [-1, 1].map((sz) => <Cyl key={`${sx}${sz}`} r={0.1} h={0.13} pos={[sx * 1.52, 0.06, sz * 1.42]} color="#c9a227" metal={0.8} seg={12} />))}
      <HeaderPins pins={shDef.pins} base={0} />
    </group>
  )
}

function SpiModel({ part }) {
  return (
    <group>
      <Pcb size={[2.73, 0.12, 2.78]} color="#1d3f8f" />
      <Box size={[2.62, 0.14, 1.6]} pos={[0, 0.19, 0.1]} color="#0b0b0d" rough={0.25} />
      <Box size={[1.0, 0.03, 0.25]} pos={[0, 0.14, 1.0]} color="#a8742a" />
      <OledTex part={part} act={SPI_ACT} y={0.265} />
      {/* resistências SMD de seleção do modo (SPI) */}
      {[-0.3, 0, 0.3].map((x) => (
        <Box key={x} size={[0.14, 0.05, 0.08]} pos={[x + 0.6, 0.145, -0.85]} color="#1a1a1a" />
      ))}
      <HeaderPins pins={spiDef.pins} base={0} />
    </group>
  )
}

export const sh1106 = { type: 'sh1106', Model: ShModel, Overlay2D: overlay(SA) }
export const ssd1306spi = { type: 'ssd1306spi', Model: SpiModel, Overlay2D: overlay(SPI_ACT) }
