// Grupo V de comportamentos (componentes vindos do catálogo do Velxio)
import lcd2004p from './lcd2004p.js'
import eeprom24 from './eeprom24.js'
import mcp3008 from './mcp3008.js'
import cd4094 from './cd4094.js'
import medidores from './medidores.js'
import botoes from './botoes.js'

export const GROUP_V = [lcd2004p, ...medidores, eeprom24, mcp3008, cd4094, ...botoes]
