// Íman do sensor magnético de porta (MC-38): cola-se na folha da porta/janela, em frente ao corpo
// do sensor. Origem no centro da face de trás; o corpo cresce segundo +y.
export default {
  type: 'imanPorta',
  name: 'Íman do sensor de porta',
  short: 'Íman',
  cat: 'casa',
  description: 'A metade sem fios do sensor magnético MC-38: um íman numa caixa de plástico. Cole-o na folha da porta ou da janela (face de dentro), junto à ponta que abre, de forma a ficar a menos de ~2 cm do corpo do sensor quando a folha está fechada.',
  size: [2.2, 0.9, 1.2],
  pins: [],
  mech: true,
  mass: 6,
  collider: { size: [2.2, 0.9, 1.2], pos: [0, 0.45, 0] },
}
