// Transístores bipolares com parâmetros reais (um ficheiro, várias peças no catálogo):
// BC547 / BC557 (TO-92, C-B-E), 2N3906 (PNP, TO-92, E-B-C) e 2N3055 (NPN de potência, TO-3).
// O 2N2222 é a peça `npn` (grupo C). `bjt` descreve o modelo usado pelo simulador.
import { PITCH } from '../geometry.js'

const P = PITCH
// TO-92 visto de frente (face plana): pinos da esquerda para a direita em z = +P, 0, −P
const to92 = (ids) => {
  const L = { E: 'E (emissor)', B: 'B (base)', C: 'C (coletor)' }
  return ids.map((id, i) => ({ id, label: L[id], pos: [0, 0, (1 - i) * P], kind: 'pass' }))
}
const TO92_VIEW = { view: 'front', z: [-0.42, 0.42], y: [-0.08, 0.86] }

const NPN_USE = 'Como interruptor do lado de baixo: E → GND, carga entre o + e C, base a um pino do Arduino por uma resistência (Ib ≈ Ic/10 para saturar).'
const PNP_USE = 'É o "espelho" do NPN: a corrente sai do emissor. Interruptor do lado de cima: E → + da alimentação, carga entre C e GND; liga quando a base fica ~0,7 V ABAIXO do emissor (pino a LOW através de uma resistência) e desliga com a base ao nível do emissor. Se a alimentação do emissor for maior que 5 V o pino do Arduino não o consegue desligar — comande a base com um NPN.'

export const BJT_DEFS = [
  {
    type: 'bc547',
    name: 'Transístor NPN BC547',
    short: 'BC547',
    cat: 'discrete',
    description: `NPN de sinal (europeu): ganho alto (hFE 110–800, típico ~300), mas só 100 mA e 0,5 W — ideal para LEDs, relés pequenos com díodo e amplificar sinais. ${NPN_USE} Com 1 kΩ… 4,7 kΩ na base satura com 100 mA. Vista de frente (face plana): C, B, E da esquerda para a direita (diferente do 2N2222!).`,
    size: [0.5, 0.8, 0.42],
    pins: to92(['C', 'B', 'E']),
    bjt: { pol: 'npn', beta: 300, vbe: 0.65, rb: 40, vsat: 0.09, rsat: 1.5, imax: 0.1, pmax: 0.5, theta: 250, tau: 8000, tjmax: 150, pkg: 'TO-92', mark: 'BC547' },
    view2d: TO92_VIEW,
  },
  {
    type: 'bc557',
    name: 'Transístor PNP BC557',
    short: 'BC557',
    cat: 'discrete',
    description: `PNP de sinal, complementar do BC547 (hFE ~300, máx. 100 mA / 0,5 W). ${PNP_USE} Vista de frente: C, B, E.`,
    size: [0.5, 0.8, 0.42],
    pins: to92(['C', 'B', 'E']),
    bjt: { pol: 'pnp', beta: 300, vbe: 0.65, rb: 40, vsat: 0.1, rsat: 1.5, imax: 0.1, pmax: 0.5, theta: 250, tau: 8000, tjmax: 150, pkg: 'TO-92', mark: 'BC557' },
    view2d: TO92_VIEW,
  },
  {
    type: 'pnp2n3906',
    name: 'Transístor PNP 2N3906',
    short: '2N3906',
    cat: 'discrete',
    description: `PNP de uso geral, complementar do 2N2222 (hFE 100–300, máx. 200 mA / 0,625 W). ${PNP_USE} Vista de frente: E, B, C (como o 2N2222).`,
    size: [0.5, 0.8, 0.42],
    pins: to92(['E', 'B', 'C']),
    bjt: { pol: 'pnp', beta: 150, vbe: 0.65, rb: 30, vsat: 0.12, rsat: 1.2, imax: 0.2, pmax: 0.625, theta: 200, tau: 8000, tjmax: 150, pkg: 'TO-92', mark: '2N3906' },
    view2d: TO92_VIEW,
  },
  {
    type: 'pwr2n3055',
    name: 'Transístor NPN de potência 2N3055',
    short: '2N3055',
    cat: 'discrete',
    description:
      'O clássico NPN de potência em caixa metálica TO-3: até 15 A e 115 W — mas só COM dissipador (sem ele ~4 W). O ganho é baixo (hFE 20–70, ~40): para 4 A precisa de ~100 mA na base, mais do que um pino do Arduino dá (40 mA) — use um BC547/2N2222 a comandar a base (par Darlington) ou um MOSFET. Vbe ≈ 0,9–1,5 V e Vce(sat) ≈ 1 V a 4 A (aquece mesmo saturado). A caixa metálica É o coletor (C): isole-a do dissipador com mica. Pinos: B e E (as duas pernas), C (a caixa).',
    size: [3.9, 1.1, 2.6],
    pins: [
      { id: 'B', label: 'B (base)', pos: [-2 * P, 0, P], kind: 'pass' },
      { id: 'E', label: 'E (emissor)', pos: [2 * P, 0, P], kind: 'pass' },
      { id: 'C', label: 'C (coletor = caixa)', pos: [0, 0, -3 * P], kind: 'pass' },
    ],
    config: { heatsink: false },
    fields: [{ key: 'heatsink', label: 'Dissipador', type: 'select', options: [[false, 'sem dissipador (≈ 35 °C/W)'], [true, 'com dissipador (≈ 3 °C/W)']] }],
    bjt: { pol: 'npn', beta: 40, vbe: 0.75, rb: 2.5, vsat: 0.3, rsat: 0.2, imax: 15, pmax: 115, theta: 35, thetaHs: 3, tau: 60000, tjmax: 200, pkg: 'TO-3', mark: '2N3055' },
    view2d: { view: 'top', x: [-2.0, 2.0], z: [-1.32, 1.32] },
  },
]

export default BJT_DEFS
