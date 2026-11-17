// LCD 20×4 paralelo (HD44780, 16 pinos): o mesmo controlador do LCD 16×2 paralelo
// (sim/parts/lcd1602p.js), com 4 linhas de 20 colunas (DDRAM 0x00, 0x40, 0x14, 0x54).
import base, { makeOutput } from './lcd1602p.js'

export default { ...base, type: 'lcd2004p', output: makeOutput(20, 4) }
