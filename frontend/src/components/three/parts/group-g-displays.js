// Grupo G (ecrãs): interfaces 3D/2D do e-paper, OLED SH1106 / SSD1306 SPI, TFT ST7735/ST7789
// e LCD Nokia 5110
import epaper from './epaper.jsx'
import { sh1106, ssd1306spi } from './oledG.jsx'
import tft77 from './tft77.jsx'
import pcd8544 from './pcd8544.jsx'
import gc9a01 from './gc9a01.jsx'

export const UI_G_DISPLAYS = [...epaper, sh1106, ssd1306spi, ...tft77, pcd8544, gc9a01]
