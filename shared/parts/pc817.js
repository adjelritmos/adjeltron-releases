// Optoacoplador PC817 (DIP-4): LED infravermelho + fototransístor isolados.
import { dipPins, dipLength, dipView } from './_dip.js'

export default {
  type: 'pc817',
  name: 'Optoacoplador PC817',
  short: 'PC817',
  cat: 'discrete',
  description:
    'Liga dois circuitos sem ligação elétrica entre eles (só luz infravermelha lá dentro): proteger o Arduino de 12 V/24 V, de relés ou de motores. Lado do LED: A (pino 1, ponto) → pino do Arduino por 330 Ω–1 kΩ, K (2) → GND (~1,2 V, 5–20 mA). Lado do transístor: C (4) ← pull-up para a tensão do outro circuito, E (3) → GND desse circuito: com o LED aceso C vai a ~0,2 V. A corrente no coletor é até ~CTR × corrente do LED (CTR ≈ 100 %, máx. 50 mA).',
  size: [dipLength(4) + 0.08, 0.5, 0.65],
  pins: dipPins([['A', 'in', 'A (ânodo do LED)'], ['K', 'in', 'K (cátodo do LED)'], ['E', 'pass', 'E (emissor)'], ['C', 'pass', 'C (coletor)']]),
  config: { ctr: 1.0 },
  fields: [{ key: 'ctr', label: 'CTR (ganho de corrente)', type: 'select', options: [[0.5, '50 % (classe A)'], [1.0, '100 % (típico)'], [2.0, '200 % (classe C)']] }],
  view2d: { ...dipView(4), x: [-0.36, 0.36] },
}
