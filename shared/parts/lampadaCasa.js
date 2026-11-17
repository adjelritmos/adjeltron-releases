// Candeeiro/lâmpada da maquete: carga resistiva de 2 terminais (sem polaridade) que acende com
// o brilho proporcional à potência (P/Pnominal). Origem no centro da base (rosácea), que se prende
// no teto (por baixo de uma laje), numa parede (face interior/exterior) ou em cima de um móvel;
// o candeeiro cresce segundo +y (pendurado: para baixo).
export const LAMP_TIPOS = { 5: { v: 5, w: 1, name: '5 V · 1 W (LED)' }, 12: { v: 12, w: 3, name: '12 V · 3 W (LED)' }, 6: { v: 6, w: 1.8, name: '6 V · 0,3 A (incandescente)' } }
export const lampTipo = (c = {}) => LAMP_TIPOS[c.tipo] || LAMP_TIPOS[5]
export const LUZ = { quente: '#ffc477', neutra: '#fff1d6', fria: '#e4f0ff' }

export default {
  type: 'lampadaCasa',
  name: 'Candeeiro / lâmpada (casa)',
  short: 'Lâmpada',
  cat: 'casa',
  description:
    'Iluminação da maquete: candeeiro pendente com abajur, plafon de teto, aplique de parede ou lâmpada com casquilho. É uma carga resistiva com dois bornes (sem polaridade): 5 V · 1 W pede 200 mA, mais do que um pino do Arduino dá (40 mA) — ligue-a por um relé (COM ao 5V, NO à lâmpada, o outro borne ao GND) ou por um transístor/MOSFET (com PWM regula o brilho). O brilho segue a potência: com metade da tensão dá ~¼ da luz. Acima de 1,5× a tensão nominal funde. Prenda a base por baixo de uma laje (teto), numa face de uma parede ou em cima de um móvel.',
  size: [4.4, 7, 4.4],
  pins: [
    { id: '1', label: 'Borne 1', pos: [-1.15, 0.25, -0.35], kind: 'pass', conn: 'screw', dir: [-1, 0, 0] },
    { id: '2', label: 'Borne 2', pos: [-1.15, 0.25, 0.35], kind: 'pass', conn: 'screw', dir: [-1, 0, 0] },
  ],
  config: { estilo: 'pendente', tipo: '5', luz: 'quente', fio: 4, abajur: '#2e3a40' },
  fields: [
    { key: 'estilo', label: 'Modelo', type: 'select', options: [['pendente', 'Candeeiro pendente (abajur)'], ['plafon', 'Plafon de teto'], ['aplique', 'Aplique de parede'], ['lampada', 'Lâmpada com casquilho']] },
    { key: 'tipo', label: 'Lâmpada', type: 'select', options: Object.entries(LAMP_TIPOS).map(([k, t]) => [k, t.name]) },
    { key: 'luz', label: 'Cor da luz', type: 'select', options: [['quente', 'Branco quente (2700 K)'], ['neutra', 'Branco neutro (4000 K)'], ['fria', 'Branco frio (6500 K)']] },
    { key: 'fio', label: 'Comprimento do fio (pendente)', type: 'range', min: 0.5, max: 15, step: 0.5, unit: 'cm' },
    { key: 'abajur', label: 'Cor do abajur', type: 'color' },
  ],
  mass: 25,
  // rosácea + o candeeiro de cada modelo (o fio do pendente não colide); peças redondas com
  // caixas de lado ≈ 0,85 × diâmetro (nem sobram cantos no ar nem fica muito de fora)
  collider: (c) => {
    const base = { size: [2.4, 0.5, 2.4], pos: [0, 0.25, 0] }
    const estilo = c.estilo || 'pendente'
    if (estilo === 'plafon') return [base, { size: [3.4, 1.0, 3.4], pos: [0, 1.0, 0] }]
    if (estilo === 'aplique') return [base, { size: [0.24, 1.4, 0.24], pos: [0, 1.2, 0] }, { size: [1.7, 1.7, 1.8], pos: [0, 2.1, 1.1] }]
    if (estilo === 'lampada') return [base, { size: [0.84, 1.75, 0.84], pos: [0, 1.375, 0] }, { size: [1.1, 1.24, 1.1], pos: [0, 2.65, 0] }]
    // pendente: casquilho e abajur (tronco de cone de r 0,45 → 2,3 em 2 cm)
    const y0 = 0.5 + Math.max(0.5, +(c.fio ?? 4))
    return [base, { size: [0.64, 0.7, 0.64], pos: [0, y0 + 0.35, 0] }, { size: [2.4, 1.0, 2.4], pos: [0, y0 + 0.7, 0] }, { size: [3.9, 1.0, 3.9], pos: [0, y0 + 1.7, 0] }]
  },
  view2d: { view: 'top', x: [-1.45, 1.25], z: [-1.25, 1.25] },
}
