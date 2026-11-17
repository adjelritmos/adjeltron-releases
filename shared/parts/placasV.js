// Placas que faltavam (do catálogo do Velxio): ATtiny85 (chip DIP-8), Franzininho (ATtiny85 com USB),
// Arduino Nano RP2040 Connect e STM32 "Blue Pill". Correm no tradutor rápido (perfis em ../boards.js);
// a compilação real usa o core de cada uma no arduino-cli (ATTinyCore, Arduino mbed, STM32duino).
import { PITCH } from '../geometry.js'

const ROW_Z = 0.762 // filas a 0,6" (encaixam por cima do canal central da breadboard)
const rowPins = (ids, z, x0, kinds = {}, labels = {}) => ids.map((id, i) => ({ id, ...(labels[id] ? { label: labels[id] } : {}), pos: [x0 + i * PITCH, 0, z], kind: kinds[id] || 'io' }))

// ---------------- ATtiny85 (DIP-8) ----------------
const TINY_X = (i) => (i - 1.5) * PITCH
export const ATTINY_DEF = {
  type: 'attiny85',
  name: 'Microcontrolador ATtiny85 (DIP-8)',
  short: 'ATtiny85',
  cat: 'mcu',
  board: { profile: 'attiny85' },
  description:
    'Microcontrolador AVR de 8 pinos: 8 KB de flash, 512 bytes de RAM e de EEPROM, 6 pinos de E/S (PB0–PB5). Sem placa nem regulador: encaixe-o sobre o canal central e ligue VCC (pino 8) a 2,7–5,5 V e GND (pino 4) — as saídas ficam à tensão de VCC. PWM em PB0, PB1 e PB4; entradas analógicas A1 (PB2), A2 (PB4), A3 (PB3) e A0 (PB5, que é o RESET — evite-o). I2C (biblioteca Wire do ATTinyCore / TinyWireM) com SDA em PB0 e SCL em PB2. digitalWrite(1, HIGH) liga o PB1. No simulador o Serial aparece no Monitor Série (no chip real o Serial do ATTinyCore é por software, TX no PB0).',
  size: [1.1, 0.55, 0.65],
  pins: [
    ...[['PB5', 'io', 'PB5 / A0 (RESET)'], ['PB3', 'io', 'PB3 / A3'], ['PB4', 'io', 'PB4 / A2 (PWM)'], ['GND', 'gnd', 'GND']].map(([id, kind, label], i) => ({ id, label, pos: [TINY_X(i), 0, 0.381], kind })),
    ...[['PB0', 'io', 'PB0 (PWM, SDA)'], ['PB1', 'io', 'PB1 (PWM)'], ['PB2', 'io', 'PB2 / A1 (SCL, INT0)'], ['VCC', 'pwr', 'VCC (2,7–5,5 V)']].map(([id, kind, label], i) => ({ id, label, pos: [TINY_X(3 - i), 0, -0.381], kind })),
  ],
  view2d: { view: 'top', x: [-0.6, 0.6], z: [-0.5, 0.5] },
}

// ---------------- Franzininho ----------------
export const FRANZ = { W: 4.4, D: 2.2 }
export const FRANZININHO_DEF = {
  type: 'franzininho',
  name: 'Franzininho (ATtiny85, compatível com a Digispark)',
  short: 'Franzininho',
  cat: 'mcu',
  board: { profile: 'franzininho' },
  description:
    'Placa brasileira de código aberto com o ATtiny85 a 16,5 MHz, compatível com a Digispark: liga-se à USB (que a alimenta e programa) ou a VIN (7–12 V, regulador 78L05). Pinos P0–P5 = PB0–PB5 (PWM em P0, P1, P4; analógicos A1 = P2, A2 = P4, A3 = P3). O LED da placa está no P1 (LED_BUILTIN). I2C com SDA em P0 e SCL em P2. Encaixa na breadboard pela fila de pinos.',
  size: [FRANZ.W, 1.0, FRANZ.D],
  pins: [
    ...rowPins(['P0', 'P1', 'P2', 'P3', 'P4', 'P5'], 0.85, -0.3, {}, { P0: 'P0 (PB0, PWM, SDA)', P1: 'P1 (PB1, PWM, LED)', P2: 'P2 (PB2, A1, SCL)', P3: 'P3 (PB3, A3, USB)', P4: 'P4 (PB4, A2, PWM, USB)', P5: 'P5 (PB5, A0, RESET)' }),
    ...rowPins(['VIN', 'GND', '5V'], -0.85, 0.7, { VIN: 'vin', GND: 'gnd', '5V': 'p5' }, { VIN: 'VIN (7–12 V)' }),
  ],
  config: { usb: true },
  fields: [{ key: 'usb', label: 'Alimentação', type: 'select', options: [[true, 'USB (computador)'], [false, 'Externa (VIN ou 5V)']] }],
  view2d: { view: 'top', x: [-FRANZ.W / 2 - 0.05, FRANZ.W / 2 + 0.05], z: [-FRANZ.D / 2 - 0.05, FRANZ.D / 2 + 0.05] },
}

// ---------------- Arduino Nano RP2040 Connect ----------------
const NRP_BOTTOM = ['D13', '3V3', 'AREF', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'VUSB', 'RST.1', 'GND.1', 'VIN']
const NRP_TOP = ['D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'GND.2', 'RST.2', 'D0', 'D1']
export const NANO_RP2040_DEF = {
  type: 'nanorp2040',
  name: 'Arduino Nano RP2040 Connect',
  short: 'Nano RP2040',
  cat: 'mcu',
  board: { profile: 'nanorp2040' },
  description:
    'O RP2040 (2 × Cortex-M0+ a 133 MHz) no formato do Nano, com Wi‑Fi e Bluetooth (módulo u-blox NINA-W102, biblioteca WiFiNINA), IMU e microfone. Pinos a 3,3 V (não aceitam 5 V!): D0–D13 e A0–A7 (A6/A7 só analógicos), I2C em A4 (SDA) / A5 (SCL), Serial1 em D0/D1. LED no D13. Alimentação pela USB (VUSB fica a 5 V) ou por VIN (5–21 V). Encaixa na breadboard por cima do canal central.',
  size: [4.5, 1.0, 1.85],
  pins: [
    ...rowPins(NRP_BOTTOM, ROW_Z, -7 * PITCH, { '3V3': 'p33', VUSB: 'p5', VIN: 'vin', 'GND.1': 'gnd', 'GND.2': 'gnd', AREF: 'pass', 'RST.1': 'pass', 'RST.2': 'pass', A6: 'in', A7: 'in' }, { AREF: 'AREF (não simulado)', 'RST.1': 'RST (não simulado)', 'RST.2': 'RST (não simulado)', VUSB: 'VUSB (5 V da USB)', VIN: 'VIN (5–21 V)', A6: 'A6 (só analógico)', A7: 'A7 (só analógico)', A4: 'A4 (SDA)', A5: 'A5 (SCL)' }),
    ...rowPins(NRP_TOP, -ROW_Z, -7 * PITCH, { 'GND.1': 'gnd', 'GND.2': 'gnd', 'RST.2': 'pass' }, { D0: 'D0 (RX)', D1: 'D1 (TX)', 'GND.2': 'GND', 'RST.2': 'RST (não simulado)' }),
  ],
  internal: [['GND.1', 'GND.2'], ['RST.1', 'RST.2']],
  config: { usb: true },
  fields: [{ key: 'usb', label: 'Alimentação', type: 'select', options: [[true, 'USB (computador)'], [false, 'Externa (VIN)']] }],
  view2d: { view: 'top', x: [-2.3, 2.3], z: [-0.95, 0.95] },
}

// ---------------- STM32 Blue Pill ----------------
// vista de cima com a micro-USB à esquerda (−x)
const BP_TOP = ['PB12', 'PB13', 'PB14', 'PB15', 'PA8', 'PA9', 'PA10', 'PA11', 'PA12', 'PA15', 'PB3', 'PB4', 'PB5', 'PB6', 'PB7', 'PB8', 'PB9', '5V', 'G.1', '3V3.1']
const BP_BOTTOM = ['G.2', 'G.3', '3V3.2', 'R', 'PB11', 'PB10', 'PB1', 'PB0', 'PA7', 'PA6', 'PA5', 'PA4', 'PA3', 'PA2', 'PA1', 'PA0', 'PC15', 'PC14', 'PC13', 'VB']
const BP_KIND = { '5V': 'p5', 'G.1': 'gnd', 'G.2': 'gnd', 'G.3': 'gnd', '3V3.1': 'p33', '3V3.2': 'p33', R: 'pass', VB: 'pass' }
const BP_LABEL = { 'G.1': 'GND', 'G.2': 'GND', 'G.3': 'GND', '3V3.1': '3,3 V', '3V3.2': '3,3 V', R: 'RESET (não simulado)', VB: 'VBAT (não simulado)', PC13: 'PC13 (LED, acende a LOW)', PB6: 'PB6 (SCL1)', PB7: 'PB7 (SDA1)', PA9: 'PA9 (TX1)', PA10: 'PA10 (RX1)', PA11: 'PA11 (USB D−)', PA12: 'PA12 (USB D+)' }
export const BLUEPILL_W = 5.3
export const BLUEPILL_DEF = {
  type: 'bluepill',
  name: 'STM32 Blue Pill (STM32F103C8)',
  short: 'Blue Pill',
  cat: 'mcu',
  board: { profile: 'bluepill' },
  description:
    'Placa barata com o STM32F103C8T6 (Cortex-M3 a 72 MHz, 64 KB de flash, 20 KB de RAM), programada com o core STM32duino. Pinos a 3,3 V (a maioria aceita 5 V nas entradas): PA0–PA15, PB0–PB15, PC13–PC15 — no código usam-se pelos nomes (digitalWrite(PC13, LOW)). ADC de 12 bits em PA0–PA7, PB0, PB1 (analogRead dá 0–1023 por omissão). O LED da placa está no PC13 e acende a LOW. I2C1 em PB7 (SDA) / PB6 (SCL), Serial1 em PA9 (TX) / PA10 (RX). Alimentação pela micro-USB ou pelo pino 5V (regulador de 3,3 V na placa).',
  size: [BLUEPILL_W, 1.0, 2.28],
  pins: [...rowPins(BP_TOP, -ROW_Z, -9.5 * PITCH, BP_KIND, BP_LABEL), ...rowPins(BP_BOTTOM, ROW_Z, -9.5 * PITCH, BP_KIND, BP_LABEL)],
  internal: [['G.1', 'G.2', 'G.3'], ['3V3.1', '3V3.2']],
  config: { usb: true },
  fields: [{ key: 'usb', label: 'Alimentação', type: 'select', options: [[true, 'Micro-USB (computador)'], [false, 'Externa (pino 5V ou 3,3 V)']] }],
  view2d: { view: 'top', x: [-BLUEPILL_W / 2 - 0.05, BLUEPILL_W / 2 + 0.05], z: [-1.2, 1.2] },
}

export default [ATTINY_DEF, FRANZININHO_DEF, NANO_RP2040_DEF, BLUEPILL_DEF]
