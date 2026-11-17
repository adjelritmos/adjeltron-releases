// Relógio de tempo real DS3231 (módulo ZS-042, cristal compensado em temperatura).
import { rowZ } from '../geometry.js'

export default {
  type: 'ds3231',
  name: 'Relógio RTC DS3231 (I2C)',
  short: 'DS3231',
  cat: 'sensor',
  description:
    'RTC de precisão (±2 ppm, ~1 minuto por ano) com sensor de temperatura interno. VCC → 5V (ou 3,3 V), GND → GND, SDA → A4, SCL → A5; endereço 0x68. Biblioteca RTClib: RTC_DS3231 rtc; rtc.begin(); rtc.now(); rtc.getTemperature(). No simulador começa na hora do computador.',
  size: [3.8, 1.2, 2.2],
  pins: rowZ(['32K', 'SQW', 'SCL', 'SDA', 'VCC', 'GND'], -1.7, 0.3, ['out', 'out', 'io', 'io', 'pwr', 'gnd']),
  config: { addr: 0x68, temp: 24 },
  fields: [{ key: 'temp', label: 'Temperatura ambiente', type: 'range', min: -20, max: 60, step: 0.5, unit: '°C' }],
  lib: {
    header: 'RTClib.h',
    usage: 'RTC_DS3231 rtc;\nrtc.begin();\nif (rtc.lostPower()) rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));\nDateTime agora = rtc.now();\nfloat t = rtc.getTemperature();',
  },
  view2d: { view: 'top', x: [-1.95, 1.95], z: [-1.15, 1.15] },
}
