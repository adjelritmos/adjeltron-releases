// Módulo de câmara (tipo Raspberry Pi Camera v2, 25 × 24 mm) — só decorativo: o simulador não
// tem visão por câmara. PCB deitada no plano xz, objetiva para cima (+y), fita para −x.
export default {
  type: 'cameraModule',
  name: 'Módulo de câmara (decorativo)',
  short: 'Câmara',
  cat: 'robot',
  description:
    'Câmara de 8 MP do tamanho de uma moeda (tipo Raspberry Pi Camera v2) com fita plana de 15 vias. Neste simulador é só decorativa: os programas correm em Arduino/ESP32/Pico, que não têm entrada de câmara CSI. Use-a para completar o aspeto da cabeça do cão robô (encaixa no ponto "câmara" da cabeça); para "ver" obstáculos use o HC-SR04.',
  size: [2.5, 0.65, 2.4],
  pins: [],
  mech: true,
  mass: 3,
  // placa e a objetiva (o cabo plano é flexível: não colide)
  collider: [
    { size: [2.5, 0.2, 2.4], pos: [0, 0.1, 0] },
    { size: [0.86, 0.62, 0.86], pos: [0.35, 0.42, 0] },
  ],
}
