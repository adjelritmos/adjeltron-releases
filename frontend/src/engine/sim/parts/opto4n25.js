// 4N25: o mesmo modelo do PC817 (LED IR + fototransístor com CTR, três regiões) com o LED de
// 1,2 V / máx. 60 mA, a base acessível (pino 6, com fuga para o emissor) e mensagens próprias.
import pc817 from './pc817.js'
import { boardIoOnNet } from './group-c-util.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  ...pc817,
  type: 'opto4n25',
  stamp(ctx) {
    ctx.cond('B', 'E', 1e-9)
    pc817.stamp(ctx)
  },
  step(ctx) {
    const { s, part, live, log, burn, circuit } = ctx
    const i = circuit.diodeCurrent(part, 'led')
    if (!s.x_led && i > 0.065) {
      s.over4 = (s.over4 || 0) + 1
      if (s.over4 > 200) {
        burn('led')
        live.burned = true
        log(i18n.m(`💥 O LED do 4N25 queimou (${(i * 1000).toFixed(0)} mA; máx. 60 mA). Use 220–330 Ω em série com o ânodo.`, `💥 The 4N25 LED burned out (${(i * 1000).toFixed(0)} mA; max 60 mA). Use 220–330 Ω in series with the anode.`), 'error')
        return
      }
    } else s.over4 = 0
    // o PC817 queima acima de 50 mA; aqui o limite é 60 mA (tratado acima)
    s.over = 0
    pc817.step(ctx)
  },
  diagnose({ part, isC, nets, name, issues, vd }) {
    if (!isC('A') || !isC('K')) issues.push({ level: 'info', msg: i18n.m(`${name}: lado do LED por ligar — A (pino 1, com o ponto) ao pino do Arduino por 220–330 Ω, K (pino 2) ao GND.`, `${name}: LED side not connected — A (pin 1, with the dot) to the Arduino pin through 220–330 Ω, K (pin 2) to GND.`), parts: [part.id] })
    const pins = boardIoOnNet(nets, nets.netOf(part.id, 'A'))
    const rs = nets.partsOnNet(nets.netOf(part.id, 'A')).some((q) => q.type === 'resistor') || nets.partsOnNet(nets.netOf(part.id, 'K')).some((q) => q.type === 'resistor')
    if (pins.length && !rs) issues.push({ level: 'warn', msg: i18n.m(`${name}: o LED está ligado diretamente ao pino ${pins[0]} sem resistência — passam demasiados mA. Ponha 220–330 Ω em série.`, `${name}: the LED is connected directly to pin ${pins[0]} without a resistor — too many mA flow. Put 220–330 Ω in series.`), parts: [part.id] })
    if (!isC('C') || !isC('E')) issues.push({ level: 'info', msg: i18n.m(`${name}: lado do transístor por ligar — C (pino 5) com pull-up (4,7–10 kΩ) à tensão do outro circuito, E (pino 4) ao GND desse circuito.`, `${name}: transistor side not connected — C (pin 5) with a pull-up (4.7–10 kΩ) to the other circuit's voltage, E (pin 4) to that circuit's GND.`), parts: [part.id] })
    if (vd('C', 'E') < -0.5) issues.push({ level: 'warn', msg: i18n.m(`${name}: C (pino 5) e E (pino 4) trocados — o coletor tem de ficar a uma tensão maior que o emissor.`, `${name}: C (pin 5) and E (pin 4) swapped — the collector must be at a higher voltage than the emitter.`), parts: [part.id] })
  },
}
