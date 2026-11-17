// Módulo semáforo: três LEDs (cátodo comum = GND), cada um com 270 Ω em série na placa.
import { SEMAFORO_LEDS } from '../../../../../shared/parts/semaforo.js'
import * as i18n from '../../../../../shared/i18n.js'

const R_PLACA = 270

export default {
  type: 'semaforo',
  diodes: () => SEMAFORO_LEDS.map(([key, a, , vf]) => ({ key, a, k: 'GND', vf, r: 12 + R_PLACA })),
  output({ live, avgCurrent }) {
    // brilho 0..1 por LED (≈10 mA = brilho total)
    for (const [key] of SEMAFORO_LEDS) live[key] = Math.round(Math.min(1, Math.max(0, avgCurrent(key)) / 0.01) * 100) / 100
  },
  diagnose({ isC, name, issues, part }) {
    if (!isC('GND')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue o GND do módulo ao GND do Arduino.`, `${name}: connect the module's GND to the Arduino's GND.`), parts: [part.id] })
  },
}
