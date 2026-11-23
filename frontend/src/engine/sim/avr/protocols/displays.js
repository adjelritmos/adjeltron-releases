// Ecrãs na emulação real, ao nível dos registos do controlador:
//   - LCD HD44780 com mochila I2C PCF8574 (LiquidCrystal_I2C): cada byte escrito no
//     expansor é P0=RS, P1=RW, P2=E, P3=retroiluminação, P4–P7=D4–D7; o flanco
//     descendente de E entrega meio byte ao HD44780 (o mesmo de parts/lcd1602p.js);
//   - OLED SSD1306 por I2C: comandos (modo de endereçamento, janelas de coluna/página,
//     on/off, inverter, contraste) e GDDRAM de 128×64 → live.fb como a biblioteca;
//   - TFT ILI9341 por SPI (hardware): CASET/PASET/RAMWR/MADCTL → s.tft.buf (RGB565),
//     que a peça (parts/ili9341.js) envia ao browser.
// Contrato em ./index.js.
import { fresh, exec, glyph, ddIndex } from '../../parts/lcd1602p.js'

// ---------- LCD 16×2 / 20×4 I2C ----------
export function lcdI2c(ctx) {
  const cols = ctx.part.type === 'lcd2004' ? 20 : 16
  const rows = ctx.part.type === 'lcd2004' ? 4 : 2
  let h = null
  let last = 0
  let bl = false
  let changed = false
  const rowBase = [0, 40, 20, 60]
  const render = () => {
    const L = ctx.live
    if (!h) return
    const lines = []
    for (let r = 0; r < rows; r++) {
      let t = ''
      for (let c = 0; c < cols; c++) {
        let idx
        if (!h.n2) idx = r === 0 ? (((c + h.shift) % 80) + 80) % 80 : -1
        else if (rows === 2) idx = r * 40 + ((((c + h.shift) % 40) + 40) % 40)
        else idx = rowBase[r] + c
        t += idx < 0 ? ' ' : glyph(h.ddram[idx])
      }
      lines.push(t)
    }
    const i = ddIndex(h, h.ac)
    Object.assign(L, { lines, cg: h.cgram.some((x) => x) ? h.cgram.slice() : null, backlight: bl, display: h.on, cursor: h.cur, blink: h.blink, cx: i % 40, cy: i >= 40 ? 1 : 0 })
  }
  return {
    i2c: {
      addr: () => ctx.i2cAddr(0x27),
      write(bytes) {
        if (!h) h = fresh()
        for (const b of bytes) {
          bl = !!(b & 0x08)
          // E: 1 → 0 entrega D4–D7
          if (last & 0x04 && !(b & 0x04) && !(last & 0x02)) {
            const nib = (last >> 4) & 0x0f
            if (h.dl8) {
              h.half = null
              exec(h, last & 1, nib << 4)
            } else if (h.half == null) h.half = nib
            else {
              const v = (h.half << 4) | nib
              h.half = null
              exec(h, last & 1, v)
            }
          }
          last = b
        }
        changed = true
      },
      read: (n) => new Array(n).fill(last | 0xf0),
    },
    step() {
      if (!ctx.powered()) {
        h = null
        return
      }
      if (changed || (h && !ctx.live.lines)) {
        changed = false
        render()
      }
    },
  }
}

// ---------- OLED SSD1306 128×64 (I2C) ----------
const ARGS = { 0x20: 1, 0x21: 2, 0x22: 2, 0x81: 1, 0x8d: 1, 0xa8: 1, 0xd3: 1, 0xd5: 1, 0xd9: 1, 0xda: 1, 0xdb: 1, 0x26: 6, 0x27: 6, 0x29: 5, 0x2a: 5, 0xa3: 2, 0xd6: 1, 0xad: 1, 0x23: 1 }
export function ssd1306(ctx) {
  const ram = new Uint8Array(128 * 8)
  let mode = 2 // por omissão: endereçamento por página
  let c0 = 0
  let c1 = 127
  let p0 = 0
  let p1 = 7
  let col = 0
  let page = 0
  let pend = null // { cmd, args: [] }
  let on = false
  let inv = false
  let contrast = 0x7f
  let segRemap = true
  let comDec = true
  let mux = 64
  let dirty = false
  let state = 0
  const live = () => ctx.live
  const command = (b) => {
    if (pend) {
      pend.args.push(b)
      if (pend.args.length < ARGS[pend.cmd]) return
      const { cmd, args } = pend
      pend = null
      if (cmd === 0x20) mode = args[0] & 3
      else if (cmd === 0x21) {
        c0 = args[0] & 127
        c1 = args[1] & 127
        col = c0
      } else if (cmd === 0x22) {
        p0 = args[0] & 7
        p1 = args[1] & 7
        page = p0
      } else if (cmd === 0x81) contrast = args[0]
      else if (cmd === 0xa8) mux = (args[0] & 63) + 1
      return
    }
    if (ARGS[b]) {
      pend = { cmd: b, args: [] }
      return
    }
    if (b === 0xae || b === 0xaf) {
      on = b === 0xaf
      state++
    } else if (b === 0xa6 || b === 0xa7) {
      inv = b === 0xa7
      state++
    } else if (b === 0xa0 || b === 0xa1) segRemap = b === 0xa1
    else if (b === 0xc0 || b === 0xc8) comDec = b === 0xc8
    else if (b >= 0xb0 && b <= 0xb7) page = b & 7
    else if (b <= 0x0f) col = (col & 0xf0) | b
    else if (b >= 0x10 && b <= 0x1f) col = (col & 0x0f) | ((b & 0x0f) << 4)
    dirty = true
  }
  const data = (b) => {
    ram[page * 128 + (col & 127)] = b
    dirty = true
    if (mode === 0) {
      if (++col > c1) {
        col = c0
        if (++page > p1) page = p0
      }
    } else if (mode === 1) {
      if (++page > p1) {
        page = p0
        if (++col > c1) col = c0
      }
    } else col = (col + 1) & 127
  }
  const render = () => {
    const fb = new Uint8Array(1024)
    let lit = 0
    for (let y = 0; y < Math.min(64, mux); y++) {
      const sy = comDec ? y : mux - 1 - y
      for (let x = 0; x < 128; x++) {
        const sx = segRemap ? x : 127 - x
        if ((ram[(sy >> 3) * 128 + sx] >> (sy & 7)) & 1) {
          fb[y * 16 + (x >> 3)] |= 0x80 >> (x & 7)
          lit++
        }
      }
    }
    const L = live()
    Object.assign(L, { on, inv, dim: contrast < 0x20, w: 128, h: 64, scroll: null, fb: Buffer.from(fb).toString('base64'), ver: (L.ver || 0) + 1 })
    const s = ctx.s
    if (s) {
      s.dispOn = on
      const f = lit / 8192
      if (Math.abs(f - (s.lit || 0)) > 0.02) {
        s.lit = f
        ctx.touch()
      }
    }
  }
  let shown = -1
  return {
    i2c: {
      addr: () => ctx.i2cAddr(0x3c),
      write(bytes) {
        let i = 0
        while (i < bytes.length) {
          const ctrl = bytes[i++]
          const dc = ctrl & 0x40
          if (ctrl & 0x80) {
            if (i < bytes.length) (dc ? data : command)(bytes[i++])
            continue
          }
          for (; i < bytes.length; i++) (dc ? data : command)(bytes[i])
        }
      },
      read: (n) => new Array(n).fill(on ? 0x03 : 0x43), // estado (D6 = display desligado)
    },
    step() {
      if (!ctx.powered()) return
      if (dirty || shown !== state) {
        dirty = false
        shown = state
        render()
      }
    },
  }
}

// ---------- TFTs por SPI: ILI9341 240×320, ST7789 240×240, ST7735 128×160 ----------
// Coordenadas: as do endereço (CASET/PASET) passam para o referencial da rotação 0 da
// Adafruit_GFX desfazendo a diferença entre o MADCTL atual e o da rotação 0 (MV troca
// x/y, MX/MY espelham na memória do controlador) e tirando a janela visível do painel.
const TFT = {
  ili9341: { W: 240, H: 320, ramW: 240, ramH: 320, base: 0x40, xo: 0, yo: 0 },
  st7789: { W: 240, H: 240, ramW: 240, ramH: 320, base: 0xc0, xo: 0, yo: 80 },
  st7735: { W: 128, H: 160, ramW: 128, ramH: 160, base: 0xc0, xo: 0, yo: 0 },
  // ecrã redondo GC9A01: memória 240×240, rotação 0 da Adafruit_GC9A01A = MX (+BGR)
  gc9a01: { W: 240, H: 240, ramW: 240, ramH: 240, base: 0x40, xo: 0, yo: 0 },
}
export function tftSpi(ctx) {
  const g = TFT[ctx.part.type] || TFT.ili9341
  let cmd = 0
  let args = []
  let xs = 0
  let xe = g.ramW - 1
  let ys = 0
  let ye = g.ramH - 1
  let cx = 0
  let cy = 0
  let mad = g.base
  let hiByte = null
  const tft = () => {
    const s = ctx.s
    if (!s) return null
    if (!s.tft || !s.tft.emu) s.tft = { emu: true, buf: new Uint16Array(g.W * g.H), W: g.W, H: g.H, dirty: true, inv: false }
    return s.tft
  }
  const idx = (c, p) => {
    const d = (mad ^ g.base) & 0xe0
    let x = c
    let y = p
    if (d & 0x20) [x, y] = [p, c]
    if (d & 0x40) x = g.ramW - 1 - x
    if (d & 0x80) y = g.ramH - 1 - y
    x -= g.xo
    y -= g.yo
    return x < 0 || y < 0 || x >= g.W || y >= g.H ? -1 : y * g.W + x
  }
  const pixel = (color) => {
    const t = tft()
    const k = idx(cx, cy)
    if (t && k >= 0) {
      t.buf[k] = color
      t.dirty = true
    }
    if (++cx > xe) {
      cx = xs
      if (++cy > ye) cy = ys
    }
  }
  return {
    spi: {
      cs: 'CS',
      byte(b) {
        if (ctx.level('DC') === 0) {
          cmd = b
          args = []
          hiByte = null
          const t = tft()
          if (b === 0x21 && t) (t.inv = true), (t.dirty = true)
          else if (b === 0x20 && t) (t.inv = false), (t.dirty = true)
          else if (b === 0x28 && ctx.s) ctx.s.dispOff = true
          else if (b === 0x29 && ctx.s) ctx.s.dispOff = false
          else if (b === 0x2c) {
            cx = xs
            cy = ys
          } else if (b === 0x01 && t) {
            t.buf.fill(0)
            t.dirty = true
            mad = 0
          }
          return 0
        }
        if (cmd === 0x2c || cmd === 0x3c) {
          if (hiByte == null) hiByte = b
          else {
            pixel((hiByte << 8) | b)
            hiByte = null
          }
          return 0
        }
        args.push(b)
        if (cmd === 0x2a && args.length === 4) {
          xs = (args[0] << 8) | args[1]
          xe = (args[2] << 8) | args[3]
        } else if (cmd === 0x2b && args.length === 4) {
          ys = (args[0] << 8) | args[1]
          ye = (args[2] << 8) | args[3]
        } else if (cmd === 0x36 && args.length === 1) mad = b
        return 0
      },
    },
  }
}
export const ili9341 = tftSpi
