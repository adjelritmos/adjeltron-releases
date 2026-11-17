// Fotodíodo BPW34-like em encapsulamento de 5 mm (2 pernas, como um LED).
export default {
  type: 'photodiode',
  name: 'Fotodíodo',
  short: 'Fotodíodo',
  cat: 'sensor',
  description:
    'Díodo que gera uma corrente proporcional à luz (~0,07 µA por lux, rápido como nenhum LDR). Use-o ao contrário: K (perna curta, lado plano) → 5V, A → pino analógico E uma resistência de 100 kΩ ao GND — a tensão no pino é corrente × 100 kΩ (≈ 2 V com 300 lux). Sem resistência não se lê nada. Ajuste a luz no painel "Controlos".',
  size: [0.6, 0.9, 0.6],
  pins: [
    { id: 'A', label: 'A (ânodo)', pos: [-0.127, 0, 0], kind: 'pass' },
    { id: 'K', label: 'K (cátodo)', pos: [0.127, 0, 0], kind: 'pass' },
  ],
  interactive: { kind: 'slider', label: 'Luz', unit: 'lux', min: 0, max: 2000, step: 10, default: 300 },
  view2d: { view: 'top', x: [-0.4, 0.4], z: [-0.4, 0.4] },
}
