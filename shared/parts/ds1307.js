// Relógio de tempo real DS1307 (módulo "Tiny RTC" I2C com pilha CR2032).
import { rowX } from '../geometry.js'

export default {
  type: 'ds1307',
  name: 'Relógio RTC DS1307 (I2C)',
  short: 'RTC',
  cat: 'sensor',
  description:
    'Mantém a data e a hora mesmo com o Arduino desligado (pilha CR2032). GND → GND, 5V → 5V, SDA → A4, SCL → A5. Endereço fixo 0x68. Biblioteca RTClib: rtc.begin(), rtc.adjust(DateTime(F(__DATE__), F(__TIME__))) para acertar e rtc.now() para ler. No simulador começa na hora do computador.',
  size: [2.8, 1.0, 2.7],
  pins: rowX(['GND', '5V', 'SDA', 'SCL', 'SQW'], 1.2, 0.3, ['gnd', 'pwr', 'io', 'io', 'out']),
  config: { addr: 0x68 },
  lib: {
    header: 'RTClib.h',
    usage: 'RTC_DS1307 rtc;\nrtc.begin();\nif (!rtc.isrunning()) rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));\nDateTime agora = rtc.now();\nSerial.println(agora.hour());',
  },
  view2d: { view: 'top', x: [-1.45, 1.45], z: [-1.4, 1.45] },
}
