// Voltímetro e amperímetro de painel (como os "Voltmeter"/"Ammeter" do Velxio): caixa pequena
// com mostrador de 4 dígitos por cima e dois bornes de 4 mm à frente (+ vermelho, − preto).
//  - voltímetro: 10 MΩ entre os bornes (não perturba o circuito); liga-se EM PARALELO
//  - amperímetro: derivação (shunt) de 50 mΩ; liga-se EM SÉRIE (com fusível de 10 A)
// A leitura é a média dos últimos ~50 ms (como um multímetro: um PWM lê-se pelo valor médio).
const jack = (id, label, z, kind) => ({ id, label, pos: [1.35, 0.6, z], kind, conn: 'female', dir: [1, 0, 0] })

export const MEDIDOR_R = { voltimetro: 10e6, amperimetro: 0.05 }
export const FUSIVEL_A = 10

const base = {
  cat: 'power',
  size: [2.8, 1.5, 2.6],
  view2d: { view: 'top', x: [-1.45, 1.6], z: [-1.35, 1.35] },
}

export const MEDIDOR_DEFS = [
  {
    ...base,
    type: 'voltimetro',
    name: 'Voltímetro (DC, 0–200 V)',
    short: 'Voltímetro',
    description:
      'Mede a tensão entre os bornes + (vermelho) e − (preto), com sinal: ligue-o EM PARALELO com o que quer medir (ex.: + no 5V, − no GND, ou aos terminais de um LED). Tem 10 MΩ de entrada, por isso quase não gasta corrente. Mostra a média dos últimos ~50 ms — um sinal PWM lê-se pelo seu valor médio, como num multímetro verdadeiro.',
    pins: [jack('+', '+ (vermelho)', -0.5, 'in'), jack('-', '− (preto, COM)', 0.5, 'in')],
  },
  {
    ...base,
    type: 'amperimetro',
    name: 'Amperímetro (DC, 0–10 A)',
    short: 'Amperímetro',
    description:
      'Mede a corrente que entra no borne + (vermelho) e sai no − (preto): ligue-o EM SÉRIE, abrindo o circuito (ex.: 5V → + do amperímetro, − do amperímetro → resistência → LED → GND). Por dentro é uma derivação de 50 mΩ. Nunca o ligue diretamente aos terminais de uma fonte (em paralelo): seria um curto-circuito — o fusível de 10 A queima e o amperímetro deixa de conduzir.',
    pins: [jack('+', '+ (vermelho, entra a corrente)', -0.5, 'in'), jack('-', '− (preto, sai a corrente)', 0.5, 'in')],
  },
]
export default MEDIDOR_DEFS
