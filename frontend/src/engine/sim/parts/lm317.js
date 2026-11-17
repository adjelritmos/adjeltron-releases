// LM317: mantém 1,25 V entre OUT e ADJ (dropout ~1,7 V, limite ~1,5 A). Ver _regulator.js.
import { regulator } from './_regulator.js'

export default regulator({ type: 'lm317', name: 'LM317', vref: 1.25, ref: 'ADJ', dropout: 1.7, ilim: 1.5, iq: 0.005 })
