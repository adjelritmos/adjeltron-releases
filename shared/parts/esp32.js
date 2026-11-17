// ESP32 DevKit V1 (DOIT, 30 pinos): ESP-WROOM-32 a 240 MHz, Wi‑Fi + Bluetooth, lógica de 3,3 V.
import { PITCH } from '../geometry.js'

const ROW_Z = 1.27 // filas a 1,0" (25,4 mm): ocupa as duas metades da breadboard
// vista de cima com a antena à direita (+x) e a USB à esquerda (−x); da USB para a antena
const TOP = ['VIN', 'GND.1', 'GPIO13', 'GPIO12', 'GPIO14', 'GPIO27', 'GPIO26', 'GPIO25', 'GPIO33', 'GPIO32', 'GPIO35', 'GPIO34', 'GPIO39', 'GPIO36', 'EN']
const BOTTOM = ['3V3', 'GND.2', 'GPIO15', 'GPIO2', 'GPIO4', 'GPIO16', 'GPIO17', 'GPIO5', 'GPIO18', 'GPIO19', 'GPIO21', 'GPIO3', 'GPIO1', 'GPIO22', 'GPIO23']
const LABEL = {
  VIN: 'VIN (5 V)', 'GND.1': 'GND', 'GND.2': 'GND', '3V3': '3V3', EN: 'EN (não simulado)',
  GPIO36: 'VP (GPIO36, só entrada)', GPIO39: 'VN (GPIO39, só entrada)', GPIO34: 'D34 (só entrada)', GPIO35: 'D35 (só entrada)',
  GPIO1: 'TX0 (GPIO1)', GPIO3: 'RX0 (GPIO3)', GPIO16: 'RX2 (GPIO16)', GPIO17: 'TX2 (GPIO17)',
  GPIO21: 'D21 (SDA)', GPIO22: 'D22 (SCL)', GPIO25: 'D25 (DAC1)', GPIO26: 'D26 (DAC2)', GPIO2: 'D2 (LED azul)',
}
const KIND = { VIN: 'vin', 'GND.1': 'gnd', 'GND.2': 'gnd', '3V3': 'p33', EN: 'pass', GPIO34: 'in', GPIO35: 'in', GPIO36: 'in', GPIO39: 'in' }
const label = (id) => LABEL[id] || (id.startsWith('GPIO') ? `D${id.slice(4)}` : id)

function pins() {
  const row = (ids, z) => ids.map((id, i) => ({ id, label: label(id), pos: [(i - 7) * PITCH, 0, z], kind: KIND[id] || 'io' }))
  return [...row(TOP, -ROW_Z), ...row(BOTTOM, ROW_Z)]
}

export default {
  type: 'esp32',
  name: 'ESP32 DevKit V1',
  short: 'ESP32',
  cat: 'mcu',
  board: { profile: 'esp32' },
  description:
    'ESP32 a 240 MHz com Wi‑Fi. Atenção: pinos de 3,3 V — 5 V num GPIO danifica-o! ADC de 12 bits (0–4095), PWM em qualquer saída (analogWrite / ledcWrite), DAC em GPIO25/26, I2C em 21 (SDA) e 22 (SCL). GPIO34–39 são só entradas. LED azul no GPIO2. Use os números GPIO no código.',
  size: [5.15, 1.2, 2.8],
  pins: pins(),
  internal: [['GND.1', 'GND.2']],
  config: { usb: true },
  fields: [{ key: 'usb', label: 'Alimentação', type: 'select', options: [[true, 'USB (computador)'], [false, 'Externa (VIN 5 V ou 3V3)']] }],
  lib: { header: 'WiFi.h', usage: '#include <WiFi.h>\nWiFi.begin("RoboLab", "12345678");\nwhile (WiFi.status() != WL_CONNECTED) delay(500);\nSerial.println(WiFi.localIP());' },
  view2d: { view: 'top', x: [-2.6, 2.6], z: [-1.45, 1.45] },
}
