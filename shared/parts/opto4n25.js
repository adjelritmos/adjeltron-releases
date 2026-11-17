// Optoacoplador 4N25 (DIP-6): LED infravermelho + fototransístor com a base acessível.
import { dipPins, dipLength, dipView } from './_dip.js'

export default {
  type: 'opto4n25',
  name: 'Optoacoplador 4N25',
  short: '4N25',
  cat: 'discrete',
  description:
    'Optoacoplador clássico em DIP-6 (isolamento de 5000 V): o mesmo uso do PC817 — separar o Arduino de circuitos de 12 V/24 V, relés, motores ou da rede — mas com CTR menor (mínimo 20 %, típico ~50 %: com 10 mA no LED o transístor puxa só ~5 mA) e a base do fototransístor no pino 6 (deixe-a solta ou ponha 1 MΩ a E para o tornar menos sensível). Pinos: 1 A (ânodo, ponto), 2 K, 3 sem ligação, 4 E (emissor), 5 C (coletor), 6 B (base). LED: 1,2 V, 10–60 mA com 220–330 Ω; C com pull-up (4,7–10 kΩ) para a tensão do outro circuito, E ao GND desse circuito.',
  size: [dipLength(6), 0.5, 0.65],
  pins: dipPins([['A', 'in', 'A (ânodo do LED)'], ['K', 'in', 'K (cátodo do LED)'], ['NC', 'pass', 'NC (sem ligação)'], ['E', 'pass', 'E (emissor)'], ['C', 'pass', 'C (coletor)'], ['B', 'pass', 'B (base)']]),
  config: { ctr: 0.5 },
  fields: [{ key: 'ctr', label: 'CTR (ganho de corrente)', type: 'select', options: [[0.2, '20 % (mínimo)'], [0.5, '50 % (típico)'], [1.0, '100 %']] }],
  view2d: dipView(6),
}
