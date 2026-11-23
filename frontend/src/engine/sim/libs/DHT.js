// DHT (Adafruit): leitura do DHT22/DHT11 ligado ao pino indicado.
// Como no real: sem sensor nesse pino, sem alimentação ou nos 1–2 s após ligar,
// devolve NaN; entre leituras com menos de 2 s devolve a leitura anterior; usar o
// tipo errado (DHT11 num DHT22) dá valores sem sentido (os bytes são outros).
import * as i18n from '../../../../../shared/i18n.js'
const MIN_INTERVAL_US = 2000000

// 5 bytes como o sensor os envia
function frame(type, t, h) {
  if (type === 'dht11') {
    // DHT11: 20–90 % HR e 0–50 °C, só valores inteiros (os bytes decimais vão a 0)
    const hi = Math.round(Math.max(20, Math.min(90, h)))
    const ti = Math.round(Math.max(0, Math.min(50, t)))
    return [hi, 0, ti, 0, 0]
  }
  const hh = Math.round(Math.max(0, Math.min(100, h)) * 10)
  const tt = Math.round(Math.abs(Math.max(-40, Math.min(80, t))) * 10)
  return [hh >> 8, hh & 255, ((tt >> 8) & 0x7f) | (t < 0 ? 0x80 : 0), tt & 255, 0]
}
// descodificação feita pela biblioteca, conforme o tipo declarado no sketch
function decode(type, d) {
  if (type === 11) return { h: d[0] + d[1] * 0.1, t: d[2] + (d[3] & 0x0f) * 0.1 * (d[3] & 0x80 ? -1 : 1) }
  const h = ((d[0] << 8) | d[1]) * 0.1
  let t = (((d[2] & 0x7f) << 8) | d[3]) * 0.1
  if (d[2] & 0x80) t = -t
  return { h, t }
}

export default {
  header: 'DHT.h',
  globals: { DHT11: 11, DHT12: 12, DHT21: 21, DHT22: 22, AM2301: 21 },
  classes: {
    DHT: (env) =>
      class DHT {
        constructor(pin, type = 22) {
          this.pin = pin
          this.type = type
          this.last = -Infinity
          this.result = { ok: false, t: NaN, h: NaN }
        }
        begin() {
          env.api.pinMode(this.pin, 'INPUT_PULLUP')
          this.last = env.rt.t - MIN_INTERVAL_US
        }
        _sensor() {
          return env.partsOnPin(this.pin).find((q) => q.type === 'dht22' || q.type === 'dht11') || null
        }
        read(force = false) {
          const now = env.rt.t
          // DHT11: uma leitura por segundo; DHT22: uma a cada 2 s
          if (!force && now - this.last < (this.type === 11 ? 1000000 : MIN_INTERVAL_US)) return this.result.ok
          this.last = now
          // sinal de arranque (LOW 1 ms no DHT22 / 20 ms no DHT11) + resposta de 40 bits (~4 ms)
          env.api.pinMode(this.pin, 'OUTPUT')
          env.api.digitalWrite(this.pin, 0)
          env.rt.t += this.type === 11 ? 20000 : 1100
          env.api.pinMode(this.pin, 'INPUT_PULLUP')
          const fail = (msg) => {
            if (msg) env.warnOnce(`dht${this.pin}`, msg)
            env.rt.t += 1000 // espera pela resposta até ao timeout
            this.result = { ok: false, t: NaN, h: NaN }
            return false
          }
          const p = this._sensor()
          if (!p) return fail(i18n.m(`DHT no pino ${this.pin}: não há nenhum sensor DHT com DATA ligado a esse pino. Verifique o fio e o número em DHT dht(${this.pin}, DHT22).`, `DHT on pin ${this.pin}: no DHT sensor has DATA connected to that pin. Check the wire and the number in DHT dht(${this.pin}, DHT22).`))
          if (!env.powered(p.id)) return fail(i18n.m(`DHT no pino ${this.pin}: o sensor não tem alimentação (VCC → 5V, GND → GND).`, `DHT on pin ${this.pin}: the sensor has no power (VCC → 5V, GND → GND).`))
          const st = env.state(p.id)
          if (st.onUs != null && now - st.onUs < 1000000) return fail(null) // ainda a arrancar (~1 s)
          // a linha tem de estar livre (HIGH) para o sensor a puxar para LOW
          if (!env.api.digitalRead(this.pin)) return fail(i18n.m(`DHT no pino ${this.pin}: a linha DATA está presa em LOW (curto ao GND?).`, `DHT on pin ${this.pin}: the DATA line is stuck LOW (short to GND?).`))
          const inp = env.input(p.id)
          const cfg = p.config || {}
          const d = frame(p.type, inp.value ?? 22, inp.humidity ?? cfg.humidity ?? 50)
          d[4] = (d[0] + d[1] + d[2] + d[3]) & 255
          env.rt.t += 4000
          const { t, h } = decode(this.type, d)
          this.result = { ok: true, t: Math.round(t * 10) / 10, h: Math.round(h * 10) / 10 }
          env.live(p.id).lastRead = Math.round(now / 1000)
          return true
        }
        readTemperature(fahrenheit = false, force = false) {
          this.read(force)
          const t = this.result.t
          return fahrenheit ? this.convertCtoF(t) : t
        }
        readHumidity(force = false) {
          this.read(force)
          return this.result.h
        }
        convertCtoF(c) {
          return c * 1.8 + 32
        }
        convertFtoC(f) {
          return (f - 32) * 0.55555
        }
        // índice de calor (fórmula da NOAA, como na biblioteca Adafruit)
        computeHeatIndex(temperature, humidity, isFahrenheit = true) {
          // forma curta computeHeatIndex(isFahrenheit): usa a última leitura
          if (humidity === undefined) {
            isFahrenheit = temperature ?? true
            this.read()
            temperature = isFahrenheit ? this.convertCtoF(this.result.t) : this.result.t
            humidity = this.result.h
          }
          const T = isFahrenheit ? temperature : this.convertCtoF(temperature)
          let hi = 0.5 * (T + 61.0 + (T - 68.0) * 1.2 + humidity * 0.094)
          if (hi > 79) {
            hi = -42.379 + 2.04901523 * T + 10.14333127 * humidity - 0.22475541 * T * humidity - 0.00683783 * T * T - 0.05481717 * humidity * humidity + 0.00122874 * T * T * humidity + 0.00085282 * T * humidity * humidity - 0.00000199 * T * T * humidity * humidity
            if (humidity < 13 && T >= 80 && T <= 112) hi -= ((13 - humidity) * 0.25) * Math.sqrt((17 - Math.abs(T - 95)) * 0.05882)
            else if (humidity > 85 && T >= 80 && T <= 87) hi += ((humidity - 85) * 0.1) * ((87 - T) * 0.2)
          }
          return isFahrenheit ? hi : this.convertFtoC(hi)
        }
      },
  },
}
