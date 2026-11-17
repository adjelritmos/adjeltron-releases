// Sensor de temperatura digital DS18B20 (TO-92, barramento 1-Wire).
import { rowZ } from '../geometry.js'

export default {
  type: 'ds18b20',
  name: 'Sensor de temperatura DS18B20',
  short: 'DS18B20',
  cat: 'sensor',
  description:
    'Termómetro digital de −55 a 125 °C (±0,5 °C) num só fio de dados (1-Wire). Com a face plana virada para si: GND, DQ, VDD. DQ → pino digital (ex.: 2) com uma resistência de 4,7 kΩ de DQ a 5V (pull-up obrigatório!). Vários sensores podem partilhar o mesmo fio. Bibliotecas OneWire + DallasTemperature: requestTemperatures() demora 750 ms a 12 bits.',
  size: [0.45, 1.1, 0.55],
  pins: rowZ(['GND', 'DQ', 'VDD'], 0, 0, ['gnd', 'io', 'pwr']),
  interactive: { kind: 'slider', label: 'Temperatura', unit: '°C', min: -55, max: 125, step: 0.5, default: 22 },
  lib: {
    header: 'DallasTemperature.h',
    usage: '#include <OneWire.h>\n#include <DallasTemperature.h>\nOneWire fio(2);\nDallasTemperature sensores(&fio);\nsensores.begin();\nsensores.requestTemperatures();\nfloat t = sensores.getTempCByIndex(0);',
  },
  view2d: { view: 'front', z: [-0.4, 0.4], y: [-0.1, 1.2] },
}
