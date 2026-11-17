// LCD Nokia 5110: placa vermelha, moldura metálica e o vidro do LCD com fundo cinzento-esverdeado.
// Pontos escuros com o contraste (live.contrast); com BL a HIGH a luz de fundo fica azulada.
import { Box, Pcb, HeaderPins, Cyl } from '../kit.jsx'
import def, { PCD_ACT as A, PCD_FRAME as F } from '@shared/parts/pcd8544.js'
import { rectOf } from './_groupA.jsx'
import { screen, b64bytes } from './_gDisplays.jsx'

const W = 84
const H = 48
const scr = screen({
  key: (e, L) => (L ? `${L.powered}|${L.on}|${L.ver}|${L.inv}|${L.contrast}|${L.bl}` : ''),
  draw(e, L) {
    const ctx = e.view.getContext('2d')
    const bl = !!L?.bl
    ctx.fillStyle = bl ? '#b9d7f2' : '#a9b49c'
    ctx.fillRect(0, 0, W, H)
    if (!L?.powered || !L.on || !L.fb) return
    const c = L.contrast ?? 40
    // contraste: < ~30 quase invisível, 45–70 bom, > 80 o fundo também escurece
    const ink = Math.max(0.05, Math.min(1, (c - 10) / 35))
    const bg = Math.max(0, Math.min(0.8, (c - 75) / 45))
    if (bg > 0) {
      ctx.fillStyle = `rgba(20,28,40,${bg})`
      ctx.fillRect(0, 0, W, H)
    }
    const bytes = b64bytes(L.fb)
    ctx.fillStyle = `rgba(16,22,34,${ink})`
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let on = (bytes[y * 11 + (x >> 3)] >> (7 - (x & 7))) & 1
        if (L.inv) on ^= 1
        if (on) ctx.fillRect(x, y, 1, 1)
      }
  },
})

function Model({ part }) {
  const tex = scr.useTex(part.id, W, H)
  const fw = F.x[1] - F.x[0]
  const fd = F.z[1] - F.z[0]
  return (
    <group>
      <Pcb size={[4.36, 0.16, 4.31]} color="#b71c1c" />
      {/* moldura metálica com as patilhas, vidro e área do LCD */}
      <Box size={[fw, 0.4, fd]} pos={[0, 0.36, (F.z[0] + F.z[1]) / 2]} color="#b9bcc0" metal={0.7} rough={0.35} />
      <Box size={[fw - 0.2, 0.02, fd - 0.3]} pos={[0, 0.565, (F.z[0] + F.z[1]) / 2 + 0.05]} color="#8f9a86" rough={0.3} />
      <mesh position={[(A.x[0] + A.x[1]) / 2, 0.577, (A.z[0] + A.z[1]) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[A.x[1] - A.x[0], A.z[1] - A.z[0]]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {[-1, 1].map((sx) => (
        <Box key={sx} size={[0.3, 0.42, 0.2]} pos={[sx * 1.4, 0.37, F.z[1] + 0.05]} color="#a9adb2" metal={0.7} />
      ))}
      {[-1, 1].map((sx) => [-1, 1].map((sz) => <Cyl key={`${sx}${sz}`} r={0.14} h={0.17} pos={[sx * 1.9, 0.08, sz * 1.9]} color="#c9a227" metal={0.8} seg={12} />))}
      <HeaderPins pins={def.pins} base={0} />
    </group>
  )
}

function Overlay2D({ part, info, live }) {
  const url = scr.useUrl(part.id, W, H, live)
  if (!live?.powered) return null
  const r = rectOf(info, A.x[0], A.z[0], A.x[1], A.z[1])
  return <image href={url} x={r.x} y={r.y} width={r.w} height={r.h} preserveAspectRatio="none" style={{ imageRendering: 'pixelated' }} pointerEvents="none" />
}

export default { type: 'pcd8544', Model, Overlay2D }
