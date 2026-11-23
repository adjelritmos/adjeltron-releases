// Driver A4988. Lógica (VDD 3–5,5 V) + potência (VMOT 8–35 V). Cada flanco ascendente
// em STEP avança 1 micropasso no sentido de DIR. Impulsos mais curtos que 1 ms são
// vistos pelo registo de escritas (ctx.pinLog). Resistências internas da placa Pololu:
// EN e MS1 (100 kΩ) e MS2/MS3 (50 kΩ) a GND, SLEEP a VDD (10 kΩ); RESET também
// tem aqui um pull-up fraco (no real fica a flutuar: ligue RESET a SLEEP).
// Posição em s.pos (micropassos de 1/16 de passo); lida pelo NEMA 17 ligado às saídas.
import { takeEvents, levelOf } from './_groupD.js'
import * as i18n from '../../../../../shared/i18n.js'

const MAX_FULL_PER_MS = 2.2 // ~660 rpm: acima disto o motor perde passos

export function microOf(ms1, ms2, ms3) {
  const k = (ms1 ? 1 : 0) | (ms2 ? 2 : 0) | (ms3 ? 4 : 0)
  return { 0: 1, 1: 2, 2: 4, 3: 8, 7: 16 }[k] ?? 16
}

// Nível de STEP/DIR antes da primeira escrita. Vindo de um pino do Arduino conta o registo de
// saída do pino (e não a tensão): um pino ainda em INPUT flutua, mas quando passa a OUTPUT sai
// a LOW — sem isto perdia-se o 1.º impulso de quem só faz pinMode() no primeiro passo
// (AccelStepper) e o sentido ficava trocado quando DIR nunca chega a ser escrito a HIGH.
export function startLevel(ctx, pin) {
  const ns = ctx.boardPinsOn(pin)
  if (!ns.length) return levelOf(ctx, pin)
  // só as mudanças ficam registadas: antes da 1.ª escrita deste ms estava o nível contrário
  const first = ctx.pinLog.find((ev) => ns.includes(ev[1]))
  return first ? 1 - first[2] : ctx.boardPins[ns[0]].out ? 1 : 0
}

export default {
  type: 'a4988',
  stamp({ cond, s }) {
    if (s.damaged) return cond('VDD', 'GND', 1e-9)
    cond('VDD', 'GND', 1 / 2500)
    cond('EN', 'GND', 1e-5)
    cond('MS1', 'GND', 1e-5)
    cond('MS2', 'GND', 2e-5)
    cond('MS3', 'GND', 2e-5)
    cond('SLP', 'VDD', 1e-4)
    cond('RST', 'VDD', 1e-5)
    // corrente nas bobinas (limite ~0,4 A, regulado por PWM): potência tirada de VMOT
    if (s.powered && s.enabled) cond('VMOT', 'GND.M', 0.4 * 0.6 / Math.max(8, s.vmot || 12))
  },
  update({ vd, set, s }) {
    const vdd = vd('VDD', 'GND')
    const vm = vd('VMOT', 'GND.M')
    if (vm > 36 || vdd > 6.5) set('damaged', true)
    set('vmot', Math.round(vm * 10) / 10)
    set('logic', !s.damaged && vdd >= 3 && vdd <= 5.6)
    set('powered', !s.damaged && vdd >= 3 && vm >= 8)
    set('enabled', vd('EN', 'GND') < 1.5 && vd('SLP', 'GND') > 2.2 && vd('RST', 'GND') > 2.2)
    set('micro', microOf(vd('MS1', 'GND') > 2.2, vd('MS2', 'GND') > 2.2, vd('MS3', 'GND') > 2.2))
  },
  step(ctx) {
    const { s, log } = ctx
    if (s.pos === undefined) Object.assign(s, { pos: 0, stepLv: startLevel(ctx, 'STEP'), dirLv: startLevel(ctx, 'DIR'), lost: 0 })
    const evs = takeEvents(ctx, ['STEP', 'DIR'])
    const inc = 16 / (s.micro || 1)
    let moved = 0
    for (const [, n, v] of evs) {
      const pin = s._evPins.get(n)
      if (pin === 'DIR') s.dirLv = v
      else {
        if (v && !s.stepLv && s.powered && s.enabled) {
          if (Math.abs(moved) / 16 < MAX_FULL_PER_MS) {
            moved += s.dirLv ? inc : -inc
          } else s.lost++
        }
        s.stepLv = v
      }
    }
    // STEP/DIR não vindos de pinos do Arduino: segue as tensões
    if (!s._evPins.size) {
      const lv = levelOf(ctx, 'STEP')
      if (lv && !s.stepLv && s.powered && s.enabled) moved += levelOf(ctx, 'DIR') ? inc : -inc
      s.stepLv = lv
    }
    s.pos += moved
    s.rate = moved / 16 // passos completos neste ms
    if (s.lost > 20 && !s.warnedLost) {
      s.warnedLost = true
      log(i18n.m('⚠ A4988: impulsos STEP depressa demais (> ~2000 passos completos/s) — o motor de passo perde passos. Reduza a velocidade (setMaxSpeed) ou use micropassos.', '⚠ A4988: STEP pulses too fast (> ~2000 full steps/s) — the stepper motor skips steps. Reduce the speed (setMaxSpeed) or use microstepping.'), 'warn')
    }
    if (s.logic && !s.powered && evs.length && !s.warnedV) {
      s.warnedV = true
      log(i18n.m(`⚠ A4988 sem tensão no motor: VMOT tem ${(s.vmot || 0).toFixed(1)} V (precisa de 8–35 V de uma fonte externa, com GND comum). Os impulsos STEP são ignorados.`, `⚠ A4988 with no motor voltage: VMOT has ${(s.vmot || 0).toFixed(1)} V (it needs 8–35 V from an external supply, with common GND). STEP pulses are ignored.`), 'warn')
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
  diagnose({ vd, isC, name, issues, part, nets, parts }) {
    const vdd = vd('VDD', 'GND')
    const vm = vd('VMOT', 'GND.M')
    if (vm > 35) issues.push({ level: 'error', msg: i18n.m(`${name}: ${vm.toFixed(1)} V em VMOT (máx. 35 V). Danificado!`, `${name}: ${vm.toFixed(1)} V on VMOT (max 35 V). Damaged!`), parts: [part.id] })
    if (vdd > 6) issues.push({ level: 'error', msg: i18n.m(`${name}: ${vdd.toFixed(1)} V em VDD (máx. 5,5 V).`, `${name}: ${vdd.toFixed(1)} V on VDD (max 5.5 V).`), parts: [part.id] })
    else if (vdd < 3) issues.push({ level: 'warn', msg: i18n.m(`${name}: sem alimentação lógica — VDD → 5V e GND → GND.`, `${name}: no logic power — VDD → 5V and GND → GND.`), parts: [part.id] })
    if (vm < 8) issues.push({ level: 'warn', msg: i18n.m(`${name}: VMOT com ${vm.toFixed(1)} V — o motor precisa de 8–35 V de uma fonte externa (ex.: pilha de 9 V, fonte de 12 V), com o − ao GND comum.`, `${name}: VMOT at ${vm.toFixed(1)} V — the motor needs 8–35 V from an external supply (e.g. 9 V battery, 12 V supply), with − to the common GND.`), parts: [part.id] })
    if (!isC('STEP') || !isC('DIR')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue STEP e DIR a dois pinos digitais.`, `${name}: connect STEP and DIR to two digital pins.`), parts: [part.id] })
    if (!isC('RST')) issues.push({ level: 'info', msg: i18n.m(`${name}: RESET desligado — no real fica a flutuar e o driver pode não andar. Ligue RESET a SLEEP.`, `${name}: RESET disconnected — in real life it floats and the driver may not run. Connect RESET to SLEEP.`), parts: [part.id] })
    const coil = ['1A', '1B', '2A', '2B'].filter((p) => isC(p))
    if (coil.length < 4) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue as bobinas do motor: 1A/1B (bobina A) e 2A/2B (bobina B).`, `${name}: connect the motor coils: 1A/1B (coil A) and 2A/2B (coil B).`), parts: [part.id] })
    const net = nets.netOf(part.id, '1A')
    if (coil.length === 4 && !nets.partsOnNet(net).some((q) => q.type === 'nema17')) issues.push({ level: 'info', msg: i18n.m(`${name}: não há nenhum motor NEMA 17 nas saídas.`, `${name}: there is no NEMA 17 motor on the outputs.`), parts: [part.id] })
    void parts
  },
}
