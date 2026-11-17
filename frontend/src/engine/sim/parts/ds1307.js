// RTC DS1307: só funciona a 5 V (4,5–5,5 V); por I2C responde em 0x68.
import { rtcBehavior } from './_rtc.js'

export default rtcBehavior('ds1307', { vcc: '5V', vMin: 4.3 })
