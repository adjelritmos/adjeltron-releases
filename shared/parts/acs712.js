// Sensor de corrente por efeito Hall ACS712 (módulo com borne de 2 vias para o circuito medido).
import { rowZ } from '../geometry.js'

export const ACS_SENS = { '5A': 0.185, '20A': 0.1, '30A': 0.066 } // V por ampere
export const ACS_MAX = { '5A': 5, '20A': 20, '30A': 30 }

export default {
  type: 'acs712',
  name: 'Sensor de corrente ACS712',
  short: 'ACS712',
  cat: 'sensor',
  description:
    'Mede corrente contínua ou alternada sem contacto elétrico com o circuito medido (efeito Hall, isolamento de 2,1 kV). O borne de 2 vias (IP+ e IP−) fica EM SÉRIE com a carga: a corrente entra por IP+ e sai por IP−. Lado do Arduino: VCC → 5V, GND → GND, OUT → A0. OUT = 2,5 V sem corrente (≈ 512) e sobe/desce conforme o sentido: 185 mV/A (versão 5 A), 100 mV/A (20 A) ou 66 mV/A (30 A). Corrente (A) = (leitura × 5,0 / 1023 − 2,5) / sensibilidade. Faça a média de várias leituras: o sinal tem ruído (~20 mV).',
  size: [3.1, 1.2, 1.35],
  pins: [
    ...rowZ(['VCC', 'OUT', 'GND'], -1.3, 0.3, ['pwr', 'out', 'gnd']),
    { id: 'IP+', label: 'IP+ (entrada da corrente)', pos: [1.38, 0.75, -0.25], kind: 'pass', conn: 'screw', dir: [1, 0, 0] },
    { id: 'IP-', label: 'IP− (saída da corrente)', pos: [1.38, 0.75, 0.25], kind: 'pass', conn: 'screw', dir: [1, 0, 0] },
  ],
  config: { range: '5A' },
  fields: [{ key: 'range', label: 'Versão', type: 'select', options: [['5A', '±5 A (185 mV/A)'], ['20A', '±20 A (100 mV/A)'], ['30A', '±30 A (66 mV/A)']] }],
  view2d: { view: 'top', x: [-1.55, 1.6], z: [-0.7, 0.7] },
}
