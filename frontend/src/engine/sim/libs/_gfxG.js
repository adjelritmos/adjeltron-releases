// Ajudantes das bibliotecas de ecrãs do grupo G (não é uma biblioteca):
//  - withGfxExtras(Base): tipos de letra GFX (FreeSans9pt7b…) aproximados pelo 5×7 ampliado
//    com a linha de base no cursor (como na Adafruit_GFX) e getTextBounds();
//  - spiPart(): procura o ecrã SPI pelo pino CS e verifica DC/MOSI/SCK;
//  - b64 / rle16: codificação das imagens para o browser.
import { hwSpi } from './Adafruit_ILI9341.js'
import * as i18n from '../../../../../shared/i18n.js'

// escala do 5×7 para um tipo de letra GFX de `pt` pontos (9 pt ≈ 2×)
const fontScale = (pt) => Math.max(1, Math.round(pt / 5))

export function withGfxExtras(Base) {
  return class extends Base {
    setFont(f) {
      if (!f) {
        this.gf = null
        return
      }
      const pt = +f.pt || 9
      const s = fontScale(pt)
      this.gf = { s, adv: 6 * s, yAdv: Math.round(pt * 2.2), name: f.name }
    }
    _write(code) {
      const gf = this.gf
      if (!gf) return super._write(code)
      const sx = this.sx * gf.s
      const sy = this.sy * gf.s
      if (code === 10) {
        this.cx = 0
        this.cy += this.sy * gf.yAdv
      } else if (code !== 13) {
        if (this.wrap && this.cx + sx * 6 > this.width()) {
          this.cx = 0
          this.cy += this.sy * gf.yAdv
        }
        // tipos GFX: o cursor está na linha de base e o fundo nunca é pintado
        this.drawChar(this.cx, this.cy - 7 * sy, code, this.fg, this.fg, sx, sy)
        this.cx += sx * 6
      }
    }
    // getTextBounds(texto, x, y, &x1, &y1, &w, &h): os & chegam como { v } (compiler-g.js)
    getTextBounds(str, x, y, x1, y1, w, h) {
      const t = String(str ?? '')
      const lines = t.split('\n')
      const n = Math.max(...lines.map((l) => l.replace(/\r/g, '').length))
      let bx
      let by
      let bw
      let bh
      if (this.gf) {
        const sx = this.sx * this.gf.s
        const sy = this.sy * this.gf.s
        bx = x
        by = y - 7 * sy
        bw = Math.max(0, n * 6 * sx - sx)
        bh = 7 * sy + (lines.length - 1) * this.sy * this.gf.yAdv
      } else {
        bx = x
        by = y
        bw = n * 6 * this.sx
        bh = lines.length * 8 * this.sy
      }
      const put = (o, v) => {
        if (o && typeof o === 'object') o.v = v
      }
      put(x1, bx)
      put(y1, by)
      put(w, bw)
      put(h, bh)
    }
  }
}

// ecrã SPI encontrado pelo pino CS. pins = { cs, dc, mosi, sck } (pinos do Arduino; mosi/sck
// por omissão os do SPI por hardware); names = nomes dos pinos da peça.
export function spiPart(env, { types, label, cs, dc, mosi, sck, names = {} }) {
  const N = { cs: 'CS', dc: 'DC', mosi: 'MOSI', sck: 'SCK', ...names }
  const isT = (q) => types.has(q.type)
  const p = env.partsOnPin(cs).find(isT) || null
  if (!p) {
    const any = env.partsOnPin(dc).find(isT)
    env.warnOnce(`spi${label}${cs}`, any ? i18n.m(`${label}: o pino ${cs} passado como CS não está ligado ao ${N.cs} do ecrã (veja a ordem dos argumentos do construtor).`, `${label}: pin ${cs} passed as CS is not connected to the display's ${N.cs} (check the order of the constructor arguments).`) : i18n.m(`${label}: nenhum ecrã com ${N.cs} no pino ${cs}. Ligue ${N.cs}, ${N.dc}, ${N.mosi} e ${N.sck}.`, `${label}: no display with ${N.cs} on pin ${cs}. Connect ${N.cs}, ${N.dc}, ${N.mosi} and ${N.sck}.`))
    return null
  }
  const hw = hwSpi(env)
  const mo = mosi ?? hw.mosi
  const sk = sck ?? hw.sck
  const has = (pin, n) => env.pinsOf(p.id, pin).includes(n)
  if (dc != null && dc >= 0 && !has(N.dc, dc)) env.warnOnce(`spidc${label}`, i18n.m(`${label}: ${N.dc} do ecrã não está no pino ${dc} — sem D/C os comandos são lidos como dados e o ecrã não mostra nada.`, `${label}: the display's ${N.dc} is not on pin ${dc} — without D/C commands are read as data and the screen shows nothing.`))
  if (!has(N.mosi, mo) || !has(N.sck, sk)) {
    env.warnOnce(`spibus${label}`, i18n.m(`${label}: ${N.mosi} tem de ir ao pino ${mo} e ${N.sck} ao ${sk}${mosi != null ? ' (pinos do construtor)' : ' (SPI por hardware da placa)'}. O ecrã não recebe nada.`, `${label}: ${N.mosi} must go to pin ${mo} and ${N.sck} to ${sk}${mosi != null ? ' (constructor pins)' : ' (the board\'s hardware SPI)'}. The display receives nothing.`))
    return null
  }
  return p
}

export const b64 = (u8) => Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength).toString('base64')

// RLE de valores de 16 bits: pares [n.º de repetições, valor]; devolve base64
export function rle16(arr) {
  const out = new Uint16Array(arr.length * 2 + 2)
  let n = 0
  let i = 0
  while (i < arr.length) {
    const c = arr[i]
    let j = i + 1
    while (j < arr.length && arr[j] === c && j - i < 65535) j++
    out[n++] = j - i
    out[n++] = c
    i = j
  }
  return b64(out.subarray(0, n))
}

// 1 bit por ponto, linha a linha, bit 7 = ponto mais à esquerda (como live.fb do OLED)
export function packBits(buf, w, h) {
  const bpr = (w + 7) >> 3
  const bytes = new Uint8Array(bpr * h)
  let lit = 0
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (buf[y * w + x]) {
        bytes[y * bpr + (x >> 3)] |= 0x80 >> (x & 7)
        lit++
      }
  return { bytes, lit }
}
