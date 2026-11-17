// Grupo Robótica de bibliotecas (um import por biblioteca)
import wire from './Wire.js'
import adafruitSensor from './Adafruit_Sensor.js'
import adafruitMpu from './Adafruit_MPU6050.js'
import mpuLight from './MPU6050_light.js'
import pwmServo from './Adafruit_PWMServoDriver.js'

export const LIBS_ROBOT = [wire, adafruitSensor, adafruitMpu, mpuLight, pwmServo]
