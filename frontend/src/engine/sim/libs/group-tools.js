// Memória não volátil: EEPROM.h (AVR/ESP32/Pico) e Preferences.h (NVS do ESP32);
// SoftwareWire.h (I2C por software em quaisquer pinos); esp_camera.h (câmara do ESP32-CAM)
import eeprom from './EEPROM.js'
import preferences from './Preferences.js'
import softwareWire from './SoftwareWire.js'
import espCamera from './esp_camera.js'

export const LIBS_TOOLS = [eeprom, preferences, softwareWire, espCamera]
