// Sensor de cor RGB TCS34725 (I2C, com LED branco e filtro de IV).
import { rowX } from '../geometry.js'

export default {
  type: 'tcs34725',
  name: 'Sensor de cor TCS34725 (I2C)',
  short: 'TCS34725',
  cat: 'sensor',
  description:
    'Sensor de cor digital com 4 canais (R, G, B e C = luz total) e filtro de infravermelho, por I2C (endereço fixo 0x29). VIN → 5V (tem regulador), GND → GND, SDA → A4, SCL → A5. LED: LED branco de iluminação (ligado por omissão; a GND apaga-o). Biblioteca Adafruit_TCS34725: tcs.begin(); tcs.getRawData(&r, &g, &b, &c) (contagens de 16 bits que dependem do tempo de integração e do ganho); tcs.getRGB(&r, &g, &b) (0–255); calculateColorTemperature() e calculateLux(). Na simulação a cor do objeto ajusta-se no painel "Controlos".',
  size: [2.0, 0.6, 2.0],
  pins: rowX(['LED', 'INT', 'SDA', 'SCL', '3V3', 'GND', 'VIN'], 0.8, 0.3, ['in', 'out', 'io', 'io', 'pwr', 'gnd', 'pwr']),
  config: { addr: 0x29, r: 40, g: 160, b: 60 },
  interactive: {
    kind: 'fields',
    items: [
      { key: 'r', label: 'Vermelho', min: 0, max: 255, step: 1 },
      { key: 'g', label: 'Verde', min: 0, max: 255, step: 1 },
      { key: 'b', label: 'Azul', min: 0, max: 255, step: 1 },
    ],
  },
  lib: {
    header: 'Adafruit_TCS34725.h',
    usage: 'Adafruit_TCS34725 tcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X);\ntcs.begin();\nuint16_t r, g, b, c;\ntcs.getRawData(&r, &g, &b, &c);\nfloat fr, fg, fb;\ntcs.getRGB(&fr, &fg, &fb);',
  },
  view2d: { view: 'top', x: [-1.02, 1.02], z: [-1.02, 1.02] },
}
