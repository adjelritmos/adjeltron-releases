// ESP32 no formato do Arduino Uno (Wemos/LOLIN D1 R32): mesmo contorno, furos e conectores
// fêmea do Uno — encaixa shields e assenta nos mesmos sítios — mas com o ESP32 (3,3 V, Wi‑Fi).
// Cada pino do Uno corresponde a um GPIO (serigrafia da placa real); no código usa-se o
// número do GPIO (ex.: o "D2" da placa é o GPIO26 → pinMode(26, OUTPUT)).
import { PITCH as P } from '../geometry.js'

// pino do conector Uno → GPIO (Wemos D1 R32)
export const R32_MAP = {
  D0: 3, D1: 1, D2: 26, D3: 25, D4: 17, D5: 16, D6: 27, D7: 14,
  D8: 12, D9: 13, D10: 5, D11: 23, D12: 19, D13: 18,
  A0: 2, A1: 4, A2: 35, A3: 34, A4: 36, A5: 39,
}
const NOTE = { 3: 'RX0', 1: 'TX0', 2: 'LED azul', 36: 'só entrada', 39: 'só entrada', 34: 'só entrada', 35: 'só entrada', 25: 'DAC1', 26: 'DAC2', 18: 'SCK', 19: 'MISO', 23: 'MOSI', 5: 'SS' }
const INPUT_ONLY = [34, 35, 36, 39]

// mesmas posições dos pinos do Arduino Uno (shared/components.js, arduinoPins)
function pins() {
  const y = 1.95
  const out = []
  const io = (uno, x, z) => {
    const g = R32_MAP[uno]
    out.push({ id: `GPIO${g}`, label: `${uno} · IO${g}${NOTE[g] ? ` (${NOTE[g]})` : ''}`, pos: [x, y, z], kind: INPUT_ONLY.includes(g) ? 'in' : 'io' })
  }
  for (let i = 0; i <= 7; i++) io(`D${i}`, 2.9 - i * P, -2.45)
  for (let i = 8; i <= 13; i++) io(`D${i}`, 2.9 - 8 * P - 0.2 - (i - 8) * P, -2.45)
  const gx = 2.9 - 14 * P - 0.2
  out.push({ id: 'GND.1', label: 'GND', pos: [gx, y, -2.45], kind: 'gnd' })
  // SDA/SCL ao lado do AREF (como no Uno R3): GPIO21 e GPIO22
  out.push({ id: 'GPIO21', label: 'SDA · IO21', pos: [gx - 2 * P, y, -2.45], kind: 'io' })
  out.push({ id: 'GPIO22', label: 'SCL · IO22', pos: [gx - 3 * P, y, -2.45], kind: 'io' })
  ;[['3V3', 'p33'], ['5V', 'p5'], ['GND.2', 'gnd'], ['GND.3', 'gnd'], ['VIN', 'vin']].forEach(([id, kind], i) => out.push({ id, label: id.split('.')[0], pos: [-0.75 + i * P, y, 2.45], kind }))
  for (let i = 0; i <= 5; i++) io(`A${i}`, 1.3 + i * P, 2.45)
  return out
}

export default {
  type: 'esp32Uno',
  name: 'ESP32 formato Uno (Wemos D1 R32)',
  short: 'ESP32 R32',
  cat: 'mcu',
  board: { profile: 'esp32' },
  description:
    'ESP32 (240 MHz, Wi‑Fi + Bluetooth) numa placa com o formato e os conectores do Arduino Uno: encaixa shields e fica no lugar do Uno. Lógica de 3,3 V — 5 V num pino danifica-o. No código use o número do GPIO escrito ao lado de cada pino (D2 = IO26, D3 = IO25, D9 = IO13, A0 = IO2…). LED azul no GPIO2. I2C em IO21 (SDA) e IO22 (SCL). A4/A5 (IO36/IO39) e A2/A3 (IO35/IO34) são só entradas.',
  size: [6.86, 2, 5.34],
  pins: pins(),
  internal: [['GND.1', 'GND.2', 'GND.3']],
  config: { usb: true },
  fields: [{ key: 'usb', label: 'Alimentação', type: 'select', options: [[true, 'USB (computador)'], [false, 'Externa (jack/VIN 7–12 V)']] }],
  conn: 'female',
  lib: { header: 'WiFi.h', usage: '#include <WiFi.h>\nWiFi.begin("RoboLab", "12345678");\nwhile (WiFi.status() != WL_CONNECTED) delay(500);\nSerial.println(WiFi.localIP());' },
  view2d: { view: 'top', x: [-3.95, 3.55], z: [-2.8, 2.8] },
}
