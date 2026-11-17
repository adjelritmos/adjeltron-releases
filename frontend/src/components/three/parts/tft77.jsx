// TFT ST7735 1,8" (placa vermelha com leitor de cartões) e ST7789 1,54" IPS. A imagem chega em
// live.fb (RLE [n, rgb565]) só após cada alteração: guarda-se num canvas por peça.
import { Box, Pcb, HeaderPins, Cyl, useLabel } from '../kit.jsx'
import defs, { TFT77 } from '@shared/parts/tft77.js'
import { rectOf } from './_groupA.jsx'
import { screen, decode565 } from './_gDisplays.jsx'

const scr = screen({
  init(e) {
    e.raw = Object.assign(document.createElement('canvas'), { width: e.w, height: e.h })
    e.raw.getContext('2d').fillRect(0, 0, e.w, e.h)
    e.ver = null
  },
  key(e, L) {
    if (!L?.powered) {
      if (e.ver !== null) {
        e.ver = null
        e.raw.getContext('2d').fillRect(0, 0, e.w, e.h)
      }
    } else if (L.fb && L.ver !== e.ver) {
      const ctx = e.raw.getContext('2d')
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, e.w, e.h)
      decode565(ctx, L.fb, Math.min(e.w, L.w || e.w), Math.min(e.h, L.h || e.h), L.w || e.w)
      e.ver = L.ver
    }
    return `${!!L?.powered}|${L?.on !== false}|${!!L?.inv}|${L?.lit !== false}|${e.ver}`
  },
  draw(e, L) {
    const ctx = e.view.getContext('2d')
    ctx.filter = 'none'
    ctx.globalAlpha = 1
    ctx.fillStyle = '#050505'
    ctx.fillRect(0, 0, e.w, e.h)
    if (!L?.powered) return
    if (L.on === false || L.ver == null) {
      // controlador por iniciar mas luz acesa: branco acinzentado
      ctx.fillStyle = L.lit !== false ? '#d6d6d6' : '#101010'
      return ctx.fillRect(0, 0, e.w, e.h)
    }
    if (L.inv) ctx.filter = 'invert(1)'
    ctx.globalAlpha = L.lit !== false ? 1 : 0.1
    ctx.drawImage(e.raw, 0, 0)
    ctx.filter = 'none'
    ctx.globalAlpha = 1
  },
})

function make(def) {
  const g = TFT77[def.type]
  const A = g.act
  const aw = A.x[1] - A.x[0]
  const ad = A.z[1] - A.z[0]
  const ax = (A.x[0] + A.x[1]) / 2
  const az = (A.z[0] + A.z[1]) / 2
  const is35 = def.type === 'st7735'
  function Model({ part }) {
    const tex = scr.useTex(part.id, g.tw, g.th)
    const label = useLabel([{ text: is35 ? '1.8" TFT SPI 128x160' : '1.54" IPS 240x240', font: 'bold 44px Arial' }], 512, 64)
    return (
      <group>
        <Pcb size={[g.L, 0.16, g.D]} color={is35 ? '#c62828' : '#16407a'} />
        {/* moldura + vidro + imagem */}
        <Box size={[aw + 0.3, 0.3, ad + (is35 ? 0.75 : 0.35)]} pos={[ax, 0.31, az + (is35 ? 0.2 : 0.08)]} color="#141414" rough={0.35} />
        <mesh position={[ax, 0.462, az]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[aw, ad]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
        {is35 && (
          <>
            {/* leitor de cartões SD por baixo da ponta oposta aos pinos */}
            <Box size={[2.4, 0.18, 0.7]} pos={[0, -0.09, -2.35]} color="#b8bcc2" metal={0.7} rough={0.35} />
            {[-0.38, -0.13, 0.13, 0.38].map((x) => (
              <Cyl key={x} r={0.07} h={0.02} pos={[x, 0.17, -2.6]} color="#c9a227" metal={0.8} seg={10} />
            ))}
          </>
        )}
        <mesh position={[0, 0.165, is35 ? 2.2 : -1.38]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[g.L * 0.8, 0.2]} />
          <meshBasicMaterial map={label} transparent />
        </mesh>
        <HeaderPins pins={def.pins} base={0} />
      </group>
    )
  }
  function Overlay2D({ part, info, live }) {
    const url = scr.useUrl(part.id, g.tw, g.th, live)
    if (!live?.powered) return null
    const r = rectOf(info, A.x[0], A.z[0], A.x[1], A.z[1])
    return <image href={url} x={r.x} y={r.y} width={r.w} height={r.h} preserveAspectRatio="none" style={{ imageRendering: 'pixelated' }} pointerEvents="none" />
  }
  return { type: def.type, Model, Overlay2D }
}

export default defs.map(make)
