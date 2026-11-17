// Grupo G (misc): interfaces 3D/2D de NeoPixel isolado e matrizes, botão 6 mm, marcador
// rotativo, motor biaxial, relés, solenoide, motor de vibração, DRV8825, TB6612 e micro servos.
import neopixels from './neopixelG.jsx'
import pushbutton6mm from './pushbutton6mm.jsx'
import rotaryDialer from './rotaryDialer.jsx'
import biaxialStepper from './biaxialStepper.jsx'
import relays from './relayG.jsx'
import coils from './coilsG.jsx'
import drivers from './driversG.jsx'
import servos from './servoMicro.jsx'

export const UI_G_MISC = [...neopixels, pushbutton6mm, rotaryDialer, biaxialStepper, ...relays, ...coils, ...drivers, ...servos]
