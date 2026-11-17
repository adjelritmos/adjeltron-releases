// Barómetro + termómetro BMP280 (módulo GY-BMP280, I2C/SPI).
import { rowX } from '../geometry.js'

export default {
  type: 'bmp280',
  name: 'Barómetro BMP280 (I2C)',
  short: 'BMP280',
  cat: 'sensor',
  description:
    'Mede a pressão atmosférica (300–1100 hPa, ±1 hPa) e a temperatura; da pressão calcula-se a altitude (~12 Pa por metro). Módulo de 3,3 V com regulador: VCC → 5V, GND → GND, SCL → A5, SDA → A4. Endereço 0x76 (SDO a GND) ou 0x77 (SDO a VCC). Biblioteca Adafruit_BMP280: bmp.begin(0x76); bmp.readPressure() (Pa); bmp.readAltitude(1013.25) (m).',
  size: [1.5, 0.6, 1.15],
  pins: rowX(['VCC', 'GND', 'SCL', 'SDA', 'CSB', 'SDO'], -0.45, 0.3, ['pwr', 'gnd', 'io', 'io', 'in', 'io']),
  config: { addr: 0x76, temp: 21 },
  fields: [
    { key: 'addr', label: 'Endereço I2C', type: 'select', options: [[0x76, '0x76 (SDO a GND)'], [0x77, '0x77 (SDO a VCC)']] },
    { key: 'temp', label: 'Temperatura', type: 'range', min: -40, max: 85, step: 0.5, unit: '°C' },
  ],
  interactive: { kind: 'slider', label: 'Altitude', unit: 'm', min: -100, max: 4000, step: 10, default: 100 },
  lib: {
    header: 'Adafruit_BMP280.h',
    usage: 'Adafruit_BMP280 bmp;\nbmp.begin(0x76);\nfloat hPa = bmp.readPressure() / 100.0;\nfloat alt = bmp.readAltitude(1013.25);',
  },
  view2d: { view: 'top', x: [-0.8, 0.8], z: [-0.62, 0.62] },
}
