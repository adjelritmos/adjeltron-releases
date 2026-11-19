// Regulador ajustável LM317T (TO-220) com a marcação real.
import { To220 } from './_to220.jsx'
import { RegOverlay } from './lm7805.jsx'

function Model({ part }) {
  return <To220 text="LM317T" code="P+ 347  E3" sub="CHN" heatsink={!!part.config?.heatsink} />
}

export default { type: 'lm317', Model, Overlay2D: RegOverlay }
