// MOSFET com parâmetros reais (um ficheiro, várias peças): 2N7000 (N, TO-92), IRF540N (N,
// TO-220, NÃO é de nível lógico), IRF9540 e FQP27P06 (canal P, TO-220). O IRLZ44N (nível
// lógico) é a peça `mosfet` (grupo C). `fet` descreve o modelo usado pelo simulador:
// vth (V, sempre positivo), k (A/V², modelo quadrático), vgsMax, imax (A), theta (°C/W).
import { PITCH } from '../geometry.js'
import { to220View } from './_to220.js'

const P = PITCH
const LBL = { G: 'G (porta)', D: 'D (dreno)', S: 'S (fonte)' }
// vista de frente: pinos da esquerda para a direita em z = +P, 0, −P
const row3 = (ids) => ids.map((id, i) => ({ id, label: `${LBL[id]} · pino ${i + 1}`, pos: [0, 0, (1 - i) * P], kind: 'pass' }))
const HS = [[false, 'sem dissipador (≈ 62 °C/W)'], [true, 'com dissipador (≈ 4 °C/W)']]

const P_USE =
  'Canal P = interruptor do lado de CIMA (high-side): S → + da alimentação, D → carga → GND. Liga quando a porta fica abaixo da fonte (Vgs negativo, ~−10 V para Rds mínimo) e desliga com G ao nível de S. Resistência de 10 kΩ entre G e S (desligado por omissão) e um NPN/2N7000 a puxar G para GND para ligar. Se S estiver a 5 V, um pino do Arduino comanda G diretamente (LOW = ligado); a 12 V NÃO — o pino nunca chega aos 12 V e o MOSFET nunca desliga.'

export const FET_DEFS = [
  {
    type: 'fet2n7000',
    name: 'MOSFET N 2N7000',
    short: '2N7000',
    cat: 'discrete',
    description:
      'MOSFET de sinal (TO-92): comanda pequenas cargas (LEDs, relés com díodo, adaptar níveis 3,3 V ↔ 5 V) com a porta isolada, sem corrente de base. Vth ≈ 2,1 V; com 5 V na porta Rds ≈ 5 Ω (só 1,8 Ω a 10 V) — é "quase" de nível lógico. Máx. 200 mA / 0,4 W e ±20 V na porta. Lado de baixo: S → GND, carga entre o + e D, G ao pino (100 Ω–1 kΩ em série, 100 kΩ de G a S). Vista de frente (face plana): S, G, D.',
    size: [0.5, 0.8, 0.42],
    pins: row3(['S', 'G', 'D']),
    fet: { pol: 'n', vth: 2.1, k: 0.07, vgsMax: 20, imax: 0.2, pmax: 0.4, theta: 312, tau: 8000, tjmax: 150, rdsSpec: '1,8 Ω a 10 V', pkg: 'TO-92', mark: '2N7000' },
    view2d: { view: 'front', z: [-0.42, 0.42], y: [-0.08, 0.86] },
  },
  {
    type: 'irf540',
    name: 'MOSFET N IRF540N (potência)',
    short: 'IRF540N',
    cat: 'discrete',
    description:
      'MOSFET de potência de canal N (100 V, 33 A, 44 mΩ) — mas NÃO é de nível lógico: os 44 mΩ são com 10 V na porta. Com os 5 V de um pino do Arduino (Vth 2–4 V) fica só meio ligado: Rds de décimas de ohm e corrente limitada a poucos amperes, e aquece. Para 5 V use o IRLZ44N (MOSFET N de nível lógico) ou comande a porta com 10–12 V (driver ou NPN + pull-up). Lado de baixo: S → GND, carga entre o + e D. Vista de frente: G, D, S.',
    size: [1.0, 2.0, 0.46],
    pins: row3(['G', 'D', 'S']),
    config: { heatsink: false },
    fields: [{ key: 'heatsink', label: 'Dissipador', type: 'select', options: HS }],
    fet: { pol: 'n', vth: 3.0, k: 3.25, vgsMax: 20, imax: 33, pmax: 130, theta: 62, thetaHs: 4, tau: 40000, tjmax: 175, rdsSpec: '44 mΩ a 10 V', pkg: 'TO-220', mark: 'IRF540N' },
    view2d: to220View,
  },
  {
    type: 'irf9540',
    name: 'MOSFET P IRF9540 (potência)',
    short: 'IRF9540',
    cat: 'discrete',
    description: `MOSFET de potência de canal P (−100 V, −19 A, 0,2 Ω a Vgs = −10 V; Vth −2 a −4 V). ${P_USE} Vista de frente: G, D, S.`,
    size: [1.0, 2.0, 0.46],
    pins: row3(['G', 'D', 'S']),
    config: { heatsink: false },
    fields: [{ key: 'heatsink', label: 'Dissipador', type: 'select', options: HS }],
    fet: { pol: 'p', vth: 3.0, k: 0.714, vgsMax: 20, imax: 19, pmax: 150, theta: 62, thetaHs: 4, tau: 40000, tjmax: 175, rdsSpec: '0,2 Ω a −10 V', pkg: 'TO-220', mark: 'IRF9540' },
    view2d: to220View,
  },
  {
    type: 'fqp27p06',
    name: 'MOSFET P FQP27P06',
    short: 'FQP27P06',
    cat: 'discrete',
    description: `MOSFET de canal P (−60 V, −27 A, 70 mΩ a Vgs = −10 V; Vth −2 a −4 V), muito usado como interruptor do lado de cima e proteção contra polaridade invertida. ${P_USE} Vista de frente: G, D, S.`,
    size: [1.0, 2.0, 0.46],
    pins: row3(['G', 'D', 'S']),
    config: { heatsink: false },
    fields: [{ key: 'heatsink', label: 'Dissipador', type: 'select', options: HS }],
    fet: { pol: 'p', vth: 3.0, k: 2.04, vgsMax: 25, imax: 27, pmax: 120, theta: 62, thetaHs: 4, tau: 40000, tjmax: 175, rdsSpec: '70 mΩ a −10 V', pkg: 'TO-220', mark: 'FQP27P06' },
    view2d: to220View,
  },
]

export default FET_DEFS
