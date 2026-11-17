// Sensor de chuva FC-37 / YL-83: placa coletora (54 × 40 mm) + módulo LM393 (AO/DO).
import { analogModuleDef } from './_analogModule.js'

export default {
  ...analogModuleDef({
    type: 'rainSensor',
    name: 'Sensor de chuva FC-37 (placa + módulo)',
    short: 'Chuva',
    description:
      'Placa com pistas entrelaçadas: as gotas de água ligam as pistas e baixam a resistência. O módulo com LM393 dá AO (analógico: seco ≈ VCC → 1023, muito molhado ≈ 1 V → ~200) e DO (LOW quando está a chover mais do que o limiar do trimpot; acende o LED D0). VCC → 5V, GND → GND, AO → A0, DO → pino digital. A placa já vem ligada ao módulo pelos 2 fios. Dica: alimente-o só ao ler (VCC num pino digital) para as pistas não corroerem.',
    order: ['VCC', 'GND', 'DO', 'AO'],
    pinX: -1.45,
    size: [9.6, 1.3, 4.0],
    view2d: { view: 'top', x: [-1.75, 8.0], z: [-2.05, 2.05] },
    interactive: { kind: 'slider', label: 'Chuva (água na placa)', unit: '%', min: 0, max: 100, step: 1, default: 0 },
    threshold: 0.5,
  }),
  cat: 'sensor',
  mass: 24.9, // a mesma de antes (caixa de `size` × 0,5 g/cm³): colisores justos não mudam a massa
  // módulo LM393 e placa coletora (à frente, segundo +x)
  collider: [
    { size: [3.3, 0.9, 1.5], pos: [-0.05, 0.45, 0] },
    { size: [5.4, 0.17, 4.0], pos: [5.2, 0.085, 0] },
  ],
}
