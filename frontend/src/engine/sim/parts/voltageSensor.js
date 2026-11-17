// Sensor de tensão 0–25 V: divisor passivo 30 kΩ (VCC→S) + 7,5 kΩ (S→GND); GND = − por dentro.
import * as i18n from '../../../../../shared/i18n.js'
export default {
  type: 'voltageSensor',
  stamp({ cond }) {
    cond('VCC', 'S', 1 / 30000)
    cond('S', 'GND', 1 / 7500)
  },
  output({ live, vd }) {
    live.vin = Math.round(vd('VCC', 'GND') * 100) / 100
  },
  diagnose({ vd, isC, name, issues, part }) {
    const v = vd('VCC', 'GND')
    if (v > 25.5) issues.push({ level: 'warn', msg: i18n.m(`${name}: ${v.toFixed(1)} V no borne — acima de 25 V a saída S passa de 5 V e pode danificar a entrada analógica.`, `${name}: ${v.toFixed(1)} V on the terminal — above 25 V the S output goes over 5 V and may damage the analog input.`), parts: [part.id] })
    if (v < -0.3) issues.push({ level: 'warn', msg: i18n.m(`${name}: tensão ao contrário no borne (VCC tem de ser o +).`, `${name}: reversed voltage on the terminal (VCC must be +).`), parts: [part.id] })
    if (!isC('S')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue S a uma entrada analógica e − ao GND do Arduino.`, `${name}: connect S to an analog input and − to the Arduino's GND.`), parts: [part.id] })
    else if (!isC('-')) issues.push({ level: 'warn', msg: i18n.m(`${name}: o − do conector (GND) tem de ir ao GND do Arduino, senão a leitura não tem referência.`, `${name}: the connector's − (GND) must go to the Arduino's GND, otherwise the reading has no reference.`), parts: [part.id] })
  },
}
