// Grupo C de comportamentos (um import por componente)
// (o Arduino Nano não tem ficheiro aqui: as placas são tratadas pelo caso 'arduino' do solver)
import stepper from './stepper.js'
import dcMotor from './dcMotor.js'
import npn from './npn.js'
import mosfet from './mosfet.js'
import diode from './diode.js'
import zener from './zener.js'
import capacitor from './capacitor.js'
import battery9v from './battery9v.js'
import aaPack from './aaPack.js'
import painelSolar from './painelSolar.js'

// caixa 4×AA em 2 camadas: a mesma eletrónica do suporte plano
const aaBox4 = { ...aaPack, type: 'aaBox4' }

export const GROUP_C = [stepper, dcMotor, npn, mosfet, diode, zener, capacitor, battery9v, aaPack, aaBox4, painelSolar]
