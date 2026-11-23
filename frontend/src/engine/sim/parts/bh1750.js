// BH1750: a leitura (lux) é feita pela biblioteca BH1750 (../libs/BH1750.js). ADDR → 0x23 / 0x5C.
// Também responde à Wire.h: escreve-se o código do modo (0x10/0x11/0x13 contínuo, 0x20/0x21/0x23
// uma medição, 0x00 desligar, 0x01 ligar, 0x07 limpar, 0x40|…/0x60|… MTreg) e leem-se 2 bytes
// (big-endian): contagem = lux × 1,2 × MTreg/69 (× 2 no modo de 0,5 lx). Medir demora 120 ms (16 ms
// em baixa resolução).
import { i2cSensor } from './_i2cSensor.js'

const st = (s) => (s.bh ||= { mode: 0, mt: 69, t0: 0, raw: 0 })
const i2c = {
  write({ s, env }, bytes) {
    const h = st(s)
    for (const b of bytes) {
      if (b === 0x00) h.mode = 0
      else if (b === 0x07) h.raw = 0
      else if ((b & 0xf8) === 0x40) h.mt = (h.mt & 0x1f) | ((b & 7) << 5)
      else if ((b & 0xe0) === 0x60) h.mt = (h.mt & 0xe0) | (b & 0x1f)
      else if ([0x10, 0x11, 0x13, 0x20, 0x21, 0x23].includes(b)) {
        h.mode = b
        h.t0 = env.rt.t
      }
    }
  },
  read({ s, env, input }) {
    const h = st(s)
    const low = (h.mode & 3) === 3
    if (h.mode && env.rt.t - h.t0 >= ((low ? 16000 : 120000) * h.mt) / 69) {
      const lux = Math.max(0, +(input.value ?? 300) * (1 + (Math.random() - 0.5) * 0.02))
      const k = (1.2 * h.mt) / 69
      let c = Math.round(lux * k * ((h.mode & 3) === 1 ? 2 : 1))
      if (low) c = Math.round(c / 4) * 4 // resolução de 4 lx
      h.raw = Math.min(65535, c)
      if (h.mode & 0x20) h.mode = 0 // medição única: volta a desligar-se
    }
    return [h.raw >> 8, h.raw & 0xff]
  },
}

export default i2cSensor({
  type: 'bh1750',
  amps: 0.00019,
  vmin: 2.4,
  addrPin: ['ADDR', 0x23, 0x5c],
  i2c,
  output: ({ s, live, input }) => {
    if (!s.powered) s.bh = null
    live.lux = input.value ?? 300
  },
})
