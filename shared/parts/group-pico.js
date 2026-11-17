// Grupo Pico e placas com soquete: Raspberry Pi Pico W, Pico 2, Pico 2 W, a Pico4Drive (soquete para
// a Pico) e a placa de expansão do Nano (soquete para o Nano).
import { PICO_FAMILY } from './picoFamily.js'
import pico4drive from './pico4drive.js'
import nanoShield from './nanoShield.js'

export const GROUP_PICO = [...PICO_FAMILY, pico4drive, nanoShield]
