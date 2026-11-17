// Bibliotecas Arduino suportadas pelo simulador. Cada ficheiro exporta por omissão:
//   {
//     header: 'Nome.h',                      // #include aceite (há um .h igual em backend/arduino/ para o clang)
//     globals: { CONST: valor, fn() {} },   // constantes/funções globais (opcional)
//     classes: { Nome: (env) => class {…} } // classes que o sketch instancia
//     env(env) => ({ objeto: … })          // objetos globais que precisam do env (ex.: WiFi)
//   }
// env = {
//   api            funções Arduino (pinMode, digitalWrite, digitalRead, analogRead, delay via __delay…)
//   rt             relógio do programa (rt.t em µs; somar tempo gasto: rt.t += µs)
//   partsOnPin(pin, type?)   peças ligadas (pela rede elétrica) a um pino do Arduino
//   i2c(addr, type?)         peça I2C nesse endereço com SDA/SCL ligados a A4/A5 (ou null)
//   powered(partId)          a peça tem alimentação?
//   pinsOf(partId, pin)      pinos do Arduino ligados (pela rede) ao pino de uma peça
//   state(partId)            estado persistente da peça (o `s` dos ganchos em sim/parts)
//   input(partId)            controlo interativo da peça no browser ({ value, on, pressed, key, x, y })
//   vd(partId, pinA, pinB)   tensão entre dois pinos de uma peça
//   fmt(valor, base)         formata como Serial.print (DEC/HEX/BIN, 2 casas nos float)
//   live(partId)             objeto de estado enviado ao browser (mutável)
//   touch()                  pede novo cálculo elétrico (mudou algo que afeta o circuito)
//   warnOnce(chave, texto)   aviso único no Monitor Série
// }
import servo from './Servo.js'
import liquidCrystalI2C from './LiquidCrystal_I2C.js'
import wifi from './WiFi.js'
import esp32Servo from './ESP32Servo.js'
import { LIBS_A } from './group-a.js'
import { LIBS_B } from './group-b.js'
import { LIBS_C } from './group-c.js'
import { LIBS_D } from './group-d.js'
import { LIBS_E } from './group-e.js'
import { LIBS_ROBOT } from './group-robot.js'
import { LIBS_TOOLS } from './group-tools.js'
import { LIBS_NET } from './group-net.js'
import { LIBS_G } from './group-g.js'
import { LIBS_MECH } from './group-mech.js'
import { LIBS_PICO } from './group-pico.js'
import { LIBS_V } from './group-v.js'

export const LIBS = [servo, esp32Servo, wifi, liquidCrystalI2C, ...LIBS_A, ...LIBS_B, ...LIBS_C, ...LIBS_D, ...LIBS_E, ...LIBS_ROBOT, ...LIBS_TOOLS, ...LIBS_NET, ...LIBS_G, ...LIBS_PICO, ...LIBS_MECH, ...LIBS_V]
export const LIB_CLASSES = LIBS.flatMap((l) => Object.keys(l.classes || {}))
export const LIB_HEADERS = ['Arduino.h', 'Wire.h', ...LIBS.map((l) => l.header)]
