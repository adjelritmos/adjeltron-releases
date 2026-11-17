// Display LCD 20×4 com módulo I2C (PCF8574) — biblioteca LiquidCrystal_I2C.
import { rowZ } from '../geometry.js'

export default {
  type: 'lcd2004',
  name: 'LCD 20×4 (I2C)',
  short: 'LCD 20×4',
  cat: 'output',
  description:
    'Display de 4 linhas × 20 caracteres (controlador HD44780) com módulo I2C na traseira: só 4 fios (GND, VCC 5 V, SDA → A4, SCL → A5). Endereço 0x27 (alguns módulos 0x3F). Use lcd.setCursor(coluna, linha) com linha 0–3.',
  size: [9.8, 1.6, 6.0],
  mass: 47, // a mesma de antes (caixa de `size` × 0,5 g/cm³): colisores justos não mudam a massa
  collider: { size: [9.8, 1.0, 6.0], pos: [0, 0.5, 0] },
  pins: rowZ(['GND', 'VCC', 'SDA', 'SCL'], -5.15, 0.3, ['gnd', 'pwr', 'io', 'io']),
  config: { addr: 0x27 },
  fields: [{ key: 'addr', label: 'Endereço I2C', type: 'select', options: [[0x27, '0x27'], [0x3f, '0x3F']] }],
  lib: {
    header: 'LiquidCrystal_I2C.h',
    usage: 'LiquidCrystal_I2C lcd(0x27, 20, 4);\nlcd.init(); lcd.backlight();\nlcd.setCursor(0, 3); lcd.print("Linha 4");',
  },
  view2d: { view: 'top', x: [-5.5, 4.95], z: [-3.05, 3.05] },
}
