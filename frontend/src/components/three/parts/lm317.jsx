// Regulador ajustável LM317T (TO-220).
import { To220 } from './_to220.jsx'
import { RegOverlay } from './lm7805.jsx'

function Model({ part }) {
  return <To220 text="LM317T" sub="ADJ·OUT·IN" heatsink={!!part.config?.heatsink} />
}

export default { type: 'lm317', Model, Overlay2D: RegOverlay }
