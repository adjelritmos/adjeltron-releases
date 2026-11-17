// Protocolos série "por bits" descodificados a partir dos flancos que o firmware gera:
// WS2812/NeoPixel (800 kHz, largura do nível alto), MAX7219 (registo de deslocamento de
// 16 bits com CS) e TM1637 (2 fios, parecido com I2C). O resultado entra na mesma fila
// (s.rx, push de parts/_groupA.js) que as bibliotecas do tradutor usam, por isso as
// peças (parts/neopixel.js, max7219.js, tm1637.js) não mudam. Contrato em ./index.js.

// ---------- WS2812B ----------
export function neopixel(ctx) {
  let rise = null
  let lastFall = 0
  let cur = 0
  let nb = 0
  let bytes = []
  let src = null
  const latch = () => {
    if (bytes.length && ctx.s) ctx.push(ctx.s, { pin: src, bytes }, 50)
    bytes = []
    cur = 0
    nb = 0
  }
  ctx.watch('DIN', (lv, us, drv, n) => {
    if (lv === 1) {
      // nível baixo de > 50 µs = "reset": a trama anterior fica nos LEDs
      if (us - lastFall > 50 && (bytes.length || nb)) latch()
      rise = us
      src = n
    } else if (rise != null) {
      const hi = us - rise
      rise = null
      lastFall = us
      cur = (cur << 1) | (hi > 0.55 ? 1 : 0)
      if (++nb === 8) {
        bytes.push(cur & 0xff)
        cur = 0
        nb = 0
      }
    }
  })
  return {
    step(us) {
      if (rise == null && bytes.length && us - lastFall > 50) latch()
    },
    reset() {
      bytes = []
      cur = nb = 0
      rise = null
    },
  }
}

// ---------- MAX7219 (LedControl, MD_MAX72xx…: shiftOut ou SPI por hardware) ----------
export function max7219(ctx) {
  const din = ctx.pins('DIN')
  if (!din.length) return null // matriz em cadeia: recebe pela peça anterior
  let bits = []
  let sel = false
  const pinOf = (p) => ctx.pins(p)[0]
  const flush = () => {
    const nw = Math.floor(bits.length / 16)
    for (let k = 0; k < nw; k++) {
      // os últimos 16 bits ficam no primeiro módulo da cadeia (endereço 0)
      const o = bits.length - 16 * (k + 1)
      let w = 0
      for (let i = 0; i < 16; i++) w = (w << 1) | bits[o + i]
      const reg = (w >> 8) & 0x0f
      if (reg === 0) continue // no-op
      ctx.push(ctx.s, { din: pinOf('DIN'), clk: pinOf('CLK'), cs: pinOf('CS'), addr: k, reg, val: w & 0xff })
    }
    bits = []
  }
  ctx.watch('CS', (lv) => {
    const low = lv === 0
    if (low && !sel) bits = []
    if (!low && sel) flush()
    sel = low
  })
  ctx.watch('CLK', (lv) => {
    if (lv !== 1 || !sel) return
    bits.push(ctx.level('DIN') ? 1 : 0)
    if (bits.length > 16 * 64) bits.shift()
  })
  return {
    spi: {
      cs: 'CS',
      byte(b) {
        for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1)
        return null
      },
    },
  }
}

// ---------- TM1637 (avishorp TM1637Display e semelhantes) ----------
export function tm1637(ctx) {
  const pinOf = (p) => ctx.pins(p)[0]
  let clk = 1
  let dio = 1
  let inTx = false
  let bit = 0
  let byte = 0
  let bytes = []
  let falls = 0
  let ctrl = 0
  const lv = (v) => (v === 0 ? 0 : 1) // solta (null) = 1 pela resistência de pull-up do módulo
  const end = () => {
    inTx = false
    if (!bytes.length || !ctx.s) return
    const cmd = bytes[0]
    if ((cmd & 0xc0) === 0xc0 && bytes.length > 1) ctx.push(ctx.s, { clk: pinOf('CLK'), dio: pinOf('DIO'), segs: bytes.slice(1), pos: cmd & 0x07, ctrl }, 500)
    else if ((cmd & 0xc0) === 0x80) {
      ctrl = cmd & 0x0f
      ctx.push(ctx.s, { clk: pinOf('CLK'), dio: pinOf('DIO'), segs: [], pos: 0, ctrl }, 500)
    }
    bytes = []
  }
  let mcuDio = 1
  let ack = false
  // nível real da linha DIO: o do MCU, ou LOW enquanto o TM1637 dá o ACK
  const setDio = (d) => {
    if (d === dio) return
    dio = d
    if (clk !== 1) return
    if (d === 0) {
      // START
      inTx = true
      bit = byte = falls = 0
      bytes = []
    } else if (inTx) end() // STOP
  }
  ctx.watch('DIO', (v) => {
    mcuDio = lv(v)
    setDio(ack ? 0 : mcuDio)
  })
  ctx.watch('CLK', (v) => {
    const c = lv(v)
    if (c === clk) return
    clk = c
    if (!inTx) return
    if (c === 1) {
      if (bit < 8) {
        byte |= dio << bit
        bit++
        if (bit === 8) bytes.push(byte)
      } else {
        bit = 0
        byte = 0
      }
    } else {
      falls++
      // ACK: o TM1637 puxa DIO a LOW entre o 8.º e o 9.º flanco descendente
      if (bit === 8 && !ack) {
        ack = true
        ctx.drive('DIO', 0)
        dio = 0
      } else if (ack) {
        ack = false
        ctx.drive('DIO', null)
        dio = mcuDio
      }
    }
  })
  return {
    reset() {
      inTx = false
      clk = dio = mcuDio = 1
      ack = false
      ctx.drive('DIO', null)
    },
  }
}
