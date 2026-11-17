// Módulo relé de 1 canal. A bobina (~70 Ω, ~72 mA a 5 V) é alimentada pelo VCC
// através de um transístor comandado por IN (ou por um optoacoplador na versão
// ativa a LOW). Os contactos são condutâncias reais (~30 mΩ) entre COM e NO/NC,
// por isso podem comutar um circuito separado (bateria + motor, lâmpada…).
// A armadura demora ~8 ms a fechar e ~4 ms a soltar.
import { supply, logDamage, diagSupply, boardPinIds } from './_groupA.js'
import * as i18n from '../../../../../shared/i18n.js'

const V_MAX = 7.0
const R_CONTACT = 0.03

export default {
  type: 'relay',
  stamp({ cond, s, cfg }) {
    if (!s.damaged) {
      cond('VCC', 'GND', 0.003 / 5) // LED de alimentação
      if (s.coil) cond('VCC', 'GND', 0.072 / 5)
      if (cfg.trigger === 'low') cond('VCC', 'IN', 1 / 1500) // LED do optoacoplador + resistência
      else cond('IN', 'GND', 1 / 10000) // resistência de base do transístor
    }
    // contactos (mecânicos: funcionam mesmo com o módulo danificado)
    if (s.closed) cond('COM', 'NO', 1 / R_CONTACT)
    else cond('COM', 'NC', 1 / R_CONTACT)
  },
  update(ctx) {
    const { vd, set, s, cfg } = ctx
    supply(ctx, { vMin: 3.5, vMax: V_MAX })
    const vin = cfg.trigger === 'low' ? vd('VCC', 'IN') : vd('IN', 'GND')
    // a bobina só atrai com ≥ ~3,75 V (75 % da nominal)
    set('coil', !!s.powered && vin > 2.0 && vd('VCC', 'GND') >= 3.75)
  },
  step(ctx) {
    const { s, vd, log, invalidate } = ctx
    logDamage(ctx, i18n.m('Relé', 'Relay'), V_MAX)
    const want = !!s.coil
    if (want !== !!s.closed) {
      s.moveMs = (s.moveMs || 0) + 1
      if (s.moveMs >= (want ? 8 : 4)) {
        s.closed = want
        s.moveMs = 0
        s.clicks = (s.clicks || 0) + 1
        invalidate()
      }
    } else s.moveMs = 0
    // corrente nos contactos (máx. 10 A). A solução elétrica do ms em que o contacto
    // muda ainda é a anterior, por isso só conta sobrecorrente que dure ≥ 5 ms.
    const i = Math.abs(vd('COM', s.closed ? 'NO' : 'NC')) / R_CONTACT
    s.overMs = s.moveMs === 0 && i > 10 ? (s.overMs || 0) + 1 : 0
    if (s.overMs >= 5 && !s._warnI) {
      s._warnI = true
      log(i18n.m(`⚠ Relé: ${i.toFixed(1)} A nos contactos (máx. 10 A). Os contactos derretem!`, `⚠ Relay: ${i.toFixed(1)} A through the contacts (max 10 A). The contacts melt!`), 'warn')
    }
    s.iContact = i
  },
  output({ s, live }) {
    live.powered = !!s.powered && !s.damaged
    live.coil = !!s.coil
    live.closed = !!s.closed
    live.clicks = s.clicks || 0
    live.amps = Math.round((s.iContact || 0) * 1000) / 1000
  },
  diagnose(ctx) {
    const { part, cfg, isC, nets, parts, name, issues } = ctx
    diagSupply(ctx, { vMin: 3.5, vMax: V_MAX })
    const inp = boardPinIds(nets, parts, part.id, 'IN')
    if (!isC('IN')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue IN a um pino digital do Arduino (ex.: 7).`, `${name}: connect IN to an Arduino digital pin (e.g. 7).`), parts: [part.id] })
    else if (inp.includes('5V') || inp.includes('GND.1')) issues.push({ level: 'info', msg: i18n.m(`${name}: IN está ligado diretamente ao ${inp.includes('5V') ? '5V' : 'GND'}, por isso o relé fica sempre ${(inp.includes('5V') === (cfg.trigger !== 'low')) ? 'ligado' : 'desligado'}.`, `${name}: IN is connected directly to ${inp.includes('5V') ? '5V' : 'GND'}, so the relay is always ${(inp.includes('5V') === (cfg.trigger !== 'low')) ? 'on' : 'off'}.`), parts: [part.id] })
    if (!isC('COM') || (!isC('NO') && !isC('NC'))) issues.push({ level: 'info', msg: i18n.m(`${name}: os contactos não comutam nada. Ex.: bateria + → COM, NO → motor/lâmpada, o outro terminal da carga → bateria −.`, `${name}: the contacts do not switch anything. E.g. battery + → COM, NO → motor/lamp, the load's other terminal → battery −.`), parts: [part.id] })
  },
}
