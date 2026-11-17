// Junção de fios (velxio-junction): um ponto de solda onde se ligam vários fios.
export default {
  type: 'junction',
  name: 'Junção (nó de fios)',
  short: 'Nó',
  cat: 'proto',
  description:
    'Um ponto de ligação para vários fios — como uma gota de solda numa placa: permite fazer uma "linha" de GND ou de 5 V com derivações, sem passar tudo pela breadboard. Todos os fios ligados ao nó ficam no mesmo ponto elétrico.',
  size: [0.2, 0.1, 0.2],
  pins: [{ id: 'J', label: 'nó', pos: [0, 0, 0], kind: 'pass' }],
  view2d: { view: 'top', x: [-0.13, 0.13], z: [-0.13, 0.13] },
}
