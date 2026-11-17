// LCD gráfico Nokia 5110 (84×48, controlador PCD8544) em placa vermelha de 8 pinos.
import { rowX } from '../geometry.js'

export const PCD_ACT = { x: [-1.6, 1.6], z: [-0.62, 1.21] }
export const PCD_FRAME = { x: [-1.98, 1.98], z: [-1.32, 1.78] }

export default {
  type: 'pcd8544',
  name: 'LCD Nokia 5110 (PCD8544) 84×48',
  short: 'Nokia 5110',
  cat: 'output',
  description:
    'O ecrã dos telemóveis Nokia antigos: 84×48 pontos monocromáticos, gasta < 1 mA (sem a luz). Pinos: RST (reset), CE (seleção = CS), DC (dados/comando), DIN (dados), CLK (relógio), VCC (3,3 V!), BL (luz de fundo: HIGH = acesa, com resistência na placa) e GND. É um módulo de 3,3 V: a 5 V o contraste fica escuro e o controlador aquece — nos pinos de sinal use resistências de 10 kΩ (ou um conversor de nível) a partir do Uno. Biblioteca Adafruit_PCD8544: begin(), setContrast(50…60), desenhar e display().',
  size: [4.36, 0.75, 4.31],
  pins: rowX(['RST', 'CE', 'DC', 'DIN', 'CLK', 'VCC', 'BL', 'GND'], -1.95, 0.3, ['in', 'in', 'in', 'in', 'in', 'pwr', 'in', 'gnd']),
  lib: {
    header: 'Adafruit_PCD8544.h',
    usage: '#include <Adafruit_GFX.h>\n#include <Adafruit_PCD8544.h>\n// software SPI: CLK, DIN, DC, CE, RST\nAdafruit_PCD8544 lcd = Adafruit_PCD8544(7, 6, 5, 4, 3);\nlcd.begin();\nlcd.setContrast(55);\nlcd.clearDisplay();\nlcd.setTextColor(BLACK);\nlcd.print("Ola!");\nlcd.display();',
  },
  view2d: { view: 'top', x: [-2.2, 2.2], z: [-2.18, 2.18] },
}
