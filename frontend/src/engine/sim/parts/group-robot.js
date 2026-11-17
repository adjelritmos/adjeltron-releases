// Grupo Robótica de comportamentos (drone, cão robô, humanoide): um import por componente.
// As estruturas mecânicas (droneFrame, quadrupedBody, humanoidTorso, servoBracket,
// robotFoot, robotPaw) não têm eletrónica: só física (no browser).
import mpu6050 from './mpu6050.js'
import pca9685 from './pca9685.js'
import esc from './esc.js'
import brushless from './brushless.js'
import lipo3s from './lipo3s.js'

export const GROUP_ROBOT = [mpu6050, pca9685, esc, brushless, lipo3s]
