// Parafuso sem-fim (módulo 1, 1 entrada) num cubo: com a coroa faz uma redução enorme numa
// só etapa (1 volta da coroa por N voltas do sem-fim) e é autobloqueante — a coroa não o faz
// rodar, por isso segura a carga com o motor parado (portões, elevadores, braços).
export const WORM = { r: 0.5, len: 2.0, hub: 0.3 } // raio primitivo 5 mm, rosca de 20 mm

export default {
  type: 'wormGear',
  name: 'Parafuso sem-fim (módulo 1)',
  short: 'Sem-fim',
  cat: 'mech',
  description:
    'Parafuso sem-fim de latão com cubo, para o veio de um motor (ou um veio num mancal). Engrena numa coroa (roda do sem-fim) com o eixo perpendicular, à distância de 5 mm + o raio da coroa: cada volta do sem-fim avança 1 dente da coroa (coroa de 40 dentes → redução 40:1). Só transmite do sem-fim para a coroa: com o motor parado a coroa fica travada.',
  size: [1.2, WORM.hub + WORM.len, 1.2],
  pins: [],
  mech: true,
  config: { color: '#c9a227' },
  fields: [{ key: 'color', label: 'Cor', type: 'color' }],
  worm: { r: WORM.r, len: WORM.len, y0: WORM.hub, starts: 1 },
  mass: 9,
  collider: { size: [1.1, WORM.hub + WORM.len, 1.1], pos: [0, (WORM.hub + WORM.len) / 2, 0] },
  mounts: { tip: { pos: [0, WORM.hub + WORM.len, 0], label: 'ponta' } },
}
