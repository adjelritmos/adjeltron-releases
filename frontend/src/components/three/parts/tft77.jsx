// TFT ST7735 1,8" (placa vermelha com leitor de cartões) e ST7789 1,54" IPS. A imagem chega em
// live.fb (RLE [n, rgb565]) só após cada alteração: guarda-se num canvas por peça.
import { Box, Pcb, HeaderPins } from '../kit.jsx'
import defs, { TFT77 } from '@shared/parts/tft77.js'
import { rectOf } from './_groupA.jsx'
import { screen, decode565, DisplayPanel, MountHoles, SolderPads } from './_gDisplays.jsx'

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
  const is35 = def.type === 'st7735'
  // vidro do painel: ST7735 1,8" (34 × 45,8 mm, saliência do lado dos pinos, +z); ST7789 1,54"
  // (31,5 × 33,7 mm, saliência do lado dos pinos, −z)
  const PANEL = is35 ? { x: [-1.69, 1.69], z: [-2.25, 2.33] } : { x: [-1.565, 1.565], z: [-1.62, 1.75] }
  function Model({ part }) {
    const tex = scr.useTex(part.id, g.tw, g.th)
    return (
      <group>
        <Pcb size={[g.L, 0.16, g.D]} color={is35 ? '#c62828' : '#16407a'} holes={false} />
        {is35 && <MountHoles pts={[[-1.4, -2.5], [1.4, -2.5], [-1.4, 2.5], [1.4, 2.5]]} y={0.16} r={0.14} ring={0.23} />}
        {/* painel TFT: tabuleiro metálico da retroiluminação, vidro, saliência com o CI e imagem */}
        <DisplayPanel glass={PANEL} act={A} y0={0.17} h={0.29} tex={tex} side="#cfd3d6" sideMetal={1} ledge={is35 ? 1 : -1} />
        {is35 && (
          <>
            {/* leitor de cartões SD por baixo da ponta oposta aos pinos e os seus 4 furos */}
            <Box size={[2.4, 0.18, 0.7]} pos={[0, -0.09, -2.35]} color="#b8bcc2" metal={0.7} rough={0.35} />
            <SolderPads pts={[-0.38, -0.13, 0.13, 0.38].map((x) => [x, -2.6])} y={0.16} r={0.075} blob={false} square0 />
          </>
        )}
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
