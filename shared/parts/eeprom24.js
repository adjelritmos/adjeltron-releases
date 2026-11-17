// EEPROM I2C da série 24xx (Microchip / Atmel) em DIP-8: 24C01 … 24LC512. Memória que não se
// apaga sem alimentação, lida e escrita por I2C (Wire) no endereço 0x50 + A2 A1 A0.
import { PITCH } from '../geometry.js'

// bytes, tamanho da página de escrita e bytes de endereço de cada modelo
export const EEPROM_CHIPS = {
  '24C01': { size: 128, page: 8, ab: 1 },
  '24C02': { size: 256, page: 8, ab: 1 },
  '24C32': { size: 4096, page: 32, ab: 2 },
  '24LC64': { size: 8192, page: 32, ab: 2 },
  '24LC256': { size: 32768, page: 64, ab: 2 },
  '24LC512': { size: 65536, page: 128, ab: 2 },
}
const X = (i) => (i - 1.5) * PITCH
// pinos 1–4 em baixo (esquerda → direita), 5–8 em cima (direita → esquerda); entalhe à esquerda
const BOTTOM = [['A0', 'in', 'A0 (endereço, bit 0)'], ['A1', 'in', 'A1 (endereço, bit 1)'], ['A2', 'in', 'A2 (endereço, bit 2)'], ['GND', 'gnd', 'GND (VSS)']]
const TOP = [['SDA', 'io', 'SDA (dados I2C)'], ['SCL', 'in', 'SCL (relógio I2C)'], ['WP', 'in', 'WP (proteção de escrita, ativo HIGH)'], ['VCC', 'pwr', 'VCC (1,8–5,5 V)']]

export default {
  type: 'eeprom24',
  name: 'EEPROM I2C 24LC256 (DIP-8)',
  short: 'EEPROM',
  cat: 'discrete',
  description:
    'Memória EEPROM externa por I2C: guarda dados mesmo sem alimentação (aqui também entre simulações). Encaixe-a sobre o canal central da breadboard. VCC → 5V, GND → GND, SDA → A4, SCL → A5 (com pull-ups de 4,7 kΩ num circuito real), WP → GND para poder escrever, A0–A2 → GND = endereço 0x50 (cada pino a 5V soma 1, 2 ou 4: até 8 memórias no mesmo barramento). Com a Wire: beginTransmission(0x50), write(endereço alto), write(endereço baixo), write(dado), endTransmission() e esperar ~5 ms (ciclo de escrita). Uma escrita que passe o fim de uma página (64 bytes no 24LC256) dá a volta ao início da mesma página, como no chip verdadeiro. Também funciona com a biblioteca I2C_eeprom.',
  size: [1.1, 0.55, 0.65],
  pins: [
    ...BOTTOM.map(([id, kind, label], i) => ({ id, label, pos: [X(i), 0, 0.381], kind })),
    ...TOP.map(([id, kind, label], i) => ({ id, label, pos: [X(3 - i), 0, -0.381], kind })),
  ],
  config: { chip: '24LC256' },
  fields: [{ key: 'chip', label: 'Modelo', type: 'select', options: Object.entries(EEPROM_CHIPS).map(([k, c]) => [k, `${k} (${c.size >= 1024 ? `${c.size / 1024} KB` : `${c.size} bytes`})`]) }],
  lib: {
    header: 'Wire.h',
    usage:
      '#include <Wire.h>\nconst int MEM = 0x50;\nvoid escreve(unsigned int end, byte v) {\n  Wire.beginTransmission(MEM);\n  Wire.write(end >> 8); Wire.write(end & 0xFF);\n  Wire.write(v);\n  Wire.endTransmission();\n  delay(5); // ciclo de escrita\n}\nbyte le(unsigned int end) {\n  Wire.beginTransmission(MEM);\n  Wire.write(end >> 8); Wire.write(end & 0xFF);\n  Wire.endTransmission();\n  Wire.requestFrom(MEM, 1);\n  return Wire.read();\n}',
  },
  view2d: { view: 'top', x: [-0.6, 0.6], z: [-0.5, 0.5] },
}
