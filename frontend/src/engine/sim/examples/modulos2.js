// Exemplos dos componentes do grupo G (peças do Velxio que faltavam): matriz NeoPixel
// com FastLED, e-paper, marcador rotativo, sensor ToF, BH1750, servo contínuo, ACS712,
// placa de relés… Cada tema vive em ./modulos2/*.js.
import { PRESETS as P_DISPLAYS } from './modulos2/displays.js'
import { PRESETS as P_SENSORS } from './modulos2/sensors.js'
import { PRESETS as P_MISC } from './modulos2/misc.js'

export const PRESETS = { ...P_DISPLAYS, ...P_SENSORS, ...P_MISC }
