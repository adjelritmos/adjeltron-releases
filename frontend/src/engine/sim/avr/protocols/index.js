// Modelos ao nível dos pinos para a EMULAÇÃO REAL (avr8js): o firmware verdadeiro mexe
// nos pinos com os tempos certos e estes modelos fazem de "chip" do módulo — respondem
// nos pinos (com eventos do relógio do CPU, ao ciclo) ou no barramento I2C/SPI e
// atualizam o mesmo estado (`s`, `live`) que as peças em plugin usam com o tradutor.
//
// ===================== Contrato para quem cria peças (pinProto) =====================
// Uma peça em sim/parts/<tipo>.js pode exportar um gancho opcional
//     pinProto(ctx) -> modelo
// (ou acrescentar o tipo a MODELS, abaixo). Sem ele, a peça funciona na emulação real
// se for só elétrica (tensões/correntes: LEDs, botões, potenciómetros, LDR, relés,
// pontes H, portas lógicas…), se tiver o gancho `i2c` (registos I2C, ver parts/index.js)
// ou se ler ctx.pinLog/boardPins no step() (74HC595, A4988, LCD paralelo…).
// Uma peça cujo comportamento venha de uma biblioteca do tradutor (sim/libs) e que não
// tenha modelo aqui faz o simulador voltar ao tradutor (ver emulatorSupport()).
//
//   ctx = {
//     part, cfg, s (estado persistente da peça, o mesmo dos ganchos), live, input() (controlo
//     do browser), powered(), env (o env das bibliotecas), circuit, log(texto, nível), warnOnce,
//     pins(pinoDaPeça) -> nºs dos pinos da placa ligados a esse pino da peça,
//     watch(pinoDaPeça, fn(nivel, us, conduzido)) -> chamado a cada mudança do MCU nesse fio
//         (nivel 0/1 quando o MCU conduz a linha; null quando a solta — entrada),
//     drive(pinoDaPeça, 0 | 1 | null) -> a peça puxa a linha (o firmware lê esse nível;
//         null solta-a; vários "drives" num fio fazem E lógico, como em dreno aberto),
//     level(pinoDaPeça) -> nível atual da linha (saída do MCU ou o que ele lê),
//     at(us, fn) -> agenda fn para o instante us (µs da simulação, relógio do CPU),
//     now() -> instante atual em µs (ao ciclo do CPU), push(s, msg) (fila de _groupA.js),
//     i2cAddr(omissão) -> endereço I2C da peça (gancho i2cAddr, config.addr ou definição)
//   }
//   modelo = {
//     step?(us)                  no início de cada ms (antes de o CPU correr esse ms)
//     reset?()                   o MCU reiniciou
//     i2c?: { addr() -> endereço, write(bytes), read(n) -> bytes }   dispositivo no TWI
//         (write recebe a transação inteira: o 1.º byte costuma ser o registo)
//     spi?: { cs: 'CS', byte(valor, ctx) -> byte MISO }   recebe cada byte do SPI por
//         hardware enquanto o pino CS da peça está a LOW
//   }
// ===================================================================================
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import LIB_TYPES from './lib-types.json'
import { DEFS } from '../../../../../../shared/components.js'
import { BEHAVIORS } from '../../parts/index.js'
import { push } from '../../parts/_groupA.js'
import { hcsr04, dht, hx711, irReceiver } from './timing.js'
import { neopixel, max7219, tm1637 } from './shiftbus.js'
import { ds18b20 } from './onewire.js'
import { lcdI2c, ssd1306, tftSpi } from './displays.js'
import { bmp280, bh1750 } from './sensors-i2c.js'

export const MODELS = {
  hcsr04,
  dht22: dht,
  dht11: dht,
  hx711,
  irReceiver,
  neopixelStrip: neopixel,
  neopixelRing: neopixel,
  max7219,
  tm1637,
  ds18b20,
  lcd1602: lcdI2c,
  lcd2004: lcdI2c,
  ssd1306,
  ili9341: tftSpi,
  st7789: tftSpi,
  st7735: tftSpi,
  bmp280,
  bh1750,
}

// peças sem modelo que funcionam na emulação real porque o tradutor também não as
// trata por biblioteca, ou cujo estado vem de outra peça (o comando IR envia ao recetor)
const OK_WITHOUT_MODEL = new Set(['irRemote', 'stepper', 'nema17', 'a4988', 'hc595', 'cd4094', 'lcd1602p', 'lcd2004p', 'keypad4x4', 'keypad3x4', 'gpsNeo6m', 'hc05', 'servo', 'servoMG', 'gripper', 'esc', 'brushless'])

// tipos de peça referidos pelas bibliotecas do tradutor (o comportamento delas vem da
// biblioteca): sem modelo aqui, a emulação real não as conseguiria mostrar
// (lido das fontes em sim/libs; num binário compilado — app desktop — não há fontes no disco
// e usa-se lib-types.json, gerado por scripts/lib-types.js)
let libTypes = null
export function libDrivenTypes() {
  if (libTypes) return libTypes
  libTypes = new Set()
  try {
    const dir = join(import.meta.dir, '..', '..', 'libs')
    const src = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(dir, f), 'utf8')).join('\n')
    // só referências que procuram peças: partsOnPin(pino, 'tipo'), i2c(end, 'tipo'), type === 'tipo', Set(['a', 'b'])
    const re = /(?:partsOnPin\([^)]*?,\s*|i2c\([^)]*?,\s*|type\s*[!=]==\s*|new Set\(\[[^\]]*?)['"]([a-zA-Z]\w*)['"]/g
    for (const m of src.matchAll(re)) if (DEFS[m[1]] && !DEFS[m[1]].board) libTypes.add(m[1])
    for (const m of src.matchAll(/(?:TYPES|types)\s*=\s*(?:new Set\()?\[([^\]]+)\]/g)) for (const t of m[1].matchAll(/['"](\w+)['"]/g)) if (DEFS[t[1]]) libTypes.add(t[1])
  } catch {
    for (const t of LIB_TYPES) libTypes.add(t)
  }
  for (const t of ['neopixelStrip', 'neopixelRing']) libTypes.add(t)
  return libTypes
}

// as peças do projeto têm suporte na emulação real? → { ok, missing: [tipos] }
export function emulatorSupport(parts) {
  const missing = new Set()
  const lib = libDrivenTypes()
  for (const p of parts) {
    const t = p.type
    const def = DEFS[t]
    if (!def || def.board || MODELS[t] || BEHAVIORS[t]?.pinProto || OK_WITHOUT_MODEL.has(t)) continue
    const B = BEHAVIORS[t]
    const has = (id) => def.pins?.some((x) => x.id === id)
    const i2cPart = has('SDA')
    // ecrãs/cartões SPI (CS + DC/MOSI/DIN) sem modelo: o protocolo vem da biblioteca
    const spiPart = has('CS') && (has('DC') || has('MOSI') || has('DIN') || has('BUSY'))
    if ((i2cPart || spiPart) && !B?.i2c) missing.add(t)
    else if (lib.has(t) && B && !B.i2c) missing.add(t) // (as peças elétricas base não têm plugin)
  }
  return { ok: !missing.size, missing: [...missing] }
}

export function createModels(host, api) {
  const list = []
  const pinsCache = new Map()
  for (const part of host.parts) {
    const make = BEHAVIORS[part.type]?.pinProto || MODELS[part.type]
    if (!make) continue
    const pinsOf = (pin) => {
      const k = `${part.id}|${pin}`
      if (!pinsCache.has(k)) pinsCache.set(k, host.pinsOn(part.id, pin))
      return pinsCache.get(k)
    }
    const src = (pin) => `${part.id}|${pin}`
    const ctx = {
      part,
      cfg: part.config || {},
      get s() {
        return host.circuit.st[part.id]
      },
      get live() {
        return host.env.live(part.id)
      },
      input: () => host.env.input(part.id),
      powered: () => !!host.circuit.st[part.id]?.powered && !host.circuit.st[part.id]?.damaged,
      env: host.env,
      host,
      circuit: host.circuit,
      log: host.log,
      warnOnce: host.warnOnce,
      touch: host.touch,
      push,
      pins: pinsOf,
      watch: (pin, fn) => pinsOf(pin).forEach((n) => api.watch(n, (lv, us, drv) => fn(lv, us, drv, n))),
      drive: (pin, lv) => pinsOf(pin).forEach((n) => api.drive(n, src(pin), lv)),
      level: (pin) => {
        const n = pinsOf(pin)[0]
        return n == null ? 1 : api.level(n)
      },
      at: (us, fn) => api.at(us, fn),
      // endereço I2C atual: gancho i2cAddr da peça (pino ADDR/AD0…), config.addr ou o da definição
      i2cAddr: (dflt) => BEHAVIORS[part.type]?.i2cAddr?.({ part, cfg: part.config || {}, vd: (a, b) => host.circuit.vdiff(part.id, a, b) }) ?? part.config?.addr ?? DEFS[part.type]?.config?.addr ?? dflt,
      now: () => api.now(),
    }
    const m = make(ctx)
    if (m) list.push({ part, ctx, m })
  }
  const spiModels = list.filter((x) => x.m.spi)
  return {
    list,
    step(us) {
      for (const x of list) x.m.step?.(us)
    },
    reset() {
      for (const x of list) x.m.reset?.()
    },
    twiDevice(addr) {
      for (const x of list) {
        const d = x.m.i2c
        if (!d || !x.ctx.powered()) continue
        // mesmo barramento que a placa
        const sda = host.circuit.nets.netOf(host.arduino.id, host.prof.i2c.sda)
        if (host.circuit.nets.netOf(x.part.id, 'SDA') !== sda) continue
        if (d.addr() === addr) return d
      }
      return null
    },
    spiByte(b) {
      let miso = null
      for (const x of spiModels) {
        const cs = x.m.spi.cs || 'CS'
        if (x.ctx.level(cs) !== 0 || !x.ctx.powered()) continue
        const r = x.m.spi.byte(b)
        if (r != null) miso = r
      }
      return miso
    },
  }
}
