// Gerador de sinais e fonte de bancada.
//  - Gerador: fonte de 50 Ω cuja tensão muda a cada passo de 1 ms (fase acumulada, por isso
//    mudar a frequência em tempo real não dá saltos). Os valores vêm do painel "Controlos"
//    (ctx.input) ou da configuração.
//  - Fonte: CV (fonte de 5 mΩ) / CC (fonte de corrente) escolhido por iteração do solver.

import { boardIoOnNet, boardOf } from './group-c-util.js'
import * as i18n from '../../../../../shared/i18n.js'

const val = (ctx, k, d) => {
  const v = ctx.input?.[k] ?? ctx.cfg?.[k]
  return v == null || v === '' ? d : v
}
const TAU = Math.PI * 2

function wave(kind, ph, duty) {
  switch (kind) {
    case 'square':
      return ph < duty ? 1 : -1
    case 'triangle':
      return ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph
    case 'sawtooth':
      return 2 * ph - 1
    case 'dc':
      return 0
    default:
      return Math.sin(TAU * ph)
  }
}
const sigNow = (ctx, ph) => {
  const amp = Math.max(0, Math.min(10, +val(ctx, 'amp', 2)))
  const off = Math.max(-10, Math.min(10, +val(ctx, 'offset', 0)))
  const duty = Math.max(0.01, Math.min(0.99, +val(ctx, 'duty', 50) / 100))
  return Math.max(-12, Math.min(12, off + amp * wave(val(ctx, 'wave', 'sine'), ph, duty)))
}

const sigGen = {
  type: 'sigGen',
  stamp({ s, src, cfg, input }) {
    src('OUT', 'GND', s.v ?? sigNow({ cfg, input }, 0), 50)
  },
  step(ctx) {
    const { s, log, invalidate } = ctx
    const f = Math.max(0.01, Math.min(500, +val(ctx, 'freq', 2)))
    s.ph = ((s.ph || 0) + f * 0.001) % 1
    const v = sigNow(ctx, s.ph)
    if (v !== s.v) invalidate()
    s.v = v
    s.f = f
    if (f > 120 && val(ctx, 'wave', 'sine') !== 'dc' && !s.warnedF) {
      s.warnedF = true
      log(i18n.m(`ℹ Gerador de sinais a ${f} Hz: a simulação avança em passos de 1 ms (1000 amostras/s), por isso só ~${Math.round(1000 / f)} pontos por período — acima de ~100 Hz a forma de onda fica grosseira e acima de 500 Hz "dobra" (aliasing).`, `ℹ Signal generator at ${f} Hz: the simulation advances in 1 ms steps (1000 samples/s), so only ~${Math.round(1000 / f)} points per period — above ~100 Hz the waveform gets coarse and above 500 Hz it "folds" (aliasing).`), 'info')
    }
  },
  output(ctx) {
    const { s, live, vd } = ctx
    live.v = Math.round((s.v ?? 0) * 1000) / 1000
    live.out = Math.round(vd('OUT', 'GND') * 1000) / 1000
    live.wave = val(ctx, 'wave', 'sine')
    live.freq = +val(ctx, 'freq', 2)
    live.amp = +val(ctx, 'amp', 2)
    live.offset = +val(ctx, 'offset', 0)
  },
  diagnose(ctx) {
    const { part, isC, nets, name, issues } = ctx
    if (!isC('OUT') || !isC('GND')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue o OUT (vermelho) ao circuito e o GND (preto) ao GND do Arduino.`, `${name}: connect OUT (red) to the circuit and GND (black) to the Arduino's GND.`), parts: [part.id] })
    const amp = +val(ctx, 'amp', 2)
    const off = +val(ctx, 'offset', 0)
    const dc = val(ctx, 'wave', 'sine') === 'dc'
    const lo = dc ? off : off - amp
    const hi = dc ? off : off + amp
    const pins = boardIoOnNet(nets, nets.netOf(part.id, 'OUT'))
    const b = boardOf(nets)
    if (pins.length && b) {
      const vio = b.type === 'esp32' || b.type === 'pico' ? 3.3 : 5
      if (lo < -0.5) issues.push({ level: 'error', msg: i18n.m(`${name}: o sinal desce a ${lo.toFixed(1)} V e está ligado ao pino ${pins[0]} — tensões negativas danificam as entradas. Suba o offset (ex.: offset = amplitude).`, `${name}: the signal goes down to ${lo.toFixed(1)} V and is connected to pin ${pins[0]} — negative voltages damage the inputs. Raise the offset (e.g. offset = amplitude).`), parts: [part.id] })
      if (hi > vio + 0.5) issues.push({ level: 'error', msg: i18n.m(`${name}: o sinal sobe a ${hi.toFixed(1)} V e está ligado ao pino ${pins[0]} (máx. ${vio} V). Baixe a amplitude/offset ou use um divisor de tensão.`, `${name}: the signal goes up to ${hi.toFixed(1)} V and is connected to pin ${pins[0]} (max ${vio} V). Lower the amplitude/offset or use a voltage divider.`), parts: [part.id] })
    }
    if (isC('OUT') && b && nets.netOf(part.id, 'GND') !== nets.netOf(b.id, 'GND.1')) issues.push({ level: 'warn', msg: i18n.m(`${name}: o GND do gerador não está ligado ao GND do Arduino — sem massa comum a leitura fica sem referência.`, `${name}: the generator's GND is not connected to the Arduino's GND — without a common ground the reading has no reference.`), parts: [part.id] })
  },
}

const RCV = 0.005
// CC: em vez de uma fonte de corrente ideal (que, com cargas não lineares — ex.: um MOSFET
// comandado pela própria fonte — dava milhares de volts nas iterações do solver), a fonte
// regula a SUA tensão interna vcc entre 0 e a tensão definida para a corrente ser o limite,
// como o laço de regulação de uma fonte real. A saída nunca passa da tensão definida.
const setV = (ctx) => Math.max(0, Math.min(30, +val(ctx, 'volts', 12)))
const setI = (ctx) => Math.max(0.001, Math.min(5, +val(ctx, 'ilim', 1)))
// tensão interna que dá a corrente I com a carga atual (estimada por v/i)
function ccTarget(v, i, I, V) {
  if (!(i > 1e-9)) return V
  const rl = Math.max(0, v) / i
  return Math.max(0, Math.min(V, I * (rl + RCV)))
}
const benchPsu = {
  type: 'benchPsu',
  stamp(ctx) {
    const { s, src, cond } = ctx
    cond('+', '-', 1e-6)
    if (!+val(ctx, 'out', 1)) return
    const V = setV(ctx)
    src('+', '-', s.mode === 'cc' ? Math.min(V, s.vcc ?? V) : V, RCV, { kind: 'psu' })
  },
  update(ctx) {
    const { s, vd, set } = ctx
    if (!+val(ctx, 'out', 1)) return set('mode', 'off')
    const V = setV(ctx)
    const I = setI(ctx)
    const v = vd('+', '-')
    const vin = s.mode === 'cc' ? Math.min(V, s.vcc ?? V) : V
    const i = (vin - v) / RCV
    if (s.mode !== 'cc') {
      if (i > I * 1.002) {
        set('mode', 'cc')
        set('vcc', Math.round(ccTarget(v, i, I, V) * 1e4) / 1e4)
        // intervalo da regulação: a 0 V não passa corrente, à tensão definida passa i > I
        Object.assign(s, { lo: 0, ilo: 0, hi: V, ihi: i, side: 0 })
      } else set('mode', 'cv')
      return
    }
    // em CC a tensão interna fica fixa durante o passo (o solver vê uma fonte normal);
    // o ajuste é feito em step(), uma vez por passo de 1 ms
    set('mode', 'cc')
  },
  step(ctx) {
    const { s, vd, invalidate, log } = ctx
    // novos valores no painel: nova solução; confirma o modo CV/CC
    const key = `${val(ctx, 'out', 1)}|${val(ctx, 'volts', 12)}|${val(ctx, 'ilim', 1)}`
    if (key !== s.key) {
      s.key = key
      invalidate()
    }
    const V = setV(ctx)
    const I = setI(ctx)
    if (s.mode === 'cv' && (V - vd('+', '-')) / RCV > I * 1.01) invalidate()
    // CC: laço de regulação, 1 ajuste por passo de 1 ms. A corrente da carga cresce com a
    // tensão, por isso procura-se a tensão interna num intervalo [lo, hi] (lo: corrente abaixo
    // do limite, hi: acima) por regula falsi com bisseção — converge mesmo com cargas muito
    // não lineares (ex.: MOSFET comandado pela própria fonte) e nunca sai de [0, V].
    if (s.mode === 'cc') {
      const v = vd('+', '-')
      const vin = Math.min(V, s.vcc ?? V)
      const i = (vin - v) / RCV
      if (s.lo == null) Object.assign(s, { lo: 0, ilo: 0, hi: V, ihi: Math.max(I * 2, i), side: 0 })
      // a carga mudou (o intervalo já não contém a solução): reabre-o
      if (i > I && vin <= s.lo) Object.assign(s, { lo: 0, ilo: 0 })
      if (i < I && vin >= s.hi) Object.assign(s, { hi: V, ihi: I * 2 })
      let side = 0
      if (i > I) (s.hi = vin), (s.ihi = i), (side = 1)
      else (s.lo = vin), (s.ilo = i), (side = -1)
      if (i < I && vin >= V - 0.01) {
        s.mode = 'cv'
        s.lo = null
        invalidate()
      } else if (Math.abs(i - I) > I * 0.003 && s.hi - s.lo > 1e-4) {
        let c = s.lo + ((I - s.ilo) * (s.hi - s.lo)) / (s.ihi - s.ilo)
        // o mesmo lado duas vezes seguidas (regula falsi lenta) ou fora do intervalo: bisseção
        if (!(c > s.lo && c < s.hi) || side === s.side) c = (s.lo + s.hi) / 2
        s.side = side
        s.vcc = c
        invalidate()
      }
    }
    if (s.mode === 'cc' && !s.warnedCC) {
      s.warnedCC = true
      log(i18n.m(`ℹ Fonte em limite de corrente (CC): ${I} A a ${vd('+', '-').toFixed(2)} V em vez de ${V} V — a carga pede mais do que o limite (ou há um curto-circuito).`, `ℹ Supply in current limit (CC): ${I} A at ${vd('+', '-').toFixed(2)} V instead of ${V} V — the load draws more than the limit (or there is a short circuit).`), 'info')
    }
    if (s.mode !== 'cc') s.warnedCC = false
  },
  output(ctx) {
    const { s, vd, live } = ctx
    const v = vd('+', '-')
    const V = +val(ctx, 'volts', 12)
    live.v = Math.round(v * 100) / 100
    const vin = s.mode === 'cc' ? Math.min(setV(ctx), s.vcc ?? V) : setV(ctx)
    live.i = s.mode === 'off' ? 0 : Math.round(Math.max(0, (vin - v) / RCV) * 1000) / 1000
    live.mode = s.mode === 'off' ? 'off' : s.mode === 'cc' ? 'CC' : 'CV'
    live.set = V
    live.ilim = +val(ctx, 'ilim', 1)
  },
  diagnose(ctx) {
    const { part, isC, name, issues, s, vd } = ctx
    if (!isC('+') || !isC('-')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue os bornes + (vermelho) e − (preto).`, `${name}: connect the + (red) and − (black) terminals.`), parts: [part.id] })
    if (s.mode === 'cc') issues.push({ level: 'warn', msg: i18n.m(`${name}: em limite de corrente (${val(ctx, 'ilim', 1)} A) logo ao ligar — a tensão fica em ${vd('+', '-').toFixed(1)} V. Curto-circuito ou carga demasiado pesada?`, `${name}: in current limit (${val(ctx, 'ilim', 1)} A) right at power-on — the voltage sits at ${vd('+', '-').toFixed(1)} V. Short circuit or too heavy a load?`), parts: [part.id] })
  },
}

export default [sigGen, benchPsu]
