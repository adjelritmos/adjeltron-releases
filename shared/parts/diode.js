// Díodo retificador 1N4007 (1 A / 1000 V).
export default {
  type: 'diode',
  name: 'Díodo 1N4007',
  short: 'D',
  cat: 'discrete',
  description:
    'Só deixa passar corrente do ânodo (A) para o cátodo (K, lado do risco prateado), com ~0,7 V de queda. Usos: proteção contra pilhas ao contrário e díodo de roda livre ("flyback") em paralelo com motores e bobinas — cátodo no +, ânodo no lado do transístor — para absorver o pico de tensão ao desligar. Máx. 1 A.',
  size: [1.2, 0.3, 0.3],
  pins: [
    { id: 'A', label: 'A (ânodo)', pos: [-0.508, 0, 0], kind: 'pass' },
    { id: 'K', label: 'K (cátodo, risco)', pos: [0.508, 0, 0], kind: 'pass' },
  ],
  view2d: { view: 'top', x: [-0.66, 0.66], z: [-0.2, 0.2] },
}
