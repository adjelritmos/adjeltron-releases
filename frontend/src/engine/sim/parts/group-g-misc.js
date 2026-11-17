// Grupo G (misc): comportamentos de NeoPixel isolado e matrizes, botão 6 mm, marcador
// rotativo, motor biaxial, DRV8825, TB6612FNG, relés KS2E e placas de relés, solenoide,
// motor de vibração e servos MG90S / FS90R.
import neopixels from './neopixelG.js'
import pushbutton6mm from './pushbutton6mm.js'
import rotaryDialer from './rotaryDialer.js'
import biaxialStepper from './biaxialStepper.js'
import drv8825 from './drv8825.js'
import tb6612 from './tb6612.js'
import { ks2eRelay, relayBoards } from './relayG.js'
import { solenoid, vibrationMotor } from './coilsG.js'
import { servoMG90, servoFS90R } from './servoMicro.js'

export const G_MISC = [...neopixels, pushbutton6mm, rotaryDialer, biaxialStepper, drv8825, tb6612, ks2eRelay, ...relayBoards, solenoid, vibrationMotor, servoMG90, servoFS90R]
