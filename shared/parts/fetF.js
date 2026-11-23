// MOSFET com parâmetros reais (um ficheiro, várias peças): 2N7000 (N, TO-92), IRF540N, IRF3205,
// IRFZ44N, IRF520N (N, TO-220, NÃO são de nível lógico), IRL540N e IRLB8721 (N, nível lógico),
// IRF9540, FQP27P06 e IRF4905 (canal P, TO-220). O IRLZ44N (nível
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

// MOSFET TO-220 genérico (G, D, S), com ou sem dissipador
const to220 = (type, name, short, description, fet) => ({
  type,
  name,
  short,
  cat: 'discrete',
  description,
  size: [1.0, 2.0, 0.46],
  pins: row3(['G', 'D', 'S']),
  config: { heatsink: false },
  fields: [{ key: 'heatsink', label: 'Dissipador', type: 'select', options: HS }],
  fet: { theta: 62, thetaHs: 4, tau: 40000, tjmax: 175, pkg: 'TO-220', mark: short, ...fet },
  view2d: to220View,
})

export const FET_DEFS = [
  {
    type: 'fet2n7000',
    name: 'MOSFET N 2N7000',
    short: '2N7000',
    cat: 'discrete',
    description:
      'MOSFET de sinal (TO-92): comanda pequenas cargas (LEDs, relés com díodo, adaptar níveis 3,3 V ↔ 5 V) com a porta isolada, sem corrente de base. Vth ≈ 2,1 V; com 5 V na porta Rds ≈ 2,5 Ω (~1 Ω a 10 V; máx. da folha de dados 5 Ω) — é "quase" de nível lógico. Máx. 200 mA / 0,4 W e ±20 V na porta. Lado de baixo: S → GND, carga entre o + e D, G ao pino (100 Ω–1 kΩ em série, 100 kΩ de G a S). Vista de frente (face plana): S, G, D.',
    size: [0.5, 0.8, 0.42],
    pins: row3(['S', 'G', 'D']),
    fet: { pol: 'n', vth: 2.1, k: 0.14, vgsMax: 20, imax: 0.2, pmax: 0.4, theta: 312, tau: 8000, tjmax: 150, rdsSpec: '~1 Ω a 10 V', pkg: 'TO-92', mark: '2N7000' },
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
    fet: { pol: 'n', vth: 3.0, k: 3.4, vgsMax: 20, imax: 33, pmax: 130, theta: 62, thetaHs: 4, tau: 40000, tjmax: 175, rdsSpec: '44 mΩ a 10 V', pkg: 'TO-220', mark: 'IRF540N' },
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
    fet: { pol: 'p', vth: 3.0, k: 0.7215, vgsMax: 20, imax: 19, pmax: 150, theta: 62, thetaHs: 4, tau: 40000, tjmax: 175, rdsSpec: '0,2 Ω a −10 V', pkg: 'TO-220', mark: 'IRF9540' },
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
    fet: { pol: 'p', vth: 3.0, k: 2.1, vgsMax: 25, imax: 27, pmax: 120, theta: 62, thetaHs: 4, tau: 40000, tjmax: 175, rdsSpec: '70 mΩ a −10 V', pkg: 'TO-220', mark: 'FQP27P06' },
    view2d: to220View,
  },
  // variantes TO-220 (Infineon/IR). k = 1 / (Rds · (Vgs − Vth)) no ponto da folha de dados
  to220('irf3205', 'MOSFET N IRF3205 (potência)', 'IRF3205',
    'MOSFET de potência de canal N muito usado em controladores de motores, inversores e ESC (55 V, 110 A, 8 mΩ a Vgs = 10 V). NÃO é de nível lógico (Vth 2–4 V): com os 5 V de um pino do Arduino fica só parcialmente ligado e aquece com correntes altas — comande a porta com 10–12 V (driver de porta ou NPN + pull-up) ou use o IRLB8721 / IRLZ44N. Lado de baixo: S → GND, carga entre o + e D, díodo em paralelo com cargas indutivas. Vista de frente: G, D, S.',
    { pol: 'n', vth: 3.0, k: 23.8, vgsMax: 20, imax: 110, pmax: 200, rdsSpec: '8 mΩ a 10 V' }),
  to220('irfz44n', 'MOSFET N IRFZ44N (potência)', 'IRFZ44N',
    'MOSFET de potência de canal N (55 V, 49 A, 17,5 mΩ a Vgs = 10 V). É o "primo" do IRLZ44N mas NÃO é de nível lógico (Vth 2–4 V): com 5 V na porta conduz mal e aquece. Comande a porta com 10–12 V ou use o IRLZ44N. Lado de baixo: S → GND, carga entre o + e D. Vista de frente: G, D, S.',
    { pol: 'n', vth: 3.0, k: 9.22, vgsMax: 20, imax: 49, pmax: 94, rdsSpec: '17,5 mΩ a 10 V' }),
  to220('irf520n', 'MOSFET N IRF520N', 'IRF520N',
    'MOSFET de canal N (100 V, 9,7 A, 0,2 Ω a Vgs = 10 V), o dos módulos "IRF520 MOSFET driver". NÃO é de nível lógico (Vth 2–4 V): com 5 V na porta só deixa passar poucas centenas de mA — serve para LEDs e pequenos motores, para correntes altas comande a porta com 10 V ou use um MOSFET de nível lógico. Lado de baixo: S → GND, carga entre o + e D. Vista de frente: G, D, S.',
    { pol: 'n', vth: 3.0, k: 0.7215, vgsMax: 20, imax: 9.7, pmax: 48, rdsSpec: '0,2 Ω a 10 V' }),
  to220('irl540n', 'MOSFET N IRL540N (nível lógico)', 'IRL540N',
    'MOSFET de potência de canal N DE NÍVEL LÓGICO (100 V, 36 A; 53 mΩ a Vgs = 5 V, Vth 1–2 V): liga bem diretamente com um pino de 5 V do Arduino. Bom para cargas de 24–48 V. Porta: máx. ±16 V. Lado de baixo: S → GND, carga entre o + e D, G ao pino com 100–220 Ω em série e 10–100 kΩ de G a S. Vista de frente: G, D, S.',
    { pol: 'n', vth: 1.5, k: 5.6, vgsMax: 16, imax: 36, pmax: 140, rdsSpec: '53 mΩ a 5 V' }),
  to220('irlb8721', 'MOSFET N IRLB8721 (nível lógico)', 'IRLB8721',
    'MOSFET de canal N DE NÍVEL LÓGICO (30 V, 62 A; 16 mΩ a Vgs = 4,5 V, 8,7 mΩ a 10 V; Vth 1,35–2,35 V): liga totalmente com 5 V e até com 3,3 V (ESP32/Pico) a correntes moderadas. Ótimo para fitas LED de 12 V e motores. Máx. 30 V entre D e S. Lado de baixo: S → GND, carga entre o + e D. Vista de frente: G, D, S.',
    { pol: 'n', vth: 1.8, k: 26.5, vgsMax: 20, imax: 62, pmax: 65, rdsSpec: '16 mΩ a 4,5 V' }),
  to220('irf4905', 'MOSFET P IRF4905 (potência)', 'IRF4905',
    `MOSFET de potência de canal P (−55 V, −74 A, 20 mΩ a Vgs = −10 V; Vth −2 a −4 V) — o "IRF3205 de canal P", para interruptores de cima com correntes altas. ${P_USE} Vista de frente: G, D, S.`,
    { pol: 'p', vth: 3.0, k: 7.94, vgsMax: 20, imax: 74, pmax: 200, rdsSpec: '20 mΩ a −10 V' }),
]

export default FET_DEFS
