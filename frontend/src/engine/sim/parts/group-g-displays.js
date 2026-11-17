// Grupo G (ecrãs): e-paper, OLED SH1106 e SSD1306 SPI, TFT ST7735/ST7789, Nokia 5110
import { EPAPER_BEHAVIORS } from './epaper.js'
import { sh1106, ssd1306spi } from './oledG.js'
import { st7735, st7789 } from './tft77.js'
import pcd8544 from './pcd8544.js'

export const G_DISPLAYS = [...EPAPER_BEHAVIORS, sh1106, ssd1306spi, st7735, st7789, pcd8544]
