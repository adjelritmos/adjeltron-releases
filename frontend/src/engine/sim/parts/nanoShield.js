// Placa de expansão do Nano: comportamento elétrico (ver shared/parts/nanoShield.js para o hardware).
//  - Ficha DC → interruptor (Power_Switch) → díodo SS54 (~0,4 V) → regulador de 5 V (queda ~1,2 V:
//    abaixo de ~6,2 V segue a entrada) → trilho V (todos os V, 5V da série/I2C e o 5V do Nano).
//  - AMS1117-3.3 a partir dos 5 V (queda ~1,1 V) → pinos 3V3.
//  - LED POWER no trilho de 5 V.
// Sem fonte na ficha, o trilho V é o 5V do Nano (USB): servos ligados aqui consomem da USB.
import * as i18n from '../../../../../shared/i18n.js'

const onOf = (input, cfg) => !!(input?.on ?? cfg.on ?? true)

export default {
  type: 'nanoShield',
  stamp({ cfg, input, cond, src, vd }) {
    cond('DC+', 'DC-', 1e-6) // fuga do condensador de entrada
    cond('D2.V', 'GND.1', 1 / 2200) // LED POWER (~2 mA)
    if (!onOf(input, cfg)) return
    const vin = vd('DC+', 'DC-') - 0.4 // depois do díodo de proteção
    // regulador de 5 V (LDO): só FORNECE corrente — se o trilho já estiver acima do que consegue
    // dar (ex.: 5 V da USB do Nano com pouca tensão na ficha), fica desligado em vez de a absorver
    const set5 = Math.min(5, Math.max(0, vin - 1.2))
    if (vin > 1 && vd('D2.V', 'GND.1') < set5 + 0.05) src('D2.V', 'GND.1', set5, 0.08, { kind: 'reg' })
    const v5 = vd('D2.V', 'GND.1')
    const set33 = Math.min(3.3, Math.max(0, v5 - 1.1))
    if (v5 > 1 && vd('3V3.1', 'GND.1') < set33 + 0.05) src('3V3.1', 'GND.1', set33, 0.2, { kind: 'reg' })
  },
  output({ live, input, cfg, vd }) {
    live.on = onOf(input, cfg)
    live.v5 = vd('D2.V', 'GND.1')
    live.vin = vd('DC+', 'DC-')
    live.pwr = live.v5 > 3
  },
  diagnose({ isC, name, issues, part, parts, vd }) {
    const vin = vd?.('DC+', 'DC-') ?? 0
    if (isC('DC+') && vin > 12.5) issues.push({ level: 'warn', msg: i18n.m(`${name}: ${vin.toFixed(1)} V na ficha DC — o regulador aguenta 7–12 V e aquece muito acima disso.`, `${name}: ${vin.toFixed(1)} V on the DC jack — the regulator takes 7–12 V and runs very hot above that.`), parts: [part.id] })
    else if (isC('DC+') && vin > 1 && vin < 6.5) issues.push({ level: 'info', msg: i18n.m(`${name}: ${vin.toFixed(1)} V na ficha DC — abaixo de ~6,5 V o regulador não chega aos 5 V (use 7–12 V).`, `${name}: ${vin.toFixed(1)} V on the DC jack — below ~6.5 V the regulator cannot reach 5 V (use 7–12 V).`), parts: [part.id] })
    const seated = (parts || []).some((q) => q.parent?.id === part.id && q.parent?.mount === 'socket')
    if (!seated) issues.push({ level: 'info', msg: i18n.m(`${name}: arraste um Arduino Nano para cima do soquete — os pinos ligam-se sozinhos.`, `${name}: drag an Arduino Nano onto the socket — the pins connect by themselves.`), parts: [part.id] })
  },
}
