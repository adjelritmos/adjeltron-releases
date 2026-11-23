// Grupo Humanoide Microban (Rhoban): tronco, peças impressas, servo Dynamixel XL330 e o Raspberry Pi
// Zero 2 W decorativo (um import por componente).
import microbanTronco from './microbanTronco.js'
import microbanPeca from './microbanPeca.js'
import servoXL330 from './servoXL330.js'
import raspberryPiZero2W from './raspberryPiZero2W.js'

export const GROUP_MICROBAN = [microbanTronco, microbanPeca, servoXL330, raspberryPiZero2W]
