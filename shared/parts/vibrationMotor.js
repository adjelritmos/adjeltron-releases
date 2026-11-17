// Motor de vibração de moeda (10 × 2,7 mm, 3 V): massa excêntrica num motor plano.
export default {
  type: 'vibrationMotor',
  name: 'Motor de vibração (moeda)',
  short: 'Vibração',
  cat: 'motion',
  description:
    'Motor plano de 10 mm com uma massa excêntrica: vibra como um telemóvel. 2,5–3,7 V, ~75 mA (12 000 rpm a 3 V). Não o ligue diretamente a um pino (75 mA > 40 mA e a bobina gera picos): use um transístor 2N2222 (1 kΩ na base), um díodo 1N4007 em paralelo e 3,3 V — ou 5 V com uma resistência de ~22 Ω em série. Com PWM no transístor controla a intensidade.',
  size: [1.0, 0.3, 1.0],
  pins: [
    { id: '+', label: '+ (fio vermelho)', pos: [-1.3, 0, -0.127], kind: 'motor', conn: 'solder', dir: [-1, 0, 0] },
    { id: '-', label: '− (fio azul)', pos: [-1.3, 0, 0.127], kind: 'motor', conn: 'solder', dir: [-1, 0, 0] },
  ],
  view2d: { view: 'top', x: [-1.4, 0.6], z: [-0.6, 0.6] },
}
