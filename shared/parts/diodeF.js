// Díodos com parâmetros reais (um ficheiro, várias peças): 1N4148 (sinal, rápido), Schottky
// 1N5817/1N5819 (queda baixa) e zeners 1N4728A (3,3 V) / 1N4742A (12 V). O 1N4007 é a peça
// `diode` e o zener de 5,1 V (1N4733A) a peça `zener` (grupo C).
// `dio` = modelo: vf/r (direto), vz/rz/izt (zener: a folha de dados dá Vz à corrente de ensaio izt,
// por isso o joelho do modelo fica em vz − izt·rz), imax (A), ipk (A, pico), vrrm (V), pmax (W), leak (S).
const pins = [
  { id: 'A', label: 'A (ânodo)', pos: [-0.508, 0, 0], kind: 'pass' },
  { id: 'K', label: 'K (cátodo, risco)', pos: [0.508, 0, 0], kind: 'pass' },
]
const base = { cat: 'discrete', size: [1.2, 0.3, 0.3], pins, view2d: { view: 'top', x: [-0.66, 0.66], z: [-0.2, 0.2] } }

export const DIODE_DEFS = [
  {
    ...base,
    type: 'd1n4148',
    name: 'Díodo de sinal 1N4148',
    short: '1N4148',
    description:
      'Díodo pequeno e rápido (4 ns) em vidro: lógica com díodos (portas OU/E), proteção de entradas, matrizes de teclas sem "fantasmas", detetores de pico. ~0,65 V de queda a poucos mA (~1 V a 100 mA). Máx. 200 mA contínuos (1 A de pico) e 100 V ao contrário — NÃO serve como díodo de roda livre de motores grandes (use o 1N4007 ou um Schottky). Cátodo K = risco preto.',
    dio: { vf: 0.62, r: 3.5, imax: 0.3, ipk: 2, vrrm: 100, pmax: 0.5, leak: 0, glass: true, mark: '1N4148' },
  },
  {
    ...base,
    type: 'd1n5817',
    name: 'Díodo Schottky 1N5817',
    short: '1N5817',
    description:
      'Schottky de 1 A / 20 V: só ~0,3 V de queda (metade de um díodo normal) — perde menos tensão e aquece menos em proteções de polaridade e fontes de baixa tensão (ex.: 5 V USB). Comuta muito depressa (bom como roda livre e em conversores). Atenção: deixa passar alguma corrente ao contrário (fuga de µA–mA, cresce com a temperatura) e só aguenta 20 V invertido. Cátodo K = risco cinzento.',
    dio: { vf: 0.3, r: 0.12, imax: 1, ipk: 25, vrrm: 20, pmax: 1.2, leak: 2e-6, mark: '1N5817' },
  },
  {
    ...base,
    type: 'd1n5819',
    name: 'Díodo Schottky 1N5819',
    short: '1N5819',
    description:
      'Schottky de 1 A / 40 V: ~0,33 V de queda a 100 mA e ~0,5 V a 1 A. O mesmo uso do 1N5817 (proteção de polaridade, roda livre, conversores DC-DC) mas aguenta 40 V ao contrário — serve para 12 V/24 V. Fuga inversa de alguns µA. Cátodo K = risco cinzento.',
    dio: { vf: 0.31, r: 0.2, imax: 1, ipk: 25, vrrm: 40, pmax: 1.2, leak: 1e-6, mark: '1N5819' },
  },
  {
    ...base,
    type: 'zener3v3',
    name: 'Díodo Zener 3,3 V (1N4728A)',
    short: 'Zener 3V3',
    description:
      'Zener de 3,3 V / 1 W: ao contrário (cátodo K, risco, no +) prende a tensão em 3,3 V à corrente de ensaio (76 mA). Com uma resistência em série faz uma referência de 3,3 V ou protege uma entrada de 3,3 V (ESP32, Pico) de sinais de 5 V. A tensão de um zener baixo "escorrega" bastante com a corrente (resistência dinâmica ~8–10 Ω): com poucos mA fica só por 2,7–2,9 V. Máx. ~270 mA.',
    dio: { vf: 0.7, r: 0.5, vz: 3.3, rz: 8, izt: 0.076, imax: 0.27, ipk: 1.5, pmax: 1, leak: 0, glass: true, zener: true, mark: '1N4728A' },
  },
  {
    ...base,
    type: 'zener12',
    name: 'Díodo Zener 12 V (1N4742A)',
    short: 'Zener 12V',
    description:
      'Zener de 12 V / 1 W: ao contrário (cátodo K no +) prende a tensão em 12 V. Usos: proteger a porta de um MOSFET (entre G e S) quando é comandada com 24 V, limitar a entrada de um regulador, referência. Com uma resistência em série a partir de uma fonte maior. Máx. ~76 mA.',
    dio: { vf: 0.7, r: 0.5, vz: 12, rz: 9, izt: 0.021, imax: 0.076, ipk: 0.6, pmax: 1, leak: 0, glass: true, zener: true, mark: '1N4742A' },
  },
]

export default DIODE_DEFS
