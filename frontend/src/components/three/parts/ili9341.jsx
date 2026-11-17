// TFT 2,8" ILI9341 240×320. A imagem chega em live.fb (base64 de pares RLE [n, rgb565])
// só durante ~0,5 s após cada alteração; por isso guarda-se uma cache por peça.
import { useMemo } from 'react'
import { Box, Pcb, HeaderPins, Cyl, useFrame, useRef, THREE, liveOf, useLabel } from '../kit.jsx'
import def, { TFT_AREA as A } from '@shared/parts/ili9341.js'
import { rectOf } from './_groupA.jsx'

const W = 240
const H = 320

// cache: partId → { ver, raw (imagem descodificada), view (imagem mostrada), key }
const CACHE = new Map()
function entry(id) {
  let e = CACHE.get(id)
  if (!e) {
    const mk = () => Object.assign(document.createElement('canvas'), { width: W, height: H })
    e = { ver: null, raw: mk(), view: mk(), key: '', n: 0 }
    e.raw.getContext('2d').fillRect(0, 0, W, H)
    CACHE.set(id, e)
  }
  return e
}

function decode(e, fb) {
  const bin = atob(fb)
  const bytes = new Uint8Array(bin.length & ~1)
  for (let i = 0; i < bytes.length; i++) bytes[i] = bin.charCodeAt(i)
  const u16 = new Uint16Array(bytes.buffer)
  const ctx = e.raw.getContext('2d')
  const img = ctx.createImageData(W, H)
  const d = img.data
  let p = 0
  const N = W * H
  for (let i = 0; i + 1 < u16.length && p < N; i += 2) {
    const n = u16[i]
    const c = u16[i + 1]
    const r = (((c >> 11) & 31) * 255) / 31
    const g = (((c >> 5) & 63) * 255) / 63
    const b = ((c & 31) * 255) / 31
    for (let k = 0; k < n && p < N; k++, p++) {
      const o = p * 4
      d[o] = r
      d[o + 1] = g
      d[o + 2] = b
      d[o + 3] = 255
    }
  }
  for (; p < N; p++) d[p * 4 + 3] = 255
  ctx.putImageData(img, 0, 0)
}

// sincroniza a cache com o estado vivo; devolve a entrada (e.n muda quando a imagem mostrada muda)
function sync(id, L) {
  const e = entry(id)
  if (!L?.powered) {
    e.ver = null
    e.raw.getContext('2d').fillRect(0, 0, W, H)
  } else if (L.fb && L.ver !== e.ver) {
    decode(e, L.fb)
    e.ver = L.ver
  }
  const key = `${!!L?.powered}|${L?.on !== false}|${!!L?.inv}|${L?.lit !== false}|${e.ver}`
  if (key !== e.key) {
    e.key = key
    const ctx = e.view.getContext('2d')
    ctx.filter = 'none'
    ctx.globalAlpha = 1
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)
    if (L?.powered) {
      if (L.on === false) {
        // ecrã desligado mas com retroiluminação: branco acinzentado
        ctx.fillStyle = L.lit !== false ? '#d8d8d8' : '#111'
        ctx.fillRect(0, 0, W, H)
      } else {
        if (L.inv) ctx.filter = 'invert(1)'
        ctx.globalAlpha = L.lit !== false ? 1 : 0.12
        ctx.drawImage(e.raw, 0, 0)
        ctx.filter = 'none'
        ctx.globalAlpha = 1
      }
    }
    e.n++
  }
  return e
}

function Model({ part }) {
  const e = entry(part.id)
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(e.view)
    t.colorSpace = THREE.SRGBColorSpace
    t.magFilter = THREE.NearestFilter
    t.minFilter = THREE.LinearFilter
    return t
  }, [e])
  const last = useRef(-1)
  useFrame(() => {
    const s = sync(part.id, liveOf(part.id))
    if (s.n !== last.current) {
      last.current = s.n
      tex.needsUpdate = true
    }
  })
  const label = useLabel([{ text: '2.8" TFT SPI 240x320', font: 'bold 44px Arial' }], 512, 64)
  const aw = A.x[1] - A.x[0]
  const ad = A.z[1] - A.z[0]
  const cz = (A.z[0] + A.z[1]) / 2
  return (
    <group>
      <Pcb size={[5.0, 0.16, 8.6]} color="#c62828" />
      {/* moldura do vidro e ecrã */}
      <Box size={[4.75, 0.3, 7.05]} pos={[0, 0.16 + 0.15, cz + 0.1]} color="#151515" rough={0.35} />
      <Box size={[4.5, 0.02, 6.1]} pos={[0, 0.465, cz]} color="#050505" rough={0.2} />
      <mesh position={[0, 0.48, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[aw, ad]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* inscrição e pinos */}
      <mesh position={[0, 0.165, 3.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.6, 0.45]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
      {[-2.2, 2.2].map((x) => (
        <Cyl key={x} r={0.08} h={0.02} pos={[x, 0.17, 3.9]} color="#ddd" />
      ))}
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

function Overlay2D({ part, info, live }) {
  const e = sync(part.id, live)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const url = useMemo(() => e.view.toDataURL(), [e.n])
  if (!live?.powered) return null
  const r = rectOf(info, A.x[0], A.z[0], A.x[1], A.z[1])
  return <image href={url} x={r.x} y={r.y} width={r.w} height={r.h} preserveAspectRatio="none" style={{ imageRendering: 'pixelated' }} pointerEvents="none" />
}

export default { type: 'ili9341', Model, Overlay2D }
