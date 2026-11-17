// Recetor de infravermelho 38 kHz (VS1838B / KY-022) para comandos à distância.
import { rowZ } from '../geometry.js'

export default {
  type: 'irReceiver',
  name: 'Recetor IR 38 kHz (VS1838B)',
  short: 'Recetor IR',
  cat: 'sensor',
  description:
    'Recebe os sinais do comando IR (protocolo NEC, portadora de 38 kHz). DAT → pino digital (ex.: 2), VCC → 5V, GND → GND. A saída está em HIGH em repouso e dá impulsos LOW enquanto chega um sinal. Use a biblioteca IRremote: IrReceiver.begin(2); if (IrReceiver.decode()) { … IrReceiver.decodedIRData.command … IrReceiver.resume(); }. Junte um "Comando IR" ao projeto para carregar nas teclas.',
  size: [2.4, 1.3, 1.5],
  pins: rowZ(['DAT', 'VCC', 'GND'], -1.0, 0.3, ['out', 'pwr', 'gnd']),
  lib: {
    header: 'IRremote.hpp',
    usage:
      '#include <IRremote.hpp>\nIrReceiver.begin(2, ENABLE_LED_FEEDBACK);\n// no loop():\nif (IrReceiver.decode()) {\n  Serial.println(IrReceiver.decodedIRData.command, HEX);\n  IrReceiver.resume();\n}',
  },
  view2d: { view: 'top', x: [-1.2, 1.3], z: [-0.8, 0.8] },
}
