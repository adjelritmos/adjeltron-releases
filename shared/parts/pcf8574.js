// Módulo expansor de E/S PCF8574 por I2C (8 pinos quase-bidirecionais P0–P7 + INT).
import { PITCH } from '../geometry.js'

export const PCF_PIN_Y = 0.95
const HEAD = [['GND', 'gnd'], ['VCC', 'pwr'], ['SDA', 'io'], ['SCL', 'in']]
// fila de baixo (ao longo de x): INT, P0…P7
export const pcfRowX = (i) => -1.2 + i * PITCH
const ADDR = [
  ...Array.from({ length: 8 }, (_, k) => [0x20 + k, `0x${(0x20 + k).toString(16).toUpperCase()} (PCF8574${k ? `, A2–A0 = ${k.toString(2).padStart(3, '0')}` : ', A0–A2 a GND'})`]),
  ...Array.from({ length: 8 }, (_, k) => [0x38 + k, `0x${(0x38 + k).toString(16).toUpperCase()} (PCF8574A${k ? `, A2–A0 = ${k.toString(2).padStart(3, '0')}` : ''})`]),
]

export default {
  type: 'pcf8574',
  name: 'Expansor de E/S PCF8574 (I2C)',
  short: 'PCF8574',
  cat: 'output',
  description:
    'Mais 8 pinos digitais com só 2 fios (I2C): GND, VCC (2,5–6 V), SDA → A4, SCL → A5 (ESP32: 21/22). Endereço 0x20–0x27 pelas pontes A0–A2 (versão PCF8574A: 0x38–0x3F); até 8 módulos no mesmo barramento. Os pinos P0–P7 são "quase-bidirecionais": a LOW absorvem até ~25 mA, mas a HIGH só dão ~0,1 mA (um pull-up fraco) — por isso os LEDs ligam-se ao contrário (ânodo → 5V por 220 Ω, cátodo → Pn: acende com LOW) e um botão vai do pino ao GND (escreva HIGH no pino para o ler). INT (dreno aberto, ativo LOW) avisa que uma entrada mudou: ligue-o a um pino com INPUT_PULLUP. Biblioteca PCF8574.h (Rob Tillaart: write8/read8/write/read; ou pinMode/digitalWrite/digitalRead) ou Wire.h diretamente.',
  size: [4.4, 1.3, 2.2],
  pins: [
    ...HEAD.map(([id, kind], i) => ({ id, pos: [-1.95, PCF_PIN_Y, (i - 1.5) * PITCH - 0.2], kind })),
    { id: 'INT', label: 'INT (ativo LOW, dreno aberto)', pos: [pcfRowX(0), PCF_PIN_Y, 0.85], kind: 'out' },
    ...Array.from({ length: 8 }, (_, k) => ({ id: `P${k}`, label: `P${k}`, pos: [pcfRowX(k + 1), PCF_PIN_Y, 0.85], kind: 'io' })),
  ],
  config: { addr: 0x20 },
  fields: [{ key: 'addr', label: 'Endereço I2C (pontes A0–A2)', type: 'select', options: ADDR }],
  lib: {
    header: 'PCF8574.h',
    usage: '#include <PCF8574.h>\nPCF8574 pcf(0x20);\npcf.begin();\npcf.write(0, LOW);      // P0 a LOW (LED com o cátodo no P0 acende)\nint b = pcf.read(7);    // ler o botão no P7\npcf.write8(0xF0);       // os 8 pinos de uma vez',
  },
  view2d: { view: 'top', x: [-2.25, 2.25], z: [-1.15, 1.15] },
}
