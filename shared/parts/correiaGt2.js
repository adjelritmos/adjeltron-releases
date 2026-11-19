// Correia GT2 fechada (6 mm, passo 2 mm) como peça própria: o utilizador escolhe as polias GT2
// à volta das quais passa (config.pulleys = ids). A correia desenha-se à volta delas (dentes
// por dentro), o comprimento calcula-se (shared/parts/_belt.js) e a transmissão do backend
// (backend/sim/mech.js) liga as polias: ω2 = ω1·z1/z2, mesmo sentido.
// As polias escolhidas aqui deixam de usar a "letra de correia" (config.belt) — o mecanismo
// antigo continua para as outras polias (projetos antigos).
// A peça em si não tem colisor de montagem: a correia desenhada tem um corpo próprio na física do
// browser (def.conveyor, frontend/src/components/three/physics/beltSurface.js) — o que se pousa
// em cima dela é arrastado à velocidade da correia (tapete/esteira). Largura, face (dentada ou
// lisa) e deslocamento ao longo do eixo vêm da config (beltDims). Sem polias aparece enrolada no
// sítio onde foi posta.

// largura e deslocamento em cm, face dentada?
export const beltDims = (c = {}) => ({ w: Math.max(0.3, (+c.width || 6) / 10), dy: (+c.offset || 0) / 10, toothed: (c.face ?? 'dentada') !== 'lisa' })

export default {
  type: 'correiaGt2',
  name: 'Correia GT2 fechada / tapete',
  short: 'Correia GT2',
  cat: 'mech',
  description:
    'Correia de borracha fechada em anel: dentada GT2 (passo 2 mm, 6 mm de largura, como nas impressoras 3D) ou lisa e larga, como o tapete de uma esteira transportadora. A largura vai de 6 mm a 30 cm e pode-se deslocar ao longo do eixo das polias. O que se pousar em cima dela (cubos, blocos, peças soltas) é arrastado à velocidade da correia. Escolha no painel as polias GT2 por onde passa (2 ou mais): a correia é desenhada à volta delas, o comprimento necessário é calculado e as polias passam a rodar juntas no mesmo sentido, com relação de velocidades z1/z2. As polias têm de ter os eixos paralelos e estar no mesmo plano (correia à mesma altura); o diagnóstico avisa se não estiverem. Uma polia pode estar num motor TT, num motor com encoder, num NEMA 17, num mancal…',
  size: [3, 0.6, 3],
  pins: [],
  mech: true,
  // a peça não tem colisor de montagem; a correia tem um corpo próprio (conveyor)
  collider: false,
  conveyor: true,
  mass: 3,
  config: { pulleys: [], width: 6, face: 'dentada', offset: 0 },
  belt: { of: ['gt2Pulley'] },
  fields: [{ key: 'pulleys', label: 'Polias da correia', type: 'parts', of: ['gt2Pulley'], min: 2, placeholder: 'Escolha 2 ou mais polias GT2', hint: 'Marque as polias GT2 por onde a correia passa (2 ou mais): ela é desenhada à volta delas e passam a rodar juntas.' },
    { key: 'width', label: 'Largura', type: 'range', min: 6, max: 300, step: 1, unit: 'mm' },
    { key: 'face', label: 'Face', type: 'select', options: [['dentada', 'Dentada (GT2)'], ['lisa', 'Lisa (tapete de esteira)']] },
    { key: 'offset', label: 'Deslocamento ao longo do eixo', type: 'range', min: -150, max: 150, step: 1, unit: 'mm', hint: 'Move a correia ao longo dos veios das polias (para uma correia larga ficar entre dois apoios, por exemplo).' },
  ],
}
