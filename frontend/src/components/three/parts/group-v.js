// Grupo V de interfaces 3D/2D (componentes vindos do catálogo do Velxio)
import lcd2004p from './lcd2004p.jsx'
import eeprom24 from './eeprom24.jsx'
import mcp3008 from './mcp3008.jsx'
import cd4094 from './cd4094.jsx'
import placasV from './placasV.jsx'
import medidores from './medidores.jsx'
import botoes from './botoes.jsx'

export const UI_V = [lcd2004p, ...medidores, eeprom24, mcp3008, cd4094, ...placasV, ...botoes]
