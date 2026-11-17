// Grupo G (misc): NeoPixel isolado e matrizes (FastLED), botão 6 mm, marcador rotativo,
// motor de passo biaxial, relés (KS2E-M-DC5 e placas de 2/4/8 canais), solenoide, motor de
// vibração, drivers DRV8825 e TB6612FNG, servos MG90S e FS90R (rotação contínua).
import { neopixelLed, neopixelModule } from './neopixelSingle.js'
import { neopixelMatrix8, neopixelMatrix16 } from './neopixelMatrix.js'
import pushbutton6mm from './pushbutton6mm.js'
import rotaryDialer from './rotaryDialer.js'
import biaxialStepper from './biaxialStepper.js'
import ks2eRelay from './ks2eRelay.js'
import relayModules from './relayModule.js'
import solenoid from './solenoid.js'
import vibrationMotor from './vibrationMotor.js'
import drv8825 from './drv8825.js'
import tb6612 from './tb6612.js'
import { servoMG90, servoFS90R } from './servoMicro.js'

export const G_MISC = [neopixelLed, neopixelModule, neopixelMatrix8, neopixelMatrix16, pushbutton6mm, rotaryDialer, biaxialStepper, ks2eRelay, ...relayModules, solenoid, vibrationMotor, drv8825, tb6612, servoMG90, servoFS90R]
