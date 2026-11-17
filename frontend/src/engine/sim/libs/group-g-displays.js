// Grupo G (ecrãs): bibliotecas GxEPD2 (BW/3C/7C), Adafruit_SH110X, U8g2, Adafruit_ST7735 /
// Adafruit_ST7789, Adafruit_PCD8544 e os tipos de letra GFX (Fonts/FreeSans9pt7b.h…)
import { LIBS_GXEPD2 } from './GxEPD2.js'
import sh110x from './Adafruit_SH110X.js'
import u8g2 from './U8g2lib.js'
import st77xx from './Adafruit_ST77xx.js'
import pcd8544 from './Adafruit_PCD8544.js'
import { LIBS_GFX_FONTS } from './GfxFonts.js'

export const LIBS_G_DISPLAYS = [...LIBS_GXEPD2, sh110x, u8g2, ...st77xx, pcd8544, ...LIBS_GFX_FONTS]
