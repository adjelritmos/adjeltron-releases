// Elástico (correia lisa de borracha) entre polias de plástico, como nos kits de brinquedo.
export default {
  type: 'elastico',
  name: 'Elástico (correia lisa)',
  short: 'Elástico',
  cat: 'mech',
  description:
    'Elástico de borracha que passa por 2 ou mais polias de plástico (escolha-as no painel): as polias rodam juntas no mesmo sentido, com a relação dos diâmetros. As polias têm de ter os eixos paralelos e as golas à mesma altura; o diagnóstico avisa se não estiverem.',
  size: [3, 0.3, 3],
  pins: [],
  mech: true,
  collider: false,
  mass: 1,
  config: { pulleys: [], color: '#f2c94c' },
  belt: { of: ['poliaElastico'] },
  fields: [
    { key: 'pulleys', label: 'Polias do elástico', type: 'parts', of: ['poliaElastico'], min: 2, placeholder: 'Escolha 2 ou mais polias', hint: 'Marque as polias por onde o elástico passa (2 ou mais): ele é desenhado à volta delas e passam a rodar juntas.' },
    { key: 'color', label: 'Cor', type: 'color' },
  ],
}
