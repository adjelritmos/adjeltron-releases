// Motor TT 1:48 com encoder Hall: o mesmo modelo do motor TT (motorTT.jsx) com o disco magnético
// no veio de trás do motor, a placa do encoder e a ficha de 6 vias.
import { TTModel } from './motorTT.jsx'
import { MotorOverlay } from './motorEnc.jsx'
import def from '@shared/parts/motorTTEnc.js'

function Model({ part }) {
  return <TTModel part={part} enc pins={def.pins} />
}

export default { type: 'motorTTEnc', Model, Overlay2D: MotorOverlay }
