// Díodo Zener 5,1 V (1N4733A, 1 W).
export default {
  type: 'zener',
  name: 'Díodo Zener 5,1 V',
  short: 'Zener',
  cat: 'discrete',
  description:
    'Em direto conduz como um díodo normal (0,7 V). Ligado ao contrário (cátodo K, o risco, no +) só conduz acima de 5,1 V e mantém a tensão nesse valor: com uma resistência em série (ex.: 470 Ω a partir de 9 V) faz uma referência de 5,1 V ou protege uma entrada do Arduino. Máx. 1 W (~190 mA).',
  size: [1.2, 0.3, 0.3],
  pins: [
    { id: 'A', label: 'A (ânodo)', pos: [-0.508, 0, 0], kind: 'pass' },
    { id: 'K', label: 'K (cátodo, risco)', pos: [0.508, 0, 0], kind: 'pass' },
  ],
  view2d: { view: 'top', x: [-0.66, 0.66], z: [-0.2, 0.2] },
}
