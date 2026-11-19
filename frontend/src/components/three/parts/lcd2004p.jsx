// LCD 20×4 paralelo (HD44780, 16 pinos): o mesmo desenho do 16×2 paralelo, maior e com 4 linhas.
import def, { LCD4_PIN_Y } from '@shared/parts/lcd2004p.js'
import { makeLcdParallel } from './lcd1602p.jsx'

export default makeLcdParallel({ type: 'lcd2004p', def, PIN_Y: LCD4_PIN_Y, COLS: 20, ROWS: 4, pcb: [9.8, 0.16, 6.0], frame: [9.7, 4.0], frameH: 0.8, glass: { x: [-3.85, 3.85], z: [-1.3, 1.3] }, texW: 1000, texH: 340, holes: [[-4.65, -2.75], [4.65, -2.75], [-4.65, 2.75], [4.65, 2.75]], inset: [0.045, 0.1], model: '2004A' })
