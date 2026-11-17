// Codificador rotativo KY-040. Cada passo (detente) é um ciclo completo de quadratura
// nos contactos CLK/DT (que ligam ao GND quando fechados). Em repouso ambos abertos
// (HIGH pelos pull-ups de 10 kΩ do módulo). Rodar para a direita (+): CLK desce primeiro.
//   fase 0: CLK=1 DT=1 · 1: CLK=0 DT=1 · 2: CLK=0 DT=0 · 3: CLK=1 DT=0
import * as i18n from '../../../../../shared/i18n.js'
const PHASES = [
  [1, 1],
  [0, 1],
  [0, 0],
  [1, 0],
]
const TRANSITION_MS = 2 // tempo entre transições ao rodar (rodar à mão: ~2–5 ms)

const phase = (q) => PHASES[(((q ?? 0) % 4) + 4) % 4]

export default {
  type: 'encoder',
  stamp({ cond, s, input }) {
    // resistências pull-up de 10 kΩ no módulo
    cond('+', 'CLK', 1e-4)
    cond('+', 'DT', 1e-4)
    cond('+', 'SW', 1e-4)
    const [clk, dt] = phase(s.q)
    if (!clk) cond('CLK', 'GND', 1)
    if (!dt) cond('DT', 'GND', 1)
    if (input.pressed) cond('SW', 'GND', 20)
  },
  update({ vd, set }) {
    set('powered', vd('+', 'GND') >= 3)
  },
  step({ s, input, invalidate }) {
    const target = Math.round(+input.value || 0) * 4
    if (s.q == null) s.q = target // posição inicial (sem gerar pulsos)
    if (s.q === target) {
      s.acc = 0
      return
    }
    if (++s.acc < TRANSITION_MS) return
    s.acc = 0
    s.q += Math.sign(target - s.q)
    invalidate()
  },
  output({ live, s, input }) {
    const [clk, dt] = phase(s.q)
    Object.assign(live, { pos: (s.q ?? 0) / 4, clk, dt, sw: !!input.pressed, powered: !!s.powered })
  },
  diagnose({ isC, s, name, issues, part }) {
    if (!s.powered) issues.push({ level: 'warn', msg: i18n.m(`${name} sem alimentação: + → 5V e GND → GND (os pull-ups de CLK/DT/SW precisam do +).`, `${name} has no power: + → 5V and GND → GND (the CLK/DT/SW pull-ups need +).`), parts: [part.id] })
    if (!isC('CLK') || !isC('DT')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue CLK e DT a dois pinos digitais (ex.: D2 e D3) — são precisos os dois para saber o sentido.`, `${name}: connect CLK and DT to two digital pins (e.g. D2 and D3) — both are needed to know the direction.`), parts: [part.id] })
  },
}
