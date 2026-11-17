// Barra de 10 LEDs (DIP-20): ânodos A1–A10 de um lado, cátodos K1–K10 do outro.
import { rowX } from '../geometry.js'

const N = 10
const ids = (p) => Array.from({ length: N }, (_, i) => `${p}${i + 1}`)

export default {
  type: 'bargraph',
  name: 'Barra de 10 LEDs',
  short: 'Barra',
  cat: 'output',
  description:
    '10 LEDs independentes num só bloco. Cada ânodo (A1–A10) liga a um pino do Arduino através de 220 Ω; os cátodos (K1–K10) vão todos ao GND. Ótimo para VU-meters e níveis.',
  size: [2.54, 0.8, 1.0],
  pins: [
    ...rowX(ids('A'), -0.381, 0, Array(N).fill('pass')).map((p) => ({ ...p, label: `${p.id} (+)` })),
    ...rowX(ids('K'), 0.381, 0, Array(N).fill('pass')).map((p) => ({ ...p, label: `${p.id} (−)` })),
  ],
  config: { color: 'red' },
  fields: [
    {
      key: 'color',
      label: 'Cor',
      type: 'select',
      options: [['red', 'Vermelho'], ['green', 'Verde'], ['yellow', 'Amarelo'], ['blue', 'Azul'], ['mixed', 'Verde/amarelo/vermelho']],
    },
  ],
  view2d: { view: 'top', x: [-1.32, 1.32], z: [-0.56, 0.56] },
}
