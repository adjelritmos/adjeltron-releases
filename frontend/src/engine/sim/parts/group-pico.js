// Comportamentos do grupo Pico (ver shared/parts/group-pico.js). As Pico W / Pico 2 / Pico 2 W
// usam o modelo elétrico das placas (electrical.js, perfil da família 'pico').
import pico4drive from './pico4drive.js'
import nanoShield from './nanoShield.js'

export const GROUP_PICO = [pico4drive, nanoShield]
