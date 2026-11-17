// Buzzer passivo (piezo sem oscilador): só soa com uma onda (tone()).
export default {
  type: 'buzzerPassive',
  name: 'Buzzer passivo',
  short: 'Piezo',
  cat: 'output',
  description:
    'Não tem oscilador: com 5 V constantes só dá um estalido. Ligue + a um pino do Arduino e − ao GND e use tone(pino, frequência) para tocar notas — ex.: tone(8, 440) é um lá — e noTone(pino) para calar.',
  size: [1.2, 0.9, 1.2],
  pins: [
    { id: '+', pos: [-0.381, 0, 0], kind: 'pass' },
    { id: '-', label: '−', pos: [0.381, 0, 0], kind: 'pass' },
  ],
  view2d: { view: 'top', x: [-0.66, 0.66], z: [-0.66, 0.66] },
}
