// LCD 20×4 HD44780 com a interface paralela de 16 pinos (sem módulo I2C) — LiquidCrystal.h.
// Placa de 98 × 60 mm, com os 16 furos no canto de cima à esquerda (como os módulos 2004A).
import { PITCH } from '../geometry.js'

export const LCD4_PIN_Y = 0.42
const PINS = [
  ['VSS', 'gnd', 'VSS (GND)'],
  ['VDD', 'pwr', 'VDD (5 V)'],
  ['V0', 'in', 'V0 (contraste)'],
  ['RS', 'in', 'RS (registo: 0 comando, 1 dados)'],
  ['RW', 'in', 'RW (0 = escrever → GND)'],
  ['E', 'in', 'E (enable)'],
  ...Array.from({ length: 8 }, (_, k) => [`D${k}`, 'in', `D${k}`]),
  ['A', 'pwr', 'A (ânodo da retroiluminação)'],
  ['K', 'gnd', 'K (cátodo da retroiluminação)'],
]

export default {
  type: 'lcd2004p',
  name: 'LCD 20×4 (paralelo, 16 pinos)',
  short: 'LCD 20×4',
  cat: 'output',
  description:
    'O LCD de 4 linhas × 20 colunas (HD44780) sem módulo I2C, com a biblioteca LiquidCrystal.h — as mesmas ligações do LCD 16×2 paralelo. Em modo de 4 bits: RS, E e D4–D7 a pinos do Arduino; VSS → GND, VDD → 5V, V0 → cursor de um potenciómetro de 10 kΩ (ou GND), RW → GND, A → 5V e K → GND (retroiluminação). Exemplo: LiquidCrystal lcd(12, 11, 5, 4, 3, 2); lcd.begin(20, 4); As linhas 3 e 4 continuam as linhas 1 e 2 na memória do controlador: um texto longo na linha 1 passa para a linha 3.',
  size: [9.8, 1.0, 6.0],
  pins: PINS.map(([id, kind, label], i) => ({ id, label: `${label} · pino ${i + 1}`, pos: [-4.15 + i * PITCH, LCD4_PIN_Y, -2.75], kind })),
  config: { blR: 100 },
  fields: [{ key: 'blR', label: 'Resistência da retroiluminação', type: 'select', options: [[100, '100 Ω na placa (comum)'], [0, 'sem resistência (ponha 220 Ω)']] }],
  lib: {
    header: 'LiquidCrystal.h',
    usage: '#include <LiquidCrystal.h>\nLiquidCrystal lcd(12, 11, 5, 4, 3, 2); // RS, E, D4–D7\nlcd.begin(20, 4);\nlcd.setCursor(0, 3); lcd.print("Linha 4");',
  },
  view2d: { view: 'top', x: [-4.95, 4.95], z: [-3.05, 3.05] },
}
