// Regulador 7805 (5 V fixos, dropout ~2 V, limite ~1,5 A). Ver _regulator.js.
import { regulator } from './_regulator.js'

export default regulator({ type: 'lm7805', name: '7805', vref: 5.0, ref: 'GND', dropout: 2.0, ilim: 1.6, iq: 0.005 })
