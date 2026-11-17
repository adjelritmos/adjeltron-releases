// Grupo Cão robô (tipo PiDog): chassis de alumínio, pernas, cabeça, placas e módulos (um import por componente).
import chassisCaoAlu from './chassisCaoAlu.js'
import coxaAlu from './coxaAlu.js'
import canelaAlu from './canelaAlu.js'
import pataCao from './pataCao.js'
import pescocoCao from './pescocoCao.js'
import cabecaCao from './cabecaCao.js'
import raspberryPi from './raspberryPi.js'
import cameraModule from './cameraModule.js'
import barraLedRgb from './barraLedRgb.js'
import bateriaLipo2s from './bateriaLipo2s.js'
import espiralCabo from './espiralCabo.js'

export const GROUP_CAO = [chassisCaoAlu, coxaAlu, canelaAlu, pataCao, pescocoCao, cabecaCao, raspberryPi, cameraModule, barraLedRgb, bateriaLipo2s, espiralCabo]
