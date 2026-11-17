// Grupo Robótica (drone, cão robô, humanoide): um import por componente
import mpu6050 from './mpu6050.js'
import pca9685 from './pca9685.js'
import esc from './esc.js'
import brushless from './brushless.js'
import lipo3s from './lipo3s.js'
import droneFrame from './droneFrame.js'
import quadrupedBody from './quadrupedBody.js'
import spiderChassis from './spiderChassis.js'
import humanoidTorso from './humanoidTorso.js'
import servoBracket from './servoBracket.js'
import robotFoot from './robotFoot.js'
import robotPaw from './robotPaw.js'

export const GROUP_ROBOT = [mpu6050, pca9685, esc, brushless, lipo3s, droneFrame, quadrupedBody, spiderChassis, humanoidTorso, servoBracket, robotFoot, robotPaw]
