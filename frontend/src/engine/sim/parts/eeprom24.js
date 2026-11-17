// EEPROM I2C 24xx: ponteiro de endereço de 1 ou 2 bytes, escrita por páginas (a escrita dá a volta
// dentro da página, como no chip), leitura sequencial que dá a volta no fim da memória, WP a HIGH
// protege contra escrita. Os dados ficam na memória não volátil do projeto (env.nvm.part), por
// isso sobrevivem entre simulações. Endereço 0x50 | A2 A1 A0 (pinos soltos = 0: pull-down interno).
import { modulePower, powerDiagnose } from './_util.js'
import { i2cDiag } from './_groupD.js'
import { EEPROM_CHIPS } from '../../../../../shared/parts/eeprom24.js'
import * as i18n from '../../../../../shared/i18n.js'

const chipOf = (cfg) => EEPROM_CHIPS[cfg?.chip] || EEPROM_CHIPS['24LC256']
const memOf = (ctx) => ctx.env.nvm.part(ctx.part.id, chipOf(ctx.cfg).size)

export default {
  type: 'eeprom24',
  i2cAddr: ({ vd }) => 0x50 | (vd('A0', 'GND') > 2 ? 1 : 0) | (vd('A1', 'GND') > 2 ? 2 : 0) | (vd('A2', 'GND') > 2 ? 4 : 0),
  i2c: {
    write(ctx, bytes) {
      const { s, env, part } = ctx
      const c = chipOf(ctx.cfg)
      if (bytes.length < c.ab) return
      let ptr = (c.ab === 2 ? (bytes[0] << 8) | bytes[1] : bytes[0]) % c.size
      s.ptr = ptr
      const data = bytes.slice(c.ab)
      if (!data.length) return // só o endereço: prepara uma leitura
      if (env.vd(part.id, 'WP', 'GND') > 2) {
        s.wpTries = (s.wpTries || 0) + data.length
        env.warnOnce(`wp${part.id}`, i18n.m(`${part.label || 'EEPROM'}: o pino WP está a HIGH (proteção de escrita) — as escritas são ignoradas. Ligue WP ao GND.`, `${part.label || 'EEPROM'}: the WP pin is HIGH (write protection) — writes are ignored. Connect WP to GND.`))
        return
      }
      const mem = memOf(ctx)
      const pageStart = ptr - (ptr % c.page)
      if (data.length > c.page) env.warnOnce(`pg${part.id}`, i18n.m(`${part.label || 'EEPROM'}: escrita de ${data.length} bytes, mas a página do ${ctx.cfg?.chip || '24LC256'} tem ${c.page} — os bytes a mais dão a volta e escrevem por cima do início da página.`, `${part.label || 'EEPROM'}: write of ${data.length} bytes, but the ${ctx.cfg?.chip || '24LC256'} page is ${c.page} — the extra bytes wrap around and overwrite the start of the page.`))
      for (const b of data) {
        mem[ptr] = b & 0xff
        ptr = pageStart + ((ptr - pageStart + 1) % c.page)
      }
      s.ptr = ptr
      s.writes = (s.writes || 0) + data.length
      env.nvm.changed()
    },
    read(ctx, n) {
      const { s } = ctx
      const c = chipOf(ctx.cfg)
      const mem = memOf(ctx)
      const out = []
      let p = s.ptr || 0
      for (let k = 0; k < n; k++) {
        out.push(mem[p])
        p = (p + 1) % c.size
      }
      s.ptr = p
      s.reads = (s.reads || 0) + n
      return out
    },
  },
  stamp({ cond, s }) {
    cond('VCC', 'GND', s.damaged ? 1e-9 : 0.001 / 5)
    cond('A0', 'GND', 1 / 1e6)
    cond('A1', 'GND', 1 / 1e6)
    cond('A2', 'GND', 1 / 1e6)
    cond('WP', 'GND', 1 / 1e6)
  },
  update: (ctx) => modulePower(ctx, 1.8, 5.5, 6.5),
  output({ s, live, cfg, vd }) {
    live.powered = !!s.powered && !s.damaged
    live.addr = 0x50 | (vd('A0', 'GND') > 2 ? 1 : 0) | (vd('A1', 'GND') > 2 ? 2 : 0) | (vd('A2', 'GND') > 2 ? 4 : 0)
    live.chip = cfg?.chip || '24LC256'
    live.writes = s.writes || 0
    live.reads = s.reads || 0
    live.ptr = s.ptr || 0
  },
  diagnose(ctx) {
    powerDiagnose(ctx, { vmax: 5.5 })
    i2cDiag(ctx)
    const { isC, vd, name, issues, part } = ctx
    if (isC('WP') && vd('WP', 'GND') > 2) issues.push({ level: 'info', msg: i18n.m(`${name}: WP está a HIGH — a memória só pode ser lida (ligue WP ao GND para escrever).`, `${name}: WP is HIGH — the memory is read-only (connect WP to GND to write).`), parts: [part.id] })
  },
}
