// Bibliotecas das peças vindas do catálogo do Velxio e as bibliotecas mais usadas do Arduino
// que só precisam de peças que já existem (entradas, tempo, movimento, matemática, ecrãs)
import i2cEeprom from './I2C_eeprom.js'
import mcp3008 from './Adafruit_MCP3008.js'
import wifiNina from './WiFiNINA.js'
import { LIBS_V_INPUT } from './vInput.js'
import { LIBS_V_TIME } from './vTime.js'
import { LIBS_V_MOTION } from './vMotion.js'
import { LIBS_V_MATH } from './vMath.js'
import { LIBS_V_DISPLAY } from './vDisplay.js'

// MPU6050.h (I2Cdev / Electronic Cats): a mesma classe MPU6050 da MPU6050_light, com a API I2Cdev
const i2cdev = [{ header: 'MPU6050.h' }, { header: 'I2Cdev.h' }]

export const LIBS_V = [i2cEeprom, mcp3008, wifiNina, ...LIBS_V_INPUT, ...LIBS_V_TIME, ...LIBS_V_MOTION, ...LIBS_V_MATH, ...LIBS_V_DISPLAY, ...i2cdev]
