// Grupo Pico (ver shared/parts/group-pico.js): Pico W, Pico 2, Pico 2 W e a placa Pico4Drive
import { UI_PICO_FAMILY } from './picoFamily.jsx'
import pico4drive from './pico4drive.jsx'
import nanoShield from './nanoShield.jsx'

export const UI_PICO = [...UI_PICO_FAMILY, pico4drive, nanoShield]
