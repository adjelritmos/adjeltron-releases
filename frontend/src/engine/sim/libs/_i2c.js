// Acesso a dispositivos I2C simulados (usado pela Wire.h e por bibliotecas de sensores).
// Um componente em plugin torna-se um dispositivo I2C "a sério" com o gancho
//   i2c: { write(ctx, bytes), read(ctx, n) -> bytes }   (ver sim/parts/index.js)
// ctx = { part, cfg, s, live, input, env }. Peças I2C sem este gancho (LCD, OLED…)
// respondem com ACK mas ignoram os dados (um "scanner" I2C encontra-as na mesma).
import { BEHAVIORS } from '../parts/index.js'

// dispositivo no endereço `addr` (SDA/SCL ligados aos pinos I2C da placa e alimentado), ou null
export function i2cDevice(env, addr, type) {
  const part = env.i2c(addr, type)
  if (!part || !env.powered(part.id)) return null
  const B = BEHAVIORS[part.type]
  const ctx = { part, cfg: part.config || {}, s: env.state(part.id), live: env.live(part.id), input: env.input(part.id), env }
  return {
    part,
    write: (bytes) => B?.i2c?.write(ctx, bytes),
    read: (n) => {
      const out = B?.i2c?.read(ctx, n) || []
      return Array.from({ length: n }, (_, i) => out[i] ?? 0xff)
    },
  }
}

// dica de ligação com os pinos I2C da placa escolhida (Uno: A4/A5, ESP32: GPIO21/22, Pico: GP4/GP5)
export const i2cHint = (env) => {
  const b = env.board?.i2c
  return b ? `SDA → ${b.sda}, SCL → ${b.scl}` : 'SDA → A4, SCL → A5'
}

// tempo de uma transação: 9 bits por byte (8 + ACK) mais o byte de endereço
export const i2cTime = (env, nBytes, hz = 100000) => {
  env.rt.t += ((nBytes + 1) * 9 * 1e6) / hz
}
