// Grupo G de componentes: peças do Velxio/Wokwi que faltavam — ecrãs (e-paper, SH1106,
// ST7735/ST7789, Nokia 5110…), sensores (I2C, módulos analógicos…), NeoPixel/FastLED,
// entradas (botão 6 mm, marcador rotativo), motores e eletromecânica.
import { G_DISPLAYS } from './group-g-displays.js'
import { G_SENSORS } from './group-g-sensors.js'
import { G_MISC } from './group-g-misc.js'

export const GROUP_G = [...G_DISPLAYS, ...G_SENSORS, ...G_MISC]
