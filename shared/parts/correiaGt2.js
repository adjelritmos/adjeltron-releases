// Correia GT2 fechada (6 mm, passo 2 mm) como peça própria: o utilizador escolhe as polias GT2
// à volta das quais passa (config.pulleys = ids). A correia desenha-se à volta delas (dentes
// por dentro), o comprimento calcula-se (shared/parts/_belt.js) e a transmissão do backend
// (backend/sim/mech.js) liga as polias: ω2 = ω1·z1/z2, mesmo sentido.
// As polias escolhidas aqui deixam de usar a "letra de correia" (config.belt) — o mecanismo
// antigo continua para as outras polias (projetos antigos).
// A peça em si não tem física (só a correia desenhada): sem polias aparece enrolada no sítio onde
// foi posta.
export default {
  type: 'correiaGt2',
  name: 'Correia GT2 fechada (6 mm)',
  short: 'Correia GT2',
  cat: 'mech',
  description:
    'Correia dentada de borracha GT2 (6 mm de largura, passo 2 mm), fechada em anel, como nas impressoras 3D. Escolha no painel as polias GT2 por onde passa (2 ou mais): a correia é desenhada à volta delas, o comprimento necessário é calculado e as polias passam a rodar juntas no mesmo sentido, com relação de velocidades z1/z2. As polias têm de ter os eixos paralelos e estar no mesmo plano (correia à mesma altura); o diagnóstico avisa se não estiverem. Uma polia pode estar num motor TT, num motor com encoder, num NEMA 17, num mancal…',
  size: [3, 0.6, 3],
  pins: [],
  mech: true,
  // peça "virtual": não entra na física nem empurra nada (a correia não tem colisor)
  collider: false,
  mass: 3,
  config: { pulleys: [] },
  belt: { of: ['gt2Pulley'] },
  fields: [{ key: 'pulleys', label: 'Polias da correia', type: 'parts', of: ['gt2Pulley'], min: 2, placeholder: 'Escolha 2 ou mais polias GT2', hint: 'Marque as polias GT2 por onde a correia passa (2 ou mais): ela é desenhada à volta delas e passam a rodar juntas.' }],
}
