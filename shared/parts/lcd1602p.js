// LCD 16×2 HD44780 com a interface paralela de 16 pinos (sem módulo I2C) — LiquidCrystal.h.
import { PITCH } from '../geometry.js'

export const LCDP_PIN_Y = 0.42
export const lcdpPinX = (i) => -3.2 + i * PITCH
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
  type: 'lcd1602p',
  name: 'LCD 16×2 (paralelo, 16 pinos)',
  short: 'LCD 16×2',
  cat: 'output',
  description:
    'O LCD clássico HD44780 sem módulo I2C, com a biblioteca LiquidCrystal.h. Em modo de 4 bits bastam 6 pinos: RS, E e D4–D7 (D0–D3 ficam soltos). Ligações: VSS → GND, VDD → 5V, V0 → cursor de um potenciómetro de 10 kΩ entre 5V e GND (contraste: com V0 perto de 5 V não se vê nada; ~0,5–1 V é o ideal; V0 diretamente ao GND também funciona, com os pontos de fundo um pouco visíveis), RW → GND (escrita), A → 5V e K → GND (retroiluminação; o módulo tem 100 Ω na placa — escolha "sem resistência" se o seu não tiver e ponha 220 Ω). Exemplo: LiquidCrystal lcd(12, 11, 5, 4, 3, 2) = RS, E, D4, D5, D6, D7. Sem lcd.begin(16, 2) a primeira linha mostra só blocos escuros.',
  size: [8.0, 1.0, 3.6],
  pins: PINS.map(([id, kind, label], i) => ({ id, label: `${label} · pino ${i + 1}`, pos: [lcdpPinX(i), LCDP_PIN_Y, -1.6], kind })),
  config: { blR: 100 },
  fields: [{ key: 'blR', label: 'Resistência da retroiluminação', type: 'select', options: [[100, '100 Ω na placa (comum)'], [0, 'sem resistência (ponha 220 Ω)']] }],
  lib: {
    header: 'LiquidCrystal.h',
    usage: '#include <LiquidCrystal.h>\nLiquidCrystal lcd(12, 11, 5, 4, 3, 2); // RS, E, D4–D7\nlcd.begin(16, 2);\nlcd.setCursor(0, 1); lcd.print("Ola!");',
  },
  view2d: { view: 'top', x: [-4.05, 4.05], z: [-1.85, 1.85] },
}
