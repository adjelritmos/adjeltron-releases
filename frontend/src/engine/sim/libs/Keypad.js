// Keypad (Mark Stanley / Alexander Brevig): varre a matriz a sério através dos pinos
// do Arduino — linhas com INPUT_PULLUP, uma coluna de cada vez a LOW. Uma ligação
// errada dá teclas trocadas ou nenhuma tecla, como no real.
// Só uma tecla de cada vez (a primeira encontrada), como getKey() da biblioteca.
import * as i18n from '../../../../../shared/i18n.js'
const NO_KEY = 0
const [IDLE, PRESSED, HOLD, RELEASED] = [0, 1, 2, 3]

export default {
  header: 'Keypad.h',
  globals: {
    NO_KEY,
    IDLE,
    PRESSED,
    HOLD,
    RELEASED,
    // char keys[4][4] -> mapa linear (como o cast (char*) da macro original)
    makeKeymap: (keys) => (Array.isArray(keys) ? keys.flat(Infinity) : keys),
  },
  classes: {
    Keypad: (env) =>
      class Keypad {
        constructor(keymap, rowPins, colPins, rows, cols) {
          this.map = Array.isArray(keymap) ? keymap.flat(Infinity) : []
          this.rowPins = Array.from(rowPins || []).slice(0, rows)
          this.colPins = Array.from(colPins || []).slice(0, cols)
          this.rows = rows
          this.cols = cols
          this.debounceUs = 10000
          this.holdUs = 500000
          this.lastScan = -Infinity
          this.cur = NO_KEY
          this.state = IDLE
          this.changed = false
          this.holdStart = 0
          this.listener = null
        }
        // varrimento elétrico: devolve a primeira tecla com a linha a LOW
        _scan() {
          const { pinMode, digitalWrite, digitalRead } = env.api
          for (const r of this.rowPins) pinMode(r, 'INPUT_PULLUP')
          let found = NO_KEY
          this.colPins.forEach((c, ci) => {
            pinMode(c, 'OUTPUT')
            digitalWrite(c, 0)
            this.rowPins.forEach((r, ri) => {
              if (!digitalRead(r) && found === NO_KEY) found = this.map[ri * this.cols + ci] ?? NO_KEY
            })
            digitalWrite(c, 1)
            pinMode(c, 'INPUT')
          })
          return found
        }
        // atualiza a máquina de estados; devolve true se algo mudou
        _update() {
          const now = env.rt.t
          if (now - this.lastScan < this.debounceUs) return false
          this.lastScan = now
          const k = this._scan()
          this.changed = false
          const set = (st) => {
            if (this.state !== st) {
              this.state = st
              this.changed = true
            }
          }
          if (k !== NO_KEY && k !== this.cur) {
            this.cur = k
            this.holdStart = now
            this.state = PRESSED
            this.changed = true
          } else if (k !== NO_KEY) {
            if (this.state === PRESSED && now - this.holdStart > this.holdUs) set(HOLD)
          } else if (this.cur !== NO_KEY) {
            if (this.state === RELEASED) {
              set(IDLE)
              this.cur = NO_KEY
            } else set(RELEASED)
          }
          return this.changed
        }
        getKey() {
          return this._update() && this.state === PRESSED ? this.cur : NO_KEY
        }
        getKeys() {
          return this._update()
        }
        keyStateChanged() {
          return this.changed
        }
        // waitForKey() bloqueia no real; aqui não é possível pausar dentro de uma
        // biblioteca: faz um varrimento e devolve NO_KEY se nada estiver premido
        waitForKey() {
          env.warnOnce('kpwait', i18n.m('Keypad.waitForKey(): no simulador não bloqueia — devolve NO_KEY se não houver tecla. Use getKey() dentro do loop().', 'Keypad.waitForKey(): in the simulator it does not block — returns NO_KEY if no key is pressed. Use getKey() inside loop().'))
          const k = this.getKey()
          if (k === NO_KEY) env.rt.t += 1000
          return k
        }
        getState() {
          this._update()
          return this.state
        }
        isPressed(ch) {
          this._update()
          return this.cur === ch && (this.state === PRESSED || this.state === HOLD)
        }
        setDebounceTime(ms) {
          this.debounceUs = Math.max(1, ms) * 1000
        }
        setHoldTime(ms) {
          this.holdUs = ms * 1000
        }
        numKeys() {
          return this.cur === NO_KEY ? 0 : 1
        }
        begin(keymap) {
          if (keymap) this.map = Array.isArray(keymap) ? keymap.flat(Infinity) : this.map
        }
      },
  },
}
