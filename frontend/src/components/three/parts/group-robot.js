// Grupo Robótica de interfaces 3D/2D (um import por componente)
import mpu6050 from './mpu6050.jsx'
import pca9685 from './pca9685.jsx'
import esc from './esc.jsx'
import brushless from './brushless.jsx'
import lipo3s from './lipo3s.jsx'
import droneFrame from './droneFrame.jsx'
import quadrupedBody from './quadrupedBody.jsx'
import spiderChassis from './spiderChassis.jsx'
import humanoidTorso from './humanoidTorso.jsx'
import servoBracket from './servoBracket.jsx'
import robotFoot from './robotFoot.jsx'
import robotPaw from './robotPaw.jsx'

export const UI_ROBOT = [mpu6050, pca9685, esc, brushless, lipo3s, droneFrame, quadrupedBody, spiderChassis, humanoidTorso, servoBracket, robotFoot, robotPaw]
