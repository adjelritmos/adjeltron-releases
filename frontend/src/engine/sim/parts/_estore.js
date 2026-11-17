// Portão de garagem / estore elétrico: motor tubular DC (resistência equivalente V/I) que enrola
// a cortina. A posição (0 = fechado, 1 = aberto) anda à velocidade 1/tempo × V/Vnominal (com
// sinal: M+ positivo sobe), arranca acima de 20 % da tensão nominal e pára nos fins de curso
// mecânicos. Os fins de curso são contactos (~50 mΩ): COM–ABERTO em cima e COM–FECHADO em baixo.
import { DEFS } from '../../../../../shared/components.js'
import { estoreTipo } from '../../../../../shared/parts/_estore.js'
import { directPinIssue, round } from './_casa.js'
import * as i18n from '../../../../../shared/i18n.js'

const EPS = 0.004

export function estoreBehavior(type, fallback) {
  // nome no idioma atual (o catálogo é traduzido por overlay); o argumento é só o recurso
  const nameOf = () => DEFS[type]?.name || fallback
  return {
    type,
    stamp({ cond, s, cfg }) {
      const t = estoreTipo(cfg)
      cond('M+', 'M-', t.i / t.v)
      const pos = s.pos ?? +(cfg.inicio ?? 0)
      if (pos >= 1 - EPS) cond('COM', 'ABERTO', 20)
      if (pos <= EPS) cond('COM', 'FECHADO', 20)
    },
    step({ s, cfg, vd, dt, invalidate, log }) {
      const t = estoreTipo(cfg)
      const tempo = Math.max(0.5, +(cfg.tempo ?? DEFS[type].config.tempo))
      if (s.pos == null) s.pos = +(cfg.inicio ?? 0)
      const v = vd('M+', 'M-')
      const vel = Math.abs(v) >= 0.2 * t.v ? v / t.v / tempo : 0
      const before = [s.pos >= 1 - EPS, s.pos <= EPS]
      s.pos = Math.max(0, Math.min(1, s.pos + vel * dt))
      s.vel = vel
      const after = [s.pos >= 1 - EPS, s.pos <= EPS]
      if (before[0] !== after[0] || before[1] !== after[1]) invalidate()
      // motor ligado contra um fim de curso: fica bloqueado
      const blocked = (vel > 0 && after[0]) || (vel < 0 && after[1])
      s.blockMs = blocked ? (s.blockMs || 0) + 1 : 0
      s.overMs = Math.abs(v) > 1.5 * t.v ? (s.overMs || 0) + 1 : 0
      if (s.overMs > 500 && !s._warnOver) {
        s._warnOver = true
        log(i18n.m(`⚠ ${nameOf()}: ${Math.abs(v).toFixed(1)} V num motor de ${t.v} V — anda depressa demais e aquece. Escolha o motor de 12 V ou baixe a tensão.`, `⚠ ${nameOf()}: ${Math.abs(v).toFixed(1)} V on a ${t.v} V motor — it runs too fast and heats up. Choose the 12 V motor or lower the voltage.`), 'warn')
      }
      if (s.blockMs > 3000 && !s._warnBlock) {
        s._warnBlock = true
        log(i18n.m(`⚠ ${nameOf()}: o motor continua ligado no fim de curso há 3 s (fica bloqueado e aquece). Leia o fim de curso e desligue o motor.`, `⚠ ${nameOf()}: the motor has been on at the end stop for 3 s (it stalls and heats up). Read the limit switch and turn the motor off.`), 'warn')
      }
    },
    output({ s, live, cfg, vd }) {
      const t = estoreTipo(cfg)
      live.pos = round(s.pos ?? +(cfg.inicio ?? 0))
      live.vel = round(s.vel || 0)
      live.aberto = live.pos >= 1 - EPS
      live.fechado = live.pos <= EPS
      live.i = round(Math.abs(vd('M+', 'M-')) * (t.i / t.v))
    },
    diagnose(ctx) {
      const { part, isC, name, issues, cfg } = ctx
      if (!isC('M+') || !isC('M-')) return issues.push({ level: 'info', msg: i18n.m(`${name}: ligue M+ e M− a um driver de motor (L298N) ou a dois relés para subir e descer.`, `${name}: connect M+ and M− to a motor driver (L298N) or to two relays to raise and lower.`), parts: [part.id] })
      directPinIssue(ctx, ['M+', 'M-'], `${Math.round(estoreTipo(cfg).i * 1000)} mA`)
    },
  }
}
