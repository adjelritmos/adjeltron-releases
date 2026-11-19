// Utilitários dos componentes do grupo A (não é um componente):
// geometria de dígitos de 7 segmentos (canvas + SVG) e texturas que seguem o estado vivo.
import { SCREEN_TINT, useMemo, useRef, useFrame, THREE, liveOf } from '../kit.jsx'

export const SEG_KEYS = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
export const LED_HEX = { red: '#ff2a2a', green: '#22ee55', yellow: '#ffd22a', blue: '#2a7bff', white: '#f4f7ff' }

// Dígito em unidades: largura 1 (x −0,5…0,5), altura 2 (y −1…1, y para baixo), ligeiramente inclinado.
const T = 0.2
const hseg = (cx, cy, L) => [[cx - L / 2, cy], [cx - L / 2 + T / 2, cy - T / 2], [cx + L / 2 - T / 2, cy - T / 2], [cx + L / 2, cy], [cx + L / 2 - T / 2, cy + T / 2], [cx - L / 2 + T / 2, cy + T / 2]]
const vseg = (cx, cy, L) => hseg(cy, cx, L).map(([y, x]) => [x, y])
const SKEW = 0.1
const POLYS = {
  a: hseg(0, -1, 0.86),
  b: vseg(0.5, -0.5, 0.86),
  c: vseg(0.5, 0.5, 0.86),
  d: hseg(0, 1, 0.86),
  e: vseg(-0.5, 0.5, 0.86),
  f: vseg(-0.5, -0.5, 0.86),
  g: hseg(0, 0, 0.86),
}
const sk = ([x, y]) => [x - SKEW * y, y]
export const DP = sk([0.78, 1.0])

// polígonos de um dígito centrado em (cx, cy) com escala s (px por unidade)
export function digitPolys(cx, cy, s) {
  return SEG_KEYS.map((k) => POLYS[k].map((p) => sk(p)).map(([x, y]) => [cx + x * s, cy + y * s]))
}

// desenha um dígito num canvas; lit[i] = brilho 0..1 dos segmentos a..g (+ dp em lit[7])
// segmento apagado de um display real: o difusor branco-acinzentado vê-se bem sobre a face
// preta (não é preto como o corpo)
export const SEG_OFF = '#8f8f8f'
export function drawDigit(ctx, cx, cy, s, lit, color, off = SEG_OFF, dp = true) {
  digitPolys(cx, cy, s).forEach((poly, i) => {
    ctx.beginPath()
    poly.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.closePath()
    ctx.fillStyle = off
    ctx.fill()
    const v = lit?.[i] || 0
    if (v > 0.02) {
      ctx.globalAlpha = Math.min(1, 0.35 + v * 0.65)
      ctx.fillStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = s * 0.25 * v
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
    }
  })
  if (dp) {
    ctx.beginPath()
    ctx.arc(cx + DP[0] * s, cy + DP[1] * s, T * 0.6 * s, 0, Math.PI * 2)
    const v = lit?.[7] || 0
    ctx.fillStyle = v > 0.02 ? color : off
    ctx.globalAlpha = v > 0.02 ? Math.min(1, 0.35 + v * 0.65) : 1
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

// dígito em SVG (só os segmentos acesos), para os Overlay2D
export function SvgDigit({ cx, cy, s, lit, color, dp = true }) {
  return (
    <g>
      {digitPolys(cx, cy, s).map((poly, i) =>
        (lit?.[i] || 0) > 0.02 ? <polygon key={i} points={poly.map((p) => p.join(',')).join(' ')} fill={color} opacity={Math.min(1, 0.35 + lit[i] * 0.65)} /> : null,
      )}
      {dp && (lit?.[7] || 0) > 0.02 && <circle cx={cx + DP[0] * s} cy={cy + DP[1] * s} r={T * 0.6 * s} fill={color} opacity={Math.min(1, 0.35 + lit[7] * 0.65)} />}
    </g>
  )
}

// textura de canvas redesenhada sempre que o estado vivo da peça muda
export function useLiveTexture(id, w, h, draw, { nearest = false, key = (L) => JSON.stringify(L ?? null) } = {}) {
  const canvas = useMemo(() => Object.assign(document.createElement('canvas'), { width: w, height: h }), [w, h])
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    if (nearest) t.magFilter = THREE.NearestFilter
    draw(canvas.getContext('2d'), w, h, null)
    t.needsUpdate = true
    return t
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas])
  const last = useRef('\u0000')
  useFrame(() => {
    const L = liveOf(id)
    const k = key(L)
    if (k === last.current) return
    last.current = k
    draw(canvas.getContext('2d'), w, h, L)
    tex.needsUpdate = true
  })
  return tex
}

// plano horizontal (virado para cima) com uma textura, centrado em pos
export function FacePlane({ tex, w, d, pos }) {
  return (
    <mesh position={pos} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial map={tex} color={SCREEN_TINT} toneMapped={false} />
    </mesh>
  )
}

// retângulo (px) de uma área em cm no referencial local, para os Overlay2D
export function rectOf(info, x0, z0, x1, z1) {
  const [ax, ay] = info.project([x0, 0, z0])
  const [bx, by] = info.project([x1, 0, z1])
  return { x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax), h: Math.abs(by - ay) }
}
