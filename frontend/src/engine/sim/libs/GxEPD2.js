// GxEPD2 (subconjunto) — ecrãs e-paper SPI: GxEPD2_BW, GxEPD2_3C e GxEPD2_7C com os painéis
// mais comuns (GxEPD2_154_D67, GxEPD2_213_BN, GxEPD2_290_BS, GxEPD2_420…). Desenha-se com a
// Adafruit_GFX numa memória do tamanho do painel; display() / nextPage() envia-a e o painel
// demora a atualizar (BUSY a HIGH): a biblioteca espera, como a real (~2 s completa, ~0,3 s
// parcial; painéis a cores ~15 s e sem atualização parcial).
// A peça (sim/parts/epaper.js) guarda a imagem (s.img, já na orientação da face do módulo) e
// o refrescamento em curso (s.ref).
import ssd1306 from './Adafruit_SSD1306.js'
import { withGfxExtras, spiPart } from './_gfxG.js'
import { EPAPER, EPAPER_TYPES, faceDims } from '../../../../../shared/parts/epaper.js'
import * as i18n from '../../../../../shared/i18n.js'

const COLORS = {
  GxEPD_BLACK: 0x0000, GxEPD_WHITE: 0xffff, GxEPD_DARKGREY: 0x7bef, GxEPD_LIGHTGREY: 0xc618, GxEPD_RED: 0xf800, GxEPD_YELLOW: 0xffe0,
  GxEPD_COLORED: 0xf800, GxEPD_GREEN: 0x07e0, GxEPD_BLUE: 0x001f, GxEPD_ORANGE: 0xfc00,
}
// índices da paleta na memória: 0 branco, 1 preto, 2 vermelho, 3 verde, 4 azul, 5 amarelo, 6 laranja
export const PAL7 = [[255, 255, 255], [0, 0, 0], [255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0], [255, 128, 0]]
const rgb565 = (c) => [(((c >> 11) & 31) * 255) / 31, (((c >> 5) & 63) * 255) / 63, ((c & 31) * 255) / 31]

// painéis: nome → [tipo da peça, cores ('bw' | '3c' | '7c'), largura, altura nativas]
const P = (type, kind, extra = {}) => ({ type, kind, ...extra })
const PANELS = {
  GxEPD2_154: P('epaper154', 'bw'), GxEPD2_154_D67: P('epaper154', 'bw'), GxEPD2_154_M09: P('epaper154', 'bw'), GxEPD2_154_M10: P('epaper154', 'bw'), GxEPD2_154_GDEY0154D67: P('epaper154', 'bw'),
  GxEPD2_154c: P('epaper154', '3c'), GxEPD2_154_Z90c: P('epaper154', '3c'),
  GxEPD2_213: P('epaper213', 'bw'), GxEPD2_213_B72: P('epaper213', 'bw'), GxEPD2_213_B73: P('epaper213', 'bw'), GxEPD2_213_B74: P('epaper213', 'bw'), GxEPD2_213_BN: P('epaper213', 'bw'), GxEPD2_213_GDEY0213B74: P('epaper213', 'bw'),
  GxEPD2_213c: P('epaper213', '3c'), GxEPD2_213_Z19c: P('epaper213', '3c'), GxEPD2_213_Z98c: P('epaper213', '3c'),
  GxEPD2_290: P('epaper290', 'bw'), GxEPD2_290_T5: P('epaper290', 'bw'), GxEPD2_290_T5D: P('epaper290', 'bw'), GxEPD2_290_I6FD: P('epaper290', 'bw'), GxEPD2_290_T94: P('epaper290', 'bw'), GxEPD2_290_T94_V2: P('epaper290', 'bw'),
  GxEPD2_290_BS: P('epaper290', 'bw'), GxEPD2_290_M06: P('epaper290', 'bw'), GxEPD2_290_GDEY029T94: P('epaper290', 'bw'),
  GxEPD2_290c: P('epaper290', '3c'), GxEPD2_290_Z13c: P('epaper290', '3c'), GxEPD2_290_C90c: P('epaper290', '3c'),
  GxEPD2_420: P('epaper420', 'bw'), GxEPD2_420_M01: P('epaper420', 'bw'), GxEPD2_420_GDEY042T81: P('epaper420', 'bw'), GxEPD2_420_GYE042A87: P('epaper420', 'bw'),
  GxEPD2_420c: P('epaper420', '3c'), GxEPD2_420c_Z21: P('epaper420', '3c'),
  GxEPD2_750_T7: P('epaper750', 'bw'), GxEPD2_750_GDEY075T7: P('epaper750', 'bw'), GxEPD2_750c_Z08: P('epaper750', '3c'),
  GxEPD2_565c: P('epaper565', '7c'),
}
export const GXEPD2_PANELS = Object.keys(PANELS)
const KIND_NAME = { bw: 'preto/branco', '3c': 'preto/branco/vermelho', '7c': '7 cores', bwr: 'preto/branco/vermelho' }
const partKind = (c) => (c === 'bwr' ? '3c' : c || 'bw')

// os painéis chamam-se sem `new` na declaração: GxEPD2_BW<…> ecra(GxEPD2_290_BS(CS, DC, RST, BUSY))
const panelGlobals = Object.fromEntries(
  Object.entries(PANELS).map(([name, p]) => {
    const g = EPAPER[p.type]
    const fn = (cs = -1, dc = -1, rst = -1, busy = -1) => ({ name, ...p, cs, dc, rst, busy, W: g.nw, H: g.nh })
    Object.assign(fn, { WIDTH: g.nw, WIDTH_VISIBLE: g.nw, HEIGHT: g.nh, panel: name, hasColor: p.kind !== 'bw', hasPartialUpdate: p.kind === 'bw', hasFastPartialUpdate: p.kind === 'bw' })
    return [name, fn]
  }),
)

const nearest7 = (c) => {
  const [r, g, b] = rgb565(c)
  let best = 0
  let bd = Infinity
  PAL7.forEach(([R, G, B], i) => {
    const d = (r - R) ** 2 + (g - G) ** 2 + (b - B) ** 2
    if (d < bd) [bd, best] = [d, i]
  })
  return best
}

function makeClass(env, clsKind, clsName) {
  const GFX = withGfxExtras(ssd1306.classes.Adafruit_SSD1306(env))
  return class extends GFX {
    constructor(panel) {
      const pn = panel && typeof panel === 'object' ? panel : panelGlobals.GxEPD2_154_D67()
      super(pn.W, pn.H)
      this.pn = pn
      this.fg = 0x0000
      this.bg = 0x0000
      this.win = null
      this.initial = true
      this.hib = false
      this.part = null
      this.epd2 = { WIDTH: pn.W, WIDTH_VISIBLE: pn.W, HEIGHT: pn.H, panel: pn.name, hasColor: pn.kind !== 'bw', hasPartialUpdate: pn.kind === 'bw', hasFastPartialUpdate: pn.kind === 'bw' }
    }
    _label() {
      return `E-paper (${this.pn.name})`
    }
    init(diag = 0, initial = true, resetMs = 10) {
      if (diag > 0) env.api.Serial?.begin?.(diag)
      this.initial = initial !== false
      env.rt.t += (resetMs | 0) * 1000 + 20000
      const pn = this.pn
      const p = spiPart(env, { types: EPAPER_TYPES, label: this._label(), cs: pn.cs, dc: pn.dc, names: { mosi: 'DIN', sck: 'CLK' } })
      this.part = p
      if (!p) return
      const has = (pin, n) => n >= 0 && env.pinsOf(p.id, pin).includes(n)
      if (!has('BUSY', pn.busy)) env.warnOnce('epdbusy', pn.busy < 0 ? i18n.m(`${this._label()}: sem pino BUSY no construtor — a biblioteca não sabe quando o painel acabou e espera sempre o tempo máximo.`, `${this._label()}: no BUSY pin in the constructor — the library cannot tell when the panel is done and always waits the maximum time.`) : i18n.m(`${this._label()}: o BUSY do ecrã não está no pino ${pn.busy}. A biblioteca espera pelo fim da atualização nesse pino: sem ele, espera o tempo máximo (timeout) a cada atualização.`, `${this._label()}: the display's BUSY is not on pin ${pn.busy}. The library waits for the refresh to finish on that pin: without it, it waits the maximum time (timeout) on every refresh.`))
      if (pn.rst >= 0 && !has('RST', pn.rst)) env.warnOnce('epdrst', i18n.m(`${this._label()}: o RST do ecrã não está no pino ${pn.rst} — depois de hibernate() o painel não acorda.`, `${this._label()}: the display's RST is not on pin ${pn.rst} — after hibernate() the panel does not wake up.`))
      const g = EPAPER[p.type]
      if (p.type !== pn.type) {
        const pg = EPAPER[pn.type]
        env.warnOnce('epdsize', i18n.m(`${this._label()}: o programa usa um painel de ${pg.inch}" (${pg.nw}×${pg.nh}) mas o módulo ligado é de ${g.inch}" (${g.nw}×${g.nh}). A imagem sai cortada ou deslocada: use a classe do painel certo.`, `${this._label()}: the program uses a ${pg.inch}" panel (${pg.nw}×${pg.nh}) but the connected module is ${g.inch}" (${g.nw}×${g.nh}). The image comes out cropped or shifted: use the right panel class.`))
      }
      const pk = partKind(p.config?.color ?? env.state(p.id)?.color)
      if (pn.kind !== clsKind) env.warnOnce('epdcls', i18n.m(`${this._label()}: o painel ${pn.name} é ${KIND_NAME[pn.kind]} mas foi declarado com ${clsName}. Use ${pn.kind === 'bw' ? 'GxEPD2_BW' : pn.kind === '3c' ? 'GxEPD2_3C' : 'GxEPD2_7C'}.`, `${this._label()}: panel ${pn.name} is ${KIND_NAME[pn.kind]} but was declared with ${clsName}. Use ${pn.kind === 'bw' ? 'GxEPD2_BW' : pn.kind === '3c' ? 'GxEPD2_3C' : 'GxEPD2_7C'}.`))
      else if (pk !== pn.kind && p.type === pn.type) env.warnOnce('epdkind', i18n.m(`${this._label()}: o programa trata o painel como ${KIND_NAME[pn.kind]}, mas o módulo ligado é ${KIND_NAME[pk]}.${pk === '3c' ? ' O vermelho nunca aparece e a atualização não funciona bem (controlador diferente).' : ' As cores extra ficam a branco.'}`, `${this._label()}: the program treats the panel as ${KIND_NAME[pn.kind]}, but the connected module is ${KIND_NAME[pk]}.${pk === '3c' ? ' Red never shows and refreshing does not work properly (different controller).' : ' The extra colors stay white.'}`))
      if (!env.powered(p.id)) env.warnOnce('epdpwr', i18n.m(`${this._label()} sem alimentação: VCC → 3,3 V ou 5V e GND → GND.`, `${this._label()} has no power: VCC → 3.3 V or 5V and GND → GND.`))
    }
    // cor RGB565 → índice da paleta
    _q(c, nx, ny) {
      c &= 0xffff
      if (c === 0xffff) return 0
      if (c === 0) return 1
      if (clsKind === '7c') return nearest7(c)
      // GxEPD2_BW: `if (color) branco; else preto` — só GxEPD_BLACK (0) é preto; vermelho, cinzentos
      // e qualquer outra cor saem a branco (não há tramas)
      if (clsKind === 'bw') return 0
      const [r, g, b] = rgb565(c)
      if (clsKind === '3c' && r > 150 && b < 110 && g < 200) return 2
      const lum = 0.3 * r + 0.59 * g + 0.11 * b
      if (lum > 235) return 0
      if (lum > 150) return (nx + ny) % 4 === 0 ? 1 : 0 // cinzento claro
      if (lum > 80) return (nx + ny) % 2 ? 1 : 0 // cinzento escuro
      return 1
    }
    drawPixel(x, y, c) {
      const k = this._idx(x, y)
      if (k < 0) return
      this.buf[k] = this._q(c, k % this.W, (k / this.W) | 0)
    }
    fillScreen(c) {
      if ((c & 0xffff) === 0x7bef || (c & 0xffff) === 0xc618) {
        for (let k = 0; k < this.buf.length; k++) this.buf[k] = this._q(c, k % this.W, (k / this.W) | 0)
      } else this.buf.fill(this._q(c, 0, 0))
      env.rt.t += 150
    }
    setFullWindow() {
      this.win = null
    }
    setPartialWindow(x, y, w, h) {
      this.win = { x: Math.floor(x), y: Math.floor(y), w: Math.ceil(w), h: Math.ceil(h) }
    }
    firstPage() {
      this.fillScreen(0xffff)
    }
    nextPage() {
      this._refresh(!!this.win, this.win)
      return false
    }
    display(partial = false) {
      this._refresh(!!partial, null)
    }
    displayWindow(x, y, w, h) {
      this._refresh(true, { x: Math.floor(x), y: Math.floor(y), w: Math.ceil(w), h: Math.ceil(h) })
    }
    refresh(partial = false) {
      this._refresh(!!partial, null)
    }
    clearScreen(v = 0xff) {
      this.buf.fill(v ? 0 : 1)
      this._refresh(false, null)
    }
    writeScreenBuffer() {
      env.rt.t += 5000
    }
    hibernate() {
      this.hib = true
      env.rt.t += 2000
      if (this.part) env.state(this.part.id).sleep = true
    }
    powerOff() {
      env.rt.t += 2000
    }
    drawInvertedBitmap(x, y, bmp, w, h, c) {
      const bw = (w + 7) >> 3
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (!(((bmp?.[j * bw + (i >> 3)] ?? 0) << (i & 7)) & 0x80)) this.drawPixel(x + i, y + j, c)
    }
    drawImage(bmp, x, y, w, h, invert = false) {
      const bw = (w + 7) >> 3
      for (let j = 0; j < h; j++)
        for (let i = 0; i < w; i++) {
          const on = !!((((bmp?.[j * bw + (i >> 3)] ?? 0) << (i & 7)) & 0x80))
          // na GxEPD2 um bit a 0 é preto
          this.drawPixel(x + i, y + j, on !== !!invert ? 0xffff : 0x0000)
        }
    }
    _refresh(partial, rect) {
      const pn = this.pn
      const p = this.part
      if (!p) return
      if (!env.powered(p.id)) {
        env.warnOnce('epdpwr2', i18n.m(`${this._label()} sem alimentação: a imagem antiga continua no ecrã, mas não muda.`, `${this._label()} has no power: the old image stays on the screen, but it does not change.`))
        env.rt.t += 1000
        return
      }
      const s = env.state(p.id)
      if (this.hib) {
        if (pn.rst < 0 || !env.pinsOf(p.id, 'RST').includes(pn.rst)) {
          env.warnOnce('epdhib', i18n.m(`${this._label()}: depois de hibernate() o controlador só acorda com um impulso em RST. Ligue RST a um pino e passe-o ao construtor.`, `${this._label()}: after hibernate() the controller only wakes up with a pulse on RST. Connect RST to a pin and pass it to the constructor.`))
          return
        }
        this.hib = false
        s.sleep = false
        env.rt.t += 20000
      }
      const g = EPAPER[p.type]
      const kind = p.config?.color || g.colors[0]
      const [fw, fh] = faceDims(g)
      if (!s.img || s.img.length !== fw * fh) s.img = new Uint8Array(fw * fh)
      const canPartial = (g.part[kind] || 0) > 0 && pn.kind === 'bw'
      if (partial && !canPartial) env.warnOnce('epdnopart', i18n.m(`${this._label()}: este painel ${kind === 'bw' ? '' : 'a cores '}não tem atualização parcial — faz sempre a atualização completa (~${Math.round(g.full[kind] / 1000)} s, a piscar).`, `${this._label()}: this ${kind === 'bw' ? '' : 'color '}panel has no partial refresh — it always does a full refresh (~${Math.round(g.full[kind] / 1000)} s, flashing).`))
      const full = !partial || this.initial || !canPartial
      const W = this.W
      const portrait = !!g.portrait
      const pk = partKind(kind)
      // cores da memória → cores que o painel ligado consegue mostrar (um painel P/B ignora o
      // plano vermelho; um de 3 cores mostra amarelo/laranja a vermelho e verde/azul a preto)
      const map = (v) => (v < 2 || pk === '7c' ? v : pk === '3c' ? (v === 2 || v >= 5 ? 2 : 1) : v === 2 ? 0 : v >= 5 ? 0 : 1)
      const put = (nx, ny) => {
        if (nx < 0 || ny < 0 || nx >= g.nw || ny >= g.nh || nx >= W || ny >= this.H) return
        const v = map(this.buf[ny * W + nx])
        if (portrait) s.img[(g.nw - 1 - nx) * fw + ny] = v
        else s.img[ny * fw + nx] = v
      }
      if (full || !rect) {
        for (let ny = 0; ny < g.nh; ny++) for (let nx = 0; nx < g.nw; nx++) put(nx, ny)
      } else {
        for (let y = rect.y; y < rect.y + rect.h; y++)
          for (let x = rect.x; x < rect.x + rect.w; x++) {
            const k = this._idx(x, y)
            if (k >= 0) put(k % W, (k / W) | 0)
          }
      }
      const ms = p.config?.speed === 'fast' ? 50 : full ? g.full[kind] : g.part[kind]
      s.ver = (s.ver || 0) + 1
      s.ref = { t0: env.rt.t, dur: ms * 1000, full }
      this.initial = false
      env.touch()
      // envio da memória por SPI (~4 MHz) + espera pelo BUSY
      env.rt.t += Math.round(((g.nw * g.nh) / 8) * (pk === 'bw' ? 1 : pk === '3c' ? 2 : 4) * 2.2) + ms * 1000
    }
  }
}

const globals = { ...COLORS, ...panelGlobals }
const mk = (header, cls, kind) => ({ header, globals, classes: { [cls]: (env) => makeClass(env, kind, cls) } })

export const LIBS_GXEPD2 = [mk('GxEPD2_BW.h', 'GxEPD2_BW', 'bw'), mk('GxEPD2_3C.h', 'GxEPD2_3C', '3c'), mk('GxEPD2_7C.h', 'GxEPD2_7C', '7c')]
