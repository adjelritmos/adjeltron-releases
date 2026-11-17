// Caixa para 4 pilhas AA em 2 camadas (2 × 2, "4 AA Battery Case with lead"): 4 pilhas em série
// (6 V), com fios vermelho (+) e preto (−). Eletricamente igual ao suporte plano aaPack; ocupa
// menos área (≈ 3,2 × 3,1 × 5,8 cm), boa para robôs pequenos.
import aaPack from './aaPack.js'

export const AAB = { L: 5.8, W: 3.2, H: 3.1 } // comprimento (x), largura (z), altura (y)

export default {
  ...aaPack,
  type: 'aaBox4',
  name: 'Caixa 4×AA em 2 camadas (6 V)',
  short: '4×AA 2×2',
  description:
    'Caixa preta para quatro pilhas AA arrumadas em 2 × 2 (duas em cima, duas em baixo), ligadas em série: ~6 V, resistência interna total ~0,4 Ω, com fios vermelho (+) e preto (−). Mais compacta do que o suporte plano. Boa para motores pequenos e servos (6 V é o máximo do SG90/MG90S). Com pilhas alcalinas, o Arduino precisa do VIN de uma placa com regulador (7–12 V); com pilhas recarregáveis NiMH (4 × 1,2 V ≈ 4,8–5,5 V, como no Otto DIY) liga-se direto ao 5V. Ligue sempre o − ao GND comum.',
  size: [AAB.L + 2.2, AAB.H, AAB.W],
  mass: 112, // 4 pilhas alcalinas (~23 g cada) + caixa
  collider: { size: [AAB.L, AAB.H, AAB.W], pos: [0, AAB.H / 2, 0] },
  pins: [
    { id: '+', label: '+ (vermelho)', pos: [AAB.L / 2 + 2.0, 0.2, -0.3], kind: 'bat+', conn: 'solder', dir: [1, 0, 0] },
    { id: '-', label: '− (preto)', pos: [AAB.L / 2 + 2.0, 0.2, 0.3], kind: 'bat-', conn: 'solder', dir: [1, 0, 0] },
  ],
  view2d: { view: 'top', x: [-3.1, AAB.L / 2 + 2.3], z: [-1.8, 1.8] },
}
