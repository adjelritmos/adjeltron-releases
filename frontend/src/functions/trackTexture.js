// Desenha a pista (geometria partilhada em shared/tracks.js) numa textura.
// O backend rasteriza exatamente a mesma geometria para os sensores IR.
import { ARENA, trackInfo } from '@shared/tracks.js'

const cache = new Map()

export function getTrack(id) {
  if (cache.has(id)) return cache.get(id)
  const info = trackInfo(id)
  const { w, h, pxPerCm: S } = ARENA
  const canvas = document.createElement('canvas')
  canvas.width = w * S
  canvas.height = h * S
  const ctx = canvas.getContext('2d')
  // fundo branco (ou preto, na pista de linha branca)
  ctx.fillStyle = info.invert ? '#151515' : '#f2f1ec'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  for (let i = 0; i < 9000; i++) {
    const g = info.invert ? 20 + Math.floor(Math.random() * 20) : 225 + Math.floor(Math.random() * 25)
    ctx.fillStyle = `rgba(${g},${g},${g},0.35)`
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2)
  }
  ctx.strokeStyle = 'rgba(120,140,170,0.12)'
  ctx.lineWidth = 1
  for (let x = 0; x <= w; x += 10) {
    ctx.beginPath(); ctx.moveTo(x * S, 0); ctx.lineTo(x * S, h * S); ctx.stroke()
  }
  for (let z = 0; z <= h; z += 10) {
    ctx.beginPath(); ctx.moveTo(0, z * S); ctx.lineTo(w * S, z * S); ctx.stroke()
  }
  const toPx = ([x, z]) => [(x + w / 2) * S, (z + h / 2) * S]
  // linhas (todas as da pista), com a largura e o tracejado da pista
  ctx.strokeStyle = info.invert ? '#f4f4f0' : '#111'
  ctx.lineWidth = info.lineW * S
  ctx.lineJoin = 'round'
  for (const pth of info.paths || []) {
    const dash = pth.dash ?? info.dash
    ctx.lineCap = dash ? 'butt' : 'round'
    ctx.setLineDash(dash ? dash.map((v) => v * S) : [])
    ctx.beginPath()
    pth.points.forEach((p, i) => (i ? ctx.lineTo(...toPx(p)) : ctx.moveTo(...toPx(p))))
    if (pth.closed) ctx.closePath()
    ctx.stroke()
  }
  ctx.setLineDash([])
  // cruzamentos numerados (grelha de ruas do exemplo do Dijkstra)
  if (info.nodes) {
    for (const n of info.nodes) {
      const [px, py] = toPx([n.x, n.z])
      ctx.fillStyle = '#1565c0'
      ctx.beginPath()
      ctx.arc(px + 5 * S, py - 5 * S, 2.6 * S, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = `bold ${3 * S}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(n.id), px + 5 * S, py - 5 * S + 0.2 * S)
    }
  }
  if (info.points && info.mark) {
    const m = info.mark
    ctx.save()
    ctx.translate(...toPx([m.x, m.z]))
    ctx.rotate(-m.theta)
    ctx.fillStyle = '#d32f2f'
    ctx.fillRect(-0.4 * S, -6 * S, 0.8 * S, 12 * S)
    ctx.restore()
  }
  if (info.border) {
    ctx.strokeStyle = '#111'
    ctx.lineWidth = 2.5 * S
    ctx.strokeRect(6 * S, 6 * S, (w - 12) * S, (h - 12) * S)
  }
  const t = { ...info, canvas }
  cache.set(id, t)
  return t
}
