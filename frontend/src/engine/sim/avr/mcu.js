// Configuração dos microcontroladores AVR emulados com o avr8js (Uno/Nano = ATmega328P,
// Mega = ATmega2560): portas → números de pino do Arduino, timers, USART, ADC, TWI, SPI.
// As tabelas do Mega seguem as do Velxio (frontend/src/simulation/AVRSimulator.ts):
// o avr8js só traz as configurações do 328P; no 2560 os vetores de interrupção e os
// pinos de comparação dos timers são outros, e há Timer3/4/5 e USART1–3.
import {
  portAConfig, portBConfig, portCConfig, portDConfig, portEConfig, portFConfig, portGConfig, portHConfig, portJConfig, portKConfig, portLConfig,
  timer0Config, timer1Config, timer2Config, usart0Config, spiConfig, twiConfig, adcConfig, eepromConfig, ADCMuxInputType, atmega328Channels,
} from 'avr8js'

// Intel HEX → memória de programa
export function loadHex(hex, bytes) {
  let base = 0
  for (const line of String(hex).split(/\r?\n/)) {
    if (line[0] !== ':') continue
    const n = parseInt(line.substr(1, 2), 16)
    const addr = parseInt(line.substr(3, 4), 16)
    const type = parseInt(line.substr(7, 2), 16)
    if (type === 0) for (let i = 0; i < n; i++) bytes[base + addr + i] = parseInt(line.substr(9 + i * 2, 2), 16)
    else if (type === 2) base = parseInt(line.substr(9, 4), 16) << 4
    else if (type === 4) base = parseInt(line.substr(9, 4), 16) << 16
    else if (type === 1) break
  }
}

// ---------- ATmega328P (Uno, Nano) ----------
const UNO = {
  id: 'atmega328p',
  flash: 0x8000,
  sram: 2048,
  eeprom: 1024,
  ports: [
    { cfg: portBConfig, pins: [8, 9, 10, 11, 12, 13, -1, -1] },
    { cfg: portCConfig, pins: [14, 15, 16, 17, 18, 19, -1, -1] },
    { cfg: portDConfig, pins: [0, 1, 2, 3, 4, 5, 6, 7] },
  ],
  timers: [timer0Config, timer1Config, timer2Config],
  usarts: [{ cfg: usart0Config, tx: 1, rx: 0, name: 'Serial' }],
  spi: spiConfig,
  twi: twiConfig,
  adc: { ...adcConfig, muxChannels: atmega328Channels },
  adcPin: (ch) => (ch < 6 ? 14 + ch : null), // A6/A7 do Nano não existem no perfil
  eepromCfg: eepromConfig,
}

// ---------- ATmega2560 (Mega) ----------
const megaPinChange = (n, mask, offset) => ({ PCIE: n, PCICR: 0x68, PCIFR: 0x3b, PCMSK: 0x6b + n, pinChangeInterrupt: 18 + 2 * n, mask, offset })
const megaExtInt = (n) => ({ EICR: n < 4 ? 0x69 : 0x6a, EIMSK: 0x3d, EIFR: 0x3c, index: n, iscOffset: (n % 4) * 2, interrupt: 2 + 2 * n })
const regs = (c) => ({ PIN: c.PIN, DDR: c.DDR, PORT: c.PORT })
const T1 = timer1Config
const timer16 = (o) => ({ ...T1, OCFC: 0b1000, OCIEC: 0b1000, ...o })
const MEGA_USART = (rx, udre, tx, base) => ({ rxCompleteInterrupt: rx, dataRegisterEmptyInterrupt: udre, txCompleteInterrupt: tx, UCSRA: base, UCSRB: base + 1, UCSRC: base + 2, UBRRL: base + 4, UBRRH: base + 5, UDR: base + 6 })
const megaMux = {}
for (let i = 0; i < 8; i++) {
  megaMux[i] = { type: ADCMuxInputType.SingleEnded, channel: i }
  megaMux[0x20 + i] = { type: ADCMuxInputType.SingleEnded, channel: 8 + i }
}
megaMux[0x1e] = { type: ADCMuxInputType.Constant, voltage: 1.1 }
megaMux[0x1f] = { type: ADCMuxInputType.Constant, voltage: 0 }

const MEGA = {
  id: 'atmega2560',
  flash: 0x40000,
  sram: 8192,
  eeprom: 4096,
  ports: [
    { cfg: { ...regs(portAConfig), externalInterrupts: [] }, pins: [22, 23, 24, 25, 26, 27, 28, 29] },
    { cfg: { ...regs(portBConfig), pinChange: megaPinChange(0, 0xff, 0), externalInterrupts: [] }, pins: [53, 52, 51, 50, 10, 11, 12, 13] },
    { cfg: { ...regs(portCConfig), externalInterrupts: [] }, pins: [37, 36, 35, 34, 33, 32, 31, 30] },
    { cfg: { ...regs(portDConfig), externalInterrupts: [megaExtInt(0), megaExtInt(1), megaExtInt(2), megaExtInt(3)] }, pins: [21, 20, 19, 18, -1, -1, -1, 38] },
    { cfg: { ...regs(portEConfig), pinChange: megaPinChange(1, 0x01, 0), externalInterrupts: [null, null, null, null, megaExtInt(4), megaExtInt(5), megaExtInt(6), megaExtInt(7)] }, pins: [0, 1, -1, 5, 2, 3, -1, -1] },
    { cfg: { ...regs(portFConfig), externalInterrupts: [] }, pins: [54, 55, 56, 57, 58, 59, 60, 61] },
    { cfg: { ...regs(portGConfig), externalInterrupts: [] }, pins: [41, 40, 39, -1, -1, 4, -1, -1] },
    { cfg: { ...regs(portHConfig), externalInterrupts: [] }, pins: [17, 16, -1, 6, 7, 8, 9, -1] },
    { cfg: { ...regs(portJConfig), pinChange: megaPinChange(1, 0x7f, 1), externalInterrupts: [] }, pins: [15, 14, -1, -1, -1, -1, -1, -1] },
    { cfg: { ...regs(portKConfig), pinChange: megaPinChange(2, 0xff, 0), externalInterrupts: [] }, pins: [62, 63, 64, 65, 66, 67, 68, 69] },
    { cfg: { ...regs(portLConfig), externalInterrupts: [] }, pins: [49, 48, 47, 46, 45, 44, 43, 42] },
  ],
  timers: [
    { ...timer0Config, compAInterrupt: 0x2a, compBInterrupt: 0x2c, ovfInterrupt: 0x2e, compPortA: portBConfig.PORT, compPinA: 7, compPortB: portGConfig.PORT, compPinB: 5, externalClockPort: portDConfig.PORT, externalClockPin: 7 },
    { ...T1, captureInterrupt: 0x20, compAInterrupt: 0x22, compBInterrupt: 0x24, ovfInterrupt: 0x28, OCRC: 0x8c, compCInterrupt: 0x26, OCFC: 0b1000, OCIEC: 0b1000, compPortA: portBConfig.PORT, compPinA: 5, compPortB: portBConfig.PORT, compPinB: 6, compPortC: portBConfig.PORT, compPinC: 7, externalClockPort: portDConfig.PORT, externalClockPin: 6 },
    { ...timer2Config, compAInterrupt: 0x1a, compBInterrupt: 0x1c, ovfInterrupt: 0x1e, compPortA: portBConfig.PORT, compPinA: 4, compPortB: portHConfig.PORT, compPinB: 6, externalClockPort: 0, externalClockPin: 0 },
    timer16({ captureInterrupt: 0x3e, compAInterrupt: 0x40, compBInterrupt: 0x42, compCInterrupt: 0x44, ovfInterrupt: 0x46, TIFR: 0x38, TIMSK: 0x71, TCCRA: 0x90, TCCRB: 0x91, TCCRC: 0x92, TCNT: 0x94, ICR: 0x96, OCRA: 0x98, OCRB: 0x9a, OCRC: 0x9c, compPortA: portEConfig.PORT, compPinA: 3, compPortB: portEConfig.PORT, compPinB: 4, compPortC: portEConfig.PORT, compPinC: 5, externalClockPort: portEConfig.PORT, externalClockPin: 6 }),
    timer16({ captureInterrupt: 0x52, compAInterrupt: 0x54, compBInterrupt: 0x56, compCInterrupt: 0x58, ovfInterrupt: 0x5a, TIFR: 0x39, TIMSK: 0x72, TCCRA: 0xa0, TCCRB: 0xa1, TCCRC: 0xa2, TCNT: 0xa4, ICR: 0xa6, OCRA: 0xa8, OCRB: 0xaa, OCRC: 0xac, compPortA: portHConfig.PORT, compPinA: 3, compPortB: portHConfig.PORT, compPinB: 4, compPortC: portHConfig.PORT, compPinC: 5, externalClockPort: portHConfig.PORT, externalClockPin: 7 }),
    timer16({ captureInterrupt: 0x5c, compAInterrupt: 0x5e, compBInterrupt: 0x60, compCInterrupt: 0x62, ovfInterrupt: 0x64, TIFR: 0x3a, TIMSK: 0x73, TCCRA: 0x120, TCCRB: 0x121, TCCRC: 0x122, TCNT: 0x124, ICR: 0x126, OCRA: 0x128, OCRB: 0x12a, OCRC: 0x12c, compPortA: portLConfig.PORT, compPinA: 3, compPortB: portLConfig.PORT, compPinB: 4, compPortC: portLConfig.PORT, compPinC: 5, externalClockPort: portLConfig.PORT, externalClockPin: 2 }),
  ],
  usarts: [
    { cfg: { ...usart0Config, rxCompleteInterrupt: 0x32, dataRegisterEmptyInterrupt: 0x34, txCompleteInterrupt: 0x36 }, tx: 1, rx: 0, name: 'Serial' },
    { cfg: MEGA_USART(0x48, 0x4a, 0x4c, 0xc8), tx: 18, rx: 19, name: 'Serial1' },
    { cfg: MEGA_USART(0x66, 0x68, 0x6a, 0xd0), tx: 16, rx: 17, name: 'Serial2' },
    { cfg: MEGA_USART(0x6c, 0x6e, 0x70, 0x130), tx: 14, rx: 15, name: 'Serial3' },
  ],
  spi: { ...spiConfig, spiInterrupt: 0x30 },
  twi: { ...twiConfig, twiInterrupt: 0x4e },
  adc: { ...adcConfig, adcInterrupt: 0x3a, numChannels: 16, muxInputMask: 0x3f, muxChannels: megaMux },
  adcPin: (ch) => (ch < 16 ? 54 + ch : null),
  eepromCfg: { ...eepromConfig, eepromReadyInterrupt: 0x3c },
}

export const MCUS = { atmega328p: UNO, atmega2560: MEGA }
// perfil da placa (shared/boards.js) → MCU emulado (ou null se não for AVR)
export const mcuOfProfile = (prof) => (prof?.id === 'uno' ? UNO : prof?.id === 'mega' ? MEGA : null)
