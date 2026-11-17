// Escolha do motor de simulação de um projeto (puro: as funções de compilação vêm de fora —
// engine-select.js no backend Bun, frontend/src/sim/desktop/compile.js na app desktop):
//   'real' — emulação real (como o Velxio): o sketch é compilado pelo arduino-cli
//            (avr-gcc) e o .hex corre no avr8js, instrução a instrução (Uno, Nano, Mega);
//   'fast' — tradutor rápido: o C++ é traduzido para JavaScript (sim/compiler.js) e as
//            bibliotecas são simuladas (sim/libs);
//   'auto' — emulação real se a placa for AVR, o arduino-cli existir e todas as peças
//            tiverem suporte ao nível dos pinos; senão o tradutor (com o motivo no Monitor).
// ESP32 e Pico correm sempre no tradutor (não há QEMU/rp2040js aqui), mas o código é
// também compilado a sério em segundo plano para mostrar os erros/avisos verdadeiros.
import { boardProfile, DEFS } from '../../../../shared/components.js'
import { mcuOfProfile } from './avr/mcu.js'
import { emulatorSupport } from './avr/protocols/index.js'
import * as i18n from '../../../../shared/i18n.js'

const nameOf = (t) => DEFS[t]?.name || t
// (SoftwareWire e semelhantes, ou um construtor U8g2/U8x8 com "_SW_I2C")
const BITBANG_I2C = /#\s*include\s*[<"](SoftwareWire|SoftWire|SlowSoftWire)\.h[>"]|\bU8(G2|X8)_\w+_SW_I2C\b/
const strip = (r) => (r ? { ...r, hex: undefined, elfPath: undefined, binPath: undefined } : r)

// → { engine: 'avr' | 'transpiler', compile (resultado a mostrar no editor), firmware?, notes: [{ text, level }], background?: Promise }
export const makePlanEngine = ({ compileSketch, compileReal, cachedReal, realCompileAvailable }) => async function planEngine({ code, board, parts = [], mode = 'auto', libs = [] }) {
  const prof = boardProfile(DEFS[board] ? board : 'arduino')
  const isAvr = !!board && !!mcuOfProfile(prof) // sem placa no projeto: só a verificação rápida
  const cli = await realCompileAvailable()
  const notes = []
  const wantReal = mode !== 'fast'

  // 'auto' não fica à espera do arduino-cli: se o firmware ainda não estiver em cache
  // (o editor compila-o enquanto se escreve), arranca já com o tradutor e a compilação
  // real continua em segundo plano para a simulação seguinte. 'real' espera sempre.
  let pending = false
  if (isAvr && cli && mode === 'auto' && !(await cachedReal(code, { board, libs }))) pending = true
  if (isAvr && cli && wantReal && !pending) {
    const real = await compileReal(code, { board, libs })
    if (!real.ok) return { engine: 'avr', compile: strip(real), notes, failed: true }
    const sup = emulatorSupport(parts)
    // I2C por software (SoftwareWire): o avr8js só tem o periférico TWI; os sensores não
    // respondem a bit-banging nos pinos → tradutor (com a biblioteca simulada nesses pinos)
    const swire = BITBANG_I2C.test(code)
    if (sup.ok && !swire) {
      notes.push({ text: i18n.m(`ℹ Motor: emulação real do ${prof.mcu} (avr8js a 16 MHz, firmware compilado pelo ${real.compiler}${real.size ? `, ${real.size.flash} bytes de flash` : ''}).`, `ℹ Engine: real emulation of the ${prof.mcu} (avr8js at 16 MHz, firmware compiled by ${real.compiler}${real.size ? `, ${real.size.flash} bytes of flash` : ''}).`), level: 'info' })
      return { engine: 'avr', compile: strip(real), firmware: { kind: 'avr', hex: real.hex }, notes }
    }
    const fast = await compileSketch(code, { board, libs })
    // o tradutor não percebe este C++ (mas o avr-gcc compilou): corre o firmware verdadeiro na
    // emulação real, mesmo sem modelo ao nível dos pinos para todas as peças
    if (!fast.ok && !swire) {
      notes.push({ text: i18n.m(`⚠ O tradutor rápido não suporta parte deste código, por isso a simulação usa o firmware verdadeiro (avr-gcc) na emulação real do ${prof.mcu}. Atenção: ${sup.missing.map(nameOf).join(', ')} ainda não ${sup.missing.length > 1 ? 'têm' : 'tem'} modelo ao nível dos pinos e pode${sup.missing.length > 1 ? 'm' : ''} não responder.`, `⚠ The fast translator does not support part of this code, so the simulation uses the real firmware (avr-gcc) in the real emulation of the ${prof.mcu}. Note: ${sup.missing.map(nameOf).join(', ')} ${sup.missing.length > 1 ? 'have' : 'has'} no pin-level model yet and may not respond.`), level: 'warn' })
      return { engine: 'avr', compile: strip(real), firmware: { kind: 'avr', hex: real.hex }, notes }
    }
    if (swire) notes.push({ text: i18n.m('ℹ I2C por software (SoftwareWire / U8g2 SW_I2C): a emulação real só simula o I2C do hardware (A4/A5), por isso esta simulação usa o tradutor rápido, com o barramento nos pinos escolhidos. O código compilou no avr-gcc real.', 'ℹ Software I2C (SoftwareWire / U8g2 SW_I2C): the real emulation only simulates hardware I2C (A4/A5), so this simulation uses the fast translator, with the bus on the chosen pins. The code compiled with the real avr-gcc.'), level: 'info' })
    else notes.push({ text: i18n.m(`⚠ Emulação real indisponível neste projeto: ${sup.missing.map(nameOf).join(', ')} ainda não ${sup.missing.length > 1 ? 'têm' : 'tem'} modelo ao nível dos pinos. A usar o tradutor rápido (o código compila no avr-gcc real).`, `⚠ Real emulation unavailable for this project: ${sup.missing.map(nameOf).join(', ')} ${sup.missing.length > 1 ? 'have' : 'has'} no pin-level model yet. Using the fast translator (the code compiles with the real avr-gcc).`), level: 'warn' })
    // o código é C++ válido para o avr-gcc mas o tradutor pode não o suportar
    const c = fast.ok ? { ...fast, diagnostics: [...real.diagnostics.filter((d) => d.severity !== 'error'), ...fast.diagnostics.filter((d) => d.severity === 'error')] } : fast
    return { engine: 'transpiler', compile: c, notes, failed: !fast.ok }
  }

  const fast = await compileSketch(code, { board, libs })
  // o tradutor falhou numa placa AVR com arduino-cli: em vez de parar, espera pela compilação
  // verdadeira e corre o firmware na emulação real (C++ completo e bibliotecas verdadeiras)
  if (!fast.ok && pending) {
    const real = await compileReal(code, { board, libs })
    if (!real.ok) return { engine: 'avr', compile: strip(real), notes, failed: true }
    const sup = emulatorSupport(parts)
    notes.push({ text: i18n.m(`ℹ O tradutor rápido não suporta parte deste código: a simulação usa o firmware verdadeiro (compilado pelo ${real.compiler}) na emulação real do ${prof.mcu}.${sup.ok ? '' : ` Atenção: ${sup.missing.map(nameOf).join(', ')} ainda não ${sup.missing.length > 1 ? 'têm' : 'tem'} modelo ao nível dos pinos.`}`, `ℹ The fast translator does not support part of this code: the simulation uses the real firmware (compiled by ${real.compiler}) in the real emulation of the ${prof.mcu}.${sup.ok ? '' : ` Note: ${sup.missing.map(nameOf).join(', ')} ${sup.missing.length > 1 ? 'have' : 'has'} no pin-level model yet.`}`), level: sup.ok ? 'info' : 'warn' })
    return { engine: 'avr', compile: strip(real), firmware: { kind: 'avr', hex: real.hex }, notes }
  }
  if (pending) notes.push({ text: i18n.m('ℹ A compilação real (arduino-cli) ainda está a decorrer: esta simulação arranca já com o tradutor rápido; a próxima usa a emulação real. (Escolha "Emulação real" nas definições para esperar sempre por ela.)', 'ℹ The real compilation (arduino-cli) is still running: this simulation starts right away with the fast translator; the next one uses the real emulation. (Choose "Real emulation" in the settings to always wait for it.)'), level: 'info' })
  else if (isAvr && wantReal && !cli) notes.push({ text: i18n.m('⚠ Emulação real indisponível: o arduino-cli não foi encontrado (instale o Arduino IDE ou defina ARDUINO_CLI). A usar o tradutor rápido.', '⚠ Real emulation unavailable: arduino-cli was not found (install the Arduino IDE or set ARDUINO_CLI). Using the fast translator.'), level: 'warn' })
  else if (board && !isAvr && wantReal) notes.push({ text: i18n.m(`ℹ ${prof.mcu}: a simulação usa o tradutor rápido (a emulação real só existe para Uno, Nano e Mega).${cli ? ' O código também está a ser compilado a sério (arduino-cli) para mostrar os erros verdadeiros.' : ''}`, `ℹ ${prof.mcu}: the simulation uses the fast translator (real emulation only exists for the Uno, Nano and Mega).${cli ? ' The code is also being compiled for real (arduino-cli) to show the real errors.' : ''}`), level: 'info' })
  else if (mode === 'fast') notes.push({ text: i18n.m('ℹ Motor: tradutor rápido (C++ traduzido para JavaScript, bibliotecas simuladas).', 'ℹ Engine: fast translator (C++ translated to JavaScript, simulated libraries).'), level: 'info' })
  // compilação verdadeira em segundo plano (ESP32/Pico: demora mais)
  const background = cli && board && (pending || (mode !== 'fast' && !isAvr)) ? compileReal(code, { board, libs }).then(strip) : null
  return { engine: 'transpiler', compile: fast, notes, failed: !fast.ok, background }
}
