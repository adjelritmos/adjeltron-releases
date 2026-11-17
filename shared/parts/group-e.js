// Grupo E de componentes: portas lógicas 74HC, PCF8574, LCD paralelo, L293D,
// reguladores 7805/LM317, LM358, PC817, fotodíodo, GPS NEO-6M e Bluetooth HC-05.
import logic74 from './logic74.js'
import pcf8574 from './pcf8574.js'
import lcd1602p from './lcd1602p.js'
import l293d from './l293d.js'
import lm7805 from './lm7805.js'
import lm317 from './lm317.js'
import lm358 from './lm358.js'
import pc817 from './pc817.js'
import photodiode from './photodiode.js'
import gpsNeo6m from './gpsNeo6m.js'
import hc05 from './hc05.js'
import semaforo from './semaforo.js'
import l9110s from './l9110s.js'
import potRotativo from './potRotativo.js'

export const GROUP_E = [...logic74, pcf8574, lcd1602p, l293d, lm7805, lm317, lm358, pc817, photodiode, gpsNeo6m, hc05, semaforo, l9110s, potRotativo]
