// Raspberry Pi 4 com dissipador preto — só aspeto (o simulador corre Arduino, ESP32 e Pico, não
// Linux). Origem no centro da face de baixo da placa; conectores USB/Ethernet para +x e o
// conector GPIO de 40 pinos ao longo da borda −z. Por cima do GPIO encaixa um "HAT".
export const RPI = { L: 8.5, W: 5.6, pcb: 0.16, standoff: 0.3, hatY: 1.75 }

export default {
  type: 'raspberryPi',
  name: 'Raspberry Pi 4 (decorativo)',
  short: 'Raspberry Pi',
  cat: 'robot',
  description:
    'Raspberry Pi 4 Modelo B com dissipador de alumínio preto, como nos cães robô comerciais (PiDog). Aqui é DECORATIVO: o simulador corre programas de Arduino, ESP32 e Pico (C/C++), não Linux nem Python, por isso não tem pinos para ligar. Para um cão programável ponha o "cérebro" real — um Arduino Uno/Mega ou um ESP32 — dentro do chassi e use o Pi pelo aspeto e pelo peso (~60 g). O ponto "HAT" fica por cima do conector de 40 pinos: encaixe aí o driver de servos PCA9685 (faz de "Robot HAT").',
  size: [RPI.L, 2.3, RPI.W],
  pins: [],
  mech: true,
  mass: 62,
  collider: { size: [RPI.L, 1.7, RPI.W], pos: [0, 0.85, 0] },
  mounts: {
    hat: { pos: [-0.9, RPI.hatY, -1.2], plane: true, label: 'HAT (por cima do GPIO de 40 pinos)' },
  },
}
