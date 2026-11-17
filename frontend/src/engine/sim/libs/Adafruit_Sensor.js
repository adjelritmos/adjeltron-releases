// Adafruit_Sensor.h (Unified Sensor): só o tipo sensors_event_t e as constantes.
const vec = () => ({ x: 0, y: 0, z: 0, roll: 0, pitch: 0, heading: 0, v: [0, 0, 0] })

export class SensorsEvent {
  constructor() {
    Object.assign(this, { version: 0, sensor_id: 0, type: 0, timestamp: 0, temperature: 0, distance: 0, light: 0, pressure: 0, relative_humidity: 0, current: 0, voltage: 0 })
    this.acceleration = vec()
    this.gyro = vec()
    this.magnetic = vec()
    this.orientation = vec()
  }
}

export default {
  header: 'Adafruit_Sensor.h',
  globals: {
    SENSORS_GRAVITY_EARTH: 9.80665,
    SENSORS_GRAVITY_STANDARD: 9.80665,
    SENSORS_DPS_TO_RADS: 0.017453293,
    SENSORS_RADS_TO_DPS: 57.29577793,
  },
  classes: { sensors_event_t: () => SensorsEvent },
}
