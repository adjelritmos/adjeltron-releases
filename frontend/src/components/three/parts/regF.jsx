// Reguladores 7812 e 7905 (TO-220).
import { To220 } from './_to220.jsx'
import { RegOverlay } from './lm7805.jsx'

const R7812 = { type: 'lm7812', Model: ({ part }) => <To220 text="L7812CV" sub="12V  IN·GND·OUT" heatsink={!!part.config?.heatsink} />, Overlay2D: RegOverlay }
const R7905 = { type: 'lm7905', Model: ({ part }) => <To220 text="L7905CV" sub="−5V  GND·IN·OUT" heatsink={!!part.config?.heatsink} />, Overlay2D: RegOverlay }

export default [R7812, R7905]
