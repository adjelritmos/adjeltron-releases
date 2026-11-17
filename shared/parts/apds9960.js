// Sensor de gestos, proximidade e cor APDS-9960 (I2C).
import { rowX } from '../geometry.js'

export default {
  type: 'apds9960',
  name: 'Gestos / proximidade / cor APDS-9960',
  short: 'APDS9960',
  cat: 'sensor',
  description:
    'Deteta gestos (mão a passar para cima/baixo/esquerda/direita a 5–15 cm), proximidade (0–255, maior = mais perto) e cor/luz ambiente (R, G, B, C). Por I2C, endereço 0x39. VCC → 3,3V (o chip não aguenta 5 V; os módulos simples NÃO têm regulador!), GND → GND, SDA → A4, SCL → A5; VL (alimentação do LED IR) fica ligado a VCC pelo jumper; INT é ativa a LOW. Biblioteca Adafruit_APDS9960: apds.begin(); apds.enableProximity(true); apds.readProximity(); apds.enableGesture(true); apds.readGesture() → APDS9960_UP/DOWN/LEFT/RIGHT. Na simulação: proximidade, cor e gesto (1 cima, 2 baixo, 3 esquerda, 4 direita) no painel "Controlos".',
  size: [2.0, 0.55, 1.5],
  pins: rowX(['VL', 'GND', 'VCC', 'SDA', 'SCL', 'INT'], 0.6, 0.3, ['pwr', 'gnd', 'pwr', 'io', 'io', 'out']),
  config: { addr: 0x39, prox: 0, gesture: 0, r: 120, g: 120, b: 120 },
  interactive: {
    kind: 'fields',
    items: [
      { key: 'prox', label: 'Proximidade', min: 0, max: 255, step: 1 },
      { key: 'gesture', label: 'Gesto (0–4)', min: 0, max: 4, step: 1 },
      { key: 'r', label: 'Vermelho', min: 0, max: 255, step: 1 },
      { key: 'g', label: 'Verde', min: 0, max: 255, step: 1 },
      { key: 'b', label: 'Azul', min: 0, max: 255, step: 1 },
    ],
  },
  lib: {
    header: 'Adafruit_APDS9960.h',
    usage: 'Adafruit_APDS9960 apds;\napds.begin();\napds.enableProximity(true);\napds.enableGesture(true);\nuint8_t g = apds.readGesture();\nif (g == APDS9960_UP) Serial.println("cima");',
  },
  view2d: { view: 'top', x: [-1.02, 1.02], z: [-0.78, 0.78] },
}
