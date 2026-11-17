// Suporte de 4 pilhas AA em série: alcalinas (1,5 V: ~6 V) ou recarregáveis NiMH (1,2 V: ~4,8 V
// nominal, ~5,5 V acabadas de carregar — o que o Otto DIY recomenda para ligar direto aos 5 V).
export const AA_RINT = { alcalinas: 0.4, nimh: 0.15 }
export function aaPackVoltage(charge, pilhas = 'alcalinas') {
  const c = Math.max(0, Math.min(100, charge)) / 100
  return pilhas === 'nimh' ? 4.4 + 1.08 * Math.pow(c, 0.8) : 4.4 + 1.8 * Math.pow(c, 0.8)
}

export default {
  type: 'aaPack',
  name: 'Suporte 4×AA (6 V)',
  short: '4×AA',
  cat: 'power',
  description:
    'Quatro pilhas AA de 1,5 V em série: ~6 V, resistência interna total ~0,4 Ω. Boa para motores pequenos, servos e o motor de passo. Não serve para alimentar o Arduino: 6 V é demais para o pino 5V e pouco para o VIN (o regulador precisa de ≥ 7 V) — use uma pilha de 9 V no VIN, ou escolha pilhas recarregáveis NiMH (4 × 1,2 V ≈ 4,8–5,5 V), que podem ir direto ao 5V. Ligue sempre o − ao GND do Arduino (GND comum).',
  size: [7.6, 1.6, 6.2],
  mass: 37.7, // a mesma de antes (caixa de `size` × 0,5 g/cm³): colisores justos não mudam a massa
  // suporte com as pilhas (os fios soltos não colidem)
  collider: { size: [6.4, 1.6, 6.2], pos: [0, 0.8, 0] },
  pins: [
    { id: '+', label: '+ (vermelho)', pos: [7.0, 0.2, -0.4], kind: 'bat+', conn: 'solder', dir: [1, 0, 0] },
    { id: '-', label: '− (preto)', pos: [7.0, 0.2, 0.4], kind: 'bat-', conn: 'solder', dir: [1, 0, 0] },
  ],
  config: { charge: 90, pilhas: 'alcalinas' },
  fields: [
    { key: 'charge', label: 'Carga', type: 'range', min: 0, max: 100, step: 5, unit: '%' },
    { key: 'pilhas', label: 'Pilhas', type: 'select', options: [['alcalinas', 'Alcalinas (1,5 V: ~6 V)'], ['nimh', 'Recarregáveis NiMH (1,2 V: ~4,8–5,5 V)']] },
  ],
  view2d: { view: 'top', x: [-3.3, 7.3], z: [-3.2, 3.2] },
}
