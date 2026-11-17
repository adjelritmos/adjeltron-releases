// Sensor de humidade do solo capacitivo v1.2 (placa preta de 98 × 23 mm, TLC555 + regulador 3,3 V).
import { rowZ } from '../geometry.js'

export default {
  type: 'soilCapacitive',
  name: 'Humidade do solo capacitivo v1.2',
  short: 'Solo cap.',
  cat: 'sensor',
  description:
    'Mede a humidade pela capacidade das pistas (isoladas por verniz: não corrói como o sensor resistivo). GND → GND, VCC → 5V ou 3,3V, AOUT → entrada analógica. A saída é INVERSA: terra seca ≈ 2,8 V (≈ 570 no analogRead), em água ≈ 1,25 V (≈ 260). Calibre os dois extremos e use map(valor, seco, molhado, 0, 100). Só a parte abaixo da linha branca pode ser enterrada — a eletrónica no topo não é à prova de água. Tem regulador próprio: a saída quase não depende do VCC.',
  size: [9.8, 0.6, 2.3],
  pins: rowZ(['GND', 'VCC', 'AOUT'], -4.55, 0.3, ['gnd', 'pwr', 'out']),
  interactive: { kind: 'slider', label: 'Humidade do solo', unit: '%', min: 0, max: 100, step: 1, default: 30 },
  view2d: { view: 'top', x: [-4.95, 4.95], z: [-1.2, 1.2] },
}
