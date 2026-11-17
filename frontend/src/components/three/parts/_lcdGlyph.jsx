// Carateres personalizados (CGRAM) dos LCD HD44780: nas linhas vindas do backend os códigos
// 0–7 são os carateres criados com lcd.createChar(); a matriz 5×8 de cada um vem em L.cg
// (64 bytes: 8 carateres × 8 linhas, 5 bits por linha).

// matriz 5×8 de um carácter personalizado (ou null se for um carácter normal)
export function cgRows(L, ch) {
  const code = ch?.charCodeAt?.(0)
  if (code == null || code > 7) return null
  return Array.from({ length: 8 }, (_, r) => L?.cg?.[code * 8 + r] ?? 0)
}

// desenha o carácter personalizado na célula (x0, y0, w, h) de um canvas; true se desenhou
export function drawCg(ctx, L, ch, x0, y0, w, h) {
  const g = cgRows(L, ch)
  if (!g) return false
  const px = w / 5
  const py = h / 8
  for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 5; xx++) if (g[yy] & (1 << (4 - xx))) ctx.fillRect(x0 + xx * px, y0 + yy * py, px * 0.88, py * 0.88)
  return true
}

// texto da linha sem os carateres personalizados (que são desenhados à parte)
export const plainLine = (line, cols) => String(line ?? '').slice(0, cols).padEnd(cols).replace(/[\u0000-\u0007]/g, ' ')

// pontos dos carateres personalizados no 2D (SVG), sobre o retângulo do vidro
export function CgOverlay({ L, x, y, w, h, cols, rows, fill }) {
  const cw = w / cols
  const ch = h / rows
  const out = []
  for (let r = 0; r < rows; r++) {
    const line = String(L?.lines?.[r] ?? '')
    for (let c = 0; c < cols; c++) {
      const g = cgRows(L, line[c])
      if (!g) continue
      const px = (cw * 0.8) / 5
      const py = (ch * 0.8) / 8
      const x0 = x + c * cw + cw * 0.1
      const y0 = y + r * ch + ch * 0.1
      for (let yy = 0; yy < 8; yy++)
        for (let xx = 0; xx < 5; xx++) if (g[yy] & (1 << (4 - xx))) out.push(<rect key={`${r}.${c}.${yy}.${xx}`} x={x0 + xx * px} y={y0 + yy * py} width={px * 0.88} height={py * 0.88} fill={fill} />)
    }
  }
  return <g>{out}</g>
}
