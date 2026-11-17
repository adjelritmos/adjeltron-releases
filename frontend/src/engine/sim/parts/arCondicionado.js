// Ar condicionado: resistência equivalente R = V²/P entre os bornes 1 e 2. Liga acima de 70 %
// da tensão nominal (desliga abaixo de 60 %: a eletrónica reinicia). Ligado, a alheta abre em
// ~1,2 s e a temperatura da sala desce para a programada (τ ≈ 8 s); desligado volta à
// temperatura inicial (τ ≈ 25 s).
import { acTipo } from '../../../../../shared/parts/arCondicionado.js'
import { directPinIssue, round } from './_casa.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  type: 'arCondicionado',
  stamp({ cond, cfg }) {
    const t = acTipo(cfg)
    cond('1', '2', t.w / (t.v * t.v))
  },
  step({ s, cfg, vd, dt, log }) {
    const t = acTipo(cfg)
    const v = Math.abs(vd('1', '2'))
    s.on = v >= (s.on ? 0.6 : 0.7) * t.v
    s.flap = Math.max(0, Math.min(1, (s.flap || 0) + (s.on ? dt : -dt) / 1.2))
    const sala = +(cfg.sala ?? 28)
    const alvo = +(cfg.alvo ?? 22)
    s.temp ??= sala
    if (s.on && s.flap > 0.5) s.temp += (alvo - s.temp) * Math.min(1, dt / 8)
    else s.temp += (sala - s.temp) * Math.min(1, dt / 25)
    s.overMs = v > 1.4 * t.v ? (s.overMs || 0) + 1 : 0
    if (s.overMs > 300 && !s._warn) {
      s._warn = true
      log(i18n.m(`⚠ Ar condicionado com ${v.toFixed(1)} V (nominal ${t.v} V): a eletrónica pode queimar.`, `⚠ Air conditioner at ${v.toFixed(1)} V (rated ${t.v} V): the electronics may burn out.`), 'warn')
    }
  },
  output({ s, live, cfg, vd }) {
    const t = acTipo(cfg)
    live.on = !!s.on
    live.flap = round(s.flap || 0, 100)
    live.temp = round(s.temp ?? +(cfg.sala ?? 28), 10)
    live.alvo = +(cfg.alvo ?? 22)
    live.i = round(Math.abs(vd('1', '2')) * (t.w / (t.v * t.v)))
  },
  diagnose(ctx) {
    const { part, cfg, isC, name, issues } = ctx
    if (!isC('1') || !isC('2')) return issues.push({ level: 'info', msg: i18n.m(`${name}: ligue um borne à alimentação (pelo relé ou transístor) e o outro ao GND.`, `${name}: connect one terminal to the supply (through the relay or transistor) and the other to GND.`), parts: [part.id] })
    const t = acTipo(cfg)
    directPinIssue(ctx, ['1', '2'], `${Math.round((t.w / t.v) * 1000)} mA`)
  },
}
