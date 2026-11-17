// Memória não volátil: EEPROM.h (AVR/ESP32/Pico) e Preferences.h (NVS do ESP32);
// SoftwareWire.h (I2C por software em quaisquer pinos)
import eeprom from './EEPROM.js'
import preferences from './Preferences.js'
import softwareWire from './SoftwareWire.js'

export const LIBS_TOOLS = [eeprom, preferences, softwareWire]
