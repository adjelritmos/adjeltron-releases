// Grupo V: componentes que faltavam em relação ao Velxio (um import por componente)
import lcd2004p from './lcd2004p.js'
import eeprom24 from './eeprom24.js'
import mcp3008 from './mcp3008.js'
import cd4094 from './cd4094.js'
import placasV from './placasV.js'
import medidores from './medidores.js'
import botoes from './botoes.js'

export const GROUP_V = [lcd2004p, ...medidores, eeprom24, mcp3008, cd4094, ...placasV, ...botoes]
