// RTC DS3231: 2,3–5,5 V; por I2C responde em 0x68; tem sensor de temperatura.
import { rtcBehavior } from './_rtc.js'

export default rtcBehavior('ds3231', { vcc: 'VCC', vMin: 2.3 })
