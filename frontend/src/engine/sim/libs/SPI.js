// SPI.h — barramento SPI por hardware: transfer() fala com as peças que têm o gancho `spi`
// (libs/_spi.js) e cujo CS o programa pôs a LOW. Sem nenhuma selecionada devolve 0xFF (MISO no ar).
import { spiTransfer } from './_spi.js'

const spiBus = (env) => ({
  begin() {},
  end() {},
  beginTransaction() {},
  endTransaction() {},
  transfer: (b) => {
    // transfer(buf, n): troca o vetor no lugar
    if (Array.isArray(b)) {
      for (let i = 0; i < b.length; i++) b[i] = spiTransfer(env, b[i])
      return
    }
    return spiTransfer(env, b)
  },
  transfer16: (v) => (spiTransfer(env, (v >> 8) & 0xff) << 8) | spiTransfer(env, v & 0xff),
  setBitOrder() {},
  setDataMode() {},
  setClockDivider() {},
  setFrequency() {},
  setMISO: () => true,
  setMOSI: () => true,
  setSCK: () => true,
  setCS: () => true,
  setRX: () => true,
  setTX: () => true,
})

export default {
  header: 'SPI.h',
  globals: {
    SPI_MODE0: 0, SPI_MODE1: 4, SPI_MODE2: 8, SPI_MODE3: 12, MSBFIRST: 1, LSBFIRST: 0,
    SPI_CLOCK_DIV2: 4, SPI_CLOCK_DIV4: 0, SPI_CLOCK_DIV8: 5, SPI_CLOCK_DIV16: 1, SPI_CLOCK_DIV32: 6, SPI_CLOCK_DIV64: 2, SPI_CLOCK_DIV128: 3,
  },
  env: (env) => ({ SPI: spiBus(env), SPI1: spiBus(env) }), // SPI1: segundo barramento (ESP32/Pico)
  classes: { SPISettings: () => class SPISettings {} },
}
