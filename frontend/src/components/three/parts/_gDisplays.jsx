// Utilitários dos ecrãs do grupo G (não é um componente): um canvas por peça que segue o
// estado vivo (descodificação RLE / bits), usado como textura no 3D e como imagem no 2D.
import { useMemo } from 'react'
import { useFrame, useRef, THREE } from '../kit.jsx'
import { liveOf } from '../kit.jsx'

// screen({ key(e, L) -> texto (pode descodificar para e.raw…), draw(e, L) }) → { sync, useTex, url }
// e = { view (canvas mostrado), w, h, … }; draw() só é chamado quando a chave muda.
export function screen({ key, draw, init }) {
  const CACHE = new Map()
  const entry = (id, w, h) => {
    let e = CACHE.get(id)
    if (!e || e.w !== w || e.h !== h) {
      e = { w, h, view: Object.assign(document.createElement('canvas'), { width: w, height: h }), k: '\u0000', n: 0 }
      init?.(e)
      draw(e, null)
      CACHE.set(id, e)
    }
    return e
  }
  const sync = (id, w, h, L) => {
    const e = entry(id, w, h)
    const k = key(e, L)
    if (k !== e.k) {
      e.k = k
      draw(e, L)
      e.n++
    }
    return e
  }
  function useTex(id, w, h) {
    const e = entry(id, w, h)
    const tex = useMemo(() => {
      const t = new THREE.CanvasTexture(e.view)
      t.colorSpace = THREE.SRGBColorSpace
      t.magFilter = THREE.NearestFilter
      t.minFilter = THREE.LinearFilter
      t.anisotropy = 4
      return t
    }, [e])
    const last = useRef(-1)
    useFrame(() => {
      const s = sync(id, w, h, liveOf(id))
      if (s.n !== last.current) {
        last.current = s.n
        tex.needsUpdate = true
      }
    })
    return tex
  }
  // imagem (data URL) do canvas para o Overlay2D; muda quando o canvas muda
  function useUrl(id, w, h, live) {
    const e = sync(id, w, h, live)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => e.view.toDataURL(), [e, e.n])
  }
  return { sync, useTex, useUrl }
}

export const b64bytes = (s) => {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
// RLE de pares Uint16 [n, valor] → chama put(i, valor, n) por troço
export function rleRuns(fb, fn) {
  const bytes = b64bytes(fb)
  const u16 = new Uint16Array(bytes.buffer, 0, bytes.length >> 1)
  let p = 0
  for (let i = 0; i + 1 < u16.length; i += 2) {
    fn(p, u16[i + 1], u16[i])
    p += u16[i]
  }
}

export const hexRgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16))

// RGB565 → ImageData de w × h (RLE nativo de largura sw)
export function decode565(ctx, fb, w, h, sw = w) {
  const img = ctx.createImageData(w, h)
  const d = img.data
  for (let i = 3; i < d.length; i += 4) d[i] = 255
  rleRuns(fb, (p0, c, n) => {
    const r = (((c >> 11) & 31) * 255) / 31
    const g = (((c >> 5) & 63) * 255) / 63
    const b = ((c & 31) * 255) / 31
    for (let p = p0; p < p0 + n; p++) {
      const x = p % sw
      const y = (p / sw) | 0
      if (x >= w || y >= h) continue
      const o = (y * w + x) * 4
      d[o] = r
      d[o + 1] = g
      d[o + 2] = b
    }
  })
  ctx.putImageData(img, 0, 0)
}
