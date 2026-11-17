// Solenoide de impulsão/tração JF-0530B (5 V, ~0,6 A): núcleo de ferro que é puxado para
// dentro da bobina quando há corrente, e volta com a mola quando se corta.
export default {
  type: 'solenoid',
  name: 'Solenoide 5 V (JF-0530B)',
  short: 'Solenoide',
  cat: 'motion',
  description:
    'Eletroíman com núcleo móvel: com 5 V nos fios (+ e −) o êmbolo recolhe ~10 mm com força (~5 N); sem corrente a mola empurra-o para fora. Pede ~0,6 A (bobina de ~8 Ω) — nunca o ligue a um pino do Arduino: use um MOSFET (IRLZ44N) ou um relé e uma fonte capaz. É uma bobina: ponha SEMPRE um díodo 1N4007 em paralelo (cátodo no +) para o pico de tensão ao desligar não queimar o transístor. Não o deixe ligado muito tempo seguido (aquece).',
  size: [3.0, 1.6, 1.3],
  pins: [
    { id: '+', label: '+ (fio vermelho)', pos: [-2.0, 0.3, -0.127], kind: 'motor', conn: 'solder', dir: [-1, 0, 0] },
    { id: '-', label: '− (fio preto)', pos: [-2.0, 0.3, 0.127], kind: 'motor', conn: 'solder', dir: [-1, 0, 0] },
  ],
  view2d: { view: 'top', x: [-2.1, 2.3], z: [-0.8, 0.8] },
}
