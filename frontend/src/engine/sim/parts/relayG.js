// Relés do grupo G.
//  - KS2E-M-DC5: bobina de 125 Ω entre COIL1 e COIL2 (sem polaridade). Atrai com ≥ 3,75 V
//    (75 %), solta abaixo de 0,5 V (histerese); 5 ms a fechar, 3 ms a soltar. Dois
//    comutadores: P1–NC1/NO1 e P2–NC2/NO2 (~50 mΩ). Sem díodo em paralelo, o pico de
//    tensão ao desligar é avisado.
//  - Placas de 2/4/8 relés: cada canal é o relé de 1 canal (relay.js) com optoacoplador:
//    ativo a LOW por omissão (LED do opto entre VCC e INk com ~1,5 kΩ).
import { supply, logDamage, diagSupply, boardPinIds } from './_groupA.js'
import { RELAY_BOARD } from '../../../../../shared/parts/relayModule.js'
import * as i18n from '../../../../../shared/i18n.js'

const R_C = 0.05

// há um díodo (1N4007…) diretamente em paralelo com dois pinos da peça?
export function hasFlyback(nets, part, a, b) {
  const na = nets.netOf(part.id, a)
  const nb = nets.netOf(part.id, b)
  return nets.partsOnNet(na).some((q) => /diode|zener/i.test(q.type) && ((nets.netOf(q.id, 'K') === na && nets.netOf(q.id, 'A') === nb) || (nets.netOf(q.id, 'K') === nb && nets.netOf(q.id, 'A') === na)))
}

export const ks2eRelay = {
  type: 'ks2eRelay',
  stamp({ cond, s }) {
    cond('COIL1', 'COIL2', 1 / 125)
    if (s.closed) {
      cond('P1', 'NO1', 1 / R_C)
      cond('P2', 'NO2', 1 / R_C)
    } else {
      cond('P1', 'NC1', 1 / R_C)
      cond('P2', 'NC2', 1 / R_C)
    }
  },
  update({ vd, set, s }) {
    const v = Math.abs(vd('COIL1', 'COIL2'))
    set('coil', s.coil ? v > 0.5 : v >= 3.75)
    if (v > 8) set('hot', true)
  },
  step(ctx) {
    const { s, vd, log, invalidate, part, circuit } = ctx
    const want = !!s.coil
    if (want !== !!s.closed) {
      s.moveMs = (s.moveMs || 0) + 1
      if (s.moveMs >= (want ? 5 : 3)) {
        s.closed = want
        s.moveMs = 0
        s.clicks = (s.clicks || 0) + 1
        invalidate()
        if (!want && !s._warnFly && !hasFlyback(circuit.nets, part, 'COIL1', 'COIL2')) {
          s._warnFly = true
          log(i18n.m('⚠ Relé KS2E: a bobina desligou sem díodo em paralelo — o pico de tensão (dezenas de volts) pode queimar o transístor ou o pino. Ponha um 1N4007 entre COIL1 e COIL2 (cátodo do lado do +).', '⚠ KS2E relay: the coil turned off without a parallel diode — the voltage spike (tens of volts) may burn out the transistor or the pin. Put a 1N4007 between COIL1 and COIL2 (cathode on the + side).'), 'warn')
        }
      }
    } else s.moveMs = 0
    if (s.hot && !s._warnHot) {
      s._warnHot = true
      log(i18n.m(`⚠ Relé KS2E: ${Math.abs(vd('COIL1', 'COIL2')).toFixed(1)} V na bobina de 5 V — aquece e pode queimar.`, `⚠ KS2E relay: ${Math.abs(vd('COIL1', 'COIL2')).toFixed(1)} V on the 5 V coil — it heats up and may burn out.`), 'warn')
    }
    const i = Math.max(Math.abs(vd('P1', s.closed ? 'NO1' : 'NC1')), Math.abs(vd('P2', s.closed ? 'NO2' : 'NC2'))) / R_C
    s.iMax = i
    if (i > 2 && s.moveMs === 0 && !s._warnI && (s.overMs = (s.overMs || 0) + 1) > 5) {
      s._warnI = true
      log(i18n.m(`⚠ Relé KS2E: ${i.toFixed(1)} A num contacto (máx. 2 A). É um relé de sinal: para cargas grandes use um relé de potência.`, `⚠ KS2E relay: ${i.toFixed(1)} A on a contact (max 2 A). It is a signal relay: for large loads use a power relay.`), 'warn')
    }
  },
  output({ s, live, vd }) {
    live.coil = !!s.coil
    live.closed = !!s.closed
    live.clicks = s.clicks || 0
    live.mA = Math.round((Math.abs(vd('COIL1', 'COIL2')) / 125) * 1000)
  },
  diagnose({ part, isC, nets, parts, name, issues }) {
    if (!isC('COIL1') || !isC('COIL2')) return issues.push({ level: 'info', msg: i18n.m(`${name}: ligue a bobina (COIL1/COIL2) a 5 V através de um transístor comandado pelo Arduino.`, `${name}: connect the coil (COIL1/COIL2) to 5 V through a transistor driven by the Arduino.`), parts: [part.id] })
    const pins = [...boardPinIds(nets, parts, part.id, 'COIL1'), ...boardPinIds(nets, parts, part.id, 'COIL2')].filter((x) => /^[DA]\d/.test(x))
    if (pins.length) issues.push({ level: 'warn', msg: i18n.m(`${name}: a bobina está ligada diretamente ao pino ${pins[0]} — pede 40 mA (o limite absoluto do pino) e o pico ao desligar pode estragá-lo. Use um transístor 2N2222 (1 kΩ na base) e um díodo 1N4007.`, `${name}: the coil is connected directly to pin ${pins[0]} — it draws 40 mA (the pin's absolute limit) and the spike when turning off may damage it. Use a 2N2222 transistor (1 kΩ on the base) and a 1N4007 diode.`), parts: [part.id] })
    else if (!hasFlyback(nets, part, 'COIL1', 'COIL2')) issues.push({ level: 'info', msg: i18n.m(`${name}: falta o díodo de roda livre em paralelo com a bobina (1N4007, cátodo no lado do +).`, `${name}: the flyback diode in parallel with the coil is missing (1N4007, cathode on the + side).`), parts: [part.id] })
    if (!isC('P1') && !isC('P2')) issues.push({ level: 'info', msg: i18n.m(`${name}: os contactos (P1/NO1/NC1, P2/NO2/NC2) não comutam nada.`, `${name}: the contacts (P1/NO1/NC1, P2/NO2/NC2) do not switch anything.`), parts: [part.id] })
  },
}

function relayBoard(type) {
  const { n } = RELAY_BOARD[type]
  const K = Array.from({ length: n }, (_, k) => k + 1)
  const V_MAX = 7
  return {
    type,
    stamp({ cond, s, cfg }) {
      if (!s.damaged) {
        cond('VCC', 'GND', 0.003 / 5) // LED de alimentação
        for (const k of K) {
          if (s.coils?.[k]) cond('VCC', 'GND', 0.072 / 5)
          if (cfg.trigger === 'high') cond(`IN${k}`, 'GND', 1 / 10000)
          else cond('VCC', `IN${k}`, 1 / 1500)
        }
      }
      for (const k of K) cond(`COM${k}`, s.closed?.[k] ? `NO${k}` : `NC${k}`, 1 / 0.03)
    },
    update(ctx) {
      const { vd, set, s, cfg } = ctx
      supply(ctx, { vMin: 3.5, vMax: V_MAX })
      const ok = !!s.powered && vd('VCC', 'GND') >= 3.75
      const coils = K.map((k) => ok && (cfg.trigger === 'high' ? vd(`IN${k}`, 'GND') > 2.0 : vd('VCC', `IN${k}`) > 1.6))
      set('coilKey', coils.map(Number).join(''))
      s.coils = [null, ...coils]
    },
    step(ctx) {
      const { s, vd, log, invalidate } = ctx
      logDamage(ctx, i18n.m(`Placa de ${n} relés`, `${n}-relay board`), V_MAX)
      if (!s.closed) Object.assign(s, { closed: [], moveMs: [], clicks: 0 })
      let imax = 0
      for (const k of K) {
        const want = !!s.coils?.[k]
        if (want !== !!s.closed[k]) {
          s.moveMs[k] = (s.moveMs[k] || 0) + 1
          if (s.moveMs[k] >= (want ? 8 : 4)) {
            s.closed[k] = want
            s.moveMs[k] = 0
            s.clicks++
            invalidate()
          }
        } else s.moveMs[k] = 0
        imax = Math.max(imax, Math.abs(vd(`COM${k}`, s.closed[k] ? `NO${k}` : `NC${k}`)) / 0.03)
      }
      s.overMs = imax > 10 ? (s.overMs || 0) + 1 : 0
      if (s.overMs >= 5 && !s._warnI) {
        s._warnI = true
        log(i18n.m(`⚠ Placa de relés: ${imax.toFixed(1)} A num contacto (máx. 10 A). Os contactos derretem!`, `⚠ Relay board: ${imax.toFixed(1)} A on a contact (max 10 A). The contacts melt!`), 'warn')
      }
    },
    output({ s, live }) {
      live.powered = !!s.powered && !s.damaged
      live.coils = K.map((k) => !!s.coils?.[k])
      live.closed = K.map((k) => !!s.closed?.[k])
      live.clicks = s.clicks || 0
    },
    diagnose(ctx) {
      const { part, cfg, isC, nets, parts, name, issues } = ctx
      diagSupply(ctx, { vMin: 3.5, vMax: V_MAX })
      const used = K.filter((k) => isC(`IN${k}`))
      if (!used.length) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue IN1…IN${n} a pinos digitais do Arduino.`, `${name}: connect IN1…IN${n} to Arduino digital pins.`), parts: [part.id] })
      for (const k of used) {
        const p = boardPinIds(nets, parts, part.id, `IN${k}`)
        if (p.includes('GND.1') || p.includes('5V')) issues.push({ level: 'info', msg: i18n.m(`${name}: IN${k} está ligado diretamente ao ${p.includes('5V') ? '5V' : 'GND'} — o relé ${k} fica sempre ${p.includes('5V') === (cfg.trigger === 'high') ? 'ligado' : 'desligado'}.`, `${name}: IN${k} is connected directly to ${p.includes('5V') ? '5V' : 'GND'} — relay ${k} is always ${p.includes('5V') === (cfg.trigger === 'high') ? 'on' : 'off'}.`), parts: [part.id] })
      }
      const on = K.filter((k) => isC(`COM${k}`) && (isC(`NO${k}`) || isC(`NC${k}`)))
      if (used.length && !on.length) issues.push({ level: 'info', msg: i18n.m(`${name}: nenhum contacto comuta nada (ligue a carga entre COM e NO de um canal).`, `${name}: no contact switches anything (connect the load between COM and NO of a channel).`), parts: [part.id] })
      if (n >= 4 && boardPinIds(nets, parts, part.id, 'VCC').includes('5V')) issues.push({ level: 'info', msg: i18n.m(`${name}: com os ${n} relés ligados a placa gasta ~${(n * 0.075).toFixed(2).replace('.', ',')} A — mais do que o 5V do Arduino pela USB aguenta bem. Use uma fonte de 5 V externa (GND comum).`, `${name}: with all ${n} relays on the board draws ~${(n * 0.075).toFixed(2)} A — more than the Arduino's USB 5V handles well. Use an external 5 V supply (common GND).`), parts: [part.id] })
    },
  }
}

export const relayBoards = Object.keys(RELAY_BOARD).map(relayBoard)
