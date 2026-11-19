// OLED SH1106 1,3" (I2C, 4 pinos) e SSD1306 SPI de 7 pinos. Mesma imagem que o ssd1306.jsx
// (live.fb, 1 bit por ponto, só muda quando o programa envia a memória).
import { useMemo } from 'react'
import { Pcb, HeaderPins, Chip } from '../kit.jsx'
import shDef, { SH1106_GLASS as SG, SH1106_ACT as SA } from '@shared/parts/sh1106.js'
import spiDef from '@shared/parts/ssd1306spi.js'
import { useLiveTexture, rectOf } from './_groupA.jsx'
import { DisplayPanel, MountHoles, PinLabels, SmdParts } from './_gDisplays.jsx'
import { paintOled } from './ssd1306.jsx'

const SPI_ACT = { x: [-1.087, 1.087], z: [-0.45, 0.636] }
const SPI_GLASS = { x: [-1.335, 1.335], z: [-0.62, 1.02] }
const keyOf = (L) => (L ? `${L.powered}|${L.on}|${L.ver}|${L.inv}|${L.dim}` : '')

// painel OLED com a imagem viva (vidro, saliência com o CI, reflexo e fita flexível)
function OledPanel({ part, glass, act, fpc }) {
  const color = part.config?.color || 'white'
  const tex = useLiveTexture(part.id, 128, 64, (ctx, w, h, L) => paintOled(ctx, L, color), { nearest: true, key: keyOf })
  return <DisplayPanel glass={glass} act={act} y0={0.12} h={0.14} tex={tex} ledge={1} fpc={fpc} />
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

// OLED 1,3" (placa de 35,4 × 33,5 mm): regulador 662K (XC6206) e condensadores junto aos pinos
function ShModel({ part }) {
  return (
    <group>
      <Pcb size={[3.54, 0.12, 3.35]} color="#1d3f8f" holes={false} />
      <MountHoles pts={[[-1.52, -1.42], [1.52, -1.42], [-1.52, 1.5], [1.52, 1.5]]} y={0.12} r={0.09} ring={0.15} />
      <OledPanel part={part} glass={SG} act={SA} fpc={{ w: 1.3, edge: 1.675, y: 0.12 }} />
      <Chip pos={[1.0, 0.12, -1.38]} size={[0.29, 0.11, 0.16]} n={2} label="662K" />
      <SmdParts list={[[0.72, -1.38, Math.PI / 2, 'c'], [-0.72, -1.38, Math.PI / 2, 'c'], [-1.0, -1.38, Math.PI / 2, 'r']]} y={0.12} />
      <PinLabels xs={shDef.pins.map((p) => p.pos[0])} names={shDef.pins.map((p) => p.id)} z={-1.16} y={0.122} />
      <HeaderPins pins={shDef.pins} base={0} />
    </group>
  )
}

// OLED 0,96" SPI de 7 pinos: mesma placa do I2C, com a fila de 7 pinos
function SpiModel({ part }) {
  return (
    <group>
      <Pcb size={[2.73, 0.12, 2.78]} color="#1d3f8f" holes={false} />
      <MountHoles pts={[[-1.175, -1.19], [1.175, -1.19], [-1.175, 1.19], [1.175, 1.19]]} y={0.12} r={0.1} ring={0.17} />
      <OledPanel part={part} glass={SPI_GLASS} act={SPI_ACT} fpc={{ w: 1.2, edge: 1.39, y: 0.12 }} />
      <PinLabels xs={spiDef.pins.map((p) => p.pos[0])} names={spiDef.pins.map((p) => p.id)} z={-0.86} y={0.122} h={0.1} />
      <HeaderPins pins={spiDef.pins} base={0} />
    </group>
  )
}

export const sh1106 = { type: 'sh1106', Model: ShModel, Overlay2D: overlay(SA) }
export const ssd1306spi = { type: 'ssd1306spi', Model: SpiModel, Overlay2D: overlay(SPI_ACT) }
