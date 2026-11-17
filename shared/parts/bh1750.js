// Luxímetro digital BH1750 (módulo GY-302, I2C).
import { rowX } from '../geometry.js'

export default {
  type: 'bh1750',
  name: 'Sensor de luz BH1750 (GY-302, lux)',
  short: 'BH1750',
  cat: 'sensor',
  description:
    'Mede a iluminância diretamente em lux (1–65 535 lx, resposta parecida com a do olho humano), por I2C. VCC → 5V ou 3,3V, GND → GND, SCL → A5, SDA → A4. ADDR solto ou a GND = endereço 0x23; ADDR a VCC = 0x5C (dois sensores no mesmo barramento). Biblioteca BH1750: medidor.begin(); float lux = medidor.readLightLevel(); (cada medição em alta resolução demora ~120 ms). Referências: noite com lua ~1 lx, sala ~300 lx, escritório ~500 lx, dia nublado ~10 000 lx, sol direto ~50 000 lx.',
  size: [1.85, 0.55, 1.4],
  pins: rowX(['VCC', 'GND', 'SCL', 'SDA', 'ADDR'], 0.55, 0.3, ['pwr', 'gnd', 'io', 'io', 'in']),
  config: { addr: 0x23 },
  interactive: { kind: 'slider', label: 'Iluminância', unit: 'lx', min: 0, max: 20000, step: 5, default: 300 },
  lib: {
    header: 'BH1750.h',
    usage: '#include <Wire.h>\n#include <BH1750.h>\nBH1750 medidor;\n// setup(): Wire.begin(); medidor.begin();\nfloat lux = medidor.readLightLevel();',
  },
  view2d: { view: 'top', x: [-0.95, 0.95], z: [-0.72, 0.72] },
}
