// Sensor de temperatura e humidade DHT11 (caixa azul, 4 pernas).
import { rowZ } from '../geometry.js'

export default {
  type: 'dht11',
  name: 'Sensor DHT11 (temperatura e humidade)',
  short: 'DHT11',
  cat: 'sensor',
  description:
    'O irmão barato do DHT22: 0–50 °C (±2 °C) e 20–90 % HR (±5 %), só valores inteiros e no máximo uma leitura por segundo. Com a grelha virada para si: VCC → 5V, DATA → pino digital (com pull-up de 10 kΩ a VCC), NC (não ligar), GND → GND. Biblioteca DHT com o tipo DHT11: DHT dht(2, DHT11). Usar DHT22 no código com um DHT11 dá valores sem sentido. Na simulação: temperatura no painel "Controlos"; humidade nos botões −/+ junto ao sensor.',
  size: [0.6, 2.2, 1.25],
  pins: rowZ(['GND', 'NC', 'DATA', 'VCC'], 0, 0, ['gnd', 'pass', 'io', 'pwr']),
  config: { humidity: 55 },
  fields: [{ key: 'humidity', label: 'Humidade relativa', type: 'range', min: 0, max: 100, step: 1, unit: '%' }],
  interactive: { kind: 'slider', label: 'Temperatura', unit: '°C', min: -10, max: 60, step: 1, default: 22 },
  lib: {
    header: 'DHT.h',
    usage: 'DHT dht(2, DHT11);\n// setup(): dht.begin();\n// loop(): delay(1000);\nfloat t = dht.readTemperature();\nfloat h = dht.readHumidity();',
  },
  view2d: { view: 'front', z: [-0.7, 0.7], y: [-0.1, 2.25] },
}
