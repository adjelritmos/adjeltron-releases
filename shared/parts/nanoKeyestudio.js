// Keyestudio Nano CH340: o mesmo Arduino Nano (ATmega328P a 16 MHz, mesmos 30 pinos e a mesma
// posição de cada um), em placa preta da Keyestudio com conversor USB-série CH340, mini-USB e um
// conector amarelo de 2 × 3 (ICSP) na ponta oposta à USB. Funciona em tudo como o Nano
// (variantOf: 'nano': compilação para arduino:avr:nano, Fogu, soquete da placa de expansão…).
import nano from './nano.js'

export default {
  ...nano,
  type: 'nanoKeyestudio',
  variantOf: 'nano',
  name: 'Keyestudio Nano CH340',
  short: 'Nano Keyestudio',
  description:
    'Arduino Nano compatível da Keyestudio: ATmega328P a 16 MHz com os mesmos 30 pinos do Nano (D0–D13, A0–A7, PWM em 3, 5, 6, 9, 10, 11), conversor USB-série CH340 (no computador pode precisar do driver CH340) e mini-USB. Encaixa na breadboard ou no soquete da placa de expansão para Nano. Alimentação pela USB, pelo 5V ou pelo VIN (7–12 V). LED L no pino 13.',
}
