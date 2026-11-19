// Reguladores 7812 e 7905 (TO-220) com a marcação real.
import { To220 } from './_to220.jsx'
import { RegOverlay } from './lm7805.jsx'

const R7812 = { type: 'lm7812', Model: ({ part }) => <To220 text="L7812CV" code="GK347  VB" sub="CHN" heatsink={!!part.config?.heatsink} />, Overlay2D: RegOverlay }
const R7905 = { type: 'lm7905', Model: ({ part }) => <To220 text="L7905CV" code="GK347  VB" sub="CHN" heatsink={!!part.config?.heatsink} />, Overlay2D: RegOverlay }

export default [R7812, R7905]
