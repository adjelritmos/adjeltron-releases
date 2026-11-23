// Pilha de 9 V (6LR61) com clip e fios.
export function battery9vVoltage(charge) {
  const c = Math.max(0, Math.min(100, charge)) / 100
  return 6.8 + 2.4 * Math.pow(c, 0.8)
}

export default {
  type: 'battery9v',
  name: 'Pilha 9 V',
  short: 'Pilha 9V',
  cat: 'power',
  description:
    'Pilha alcalina de 9 V com clip (fio vermelho +, preto −). Resistência interna alta (~1,5 Ω): serve para o Arduino (+ → VIN, − → GND) ou um pequeno motor, mas a tensão cai bastante com correntes acima de ~0,5 A. Lembre-se do GND comum com o Arduino.',
  size: [7.0, 1.75, 2.65],
  mass: 16.2, // a mesma de antes (caixa de `size` × 0,5 g/cm³): colisores justos não mudam a massa
  // pilha e ficha de pressão (os fios soltos não colidem)
  collider: { size: [5.52, 1.75, 2.66], pos: [0.34, 0.875, 0] },
  pins: [
    { id: '+', label: '+ (vermelho)', pos: [4.0, 0.2, -0.4], kind: 'bat+', conn: 'solder', dir: [1, 0, 0] },
    { id: '-', label: '− (preto)', pos: [4.0, 0.2, 0.4], kind: 'bat-', conn: 'solder', dir: [1, 0, 0] },
  ],
  config: { charge: 90, color: '#f59e0b' },
  fields: [
    { key: 'charge', label: 'Carga', type: 'range', min: 0, max: 100, step: 5, unit: '%' },
    { key: 'color', label: 'Cor da manga', type: 'color' },
  ],
  view2d: { view: 'top', x: [-2.55, 6.45], z: [-1.45, 1.45] },
}
