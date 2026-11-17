// Keyestudio Nano CH340: o modelo do Nano (mesma geometria e pinos) em placa preta, com o nome
// Keyestudio e o conector ICSP 2 × 3 amarelo na ponta oposta à mini-USB.
import { makeNanoModel, NanoOverlay2D } from './nano.jsx'

export default { type: 'nanoKeyestudio', Model: makeNanoModel({ pcb: '#141414', title: 'Keyestudio', titleFont: 'bold 30px Arial', icsp: 'yellow', key: 'nano-keyestudio' }), Overlay2D: NanoOverlay2D }
