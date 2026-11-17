// Motor brushless 2205/2207 com hélice de 5" (drone de corrida/freestyle).
export const PROP_R = 6.35 // hélice de 5" (127 mm)
export const PROP_Y = 2.25 // altura da hélice

export default {
  type: 'brushless',
  name: 'Motor brushless 2205 + hélice 5"',
  short: 'Brushless',
  cat: 'motion',
  description:
    'Motor sem escovas de 22 mm (estator 2205/2207) com hélice de 5" (127 mm), ~30 g. Liga-se SÓ a um ESC (fases A, B, C), nunca ao Arduino. A velocidade é ~KV × tensão (2300 KV × 11,1 V ≈ 25 000 rpm sem carga; ~20 000 rpm com a hélice). Com uma LiPo 3S dá até ~6,5 N (≈ 660 g) de impulso, que cresce com o quadrado da rotação, e gasta até ~25 A. Num quadricóptero em X as hélices rodam em sentidos alternados (CW/CCW) para os binários de reação se anularem — é assim que o drone controla o yaw. Se o motor rodar ao contrário da hélice, ela quase não empurra: troque dois dos três fios do ESC. Encaixa nos braços da estrutura do drone.',
  size: [2.8, 2.6, 2.8],
  pins: [
    { id: 'A', label: 'A (fase)', pos: [-1.75, 0.35, -0.4], kind: 'mout' },
    { id: 'B', label: 'B (fase)', pos: [-1.75, 0.35, 0], kind: 'mout' },
    { id: 'C', label: 'C (fase)', pos: [-1.75, 0.35, 0.4], kind: 'mout' },
  ],
  config: { kv: 2300, spin: 'CW' },
  fields: [
    { key: 'kv', label: 'Motor (KV)', type: 'select', options: [[2300, '2205 · 2300 KV (3S/4S)'], [2600, '2207 · 2600 KV (3S)'], [1950, '2207 · 1950 KV (4S)']] },
    { key: 'spin', label: 'Sentido (visto de cima)', type: 'select', options: [['CW', 'CW — horário (hélice CW)'], ['CCW', 'CCW — anti-horário (hélice CCW)']] },
  ],
  mass: 34,
  thrust: { axis: [0, 1, 0], pos: [0, PROP_Y, 0] },
  // motor e cubo/porca da hélice (redondos: não mudam ao rodar)
  collider: [
    { size: [2.8, 1.9, 2.8], pos: [0, 0.95, 0] },
    { size: [1.1, 0.9, 1.1], pos: [0, 2.3, 0] },
    // disco que as pás de 5" varrem (r ≈ 6,5 cm; caixa de lado ≈ 0,85 × diâmetro): não
    // deixam o drone virado entrar no chão nem atravessar paredes (sem massa: a massa é do motor)
    { size: [11, 0.42, 11], pos: [0, 2.25, 0], massless: true },
  ],
  view2d: { view: 'top', x: [-2.05, 1.65], z: [-1.85, 1.85] },
}
