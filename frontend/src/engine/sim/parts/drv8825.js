// Driver DRV8825. Sem VDD: a lógica vem de um regulador interno a partir do VMOT (8,2–45 V),
// mas o GND tem de ser comum ao Arduino. Cada flanco ascendente em STEP avança 1 micropasso
// (até 1/32). Na placa Pololu: EN e M0–M2 com pull-down de 100 kΩ, SLEEP com pull-up
// (≈10 kΩ ao regulador de 3,3 V), RESET a flutuar (ligue-o a SLEEP ou a 5V), FAULT em
// dreno aberto (alto sem avaria). Posição em s.pos em 1/16 de passo (como o A4988), para o
// NEMA 17 e o motor biaxial a lerem da mesma maneira.
import { takeEvents, levelOf } from './_groupD.js'
import * as i18n from '../../../../../shared/i18n.js'

const MAX_FULL_PER_MS = 2.2

export function microOf8825(m0, m1, m2) {
  const k = (m0 ? 1 : 0) | (m1 ? 2 : 0) | (m2 ? 4 : 0)
  return [1, 2, 4, 8, 16, 32, 32, 32][k]
}

export default {
  type: 'drv8825',
  stamp({ cond, src, s }) {
    if (s.damaged) return
    for (const p of ['EN', 'M0', 'M1', 'M2']) cond(p, 'GND', 1e-5)
    cond('RST', 'GND', 1e-7)
    if (s.vok) {
      src('SLP', 'GND', 3.3, 10000)
      src('FLT', 'GND', 3.3, 10000)
      cond('VMOT', 'GND.M', 1 / 2000) // regulador + lógica (~5 mA a 12 V)
      if (s.enabled) cond('VMOT', 'GND.M', (0.5 * 0.6) / Math.max(8.2, s.vmot || 12))
    }
  },
  update({ vd, set, s }) {
    const vm = vd('VMOT', 'GND.M')
    if (vm > 47) set('damaged', true)
    set('vmot', Math.round(vm * 10) / 10)
    set('vok', !s.damaged && vm >= 8.2)
    set('powered', !s.damaged && vm >= 8.2)
    set('enabled', vd('EN', 'GND') < 0.8 && vd('SLP', 'GND') > 2.0 && vd('RST', 'GND') > 2.0)
    set('micro', microOf8825(vd('M0', 'GND') > 2.0, vd('M1', 'GND') > 2.0, vd('M2', 'GND') > 2.0))
  },
  step(ctx) {
    const { s, log } = ctx
    if (s.pos === undefined) Object.assign(s, { pos: 0, stepLv: levelOf(ctx, 'STEP'), dirLv: levelOf(ctx, 'DIR'), lost: 0 })
    const evs = takeEvents(ctx, ['STEP', 'DIR'])
    const inc = 16 / (s.micro || 1)
    let moved = 0
    for (const [, n, v] of evs) {
      const pin = s._evPins.get(n)
      if (pin === 'DIR') s.dirLv = v
      else {
        if (v && !s.stepLv && s.powered && s.enabled) {
          if (Math.abs(moved) / 16 < MAX_FULL_PER_MS) moved += s.dirLv ? inc : -inc
          else s.lost++
        }
        s.stepLv = v
      }
    }
    if (!s._evPins.size) {
      const lv = levelOf(ctx, 'STEP')
      if (lv && !s.stepLv && s.powered && s.enabled) moved += levelOf(ctx, 'DIR') ? inc : -inc
      s.stepLv = lv
    }
    s.pos += moved
    s.rate = moved / 16
    if (s.lost > 20 && !s.warnedLost) {
      s.warnedLost = true
      log(i18n.m('⚠ DRV8825: impulsos STEP depressa demais para o motor (> ~2000 passos completos/s) — perde passos. Reduza a velocidade ou use micropassos.', '⚠ DRV8825: STEP pulses too fast for the motor (> ~2000 full steps/s) — it skips steps. Reduce the speed or use microstepping.'), 'warn')
    }
    if (!s.powered && evs.length && !s.warnedV) {
      s.warnedV = true
      log(i18n.m(`⚠ DRV8825 sem tensão no motor: VMOT tem ${(s.vmot || 0).toFixed(1)} V (precisa de 8,2–45 V de uma fonte externa, com GND comum). Os impulsos STEP são ignorados.`, `⚠ DRV8825 with no motor voltage: VMOT has ${(s.vmot || 0).toFixed(1)} V (it needs 8.2–45 V from an external supply, with common GND). STEP pulses are ignored.`), 'warn')
    }
    if (s.powered && !s.enabled && evs.length > 4 && !s.warnedEn) {
      s.warnedEn = true
      log(i18n.m('⚠ DRV8825: recebe impulsos STEP mas está desativado — RESET e SLEEP têm de estar a HIGH (ligue-os a 5V) e EN a LOW.', '⚠ DRV8825: it receives STEP pulses but it is disabled — RESET and SLEEP must be HIGH (connect them to 5V) and EN LOW.'), 'warn')
    }
  },
  output({ s, live, timeUs }) {
    Object.assign(live, { powered: !!s.powered, enabled: !!s.powered && !!s.enabled, micro: s.micro || 1, steps: Math.round(((s.pos || 0) / 16) * 100) / 100 })
    const dt = timeUs - (s._rT ?? timeUs)
    if (s._rT === undefined || dt >= 100000) {
      live.rpm = s._rT === undefined ? 0 : Math.round(((((s.pos || 0) - s._rPos) / 16 / 200) * 60e6) / dt)
      s._rT = timeUs
      s._rPos = s.pos || 0
    }
  },
  diagnose({ vd, isC, name, issues, part, nets }) {
    const vm = vd('VMOT', 'GND.M')
    if (vm > 45) issues.push({ level: 'error', msg: i18n.m(`${name}: ${vm.toFixed(1)} V em VMOT (máx. 45 V). Danificado!`, `${name}: ${vm.toFixed(1)} V on VMOT (max 45 V). Damaged!`), parts: [part.id] })
    else if (vm < 8.2) issues.push({ level: 'warn', msg: i18n.m(`${name}: VMOT com ${vm.toFixed(1)} V — o DRV8825 precisa de 8,2–45 V de uma fonte externa (ex.: 12 V), com o − ao GND comum ao Arduino. Abaixo de 8,2 V desliga-se (nem a lógica funciona).`, `${name}: VMOT at ${vm.toFixed(1)} V — the DRV8825 needs 8.2–45 V from an external supply (e.g. 12 V), with − to the GND shared with the Arduino. Below 8.2 V it shuts down (not even the logic works).`), parts: [part.id] })
    if (!isC('STEP') || !isC('DIR')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue STEP e DIR a dois pinos digitais.`, `${name}: connect STEP and DIR to two digital pins.`), parts: [part.id] })
    if (!isC('RST')) issues.push({ level: 'warn', msg: i18n.m(`${name}: RESET está a flutuar — o driver fica desativado. Ligue RESET a SLEEP ou a 5V.`, `${name}: RESET is floating — the driver stays disabled. Connect RESET to SLEEP or to 5V.`), parts: [part.id] })
    const coil = ['1A', '1B', '2A', '2B'].filter((p) => isC(p))
    if (coil.length < 4) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue as bobinas do motor: A1/A2 (bobina A) e B1/B2 (bobina B).`, `${name}: connect the motor coils: A1/A2 (coil A) and B1/B2 (coil B).`), parts: [part.id] })
    else if (!nets.partsOnNet(nets.netOf(part.id, '1A')).some((q) => q.type === 'nema17' || q.type === 'biaxialStepper')) issues.push({ level: 'info', msg: i18n.m(`${name}: não há nenhum motor de passo nas saídas.`, `${name}: there is no stepper motor on the outputs.`), parts: [part.id] })
  },
}
