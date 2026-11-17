// Encoder.h (Paul Stoffregen, PJRC): contagem de encoders em quadratura com resolução 4×.
//   Encoder enc(pinA, pinB);  enc.read();  enc.write(n);  enc.readAndReset();
// Como a original: ativa os pull-ups, e em cada pino com interrupção externa liga uma ISR
// (CHANGE) que corre a máquina de estados de 4 bits; os pinos sem interrupção só são lidos
// quando se chama read() (a alta velocidade perdem-se passos — no Uno só D2 e D3 têm
// interrupção; no Mega 2, 3, 18–21; no ESP32/Pico todos). Os flancos sintetizados pelos
// motores com encoder chegam às ISR por ordem, com o nível dos pinos nesse instante.
// pino -> número da interrupção externa (placas AVR); no ESP32/Pico qualquer GPIO serve
import * as i18n from '../../../../../shared/i18n.js'
const INT_NUM = { uno: { 2: 0, 3: 1 }, mega: { 2: 0, 3: 1, 21: 2, 20: 3, 19: 4, 18: 5 } }

export default {
  header: 'Encoder.h',
  classes: {
    Encoder: (env) =>
      class Encoder {
        constructor(pin1, pin2) {
          this.p1 = pin1 | 0
          this.p2 = pin2 | 0
          this.position = 0
          this.state = 3
          // os objetos globais são criados a cada arranque da placa (antes do setup()), já com os
          // pinos no estado de arranque: o hardware (pull-ups e interrupções) prepara-se aqui
          this.begin()
        }
        begin() {
          const api = env.api
          api.pinMode(this.p1, api.INPUT_PULLUP)
          api.pinMode(this.p2, api.INPUT_PULLUP)
          this.state = (api.digitalRead(this.p1) ? 1 : 0) | (api.digitalRead(this.p2) ? 2 : 0)
          const tbl = INT_NUM[env.board?.id]
          const ints = tbl && Object.keys(tbl).map(Number)
          const can = (p) => !tbl || tbl[p] != null
          this.i1 = can(this.p1)
          this.i2 = can(this.p2)
          if (!this.i1 && !this.i2)
            env.warnOnce(`enc-noint${this.p1}`, i18n.m(`Encoder(${this.p1}, ${this.p2}): nenhum dos pinos tem interrupção externa no ${env.board?.mcu || 'Arduino'} (${ints ? `só ${ints.join(', ')}` : ''}). A contagem só é feita em cada read() e perde passos a alta velocidade — use os pinos 2 e 3.`, `Encoder(${this.p1}, ${this.p2}): neither pin has an external interrupt on the ${env.board?.mcu || 'Arduino'} (${ints ? `only ${ints.join(', ')}` : ''}). Counting only happens on each read() and loses steps at high speed — use pins 2 and 3.`))
          else if (!this.i1 || !this.i2)
            env.warnOnce(`enc-oneint${this.p1}`, i18n.m(`Encoder(${this.p1}, ${this.p2}): só o pino ${this.i1 ? this.p1 : this.p2} tem interrupção — funciona, mas a velocidades altas pode perder passos. O ideal é os dois pinos com interrupção (no Uno: 2 e 3).`, `Encoder(${this.p1}, ${this.p2}): only pin ${this.i1 ? this.p1 : this.p2} has an interrupt — it works, but at high speed it may lose steps. Ideally both pins have interrupts (on the Uno: 2 and 3).`))
          const isr = () => this.update()
          for (const [p, ok] of [[this.p1, this.i1], [this.p2, this.i2]]) if (ok) api.attachInterrupt(tbl ? tbl[p] : p, isr, api.CHANGE)
        }
        // máquina de estados da biblioteca original (resolução 4×)
        update() {
          const api = env.api
          let s = this.state & 3
          if (api.digitalRead(this.p1)) s |= 4
          if (api.digitalRead(this.p2)) s |= 8
          switch (s) {
            case 0: case 5: case 10: case 15:
              break
            case 1: case 7: case 8: case 14:
              this.position++
              break
            case 2: case 4: case 11: case 13:
              this.position--
              break
            case 3: case 12:
              this.position += 2
              break
            default:
              this.position -= 2
          }
          this.state = s >> 2
        }
        read() {
          if (!this.i1 || !this.i2) this.update()
          env.rt.t += 1
          return this.position
        }
        readAndReset() {
          const v = this.read()
          this.position = 0
          return v
        }
        write(p) {
          this.position = Math.trunc(Number(p) || 0)
        }
      },
  },
}
