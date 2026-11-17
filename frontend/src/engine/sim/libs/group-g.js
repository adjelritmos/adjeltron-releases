// Grupo G de bibliotecas: GxEPD2, Adafruit_SH110X, Adafruit_ST7735/ST7789, PCD8544, FastLED,
// BH1750, Adafruit_ADXL345, VL53L0X, HMC5883L/QMC5883L, TCS34725, DRV8825…
import { LIBS_G_DISPLAYS } from './group-g-displays.js'
import { LIBS_G_SENSORS } from './group-g-sensors.js'
import { LIBS_G_MISC } from './group-g-misc.js'

export const LIBS_G = [...LIBS_G_DISPLAYS, ...LIBS_G_SENSORS, ...LIBS_G_MISC]
