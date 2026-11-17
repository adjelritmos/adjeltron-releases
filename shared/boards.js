// Perfis dos microcontroladores: que pinos existem, a que tensão funcionam,
// resolução do ADC, onde há PWM, constantes do core Arduino e barramento I2C.
// O índice de `pins` é o número do pino usado no código (digitalWrite(13…), GPIO 2…).

// 20/21 = A6/A7: só analógicos (existem no Nano e nas placas SMD; no Uno DIP não há pino)
const UNO_PINS = [...Array.from({ length: 14 }, (_, i) => `D${i}`), ...Array.from({ length: 8 }, (_, i) => `A${i}`)]

export const UNO = {
  id: 'uno',
  mcu: 'ATmega328P',
  vio: 5, // tensão lógica dos pinos
  supply: '5V', // pino de alimentação regulada da placa
  pins: UNO_PINS,
  pwm: [3, 5, 6, 9, 10, 11],
  adcMax: 1023,
  adcRef: 5,
  analog: [14, 15, 16, 17, 18, 19, 20, 21],
  inputOnly: [20, 21], // A6/A7: só entradas analógicas
  analogAlias: (n) => (n < 14 ? n + 14 : n), // analogRead(0) == analogRead(A0)
  pullup: 35000,
  rOut: 25,
  consts: { LED_BUILTIN: 13, A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19, A6: 20, A7: 21, SDA: 18, SCL: 19 },
  i2c: { sda: 'A4', scl: 'A5' },
  defines: [],
}

// ESP32 (ESP-WROOM-32, placa DevKit V1 de 30 pinos): 3,3 V, ADC de 12 bits,
// PWM (LEDC) em qualquer saída, DAC nos GPIO 25/26, I2C por omissão em 21/22.
const ESP_GPIO = [0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39]
export const ESP32 = {
  id: 'esp32',
  mcu: 'ESP32-D0WDQ6',
  vio: 3.3,
  supply: '3V3',
  pins: Array.from({ length: 40 }, (_, n) => (ESP_GPIO.includes(n) ? `GPIO${n}` : null)),
  pwm: 'all',
  inputOnly: [34, 35, 36, 39],
  adcMax: 4095,
  adcRef: 3.3,
  // ADC1 (32–39) e ADC2 (0, 2, 4, 12–15, 25–27; o ADC2 não funciona com o Wi‑Fi ligado)
  analog: [36, 39, 32, 33, 34, 35, 0, 2, 4, 12, 13, 14, 15, 25, 26, 27],
  adc2: [0, 2, 4, 12, 13, 14, 15, 25, 26, 27],
  analogAlias: (n) => n,
  pulldown: true,
  chip: 'ESP32',
  dac: [25, 26],
  pullup: 45000,
  rOut: 30,
  consts: {
    LED_BUILTIN: 2, A0: 36, A3: 39, A4: 32, A5: 33, A6: 34, A7: 35, A10: 4, A11: 0, A12: 2, A13: 15, A14: 13, A15: 12, A16: 14,
    A17: 27, A18: 25, A19: 26, DAC1: 25, DAC2: 26, SDA: 21, SCL: 22, T0: 4, T2: 2, T3: 15, T4: 13, T5: 12, T6: 14, T7: 27, T8: 33, T9: 32,
  },
  i2c: { sda: 'GPIO21', scl: 'GPIO22' },
  // Serial1 usa por omissão os GPIO 9/10 (memória flash): indique os pinos em begin(baud, SERIAL_8N1, rx, tx)
  uarts: ['Serial1', 'Serial2'],
  uartPins: { Serial1: {}, Serial2: { rx: 16, tx: 17 } },
  defines: ['ESP32', 'ARDUINO_ARCH_ESP32'],
  wifi: true, // WiFi.h / PubSubClient / HTTPClient / WebServer simulados
}

// Arduino Mega 2560 (ATmega2560): 5 V, D0–D53 + A0–A15 (números 54–69), PWM em 2–13 e
// 44–46, I2C em 20 (SDA) / 21 (SCL), Serial1–3 nos pinos 14–19.
const MEGA_A = Array.from({ length: 16 }, (_, i) => [`A${i}`, 54 + i])
export const MEGA = {
  id: 'mega',
  mcu: 'ATmega2560',
  vio: 5,
  supply: '5V',
  pins: [...Array.from({ length: 54 }, (_, i) => `D${i}`), ...MEGA_A.map(([a]) => a)],
  pwm: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 44, 45, 46],
  adcMax: 1023,
  adcRef: 5,
  analog: MEGA_A.map(([, n]) => n),
  analogAlias: (n) => (n < 16 ? n + 54 : n), // analogRead(0) == analogRead(A0)
  pullup: 35000,
  rOut: 25,
  consts: { LED_BUILTIN: 13, ...Object.fromEntries(MEGA_A), SDA: 20, SCL: 21 },
  i2c: { sda: 'D20', scl: 'D21' },
  uarts: ['Serial1', 'Serial2', 'Serial3'],
  uartPins: { Serial1: { rx: 19, tx: 18 }, Serial2: { rx: 17, tx: 16 }, Serial3: { rx: 15, tx: 14 } },
  defines: ['ARDUINO_AVR_MEGA2560', '__AVR_ATmega2560__'],
}

// Raspberry Pi Pico (RP2040, core Arduino-Pico de Earle Philhower): 3,3 V, GP0–GP28
// (GP23/24 são internos; GP25 é o LED da placa), ADC de 12 bits em GP26–28 (A0–A2,
// lidos a 10 bits por omissão), PWM em todos os pinos, Wire por omissão em GP4/GP5.
const PICO_INTERNAL = [23, 24]
export const PICO = {
  id: 'pico',
  family: 'pico', // família Raspberry Pi Pico (Pico, Pico W, Pico 2, Pico 2 W): mesmo pinout e core
  fqbn: 'rp2040:rp2040:rpipico',
  cpuMHz: 133,
  mcu: 'RP2040',
  chip: 'RP2040',
  vio: 3.3,
  supply: '3V3',
  pins: Array.from({ length: 29 }, (_, n) => (PICO_INTERNAL.includes(n) ? null : `GP${n}`)),
  onboard: [25], // existe no código (LED_BUILTIN) mas não sai para um pino da placa
  pwm: 'all',
  pulldown: true,
  adcMax: 4095,
  adcBits: 10, // analogRead() devolve 0–1023 até analogReadResolution(12)
  adcRef: 3.3,
  analog: [26, 27, 28],
  analogAlias: (n) => n, // como no Arduino-Pico: analogRead(0) é inválido, use A0 (= 26)
  pullup: 50000,
  rOut: 40,
  consts: { LED_BUILTIN: 25, PIN_LED: 25, A0: 26, A1: 27, A2: 28, SDA: 4, SCL: 5, PIN_WIRE0_SDA: 4, PIN_WIRE0_SCL: 5 },
  i2c: { sda: 'GP4', scl: 'GP5' },
  uarts: ['Serial1', 'Serial2'],
  uartPins: { Serial1: { tx: 0, rx: 1 }, Serial2: { tx: 8, rx: 9 } },
  vinPin: 'VSYS',
  defines: ['ARDUINO_ARCH_RP2040', 'ARDUINO_RASPBERRY_PI_PICO'],
}

// Pico W / Pico 2 / Pico 2 W (group-pico): mesmo conector de 40 pinos. Nas versões W o chip
// Wi‑Fi CYW43439 usa GP23/24/25/29 por dentro e o LED da placa está no WL_GPIO0 do CYW43
// (LED_BUILTIN = 64 no core Arduino-Pico). RP2350 (Pico 2): 2 × Cortex-M33 a 150 MHz, 520 KB SRAM.
const picoVariant = (o) => ({ ...PICO, ...o, consts: { ...PICO.consts, A3: 29, ...(o.consts || {}) } })
const W_PINS = Array.from({ length: 65 }, (_, n) => (n === 64 ? 'WL_GPIO0' : n < 29 && ![23, 24, 25].includes(n) ? `GP${n}` : null))
export const PICO_W = picoVariant({
  id: 'picow', fqbn: 'rp2040:rp2040:rpipicow', wifi: true, wireless: 'CYW43439',
  pins: W_PINS, onboard: [64], led: 64,
  consts: { LED_BUILTIN: 64, PIN_LED: 64 },
  defines: ['ARDUINO_ARCH_RP2040', 'ARDUINO_RASPBERRY_PI_PICO_W', 'PICO_CYW43_SUPPORTED=1'],
})
export const PICO2 = picoVariant({
  id: 'pico2', fqbn: 'rp2040:rp2040:rpipico2', mcu: 'RP2350', chip: 'RP2350', cpuMHz: 150, sram: 520,
  defines: ['ARDUINO_ARCH_RP2040', 'ARDUINO_RASPBERRY_PI_PICO_2', 'PICO_RP2350=1'],
})
export const PICO2_W = picoVariant({
  id: 'pico2w', fqbn: 'rp2040:rp2040:rpipico2w', mcu: 'RP2350', chip: 'RP2350', cpuMHz: 150, sram: 520, wifi: true, wireless: 'CYW43439',
  pins: W_PINS, onboard: [64], led: 64,
  consts: { LED_BUILTIN: 64, PIN_LED: 64 },
  defines: ['ARDUINO_ARCH_RP2040', 'ARDUINO_RASPBERRY_PI_PICO_2W', 'PICO_RP2350=1', 'PICO_CYW43_SUPPORTED=1'],
})

// ATtiny85 (DIP-8, core ATTinyCore): 6 pinos PB0–PB5, sem regulador — funciona à tensão de VCC
// (1,8–5,5 V) e as saídas ficam a essa tensão. ADC em PB5/PB2/PB4/PB3 (A0–A3), PWM em PB0, PB1,
// PB4. I2C (USI) com SDA em PB0 e SCL em PB2. Sem UART: o Serial do ATTinyCore é por software
// (TX em PB0) — no simulador aparece no Monitor Série.
const TINY_ADC = { 0: 5, 1: 2, 2: 4, 3: 3, 10: 5, 11: 2, 12: 4, 13: 3 }
const tinyBase = {
  mcu: 'ATtiny85',
  chip: 'ATtiny85',
  vio: 5,
  cpuMHz: 8,
  pwm: [0, 1, 4],
  adcMax: 1023,
  adcRef: 5,
  analog: [5, 2, 4, 3],
  // A0–A3 são canais do ADC (analogRead(A1) = PB2); digitalRead/Write usam o número do PB
  analogAlias: (n) => TINY_ADC[n] ?? n,
  pullup: 35000,
  rOut: 25,
  consts: { LED_BUILTIN: 1, A0: 10, A1: 11, A2: 12, A3: 13, PB0: 0, PB1: 1, PB2: 2, PB3: 3, PB4: 4, PB5: 5, PIN_B0: 0, PIN_B1: 1, PIN_B2: 2, PIN_B3: 3, PIN_B4: 4, PIN_B5: 5, SDA: 0, SCL: 2 },
  defines: ['ARDUINO_ARCH_AVR', '__AVR__', '__AVR_ATtiny85__', 'ARDUINO_AVR_ATTINYX5', 'F_CPU=8000000L'],
}
export const ATTINY85 = {
  ...tinyBase,
  id: 'attiny85',
  fqbn: 'ATTinyCore:avr:attinyx5:chip=85,clock=8internal',
  supply: 'VCC',
  pins: ['PB0', 'PB1', 'PB2', 'PB3', 'PB4', 'PB5'],
  i2c: { sda: 'PB0', scl: 'PB2' },
  power: { direct: 'VCC', gnd: 'GND', load: 1 / 5000, vmin: 1.8, vmax: 6 },
}
// Franzininho (placa brasileira de código aberto, compatível com a Digispark): ATtiny85 a 16,5 MHz,
// conector USB, regulador 78L05 (VIN 7–12 V) e LED no P1. Pinos P0–P5 = PB0–PB5.
export const FRANZININHO = {
  ...tinyBase,
  id: 'franzininho',
  cpuMHz: 16.5,
  fqbn: 'ATTinyCore:avr:attinyx5:chip=85,clock=16pll',
  supply: '5V',
  pins: ['P0', 'P1', 'P2', 'P3', 'P4', 'P5'],
  consts: { ...tinyBase.consts, P0: 0, P1: 1, P2: 2, P3: 3, P4: 4, P5: 5 },
  i2c: { sda: 'P0', scl: 'P2' },
  power: { usb: '5V', rail: '5V', railV: 5, vin: 'VIN', vinMin: 6.5, gnd: 'GND', load: 1 / 250 },
  defines: [...tinyBase.defines.filter((d) => !d.startsWith('F_CPU')), 'F_CPU=16500000L', 'ARDUINO_AVR_DIGISPARK'],
}

// Arduino Nano RP2040 Connect (core Arduino mbed): formato Nano com o RP2040, 3,3 V, D0–D13 e
// A0–A7 (= D14–D21; A6/A7 só analógicos), ADC de 10 bits, Wi‑Fi/Bluetooth no módulo u-blox NINA-W102
// (WiFiNINA), LED no D13. USB → VUSB (5 V) → regulador MP2322 → 3V3; VIN aceita 5–21 V.
const NRP_A = Array.from({ length: 8 }, (_, i) => [`A${i}`, 14 + i])
export const NANO_RP2040 = {
  id: 'nanorp2040',
  mcu: 'RP2040',
  chip: 'RP2040',
  cpuMHz: 133,
  fqbn: 'arduino:mbed_nano:nanorp2040connect',
  vio: 3.3,
  supply: '3V3',
  pins: [...Array.from({ length: 14 }, (_, i) => `D${i}`), ...NRP_A.map(([a]) => a)],
  pwm: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
  inputOnly: [20, 21],
  pulldown: true,
  adcMax: 1023,
  adcRef: 3.3,
  analog: NRP_A.map(([, n]) => n),
  analogAlias: (n) => (n < 8 ? n + 14 : n),
  pullup: 50000,
  rOut: 40,
  consts: { LED_BUILTIN: 13, ...Object.fromEntries(NRP_A), SDA: 18, SCL: 19 },
  i2c: { sda: 'A4', scl: 'A5' },
  uarts: ['Serial1'],
  uartPins: { Serial1: { tx: 1, rx: 0 } },
  wifi: true,
  defines: ['ARDUINO_ARCH_MBED', 'ARDUINO_ARCH_MBED_NANO', 'ARDUINO_NANO_RP2040_CONNECT', 'TARGET_RP2040'],
  power: { usb: 'VUSB', rail: '3V3', railV: 3.3, vin: 'VIN', vinMin: 5, load: 1 / 60 },
}

// STM32 "Blue Pill" (STM32F103C8T6, core STM32duino): Cortex-M3 a 72 MHz, 3,3 V (a maioria dos
// pinos aceita 5 V), PA0–PA15, PB0–PB15 e PC13–PC15. ADC de 12 bits (lido a 10 bits por omissão) em
// PA0–PA7, PB0, PB1. LED no PC13 (acende a LOW). I2C1 em PB7 (SDA) / PB6 (SCL), Serial1 em PA9/PA10.
const BP_NAMES = [...Array.from({ length: 16 }, (_, i) => `PA${i}`), ...Array.from({ length: 16 }, (_, i) => `PB${i}`), 'PC13', 'PC14', 'PC15']
const BP_A = [['A0', 0], ['A1', 1], ['A2', 2], ['A3', 3], ['A4', 4], ['A5', 5], ['A6', 6], ['A7', 7], ['A8', 16], ['A9', 17]]
export const BLUEPILL = {
  id: 'bluepill',
  mcu: 'STM32F103C8',
  chip: 'STM32F103',
  cpuMHz: 72,
  fqbn: 'STMicroelectronics:stm32:GenF1:pnum=BLUEPILL_F103C8',
  vio: 3.3,
  supply: '3V3',
  pins: BP_NAMES,
  pwm: [0, 1, 2, 3, 6, 7, 8, 9, 10, 11, 16, 17, 22, 23, 24, 25],
  pulldown: true,
  adcMax: 1023,
  adcRef: 3.3,
  analog: BP_A.map(([, n]) => n),
  analogAlias: (n) => n,
  pullup: 40000,
  rOut: 40,
  consts: { LED_BUILTIN: 32, PIN_LED: 32, ...Object.fromEntries(BP_NAMES.map((n, i) => [n, i])), ...Object.fromEntries(BP_A), SDA: 23, SCL: 22, PIN_WIRE_SDA: 23, PIN_WIRE_SCL: 22 },
  i2c: { sda: 'PB7', scl: 'PB6' },
  uarts: ['Serial1', 'Serial2', 'Serial3'],
  uartPins: { Serial1: { tx: 9, rx: 10 }, Serial2: { tx: 2, rx: 3 }, Serial3: { tx: 26, rx: 27 } },
  defines: ['ARDUINO_ARCH_STM32', 'STM32F1xx', 'STM32F103xB', 'ARDUINO_BLUEPILL_F103C8'],
  power: { usb: '5V', rail: '3V3.1', railV: 3.3, gnd: 'G.1', load: 1 / 110 },
}

export const PROFILES = { uno: UNO, esp32: ESP32, mega: MEGA, pico: PICO, picow: PICO_W, pico2: PICO2, pico2w: PICO2_W, attiny85: ATTINY85, franzininho: FRANZININHO, nanorp2040: NANO_RP2040, bluepill: BLUEPILL }
// `board: true` (Uno, Nano) usa o perfil do Uno; `board: { profile: 'esp32' }` escolhe outro
export const profileOfDef = (def) => (def?.board && typeof def.board === 'object' ? PROFILES[def.board.profile] : UNO)
