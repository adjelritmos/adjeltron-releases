// Pico4Drive: comportamento elétrico (ver shared/parts/pico4drive.js para o hardware).
//  - Energia: VBAT (borne 2) → interruptor (MOSFETs SiSH101DN comandados pelo ATtiny412) → VIN
//    (= VM dos drivers) → regulador AP62200 de 5 V / 1,5 A → Q1 (DMG2301L, desliga com USB) → VSYS da Pico.
//    O ATtiny liga com o botão ON (ou ao iniciar, config.autoOn), corta com bateria fraca
//    (< 6,0 V durante 1 s, 2 células) ou acima de 11,5 V, e quando a Pico põe o GP21 a LOW.
//  - DRV8212P em modo PWM (MODE = VCC): IN1/IN2 = 1/0 → OUT1 H, 0/1 → OUT2 H, 1/1 → travão
//    (as duas saídas a GND), 0/0 → roda livre (alta impedância). Modelo médio: as entradas contam
//    pela fração do PWM; resistência HS + LS de ~0,28 Ω; proteção de sobrecorrente acima de ~4,5 A
//    (desliga e volta a tentar após ~2 ms). VM 1,65–11 V; a lógica (VCC) vem do 3V3 da Pico.
//  - 74HC4051: entrada ANx (470 Ω + ~80 Ω do interruptor) ligada ao GP28 conforme GP18–20.
//  - Divisores: GND —2K2— OUT —1K2— 5V —4K7— 12V.
//  - Trilho dos GPIO: 3V3 / 5V / VIN conforme o jumper (config.rail).
import { DEFS } from '../../../../../shared/components.js'
import * as i18n from '../../../../../shared/i18n.js'
const DRV = [
  ['GP11', 'GP10', 'M1A', 'M1B'],
  ['GP13', 'GP12', 'M2A', 'M2B'],
  ['GP15', 'GP14', 'M3A', 'M3B'],
  ['GP17', 'GP16', 'M4A', 'M4B'],
]
const R_HALF = 0.14 // Ω por meia-ponte (HS ou LS) do DRV8212P
const OCP_A = 4.5
const OCP_RETRY_MS = 2
const MUX = ['GP18', 'GP19', 'GP20']
const RAIL_TO = { '3V3': 'S.3V3', '5V': 'J.5V', VIN: 'J.VIN' }
const lvl = (vd, pin) => (vd(`S.${pin}`, 'GND') >= 1.65 ? 1 : 0)
// fração do tempo a HIGH de uma entrada do driver: PWM da Pico (step) ou nível pela tensão
const frac = (s, vd, pin) => s.fr?.[pin] ?? lvl(vd, pin)

export default {
  type: 'pico4drive',
  stamp({ s, cfg, cond, src, vd }) {
    cond('VBAT', 'GND', 1e-6) // ATtiny a dormir (~3 µA)
    // jumper VBUS–VBAT: a USB da Pico alimenta a placa
    if (cfg.usbJumper) cond('J.VBUS', 'J.VBAT', 1 / 0.05)
    // divisores resistivos
    for (const d of ['D1', 'D2']) {
      cond(d === 'D1' ? 'J.GND2' : 'J.GND3', `${d}.OUT`, 1 / 2200)
      cond(`${d}.OUT`, `${d}.5V`, 1 / 1200)
      cond(`${d}.5V`, `${d}.12V`, 1 / 4700)
    }
    // trilho de alimentação das colunas dos GPIO
    cond('GP0.V', RAIL_TO[cfg.rail] || 'S.3V3', 1 / 0.01)
    cond('J.VIN', 'GND', 1 / 100000)
    cond('J.5V', 'GND', 1 / 1000) // regulador sem carga + LED ON
    if (!s.pwr) return
    // interruptor da bateria (2 MOSFETs em série, ~20 mΩ)
    cond('VBAT', 'J.VIN', 1 / 0.02)
    const vin = vd('J.VIN', 'GND')
    // regulador comutado de 5 V (abaixo de ~5,3 V fica em "dropout": segue a entrada)
    if (vin > 2.5) src('J.5V', 'GND', Math.min(5.0, Math.max(0, vin - 0.3)), 0.05, { kind: 'reg' })
    // Q1: 5 V → VSYS da Pico quando a USB (VBUS) não está ligada
    if (s.q1) cond('J.5V', 'S.VSYS', 1 / 0.08)
    // multiplexador analógico
    if (s.mux >= 0) cond(`AN${s.mux}`, 'S.GP28', 1 / 550)
    // pontes H
    const vcc = vd('S.3V3', 'GND')
    if (vcc < 1.65 || vin < 1.65) return
    DRV.forEach(([in1, in2, oa, ob], k) => {
      if (s.ocp?.[k] > 0) return
      const fa = frac(s, vd, in1)
      const fb = frac(s, vd, in2)
      const c = Math.max(fa, fb)
      if (c < 0.005) return // as duas entradas a LOW: roda livre
      src(oa, 'GND', (vin * Math.max(0, fa - fb)) / c, R_HALF / c, { kind: 'drv', ch: k })
      src(ob, 'GND', (vin * Math.max(0, fb - fa)) / c, R_HALF / c, { kind: 'drv', ch: k })
    })
  },
  update({ s, cfg, vd, set }) {
    // estado inicial (antes do 1.º ms): com autoOn a placa arranca ligada se a bateria estiver boa
    if (s.pwr == null && cfg.autoOn !== false) {
      const v = vd('VBAT', 'GND')
      if (v >= (cfg.uvp === false ? 4.5 : 6.0) && v <= 11.5) set('pwr', true)
    }
    set('q1', s.pwr && vd('S.VBUS', 'GND') < 4 ? 1 : 0)
    const v3 = vd('S.3V3', 'GND')
    set('mux', s.pwr && v3 >= 2 ? MUX.reduce((a, p, i) => a | (lvl(vd, p) << i), 0) : -1)
    // entradas dos drivers (quando não vêm de pinos da Pico em PWM): nível pela tensão
    set('sig', DRV.flatMap(([a, b]) => [a, b]).map((p) => (s.fr?.[p] != null ? 'p' : lvl(vd, p))).join('') + (v3 >= 1.65 ? 1 : 0))
  },
  step(ctx) {
    const { s, cfg, vd, live, log, invalidate, boardPins, input, dt } = ctx
    // ---- ATtiny412: gestão de energia ----
    const vbat = vd('VBAT', 'GND')
    s.vbat = vbat
    s.t = (s.t || 0) + dt
    const ok = (v) => v >= (cfg.uvp === false ? 4.5 : 6.0) && v <= 11.5
    const turn = (on, why, level = 'info') => {
      if (!!s.pwr === on) return
      s.pwr = on
      s.lowMs = 0
      invalidate()
      if (why) log(`${on ? '🔌' : '⏻'} Pico4Drive ${on ? i18n.m('ligada', 'on') : i18n.m('desligada', 'off')}: ${why}`, level)
    }
    if (s.pwr == null) {
      s.pwr = false
      s.wantOn = cfg.autoOn !== false
    } else if (s.wantOn == null) s.wantOn = false
    const pressed = !!input.pressed
    if (pressed && !s.prevBtn && !s.pwr) s.wantOn = true
    s.prevBtn = pressed
    // botão OFF: o ATtiny corta a bateria (e anula um ON pendente)
    if (input.off) {
      s.wantOn = false
      turn(false, i18n.m('botão OFF', 'OFF button'))
    }
    if (!s.pwr && s.wantOn) {
      s.wantOn = false
      if (vbat < 0.5) log(i18n.m('⚠ Pico4Drive: carregou em ON mas não há bateria no borne VBAT/GND (5–11 V).', '⚠ Pico4Drive: ON was pressed but there is no battery on the VBAT/GND terminal (5–11 V).'), 'warn')
      else if (vbat > 11.5) log(i18n.m(`✖ Pico4Drive: ${vbat.toFixed(1)} V na entrada (máx. 11 V) — a proteção de sobretensão não deixa ligar.`, `✖ Pico4Drive: ${vbat.toFixed(1)} V at the input (max 11 V) — the overvoltage protection does not let it turn on.`), 'error')
      else if (!ok(vbat)) log(i18n.m(`⚠ Pico4Drive: bateria a ${vbat.toFixed(2)} V — abaixo de 6,0 V o ATtiny não liga (proteção de 2 células). Para uma fonte de 5 V desative a proteção.`, `⚠ Pico4Drive: battery at ${vbat.toFixed(2)} V — below 6.0 V the ATtiny does not turn on (2-cell protection). For a 5 V supply disable the protection.`), 'warn')
      else turn(true, s.t > 0.01 ? i18n.m('botão ON', 'ON button') : null)
    }
    if (s.pwr) {
      if (vbat > 11.5) turn(false, i18n.m(`sobretensão (${vbat.toFixed(1)} V > 11 V)`, `overvoltage (${vbat.toFixed(1)} V > 11 V)`), 'error')
      s.lowMs = vbat < (cfg.uvp === false ? 4.5 : 6.0) ? (s.lowMs || 0) + 1 : 0
      if (s.lowMs > 1000) turn(false, i18n.m(`bateria fraca (${vbat.toFixed(2)} V) — corte automático para proteger as células`, `low battery (${vbat.toFixed(2)} V) — automatic cutoff to protect the cells`), 'warn')
      // pedido da Pico: GP21 (ATTINY_CTRL) a LOW
      const n21 = ctx.boardPinsOn('S.GP21')
      const p21 = n21.length ? boardPins[n21[0]] : null
      if (p21?.mode === 'OUTPUT' && !p21.out && !p21.pwm) turn(false, 'power_off() pedido pela Pico (GP21 a LOW)')
    }
    // ---- entradas dos drivers vindas da Pico (duty do PWM ou nível) ----
    const fr = {}
    for (const [a, b] of DRV) {
      for (const pin of [a, b]) {
        const ns = ctx.boardPinsOn(`S.${pin}`)
        const bp = ns.length ? boardPins[ns[0]] : null
        if (bp) fr[pin] = bp.mode === 'OUTPUT' ? (bp.pwm ? bp.duty : bp.out) : 0 // pull-down interno do DRV8212P
      }
    }
    const key = JSON.stringify(fr)
    if (key !== s.frKey) {
      s.frKey = key
      s.fr = fr
      invalidate()
    }
    // ---- correntes e proteção de sobrecorrente ----
    s.ocp = s.ocp || [0, 0, 0, 0]
    const vin = vd('J.VIN', 'GND')
    const on = s.pwr && vd('S.3V3', 'GND') >= 1.65 && vin >= 1.65
    // corrente de cada ponte: a das fontes do último cálculo do circuito (média no PWM)
    const drvI = [0, 0, 0, 0]
    for (const src of ctx.circuit.sources) if (src.part === ctx.part.id && src.kind === 'drv') drvI[src.ch] = Math.max(drvI[src.ch], Math.abs(ctx.circuit.sourceCurrent(src)))
    s.amps = DRV.map((_, k) => {
      if (s.ocp[k] > 0) {
        if (--s.ocp[k] === 0) invalidate()
        return 0
      }
      if (!on) return 0
      const i = drvI[k]
      if (i > OCP_A) {
        s.ocp[k] = OCP_RETRY_MS
        invalidate()
        if (!s[`ocpw${k}`]) {
          s[`ocpw${k}`] = true
          log(i18n.m(`⚠ Pico4Drive: sobrecorrente no DRV${k + 1} (${i.toFixed(1)} A > ${OCP_A} A) — o DRV8212P desliga e volta a tentar. Curto-circuito ou motor bloqueado?`, `⚠ Pico4Drive: overcurrent on DRV${k + 1} (${i.toFixed(1)} A > ${OCP_A} A) — the DRV8212P shuts down and retries. Short circuit or stalled motor?`), 'warn')
        }
        return 0
      }
      return i
    })
    s.hot = s.amps.map((i, k) => (i > 2.1 ? (s.hot?.[k] || 0) + 1 : 0))
    s.hot.forEach((n, k) => {
      if (n > 3000 && !s[`hotw${k}`]) {
        s[`hotw${k}`] = true
        log(i18n.m(`⚠ Pico4Drive: DRV${k + 1} com ${s.amps[k].toFixed(1)} A há mais de 3 s (máx. 2 A contínuos) — no real aquece e entra em proteção térmica.`, `⚠ Pico4Drive: DRV${k + 1} at ${s.amps[k].toFixed(1)} A for more than 3 s (max 2 A continuous) — in real life it heats up and goes into thermal protection.`), 'warn')
      }
    })
    live.pwr = !!s.pwr
  },
  output({ s, vd, live, input }) {
    live.pwr = !!s.pwr
    live.vbat = Math.round((s.vbat || 0) * 100) / 100
    live.v5 = Math.round(vd('J.5V', 'GND') * 100) / 100
    live.btn = !!input.pressed
    live.btnOff = !!input.off
    live.mux = s.mux ?? -1
    live.out = DRV.map(([, , a, b], k) => ({ v: Math.round(vd(b, a) * 100) / 100, i: Math.round((s.amps?.[k] || 0) * 100) / 100, ocp: (s.ocp?.[k] || 0) > 0 }))
  },
  diagnose({ part, cfg, vd, isC, nets, name, issues, parts }) {
    const vbat = vd('VBAT', 'GND')
    const sockNet = nets.netOf(part.id, 'S.3V3')
    const mcu = nets.partsOnNet(sockNet).find((q) => q.id !== part.id && ['pico', 'picow', 'pico2', 'pico2w'].includes(q.type))
    if (!mcu) issues.push({ level: 'info', msg: i18n.m(`${name}: o soquete está vazio — arraste uma Raspberry Pi Pico (Pico, Pico W, Pico 2 ou Pico 2 W) para cima dele, com a USB virada para fora da placa.`, `${name}: the socket is empty — drag a Raspberry Pi Pico (Pico, Pico W, Pico 2 or Pico 2 W) onto it, with the USB facing away from the board.`), parts: [part.id] })
    if (!isC('VBAT') && !cfg.usbJumper) issues.push({ level: 'warn', msg: i18n.m(`${name}: sem bateria — ligue 2 células (7,4 V) ao borne VBAT (2) e GND (1). Sem ela os motores não andam.`, `${name}: no battery — connect 2 cells (7.4 V) to the VBAT (2) and GND (1) terminal. Without it the motors do not run.`), parts: [part.id] })
    else if (vbat > 11.5) issues.push({ level: 'error', msg: i18n.m(`${name}: ${vbat.toFixed(1)} V no VBAT — a entrada aceita 5–11 V (a proteção não deixa ligar acima disso; 3S LiPo é demais).`, `${name}: ${vbat.toFixed(1)} V on VBAT — the input accepts 5–11 V (the protection does not let it turn on above that; a 3S LiPo is too much).`), parts: [part.id] })
    else if (vbat > 0.5 && vbat < 6 && cfg.uvp !== false) issues.push({ level: 'warn', msg: i18n.m(`${name}: bateria a ${vbat.toFixed(1)} V — com a proteção de 2 células (< 6,0 V) a placa não liga. Desative-a nas propriedades se usar 5 V.`, `${name}: battery at ${vbat.toFixed(1)} V — with the 2-cell protection (< 6.0 V) the board does not turn on. Disable it in the properties if you use 5 V.`), parts: [part.id] })
    if (vd('VBAT', 'GND') < -0.3) issues.push({ level: 'error', msg: i18n.m(`${name}: bateria ao contrário no borne (a proteção de polaridade impede danos, mas a placa não liga).`, `${name}: battery reversed on the terminal (the polarity protection prevents damage, but the board does not turn on).`), parts: [part.id] })
    for (let k = 1; k <= 4; k++) {
      const a = isC(`M${k}A`)
      const b = isC(`M${k}B`)
      if (a !== b) issues.push({ level: 'warn', msg: i18n.m(`${name}: o motor ${k} só tem um fio no borne (M${k}A / M${k}B).`, `${name}: motor ${k} has only one wire on the terminal (M${k}A / M${k}B).`), parts: [part.id] })
    }
    for (const d of ['D1', 'D2']) {
      if (isC(`${d}.5V`) && vd(`${d}.5V`, 'GND') > 5.6) issues.push({ level: 'warn', msg: i18n.m(`${name}: ${vd(`${d}.5V`, 'GND').toFixed(1)} V na entrada de 5 V do divisor ${d.slice(1)} — para até 12 V use a entrada ${d}.12V.`, `${name}: ${vd(`${d}.5V`, 'GND').toFixed(1)} V on the 5 V input of divider ${d.slice(1)} — for up to 12 V use input ${d}.12V.`), parts: [part.id] })
    }
    // trilho dos GPIO no jumper 5V/VIN com a placa a arrancar desligada: as peças ligadas aos pinos V
    // dos GP (ou ao 5V/VIN) só têm tensão depois de carregar em ON — o fio está certo, falta ligar a placa
    if (cfg.rail !== '3V3' && cfg.autoOn === false) {
      const users = [...new Set([nets.netOf(part.id, 'GP0.V'), nets.netOf(part.id, 'J.5V'), nets.netOf(part.id, 'J.VIN')])]
        .flatMap((n) => nets.partsOnNet(n))
        .filter((q) => q.id !== part.id && q.type !== 'battery')
      if (users.length) {
        const list = users.map((q) => DEFS[q.type]?.short || DEFS[q.type]?.name || q.type).join(', ')
        issues.push({
          level: 'warn',
          msg: i18n.m(
            `${name}: ${list} ${users.length > 1 ? 'estão' : 'está'} nos pinos V dos GP (jumper ${cfg.rail}), que só têm tensão com a placa LIGADA. A placa arranca desligada ("Ao iniciar: Desligada"): carregue em ON durante a simulação, ou mude "Ao iniciar" para Ligada. Um programa que procure estes módulos logo no setup() não os encontra antes de carregar em ON.`,
            `${name}: ${list} ${users.length > 1 ? 'are' : 'is'} on the GP V pins (jumper ${cfg.rail}), which only have power with the board ON. The board starts off ("At start: Off"): press ON during the simulation, or set "At start" to On. A program that looks for these modules in setup() won't find them before ON is pressed.`,
          ),
          parts: [part.id, ...users.map((q) => q.id)],
          // estas peças estão bem ligadas: o aviso genérico "sem alimentação" delas sai (electrical.js)
          covers: users.map((q) => q.id),
        })
      }
    }
    if (cfg.rail !== '3V3') {
      const v = vd('GP0.V', 'GND')
      if (v > 3.7) issues.push({ level: 'info', msg: i18n.m(`${name}: os trilhos de alimentação dos GPIO estão a ${v.toFixed(1)} V (jumper ${cfg.rail}) — bom para servos, mas um sensor alimentado por eles devolve sinais acima de 3,3 V à Pico.`, `${name}: the GPIO power rails are at ${v.toFixed(1)} V (jumper ${cfg.rail}) — fine for servos, but a sensor powered from them returns signals above 3.3 V to the Pico.`), parts: [part.id] })
    }
    void parts
  },
}
