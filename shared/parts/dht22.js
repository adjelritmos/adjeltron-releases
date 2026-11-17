// Sensor digital de temperatura e humidade DHT22 (AM2302), protocolo de 1 fio.
import { rowZ } from '../geometry.js'

export default {
  type: 'dht22',
  name: 'Sensor DHT22 (temperatura e humidade)',
  short: 'DHT22',
  cat: 'sensor',
  description:
    'Com a grelha virada para si, da esquerda para a direita: VCC → 5V (ou 3,3V), DATA → pino digital (ex.: D2), NC (não ligar), GND → GND. Comunica por um só fio (protocolo próprio): use a biblioteca DHT. Mede −40…80 °C e 0…100 % HR, mas só uma leitura nova a cada 2 s (ler mais depressa devolve o valor anterior). Recomenda-se uma resistência pull-up de 10 kΩ entre DATA e VCC. Na simulação: a temperatura ajusta-se no painel "Controlos"; a humidade nas propriedades ou nos botões −/+ junto ao sensor no circuito.',
  size: [0.8, 2.9, 1.6],
  pins: rowZ(['GND', 'NC', 'DATA', 'VCC'], 0, 0, ['gnd', 'pass', 'io', 'pwr']),
  config: { humidity: 50 },
  fields: [{ key: 'humidity', label: 'Humidade relativa', type: 'range', min: 0, max: 100, step: 1, unit: '%' }],
  interactive: { kind: 'slider', label: 'Temperatura', unit: '°C', min: -40, max: 80, step: 0.1, default: 22 },
  lib: {
    header: 'DHT.h',
    usage: 'DHT dht(2, DHT22);\n// setup(): dht.begin();\n// loop(): delay(2000);\nfloat t = dht.readTemperature();\nfloat h = dht.readHumidity();\nif (isnan(t) || isnan(h)) Serial.println("Falha na leitura!");',
  },
  view2d: { view: 'front', z: [-0.85, 0.85], y: [-0.1, 2.9] },
}
