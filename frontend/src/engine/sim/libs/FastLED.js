// FastLED (subconjunto): LEDs WS2812B/NeoPixel com CRGB/CHSV, paletas e as funções de
// cor e de matemática de 8 bits mais usadas. Como na biblioteca:
//   CRGB leds[N]; FastLED.addLeds<WS2812B, PINO, GRB>(leds, N);  (o transpilador troca o
//   template por addLeds([WS2812B, PINO, GRB], leds, N) — ver ../compiler-g.js)
//   FastLED.show() envia a trama (na ordem de cores indicada: com a ordem errada as cores
//   trocam), ~30 µs por LED, aplicando o brilho global, a correção de cor e o limite de
//   potência (setMaxPowerInVoltsAndMilliamps). As fitas/anéis/matrizes são as peças NEO_TYPES
//   cujo DIN está na rede do pino (as mesmas da Adafruit_NeoPixel).
// CRGB e CHSV funcionam com e sem `new` (CRGB(255, 0, 0), CRGB::Red, CHSV(h, 255, 255)).
import { push } from '../parts/_groupA.js'
import { neoTargets } from '../parts/neopixel.js'
import * as i18n from '../../../../../shared/i18n.js'

// ---------- matemática de 8 bits (lib8tion) ----------
const u8 = (x) => (Math.trunc(Number(x) || 0) & 255) >>> 0
export const scale8 = (i, s) => ((u8(i) * (1 + u8(s))) >> 8) & 255
export const scale8_video = (i, s) => (((u8(i) * u8(s)) >> 8) + (u8(i) && u8(s) ? 1 : 0)) & 255
const qadd8 = (a, b) => Math.min(255, u8(a) + u8(b))
const qsub8 = (a, b) => Math.max(0, u8(a) - u8(b))
const qmul8 = (a, b) => Math.min(255, u8(a) * u8(b))
const sin8 = (t) => Math.round(127.5 + 127.5 * Math.sin((u8(t) / 256) * 2 * Math.PI)) & 255
const cos8 = (t) => sin8(u8(t) + 64)
const sin16 = (t) => Math.round(32767 * Math.sin((((Number(t) || 0) & 0xffff) / 65536) * 2 * Math.PI))
const cos16 = (t) => sin16(((Number(t) || 0) & 0xffff) + 16384)
const triwave8 = (i) => {
  i = u8(i)
  if (i & 0x80) i = 255 - i
  return (i << 1) & 255
}
const ease8InOutQuad = (i) => {
  i = u8(i)
  let j = i
  if (j & 0x80) j = 255 - j
  const jj = scale8(j, j)
  const jj2 = (jj << 1) & 255
  return i & 0x80 ? 255 - jj2 : jj2
}
const quadwave8 = (i) => ease8InOutQuad(triwave8(i))
const ease8InOutCubic = (i) => {
  i = u8(i)
  const ii = scale8(i, i)
  const iii = scale8(ii, i)
  const r1 = 3 * ii - 2 * iii
  return r1 & 0x100 ? 255 : r1 & 255
}
const cubicwave8 = (i) => ease8InOutCubic(triwave8(i))
const lerp8by8 = (a, b, f) => (u8(b) > u8(a) ? u8(a) + scale8(u8(b) - u8(a), f) : u8(a) - scale8(u8(a) - u8(b), f))
const map8 = (x, lo, hi) => u8(lo) + scale8(x, u8(hi) - u8(lo))
const avg8 = (a, b) => (u8(a) + u8(b)) >> 1
const blend8 = (a, b, amt) => lerp8by8(a, b, amt)

// ---------- cores com nome (HTMLColorCode) ----------
const NAMED = {
  AliceBlue: 0xf0f8ff, Amethyst: 0x9966cc, AntiqueWhite: 0xfaebd7, Aqua: 0x00ffff, Aquamarine: 0x7fffd4, Azure: 0xf0ffff, Beige: 0xf5f5dc, Bisque: 0xffe4c4,
  Black: 0x000000, BlanchedAlmond: 0xffebcd, Blue: 0x0000ff, BlueViolet: 0x8a2be2, Brown: 0xa52a2a, BurlyWood: 0xdeb887, CadetBlue: 0x5f9ea0, Chartreuse: 0x7fff00,
  Chocolate: 0xd2691e, Coral: 0xff7f50, CornflowerBlue: 0x6495ed, Cornsilk: 0xfff8dc, Crimson: 0xdc143c, Cyan: 0x00ffff, DarkBlue: 0x00008b, DarkCyan: 0x008b8b,
  DarkGoldenrod: 0xb8860b, DarkGray: 0xa9a9a9, DarkGreen: 0x006400, DarkKhaki: 0xbdb76b, DarkMagenta: 0x8b008b, DarkOliveGreen: 0x556b2f, DarkOrange: 0xff8c00,
  DarkOrchid: 0x9932cc, DarkRed: 0x8b0000, DarkSalmon: 0xe9967a, DarkSeaGreen: 0x8fbc8f, DarkSlateBlue: 0x483d8b, DarkSlateGray: 0x2f4f4f, DarkTurquoise: 0x00ced1,
  DarkViolet: 0x9400d3, DeepPink: 0xff1493, DeepSkyBlue: 0x00bfff, DimGray: 0x696969, DodgerBlue: 0x1e90ff, FireBrick: 0xb22222, FloralWhite: 0xfffaf0,
  ForestGreen: 0x228b22, Fuchsia: 0xff00ff, Gainsboro: 0xdcdcdc, GhostWhite: 0xf8f8ff, Gold: 0xffd700, Goldenrod: 0xdaa520, Gray: 0x808080, Grey: 0x808080,
  Green: 0x008000, GreenYellow: 0xadff2f, Honeydew: 0xf0fff0, HotPink: 0xff69b4, IndianRed: 0xcd5c5c, Indigo: 0x4b0082, Ivory: 0xfffff0, Khaki: 0xf0e68c,
  Lavender: 0xe6e6fa, LavenderBlush: 0xfff0f5, LawnGreen: 0x7cfc00, LemonChiffon: 0xfffacd, LightBlue: 0xadd8e6, LightCoral: 0xf08080, LightCyan: 0xe0ffff,
  LightGoldenrodYellow: 0xfafad2, LightGreen: 0x90ee90, LightGrey: 0xd3d3d3, LightPink: 0xffb6c1, LightSalmon: 0xffa07a, LightSeaGreen: 0x20b2aa,
  LightSkyBlue: 0x87cefa, LightSlateGray: 0x778899, LightSteelBlue: 0xb0c4de, LightYellow: 0xffffe0, Lime: 0x00ff00, LimeGreen: 0x32cd32, Linen: 0xfaf0e6,
  Magenta: 0xff00ff, Maroon: 0x800000, MediumAquamarine: 0x66cdaa, MediumBlue: 0x0000cd, MediumOrchid: 0xba55d3, MediumPurple: 0x9370db, MediumSeaGreen: 0x3cb371,
  MediumSlateBlue: 0x7b68ee, MediumSpringGreen: 0x00fa9a, MediumTurquoise: 0x48d1cc, MediumVioletRed: 0xc71585, MidnightBlue: 0x191970, MintCream: 0xf5fffa,
  MistyRose: 0xffe4e1, Moccasin: 0xffe4b5, NavajoWhite: 0xffdead, Navy: 0x000080, OldLace: 0xfdf5e6, Olive: 0x808000, OliveDrab: 0x6b8e23, Orange: 0xffa500,
  OrangeRed: 0xff4500, Orchid: 0xda70d6, PaleGoldenrod: 0xeee8aa, PaleGreen: 0x98fb98, PaleTurquoise: 0xafeeee, PaleVioletRed: 0xdb7093, PapayaWhip: 0xffefd5,
  PeachPuff: 0xffdab9, Peru: 0xcd853f, Pink: 0xffc0cb, Plaid: 0xcc5533, Plum: 0xdda0dd, PowderBlue: 0xb0e0e6, Purple: 0x800080, Red: 0xff0000, RosyBrown: 0xbc8f8f,
  RoyalBlue: 0x4169e1, SaddleBrown: 0x8b4513, Salmon: 0xfa8072, SandyBrown: 0xf4a460, SeaGreen: 0x2e8b57, Seashell: 0xfff5ee, Sienna: 0xa0522d, Silver: 0xc0c0c0,
  SkyBlue: 0x87ceeb, SlateBlue: 0x6a5acd, SlateGray: 0x708090, Snow: 0xfffafa, SpringGreen: 0x00ff7f, SteelBlue: 0x4682b4, Tan: 0xd2b48c, Teal: 0x008080,
  Thistle: 0xd8bfd8, Tomato: 0xff6347, Turquoise: 0x40e0d0, Violet: 0xee82ee, Wheat: 0xf5deb3, White: 0xffffff, WhiteSmoke: 0xf5f5f5, Yellow: 0xffff00,
  YellowGreen: 0x9acd32, FairyLight: 0xffe42d, FairyLightNCC: 0xff9d2a,
}

// ---------- HSV → RGB (algoritmo "rainbow" da FastLED) ----------
function rainbow(h, s, v) {
  const hue = u8(h)
  const sat = u8(s)
  let val = u8(v)
  const offset8 = (hue & 0x1f) << 3
  const third = scale8(offset8, 85)
  const twothirds = scale8(offset8, 170)
  let r
  let g
  let b
  if (!(hue & 0x80)) {
    if (!(hue & 0x40)) {
      if (!(hue & 0x20)) [r, g, b] = [255 - third, third, 0]
      else [r, g, b] = [171, 85 + third, 0]
    } else if (!(hue & 0x20)) [r, g, b] = [171 - twothirds, 170 + third, 0]
    else [r, g, b] = [0, 255 - third, third]
  } else if (!(hue & 0x40)) {
    if (!(hue & 0x20)) [r, g, b] = [0, 171 - twothirds, 85 + twothirds]
    else [r, g, b] = [third, 0, 255 - third]
  } else if (!(hue & 0x20)) [r, g, b] = [85 + third, 0, 171 - third]
  else [r, g, b] = [170 + third, 0, 85 - third]
  if (sat !== 255) {
    if (sat === 0) [r, g, b] = [255, 255, 255]
    else {
      const desat = scale8_video(255 - sat, 255 - sat)
      const ss = 255 - desat
      ;[r, g, b] = [r, g, b].map((c) => (c ? scale8(c, ss) + 1 : 0) + desat).map((c) => Math.min(255, c))
    }
  }
  if (val !== 255) {
    val = scale8_video(val, val)
    if (val === 0) [r, g, b] = [0, 0, 0]
    else [r, g, b] = [r, g, b].map((c) => (c ? scale8(c, val) + 1 : 0)).map((c) => Math.min(255, c))
  }
  return [r & 255, g & 255, b & 255]
}
// HSV "espectro" (matizes uniformes, sem realce do amarelo)
function spectrum(h, s, v) {
  const hh = (u8(h) / 256) * 6
  const sat = u8(s) / 255
  const val = u8(v) / 255
  const i = Math.floor(hh)
  const f = hh - i
  const p = val * (1 - sat)
  const q = val * (1 - sat * f)
  const t = val * (1 - sat * (1 - f))
  const [r, g, b] = [[val, t, p], [q, val, p], [p, val, t], [p, q, val], [t, p, val], [val, p, q]][i % 6]
  return [r, g, b].map((x) => Math.round(x * 255))
}

// ---------- CHSV e CRGB (com e sem new) ----------
function CHSV(h = 0, s = 0, v = 0) {
  if (!(this instanceof CHSV)) return new CHSV(h, s, v)
  if (h instanceof CHSV) [h, s, v] = [h.h, h.s, h.v]
  this.h = u8(h)
  this.s = u8(s)
  this.v = u8(v)
}
for (const [a, k] of [['hue', 'h'], ['sat', 's'], ['val', 'v']]) Object.defineProperty(CHSV.prototype, a, { get() { return this[k] }, set(x) { this[k] = u8(x) } })
CHSV.prototype.setHSV = function (h, s, v) {
  Object.assign(this, { h: u8(h), s: u8(s), v: u8(v) })
  return this
}

// cor qualquer (CRGB, CHSV, número 0xRRGGBB) → [r, g, b]
export function rgbOf(c) {
  if (c == null) return [0, 0, 0]
  if (c instanceof CRGB) return [c.r, c.g, c.b]
  if (c instanceof CHSV) return rainbow(c.h, c.s, c.v)
  if (typeof c === 'object' && 'r' in c) return [u8(c.r), u8(c.g), u8(c.b)]
  const n = Number(c) >>> 0
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function CRGB(r, g, b) {
  if (!(this instanceof CRGB)) return new CRGB(r, g, b)
  if (g === undefined) [r, g, b] = rgbOf(r ?? 0)
  this.r = u8(r)
  this.g = u8(g)
  this.b = u8(b)
}
for (const [a, k] of [['red', 'r'], ['green', 'g'], ['blue', 'b']]) Object.defineProperty(CRGB.prototype, a, { get() { return this[k] }, set(x) { this[k] = u8(x) } })
for (const [name, hex] of Object.entries(NAMED)) Object.defineProperty(CRGB, name, { get: () => new CRGB(hex), enumerable: true })
const set3 = (o, [r, g, b]) => ((o.r = u8(r)), (o.g = u8(g)), (o.b = u8(b)), o)
Object.assign(CRGB.prototype, {
  setRGB(r, g, b) {
    return set3(this, [r, g, b])
  },
  setHSV(h, s, v) {
    return set3(this, rainbow(h, s, v))
  },
  setHue(h) {
    return set3(this, rainbow(h, 255, 255))
  },
  setColorCode(c) {
    return set3(this, rgbOf(c))
  },
  nscale8(s) {
    return set3(this, [scale8(this.r, s), scale8(this.g, s), scale8(this.b, s)])
  },
  nscale8_video(s) {
    return set3(this, [scale8_video(this.r, s), scale8_video(this.g, s), scale8_video(this.b, s)])
  },
  fadeToBlackBy(f) {
    return this.nscale8(255 - u8(f))
  },
  fadeLightBy(f) {
    return this.nscale8_video(255 - u8(f))
  },
  scale8(s) {
    return new CRGB(scale8(this.r, s), scale8(this.g, s), scale8(this.b, s))
  },
  getLuminance() {
    return (54 * this.r + 183 * this.g + 18 * this.b) >> 8
  },
  getAverageLight() {
    return Math.round((this.r + this.g + this.b) / 3)
  },
  maximizeBrightness(lim = 255) {
    const m = Math.max(this.r, this.g, this.b)
    if (!m) return this
    const f = lim / m
    return set3(this, [this.r * f, this.g * f, this.b * f])
  },
  lerp8(other, f) {
    const o = rgbOf(other)
    return new CRGB(lerp8by8(this.r, o[0], f), lerp8by8(this.g, o[1], f), lerp8by8(this.b, o[2], f))
  },
  addToRGB(d) {
    return set3(this, [qadd8(this.r, d), qadd8(this.g, d), qadd8(this.b, d)])
  },
  subtractFromRGB(d) {
    return set3(this, [qsub8(this.r, d), qsub8(this.g, d), qsub8(this.b, d)])
  },
  valueOf() {
    return (this.r << 16) | (this.g << 8) | this.b
  },
})

// operadores compostos em CRGB (o transpilador troca leds[i] += x por leds[i] = __crgbOp('+', leds[i], x))
function crgbOp(op, a, x) {
  const [r, g, b] = rgbOf(a)
  const o = typeof x === 'number' && op !== '+' && op !== '-' && op !== '|' && op !== '&' ? [x, x, x] : rgbOf(x)
  const f = {
    '+': (p, q) => qadd8(p, q),
    '-': (p, q) => qsub8(p, q),
    '*': (p, q) => qmul8(p, q),
    '/': (p, q) => (q ? Math.trunc(p / q) : p),
    '%': (p, q) => scale8_video(p, q),
    '|': (p, q) => Math.max(p, q),
    '&': (p, q) => Math.min(p, q),
  }[op] || ((p) => p)
  const out = new CRGB(f(r, o[0]), f(g, o[1]), f(b, o[2]))
  return out
}

// ---------- paletas ----------
const P = (list) => list.map((c) => (typeof c === 'string' ? NAMED[c] : c))
const PALETTES = {
  RainbowColors_p: [0xff0000, 0xd52a00, 0xab5500, 0xab7f00, 0xabab00, 0x56d500, 0x00ff00, 0x00d52a, 0x00ab55, 0x0056aa, 0x0000ff, 0x2a00d5, 0x5500ab, 0x7f0081, 0xab0055, 0xd5002b],
  RainbowStripeColors_p: [0xff0000, 0, 0xab5500, 0, 0xabab00, 0, 0x00ff00, 0, 0x00ab55, 0, 0x0000ff, 0, 0x5500ab, 0, 0xab0055, 0],
  PartyColors_p: [0x5500ab, 0x84007c, 0xb5004b, 0xe5001b, 0xe81700, 0xb84700, 0xab7700, 0xabab00, 0xab5500, 0xdd2200, 0xf2000e, 0xc2003e, 0x8f0071, 0x5f00a1, 0x2f00d0, 0x0007f9],
  HeatColors_p: [0x000000, 0x330000, 0x660000, 0x990000, 0xcc0000, 0xff0000, 0xff3300, 0xff6600, 0xff9900, 0xffcc00, 0xffff00, 0xffff33, 0xffff66, 0xffff99, 0xffffcc, 0xffffff],
  OceanColors_p: P(['MidnightBlue', 'DarkBlue', 'MidnightBlue', 'Navy', 'DarkBlue', 'MediumBlue', 'SeaGreen', 'Teal', 'CadetBlue', 'Blue', 'DarkCyan', 'CornflowerBlue', 'Aquamarine', 'SeaGreen', 'Aqua', 'LightSkyBlue']),
  CloudColors_p: P(['Blue', 'DarkBlue', 'DarkBlue', 'DarkBlue', 'DarkBlue', 'DarkBlue', 'DarkBlue', 'DarkBlue', 'Blue', 'DarkBlue', 'SkyBlue', 'SkyBlue', 'LightBlue', 'White', 'LightBlue', 'SkyBlue']),
  LavaColors_p: P(['Black', 'Maroon', 'Black', 'Maroon', 'DarkRed', 'DarkRed', 'Maroon', 'DarkRed', 'DarkRed', 'DarkRed', 'Red', 'Orange', 'White', 'Orange', 'Red', 'DarkRed']),
  ForestColors_p: P(['DarkGreen', 'DarkGreen', 'DarkOliveGreen', 'DarkGreen', 'Green', 'ForestGreen', 'OliveDrab', 'Green', 'SeaGreen', 'MediumAquamarine', 'LimeGreen', 'YellowGreen', 'LightGreen', 'LawnGreen', 'MediumAquamarine', 'ForestGreen']),
}
const LINEARBLEND = 1
const NOBLEND = 0

// CRGBPalette16: vetor de 16 CRGB (de uma paleta, de 16 cores ou um gradiente de 1–4 cores)
function CRGBPalette16(...a) {
  let cols
  if (a.length === 1 && Array.isArray(a[0])) cols = a[0].map(rgbOf)
  else if (a.length >= 16) cols = a.slice(0, 16).map(rgbOf)
  else if (a.length === 0) cols = Array.from({ length: 16 }, () => [0, 0, 0])
  else {
    const stops = a.map(rgbOf)
    cols = Array.from({ length: 16 }, (_, i) => {
      const t = (i / 15) * (stops.length - 1)
      const k = Math.min(stops.length - 2, Math.floor(t))
      const f = t - k
      return stops.length === 1 ? stops[0] : stops[k].map((c, j) => Math.round(c + (stops[k + 1][j] - c) * f))
    })
  }
  return cols.map((c) => new CRGB(...c))
}
const CHSVPalette16 = (...a) => CRGBPalette16(...a.map((h) => (h instanceof CHSV ? new CRGB(h) : h)))

function colorFromPalette(pal, index, bright = 255, blend = LINEARBLEND) {
  if (!Array.isArray(pal) || !pal.length) return new CRGB(0, 0, 0)
  index = u8(index)
  const hi4 = index >> 4
  const lo4 = index & 15
  let c = rgbOf(pal[hi4 % pal.length])
  if ((typeof blend !== 'number' || blend) && lo4) {
    const n = rgbOf(pal[(hi4 + 1) % pal.length])
    const f2 = lo4 << 4
    const f1 = 255 - f2
    c = c.map((x, k) => scale8(x, f1) + scale8(n[k], f2))
  }
  if (u8(bright) !== 255) c = c.map((x) => scale8_video(x, bright))
  return new CRGB(...c)
}

// HeatColor(temperatura 0–255): preto → vermelho → amarelo → branco
function heatColor(t) {
  const t192 = scale8_video(t, 191)
  const ramp = (t192 & 0x3f) << 2
  if (t192 & 0x80) return new CRGB(255, 255, ramp)
  if (t192 & 0x40) return new CRGB(255, ramp, 0)
  return new CRGB(ramp, 0, 0)
}

// ruído suave (valor interpolado) parecido com o inoise8 da FastLED
const hash = (x, y, z) => {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}
function noise3(x, y, z) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const s = (t) => t * t * (3 - 2 * t)
  const [fx, fy, fz] = [s(x - xi), s(y - yi), s(z - zi)]
  const L = (a, b, t) => a + (b - a) * t
  const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz)
  return L(L(L(c(0, 0, 0), c(1, 0, 0), fx), L(c(0, 1, 0), c(1, 1, 0), fx), fy), L(L(c(0, 0, 1), c(1, 0, 1), fx), L(c(0, 1, 1), c(1, 1, 1), fx), fy), fz)
}

// ordem das cores (EOrder: dígitos em octal = canal de cada byte enviado, 0 = R, 1 = G, 2 = B)
const ORDERS = { RGB: 0o012, RBG: 0o021, GRB: 0o102, GBR: 0o120, BRG: 0o201, BGR: 0o210 }
const CHIPS = ['WS2812B', 'WS2812', 'WS2811', 'WS2811_400', 'WS2813', 'WS2815', 'SK6812', 'SK6822', 'NEOPIXEL', 'TM1803', 'TM1804', 'TM1809', 'TM1829', 'UCS1903', 'UCS1903B', 'UCS1904', 'GW6205', 'APA104', 'APA106', 'PL9823', 'WS2852', 'GE8822', 'LPD1886', 'SM16703']
const SPI_CHIPS = ['APA102', 'SK9822', 'DOTSTAR', 'WS2801', 'WS2803', 'LPD8806', 'LPD6803', 'P9813', 'SM16716']
const CORR = { TypicalLEDStrip: 0xffb0f0, TypicalSMD5050: 0xffb0f0, Typical8mmPixel: 0xffe08c, TypicalPixelString: 0xffe08c, UncorrectedColor: 0xffffff }
const TEMPS = {
  Candle: 0xff9329, Tungsten40W: 0xffc58f, Tungsten100W: 0xffd6aa, Halogen: 0xfff1e0, CarbonArc: 0xfffaf4, HighNoonSun: 0xfffffb, DirectSunlight: 0xffffff, OvercastSky: 0xc9e2ff,
  ClearBlueSky: 0x409cff, WarmFluorescent: 0xfff4e5, StandardFluorescent: 0xf4fffa, CoolWhiteFluorescent: 0xd4ebff, FullSpectrumFluorescent: 0xfff4f2, GrowLightFluorescent: 0xffeff7,
  BlackLightFluorescent: 0xa700ff, MercuryVapor: 0xd8f7ff, SodiumVapor: 0xffd1b2, MetalHalide: 0xf2fcff, HighPressureSodium: 0xffb74c, UncorrectedTemperature: 0xffffff,
}

const globals = {
  ...Object.fromEntries(CHIPS.map((c) => [c, c])),
  ...Object.fromEntries(SPI_CHIPS.map((c) => [c, c])),
  ...ORDERS,
  ...CORR,
  ...TEMPS,
  HUE_RED: 0, HUE_ORANGE: 32, HUE_YELLOW: 64, HUE_GREEN: 96, HUE_AQUA: 128, HUE_BLUE: 160, HUE_PURPLE: 192, HUE_PINK: 224,
  LINEARBLEND, NOBLEND, LINEARBLEND_NOWRAP: 2, BLEND: 1,
  DISABLE_DITHER: 0, BINARY_DITHER: 1,
  ...Object.fromEntries(Object.entries(PALETTES).map(([k, v]) => [k, v])),
  scale8, scale8_video, qadd8, qsub8, qmul8, sin8, cos8, sin16, cos16, triwave8, quadwave8, cubicwave8, ease8InOutQuad, ease8InOutCubic, lerp8by8, map8, avg8, blend8,
  abs8: (x) => Math.abs(x),
  sqrt16: (x) => Math.floor(Math.sqrt(Math.max(0, x))),
  lerp16by16: (a, b, f) => Math.round(a + ((b - a) * (f & 0xffff)) / 65536),
  dim8_raw: (x) => scale8(x, x),
  dim8_video: (x) => scale8_video(x, x),
  brighten8_raw: (x) => 255 - scale8(255 - u8(x), 255 - u8(x)),
  inoise8: (x, y = 0, z = 0) => Math.round(noise3((x || 0) / 256, (y || 0) / 256, (z || 0) / 256) * 255),
  inoise16: (x, y = 0, z = 0) => Math.round(noise3((x || 0) / 65536, (y || 0) / 65536, (z || 0) / 65536) * 65535),
  hsv2rgb_rainbow: (hsv, rgb) => set3(rgb, rainbow(hsv.h, hsv.s, hsv.v)),
  hsv2rgb_spectrum: (hsv, rgb) => set3(rgb, spectrum(hsv.h, hsv.s, hsv.v)),
  hsv2rgb_raw: (hsv, rgb) => set3(rgb, spectrum(hsv.h, hsv.s, hsv.v)),
  ColorFromPalette: colorFromPalette,
  HeatColor: heatColor,
  blend: (a, b, amt) => {
    const [x, y] = [rgbOf(a), rgbOf(b)]
    return new CRGB(...x.map((c, k) => blend8(c, y[k], amt)))
  },
  nblend: (a, b, amt) => {
    const y = rgbOf(b)
    if (a instanceof CRGB) return set3(a, [a.r, a.g, a.b].map((c, k) => blend8(c, y[k], amt)))
    return a
  },
  // funções sobre vetores de LEDs (substituem os elementos: nada fica partilhado)
  fill_solid: (leds, n, c) => {
    const rgb = rgbOf(c)
    for (let i = 0; i < Math.min(n, leds?.length ?? 0); i++) leds[i] = new CRGB(...rgb)
  },
  fill_rainbow: (leds, n, hue = 0, delta = 5) => {
    let h = u8(hue)
    for (let i = 0; i < Math.min(n, leds?.length ?? 0); i++) {
      leds[i] = new CRGB(...rainbow(h, 240, 255))
      h = (h + u8(delta)) & 255
    }
  },
  fill_rainbow_circular: (leds, n, hue = 0, reversed = false) => {
    for (let i = 0; i < Math.min(n, leds?.length ?? 0); i++) leds[i] = new CRGB(...rainbow(u8(hue) + Math.round(((reversed ? -i : i) * 256) / n), 240, 255))
  },
  fill_gradient_RGB: (leds, a, b, c, d, e) => {
    // fill_gradient_RGB(leds, n, c1, c2[, c3[, c4]])  ou (leds, pos1, c1, pos2, c2)
    let stops
    let n
    if (typeof b === 'number' && typeof d === 'number' && e === undefined && (c instanceof CRGB || typeof c === 'object')) {
      for (let i = a; i <= d && i < leds.length; i++) leds[i] = globals.blend(b, c, d === a ? 0 : Math.round(((i - a) * 255) / (d - a)))
      return
    }
    n = a
    stops = [b, c, d, e].filter((x) => x !== undefined).map(rgbOf)
    for (let i = 0; i < Math.min(n, leds.length); i++) {
      const t = n > 1 ? (i / (n - 1)) * (stops.length - 1) : 0
      const k = Math.min(stops.length - 2, Math.floor(t))
      const f = t - k
      leds[i] = new CRGB(...stops[k].map((x, j) => Math.round(x + (stops[k + 1][j] - x) * f)))
    }
  },
  fill_palette: (leds, n, start, inc, pal, bright = 255, blend = LINEARBLEND) => {
    let idx = u8(start)
    for (let i = 0; i < Math.min(n, leds?.length ?? 0); i++) {
      leds[i] = colorFromPalette(pal, idx, bright, blend)
      idx = (idx + u8(inc)) & 255
    }
  },
  fadeToBlackBy: (leds, n, amt) => {
    for (let i = 0; i < Math.min(n, leds?.length ?? 0); i++) leds[i] = new CRGB(...rgbOf(leds[i]).map((c) => scale8(c, 255 - u8(amt))))
  },
  fade_raw: (leds, n, amt) => globals.fadeToBlackBy(leds, n, amt),
  fadeLightBy: (leds, n, amt) => {
    for (let i = 0; i < Math.min(n, leds?.length ?? 0); i++) leds[i] = new CRGB(...rgbOf(leds[i]).map((c) => scale8_video(c, 255 - u8(amt))))
  },
  fade_video: (leds, n, amt) => globals.fadeLightBy(leds, n, amt),
  nscale8: (leds, n, s) => {
    for (let i = 0; i < Math.min(n, leds?.length ?? 0); i++) leds[i] = new CRGB(...rgbOf(leds[i]).map((c) => scale8(c, s)))
  },
  nscale8_video: (leds, n, s) => {
    for (let i = 0; i < Math.min(n, leds?.length ?? 0); i++) leds[i] = new CRGB(...rgbOf(leds[i]).map((c) => scale8_video(c, s)))
  },
  blur1d: (leds, n, amount) => {
    const keep = 255 - u8(amount)
    const seep = u8(amount) >> 1
    let carry = [0, 0, 0]
    for (let i = 0; i < Math.min(n, leds.length); i++) {
      const cur = rgbOf(leds[i])
      const part = cur.map((c) => scale8(c, seep))
      const kept = cur.map((c, k) => qadd8(scale8(c, keep), carry[k]))
      if (i) leds[i - 1] = new CRGB(...rgbOf(leds[i - 1]).map((c, k) => qadd8(c, part[k])))
      leds[i] = new CRGB(...kept)
      carry = part
    }
  },
  __crgbOp: crgbOp,
}

export default {
  header: 'FastLED.h',
  globals,
  classes: {
    CRGB: () => CRGB,
    CHSV: () => CHSV,
    CRGBPalette16: () => CRGBPalette16,
    CHSVPalette16: () => CHSVPalette16,
    TBlendType: () =>
      function TBlendType(v = LINEARBLEND) {
        return new Number(v) // eslint-disable-line no-new-wrappers
      },
  },
  env(env) {
    const nowMs = () => env.rt.t / 1000
    const every = new Map()
    let seed = 1337
    const rnd16 = () => {
      seed = (seed * 2053 + 13849) & 0xffff
      return seed
    }
    const random8 = (a, b) => {
      const r = rnd16() >> 8
      if (a === undefined) return r & 255
      if (b === undefined) return (r * u8(a)) >> 8
      return u8(a) + ((r * (u8(b) - u8(a))) >> 8)
    }
    const random16 = (a, b) => {
      const r = rnd16()
      if (a === undefined) return r
      if (b === undefined) return Math.floor((r * a) / 65536)
      return a + Math.floor((r * (b - a)) / 65536)
    }
    // batidas: bpm em batidas por minuto (beat8 = dente de serra 0–255)
    const beat16 = (bpm, t0 = 0) => {
      const b = bpm > 255 ? bpm / 256 : bpm // accum88
      return Math.floor(((nowMs() - t0) * b * 65536) / 60000) & 0xffff
    }
    const beat8 = (bpm, t0 = 0) => beat16(bpm, t0) >> 8
    const beatsin8 = (bpm, lo = 0, hi = 255, t0 = 0, ph = 0) => lo + scale8(sin8(beat8(bpm, t0) + ph), hi - lo)
    const beatsin16 = (bpm, lo = 0, hi = 65535, t0 = 0, ph = 0) => lo + Math.floor(((sin16(beat16(bpm, t0) + ph) + 32768) * (hi - lo)) / 65536)
    const beatsin88 = (bpm88, lo = 0, hi = 65535, t0 = 0, ph = 0) => beatsin16(bpm88 / 256, lo, hi, t0, ph)

    const ctrls = []
    let bright = 255
    let maxMw = 0
    let corrAll = 0xffffff
    let tempAll = 0xffffff
    let shows = 0
    let fpsT = 0
    let fps = 0
    class Controller {
      constructor(chip, pin, order, leds, n, off, clock) {
        Object.assign(this, { chip, pin, order, data: leds, n, off, clock, corr: null, temp: null })
      }
      setCorrection(c) {
        this.corr = (rgbOf(c)[0] << 16) | (rgbOf(c)[1] << 8) | rgbOf(c)[2]
        return this
      }
      setTemperature(c) {
        this.temp = (rgbOf(c)[0] << 16) | (rgbOf(c)[1] << 8) | rgbOf(c)[2]
        return this
      }
      setDither() {
        return this
      }
      setLeds(leds, n) {
        Object.assign(this, { data: leds, n })
        return this
      }
      leds() {
        return this.data
      }
      size() {
        return this.n
      }
      showLeds(b = bright) {
        sendCtrl(this, b)
      }
      clearLedData() {
        for (let i = 0; i < this.n; i++) this.data[this.off + i] = new CRGB(0, 0, 0)
      }
    }
    const adjust = (c, b) => {
      const corr = rgbOf(c.corr ?? corrAll)
      const temp = rgbOf(c.temp ?? tempAll)
      return [0, 1, 2].map((k) => (corr[k] && temp[k] ? Math.floor(((corr[k] + 1) * (temp[k] + 1) * u8(b)) / 0x10000) : 0))
    }
    // brilho máximo para não passar do limite de potência (como calculate_max_brightness_for_power_mW)
    const powerLimit = (b) => {
      if (!maxMw) return b
      let mw = 0
      for (const c of ctrls) {
        for (let i = 0; i < c.n; i++) {
          const [r, g, bl] = rgbOf(c.data[c.off + i])
          mw += (r * 80 + g * 55 + bl * 75) / 256
        }
        mw += c.n * 5
      }
      const want = (mw * b) / 256
      return want > maxMw ? Math.max(0, Math.floor((b * maxMw) / want)) : b
    }
    function sendCtrl(c, b) {
      env.rt.t += 30 * c.n + 50
      if (SPI_CHIPS.includes(c.chip)) {
        env.warnOnce(`fl-spi-${c.chip}`, i18n.m(`FastLED: LEDs ${c.chip} (dados + relógio) não existem no simulador — use WS2812B/NEOPIXEL.`, `FastLED: ${c.chip} LEDs (data + clock) do not exist in the simulator — use WS2812B/NEOPIXEL.`))
        return
      }
      if (!c.data || !Array.isArray(c.data)) {
        env.warnOnce('fl-data', i18n.m('FastLED: addLeds() sem vetor de LEDs (CRGB leds[N]).', 'FastLED: addLeds() without a LED array (CRGB leds[N]).'))
        return
      }
      const targets = neoTargets(env, c.pin)
      if (!targets.length) {
        env.warnOnce(`fl-pin${c.pin}`, i18n.m(`FastLED: nenhuma fita/anel/matriz NeoPixel ligada ao pino ${c.pin} (fio do pino → DIN).`, `FastLED: no NeoPixel strip/ring/matrix connected to pin ${c.pin} (wire from pin → DIN).`))
        return
      }
      const adj = adjust(c, b)
      const o = c.order
      const seq = [(o >> 6) & 7, (o >> 3) & 7, o & 7]
      const bytes = new Array(c.n * 3)
      for (let i = 0; i < c.n; i++) {
        const rgb = rgbOf(c.data[c.off + i])
        const v = rgb.map((x, k) => scale8(x, adj[k]))
        for (let j = 0; j < 3; j++) bytes[i * 3 + j] = v[seq[j]] ?? 0
      }
      for (const { part: q, thru } of targets) push(env.state(q.id), { pin: c.pin, bytes, thru }, 50)
    }
    const FastLED = {
      addLeds(tpl, leds, a, b) {
        const [chip, p1, p2, p3] = Array.isArray(tpl) ? tpl : [tpl]
        const spi = SPI_CHIPS.includes(chip)
        const pin = p1
        const order = spi ? (p3 ?? ORDERS.RGB) : chip === 'NEOPIXEL' ? ORDERS.GRB : (p2 ?? ORDERS.RGB)
        const [off, n] = b !== undefined ? [a | 0, b | 0] : [0, a | 0]
        if (typeof pin !== 'number') env.warnOnce('fl-pin', i18n.m('FastLED.addLeds: o pino de dados tem de ser uma constante (ex.: #define PINO_LEDS 6).', 'FastLED.addLeds: the data pin must be a constant (e.g. #define LED_PIN 6).'))
        if (Array.isArray(leds) && off + n > leds.length) env.warnOnce('fl-len', i18n.m(`FastLED.addLeds: ${n} LEDs mas o vetor só tem ${leds.length} — o programa escreveria fora da memória.`, `FastLED.addLeds: ${n} LEDs but the array only has ${leds.length} — the program would write outside memory.`))
        if (typeof pin === 'number' && env.api.pinMode) env.api.pinMode(pin, 'OUTPUT')
        const c = new Controller(chip, pin, order, leds, n, off, spi ? p2 : null)
        ctrls.push(c)
        env.rt.t += 50
        return c
      },
      show(b) {
        const bb = powerLimit(b === undefined ? bright : b)
        for (const c of ctrls) sendCtrl(c, bb)
        shows++
        const t = nowMs()
        if (t - fpsT >= 1000) {
          fps = Math.round((shows * 1000) / Math.max(1, t - fpsT))
          shows = 0
          fpsT = t
        }
      },
      clear(write = false) {
        for (const c of ctrls) c.clearLedData()
        if (write) FastLED.show()
      },
      clearData() {
        for (const c of ctrls) c.clearLedData()
      },
      showColor(col, b) {
        for (const c of ctrls) for (let i = 0; i < c.n; i++) c.data[c.off + i] = new CRGB(...rgbOf(col))
        FastLED.show(b)
      },
      setBrightness(b) {
        bright = u8(b)
      },
      getBrightness() {
        return bright
      },
      setMaxPowerInVoltsAndMilliamps(v, mA) {
        maxMw = Math.max(1, (Number(v) || 5) * (Number(mA) || 500))
      },
      setMaxPowerInMilliWatts(mw) {
        maxMw = Math.max(1, Number(mw) || 0)
      },
      setCorrection(c) {
        corrAll = (rgbOf(c)[0] << 16) | (rgbOf(c)[1] << 8) | rgbOf(c)[2]
      },
      setTemperature(c) {
        tempAll = (rgbOf(c)[0] << 16) | (rgbOf(c)[1] << 8) | rgbOf(c)[2]
      },
      setDither() {},
      setMaxRefreshRate() {},
      countFPS() {},
      getFPS() {
        return fps
      },
      count() {
        return ctrls.length
      },
      size() {
        return ctrls[0]?.n ?? 0
      },
      leds() {
        return ctrls[0]?.data ?? null
      },
      // FastLED.delay(ms) passa a FastLED.show(), delay(ms) no transpilador
      delay() {},
    }
    return {
      FastLED,
      random8,
      random16,
      random16_add_entropy: (e) => (seed = (seed + (e | 0)) & 0xffff),
      random16_set_seed: (s) => (seed = s & 0xffff),
      random16_get_seed: () => seed,
      beat8,
      beat16,
      beatsin8,
      beatsin16,
      beatsin88,
      // EVERY_N_MILLISECONDS(n) { … } -> if (__everyN(k, n)) { … }
      __everyN(k, ms) {
        const t = nowMs()
        if (!every.has(k)) every.set(k, t)
        if (t - every.get(k) >= ms) {
          every.set(k, t)
          return true
        }
        return false
      },
    }
  },
}
