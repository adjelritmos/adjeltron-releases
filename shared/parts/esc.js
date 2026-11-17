// Controlador eletrónico de velocidade (ESC) de 30 A para motores brushless.
export default {
  type: 'esc',
  name: 'ESC 30 A (motor brushless)',
  short: 'ESC',
  cat: 'motion',
  description:
    'Transforma um sinal de servo (impulsos de 1000–2000 µs a 50–400 Hz) na corrente trifásica de um motor brushless. Bateria LiPo 2–4S em B+ (vermelho) e B− (preto); A, B e C às 3 fases do motor — trocar quaisquer dois fios inverte o sentido de rotação. O cabo de servo tem SIG (sinal, a qualquer pino com Servo.h: esc.attach(9); esc.writeMicroseconds(1000…2000)), GND e 5V do BEC: um regulador de 5 V / 2 A que pode alimentar o Arduino pelo pino 5V (use o BEC de um só ESC; sem USB ligada ao mesmo tempo). ARMAR: depois de ligar a bateria o ESC só arranca se o sinal estiver no mínimo (~1000 µs) durante ~1 s (bip-bip) — é uma proteção contra hélices a arrancar sozinhas. Acima de ~1040 µs o motor roda. Sem sinal, o motor pára. Retire SEMPRE as hélices para testar na bancada!',
  size: [4.6, 0.9, 2.4],
  pins: [
    { id: 'B+', label: 'B+ (bateria, vermelho)', pos: [-2.75, 0.45, -0.85], kind: 'bat+' },
    { id: 'B-', label: 'B− (bateria, preto)', pos: [-2.75, 0.45, -0.5], kind: 'bat-' },
    { id: 'GND', label: 'GND (cabo de servo)', pos: [-2.75, 0.45, 0.35], kind: 'gnd' },
    { id: '5V', label: '5V (BEC, saída)', pos: [-2.75, 0.45, 0.6], kind: 'p5' },
    { id: 'SIG', label: 'SIG (sinal de servo)', pos: [-2.75, 0.45, 0.85], kind: 'in' },
    { id: 'A', label: 'A (fase do motor)', pos: [2.75, 0.45, -0.4], kind: 'mout' },
    { id: 'B', label: 'B (fase do motor)', pos: [2.75, 0.45, 0], kind: 'mout' },
    { id: 'C', label: 'C (fase do motor)', pos: [2.75, 0.45, 0.4], kind: 'mout' },
  ],
  internal: [['B-', 'GND']],
  mass: 22,
  lib: {
    header: 'Servo.h',
    usage: '#include <Servo.h>\nServo esc;\nesc.attach(9);\nesc.writeMicroseconds(1000);  // armar: mínimo durante ~1 s\ndelay(1500);\nesc.writeMicroseconds(1300);  // acelera (1000 = parado, 2000 = máximo)',
  },
  view2d: { view: 'top', x: [-3.0, 3.0], z: [-1.3, 1.3] },
}
