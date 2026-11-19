// Carateres personalizados (CGRAM) dos LCD HD44780: nas linhas vindas do backend os códigos
// 0–7 são os carateres criados com lcd.createChar(); a matriz 5×8 de cada um vem em L.cg
// (64 bytes: 8 carateres × 8 linhas, 5 bits por linha).
// Também: a fonte 5×8 da ROM do controlador (pontos como no vidro real) e o módulo 3D comum
// dos LCD de caracteres (placa verde, moldura metálica preta, vidro e almofadas).
import { SCREEN_TINT, Pcb, SilkText, geo, mat, mergedGeo, THREE } from '../kit.jsx'
import { MountHoles, SolderPads, GlassSheen } from './_gDisplays.jsx'

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
// eslint-disable-next-line no-control-regex
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

// ---------- fonte 5×8 da ROM (A00) ----------
// colunas de 0x20 a 0x7E (bit 0 = linha de cima; bit 7 = linha do cursor, usada nas descendentes)
const FONT =
  '0000000000 00005f0000 0007000700 147f147f14 242a7f2a12 2313086462 3649562050 0005030000 001c224100 0041221c00 2a1c7f1c2a 08083e0808 0050300000 0808080808 0060600000 2010080402 ' +
  '3e5149453e 00427f4000 4261514946 2141454b31 1814127f10 2745454539 3c4a494930 0171090503 3649494936 064949291e 0036360000 0056360000 0008142241 1414141414 4122140800 0201510906 ' +
  '324979413e 7e1111117e 7f49494936 3e41414122 7f4141221c 7f49494941 7f09090901 3e4149497a 7f0808087f 00417f4100 2040413f01 7f08142241 7f40404040 7f020c027f 7f0408107f 3e4141413e ' +
  '7f09090906 3e4151215e 7f09192946 4649494931 01017f0101 3f4040403f 1f2040201f 3f4038403f 6314081463 0708700807 6151494543 007f414100 0204081020 0041417f00 0402010204 4040404040 ' +
  '0001020400 2054545478 7f48444438 3844444420 384444487f 3854545418 087e090102 0c5252523e 7f08040478 00447d4000 2040443d00 7f10284400 00417f4000 7c0418047c 7c08040478 3844444438 ' +
  '7c14141408 081414187c 7c08040408 4854545420 043f444020 3c4040207c 1c2040201c 3c4030403c 4428102844 0c5050503c 4464544c44 0008364100 00007f0000 0041360800 0201020402'
const GLYPHS = FONT.split(/\s+/).map((h) => {
  const cols = [0, 2, 4, 6, 8].map((k) => parseInt(h.slice(k, k + 2), 16))
  return Array.from({ length: 8 }, (_, r) => cols.reduce((m, c, x) => m | (((c >> r) & 1) << (4 - x)), 0))
})
// matriz 5×8 de um carácter (CGRAM, ROM, ou null se a ROM não o tiver)
export function glyphOf(L, ch) {
  if (!ch) return null
  const cg = cgRows(L, ch)
  if (cg) return cg
  const code = ch.charCodeAt(0)
  return code >= 0x20 && code <= 0x7e ? GLYPHS[code - 0x20] : null
}

// pinta um LCD de caracteres como no vidro real: área de caracteres com margens, células de
// 5×8 pontos (os apagados ainda se veem um pouco) e os carateres em pontos da fonte da ROM.
// o: { cols, rows, inset: [fração x, fração y], L, show (mostra texto), ink 'r,g,b', dotA (pontos
// apagados), textA (pontos acesos), blockRow (linha de blocos escuros, -1), blockA }
// Devolve a grelha { x0, y0, cw, ch, px, py } (para o cursor).
export function paintLcd(ctx, w, h, { cols, rows, inset = [0.06, 0.12], L, show = true, ink = '16,36,10', dotA = 0.08, textA = 1, blockRow = -1, blockA = 0 }) {
  const x0 = w * inset[0]
  const y0 = h * inset[1]
  const cw = (w - 2 * x0) / cols
  const ch = (h - 2 * y0) / rows
  // passo dos pontos: 5 pontos + 1 de intervalo por célula; 8 + ~0,6 na vertical
  const px = cw / 5.9
  const py = ch / 8.7
  const dw = px * 0.84
  const dh = py * 0.84
  const off = `rgba(${ink},${dotA})`
  const on = `rgba(${ink},${textA})`
  const blk = `rgba(${ink},${blockA})`
  for (let r = 0; r < rows; r++) {
    const line = String(L?.lines?.[r] ?? '')
    for (let c = 0; c < cols; c++) {
      const cx = x0 + c * cw + (cw - 5 * px) / 2
      const cy = y0 + r * ch + (ch - 8 * py) / 2
      const t = show ? line[c] : null
      const g = t && t !== ' ' ? glyphOf(L, t) : null
      const block = r === blockRow
      if (t && t !== ' ' && !g) {
        // fora da ROM (acentos, símbolos): letra desenhada na célula
        ctx.fillStyle = off
        for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 5; xx++) ctx.fillRect(cx + xx * px, cy + yy * py, dw, dh)
        ctx.fillStyle = on
        ctx.font = `bold ${Math.round(ch * 0.7)}px "Courier New", monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(t, cx + 2.5 * px, cy + 3.6 * py)
        continue
      }
      for (let yy = 0; yy < 8; yy++)
        for (let xx = 0; xx < 5; xx++) {
          const lit = g && g[yy] & (1 << (4 - xx))
          ctx.fillStyle = block ? blk : lit ? on : off
          ctx.fillRect(cx + xx * px, cy + yy * py, dw, dh)
        }
    }
  }
  return { x0, y0, cw, ch, px, py }
}

// fundo do vidro: verde-amarelo com a retroiluminação, um pouco mais claro ao centro
export function lcdBackground(ctx, w, h, bl, on, [lit, dim, off] = ['#86cc3a', '#3f5a22', '#2b3a1c']) {
  if (!bl) {
    ctx.fillStyle = on ? dim : off
    return ctx.fillRect(0, 0, w, h)
  }
  ctx.fillStyle = lit
  ctx.fillRect(0, 0, w, h)
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.6)
  g.addColorStop(0, 'rgba(255,255,210,0.12)')
  g.addColorStop(1, 'rgba(0,30,0,0.18)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

// ---------- módulo 3D de um LCD de caracteres (1602A / 2004A) ----------
// placa verde com 4 furos metalizados, moldura de chapa pintada de preto com a janela, vidro
// (textura do conteúdo) um pouco abaixo do rebordo, patilhas da moldura, terminais da
// retroiluminação nas pontas e as 16 almofadas soldadas (quadrada no pino 1).
// o: { pcb: [w, t, d], frame: [fw, fd], frameH, glass: {x, z}, tex, holes: [[x,z]…], pads: [[x,z]…],
//      model: '1602A' | '2004A' }
const frameGeo = (fw, fd, wx, wz, h) =>
  geo(`lcdFrame${fw},${fd},${wx},${wz},${h}`, () => {
    const r = 0.06
    const s = new THREE.Shape()
    s.moveTo(-fw / 2 + r, -fd / 2)
    s.lineTo(fw / 2 - r, -fd / 2)
    s.quadraticCurveTo(fw / 2, -fd / 2, fw / 2, -fd / 2 + r)
    s.lineTo(fw / 2, fd / 2 - r)
    s.quadraticCurveTo(fw / 2, fd / 2, fw / 2 - r, fd / 2)
    s.lineTo(-fw / 2 + r, fd / 2)
    s.quadraticCurveTo(-fw / 2, fd / 2, -fw / 2, fd / 2 - r)
    s.lineTo(-fw / 2, -fd / 2 + r)
    s.quadraticCurveTo(-fw / 2, -fd / 2, -fw / 2 + r, -fd / 2)
    const hole = new THREE.Path()
    hole.moveTo(wx[0], wz[0])
    hole.lineTo(wx[0], wz[1])
    hole.lineTo(wx[1], wz[1])
    hole.lineTo(wx[1], wz[0])
    hole.lineTo(wx[0], wz[0])
    s.holes.push(hole)
    const b = 0.012
    const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * b, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 1, curveSegments: 3 })
    // forma no plano xz (y da forma → −z do mundo) e altura de 0 a h
    g.rotateX(-Math.PI / 2)
    g.translate(0, b, 0)
    return g
  })

export function LcdModule({ pcb, frame, frameH, glass, tex, holes, pads, model = '1602A' }) {
  const [w, T] = pcb
  const [fw, fd] = frame
  const top = T + frameH
  const gx = (glass.x[0] + glass.x[1]) / 2
  const gz = (glass.z[0] + glass.z[1]) / 2
  const gw = glass.x[1] - glass.x[0]
  const gd = glass.z[1] - glass.z[0]
  // janela da moldura ~1 mm maior que a área visível
  const wx = [glass.x[0] - 0.08, glass.x[1] + 0.08]
  const wz = [glass.z[0] - 0.08, glass.z[1] + 0.08]
  const frameMat = mat('#1c1d1f', 0.55, 0.42)
  return (
    <group>
      <Pcb size={pcb} color="#1f6f2a" holes={false} />
      <MountHoles pts={holes} y={T} r={0.13} ring={0.24} />
      {/* moldura de chapa (paredes e rebordo com a janela) */}
      <mesh position={[0, T, 0]} geometry={frameGeo(fw, fd, wx, wz.map((z) => -z).reverse(), frameH)} material={frameMat} castShadow receiveShadow />
      {/* vidro do LCD: bloco escuro por baixo da janela e a imagem ~0,4 mm abaixo do rebordo */}
      <mesh position={[gx, top - 0.05, gz]} scale={[wx[1] - wx[0], 0.04, wz[1] - wz[0]]} geometry={geo('gull', () => new THREE.BoxGeometry(1, 1, 1))} material={mat('#141a10', 0, 0.3)} />
      <mesh position={[gx, top - 0.028, gz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[gw + 0.16, gd + 0.16]} />
        <meshBasicMaterial map={tex} color={SCREEN_TINT} toneMapped={false} />
      </mesh>
      <GlassSheen w={gw + 0.16} d={gd + 0.16} pos={[gx, top - 0.02, gz]} />
      {/* patilhas da moldura dobradas para a placa (lados compridos) */}
      <mesh
        geometry={mergedGeo(`lcdTabs${fw},${fd},${T}`, () =>
          [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [geo('gull', () => new THREE.BoxGeometry(1, 1, 1)), [sx * fw * 0.36, T + 0.06, sz * (fd / 2 + 0.02)], [0, 0, 0], [0.28, 0.12, 0.05]])),
        )}
        material={frameMat}
      />
      {/* terminais da retroiluminação (A/K) soldados nas pontas da moldura */}
      {fw / 2 + 0.25 < w / 2 && <SolderPads pts={[[-fw / 2 - 0.16, -0.12], [-fw / 2 - 0.16, 0.12], [fw / 2 + 0.16, -0.12], [fw / 2 + 0.16, 0.12]]} y={T} r={0.08} />}
      {/* 16 almofadas do conector, soldadas (a 1 é quadrada) e a serigrafia */}
      <SolderPads pts={pads} y={T} r={0.085} square0 />
      <SilkText text="1" pos={[pads[0][0] - 0.06, T + 0.003, pads[0][1] + 0.2]} w={0.14} d={0.14} font="bold 52px Arial" px={[64, 64]} />
      <SilkText text="16" pos={[pads[15][0] + 0.02, T + 0.003, pads[15][1] + 0.2]} w={0.22} d={0.14} font="bold 52px Arial" px={[96, 64]} />
      <SilkText text={model} pos={[w / 2 - 0.75, T + 0.003, pads[0][1]]} w={0.8} d={0.16} font="bold 44px Arial" px={[256, 52]} />
    </group>
  )
}
