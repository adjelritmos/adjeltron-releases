// Condensador eletrolítico (polarizado), capacidade e tensão máxima configuráveis.
export const CAP_VALUES = [1, 4.7, 10, 22, 47, 100, 220, 470, 1000, 2200, 4700]
export const CAP_VOLTS = [6.3, 10, 16, 25, 35, 50]
// diâmetro do corpo (cm) conforme a capacidade (valores típicos a 16 V)
export const capDiameter = (uF) => (uF <= 47 ? 0.5 : uF <= 220 ? 0.63 : uF <= 470 ? 0.8 : uF <= 1000 ? 1.0 : uF <= 2200 ? 1.25 : 1.6)

export default {
  type: 'capacitor',
  name: 'Condensador eletrolítico',
  short: 'C',
  cat: 'discrete',
  description:
    'Guarda carga: a tensão aos terminais não muda de repente. Tem polaridade — a perna longa (+) para o lado positivo, o risco claro marca o −. Ao contrário ou acima da tensão máxima aquece e rebenta! Com uma resistência faz um atraso RC: carrega até 63 % em τ = R·C (ex.: 10 kΩ × 100 µF = 1 s). Em paralelo com a alimentação de um motor ou servo suaviza as quedas de tensão. Simulação em passos de 1 ms: constantes de tempo a partir de ~10 ms são exatas.',
  size: [1.0, 1.3, 1.0],
  pins: [
    { id: '+', label: '+ (perna longa)', pos: [-0.127, 0, 0], kind: 'pass' },
    { id: '-', label: '− (risco)', pos: [0.127, 0, 0], kind: 'pass' },
  ],
  config: { uF: 100, vmax: 16 },
  fields: [
    { key: 'uF', label: 'Capacidade', type: 'select', options: CAP_VALUES.map((v) => [v, `${String(v).replace('.', ',')} µF`]) },
    { key: 'vmax', label: 'Tensão máxima', type: 'select', options: CAP_VOLTS.map((v) => [v, `${String(v).replace('.', ',')} V`]) },
  ],
  view2d: { view: 'top', x: [-0.85, 0.85], z: [-0.85, 0.85] },
}
