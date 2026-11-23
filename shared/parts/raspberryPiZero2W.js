// Raspberry Pi Zero 2 W — só aspeto (o simulador corre Arduino, ESP32 e Pico, não Linux). Placa de
// 65 × 30 mm com 4 furos de 2,75 mm a 58 × 23 mm; GPIO de 40 pinos (furos, ou com a barra soldada)
// ao longo da borda −z. Origem no centro da face de baixo da PCB. Por cima do GPIO encaixa um "HAT".
export const RPIZ = { L: 6.5, W: 3.0, pcb: 0.1, hatY: 1.15 }

export default {
  type: 'raspberryPiZero2W',
  name: 'Raspberry Pi Zero 2 W (decorativo)',
  short: 'Pi Zero 2 W',
  cat: 'robot',
  description:
    'Raspberry Pi Zero 2 W (65 × 30 mm, ~11 g): sistema-em-pacote RP3A0 (BCM2710A1 de 4 núcleos a 1 GHz + 512 MB de RAM), Wi‑Fi e Bluetooth, GPIO de 40 pinos, mini-HDMI, duas micro-USB (dados e alimentação), conector de câmara (CSI) e cartão microSD. É o "cérebro" de robôs como o humanoide Microban. Aqui é DECORATIVO: o simulador corre programas de Arduino, ESP32 e Pico (C/C++), não Linux nem Python, por isso não tem pinos para ligar — use-o pelo aspeto e pelo peso e ponha uma placa programável (ESP32, Arduino) a fazer o trabalho. O ponto "HAT" fica por cima do conector de 40 pinos.',
  size: [RPIZ.L, 0.6, RPIZ.W],
  pins: [],
  mech: true,
  mass: 11,
  collider: { size: [RPIZ.L, 0.45, RPIZ.W], pos: [0, 0.225, 0] },
  mounts: {
    hat: { pos: [0, RPIZ.hatY, 0], plane: true, label: 'HAT (por cima do GPIO de 40 pinos)' },
  },
}
