// Grupo G (ecrãs): e-paper 1,54"–7,5" (GxEPD2), OLED SH1106 1,3", OLED SSD1306 SPI de 7 pinos,
// TFT ST7735 / ST7789 e LCD Nokia 5110 (PCD8544)
import epaper from './epaper.js'
import sh1106 from './sh1106.js'
import ssd1306spi from './ssd1306spi.js'
import tft77 from './tft77.js'
import pcd8544 from './pcd8544.js'

export const G_DISPLAYS = [...epaper, sh1106, ssd1306spi, ...tft77, pcd8544]
