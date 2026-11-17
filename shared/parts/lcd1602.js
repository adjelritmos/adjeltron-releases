// Display LCD 16×2 com módulo I2C (PCF8574) — biblioteca LiquidCrystal_I2C.
import { rowZ } from '../geometry.js'

export default {
  type: 'lcd1602',
  name: 'LCD 16×2 (I2C)',
  short: 'LCD',
  cat: 'output',
  description: 'Display de 2 linhas × 16 caracteres com módulo I2C: só 4 fios (GND, VCC 5 V, SDA → A4, SCL → A5). Endereço 0x27.',
  size: [8.0, 1.6, 3.6],
  mass: 23.1, // a mesma de antes (caixa de `size` × 0,5 g/cm³): colisores justos não mudam a massa
  collider: { size: [8.0, 0.9, 3.6], pos: [0, 0.45, 0] },
  // pinos do módulo I2C na traseira, à esquerda (vista de cima)
  // pinos em ângulo reto, virados para a esquerda (−x): o jumper entra de lado
  pins: rowZ(['GND', 'VCC', 'SDA', 'SCL'], -4.25, 0.3, ['gnd', 'pwr', 'io', 'io']).map((p) => ({ ...p, dir: [-1, 0, 0] })),
  config: { addr: 0x27 },
  fields: [{ key: 'addr', label: 'Endereço I2C', type: 'select', options: [[0x27, '0x27'], [0x3f, '0x3F']] }],
  lib: { header: 'LiquidCrystal_I2C.h', usage: 'LiquidCrystal_I2C lcd(0x27, 16, 2);\nlcd.init(); lcd.backlight();\nlcd.setCursor(0, 0); lcd.print("Ola!");' },
  view2d: { view: 'top', x: [-4.6, 4.1], z: [-1.85, 1.85] },
}
