// FQBN do arduino-cli de cada placa do projeto (puro: usado pelo backend Bun e pelo worker
// do simulador na app desktop, que pede a compilação real ao servidor Rust do Tauri).
import { DEFS, boardProfile } from './components.js'

// def.board.fqbn, se a placa o indicar, tem prioridade
export function fqbnOf(boardType) {
  const def = DEFS[boardType]
  if (def?.board?.fqbn) return def.board.fqbn
  const prof = boardProfile(DEFS[boardType] ? boardType : 'arduino')
  if (prof.fqbn && !['pico', 'picow', 'pico2', 'pico2w'].includes(prof.id)) return prof.fqbn
  const t = String(def?.variantOf || boardType || '').toLowerCase() // variantes (ex.: Keyestudio Nano) compilam como a placa original
  if (prof.id === 'mega') return 'arduino:avr:mega:cpu=atmega2560'
  if (prof.id === 'esp32') return 'esp32:esp32:esp32'
  if (prof.id === 'pico' || /^pico/.test(t) || /rp2/.test(prof.id || '')) {
    if (/pico2w|pico_2w|pico-2w/.test(t) || prof.id === 'pico2w') return 'rp2040:rp2040:rpipico2w'
    if (/pico2/.test(t) || prof.id === 'pico2') return 'rp2040:rp2040:rpipico2'
    if (/picow/.test(t) || prof.id === 'picow') return 'rp2040:rp2040:rpipicow'
    return 'rp2040:rp2040:rpipico'
  }
  if (t === 'nano') return 'arduino:avr:nano:cpu=atmega328'
  return 'arduino:avr:uno'
}
export const archOf = (fqbn) => (fqbn.startsWith('arduino:avr') ? 'avr' : fqbn.startsWith('esp32') ? 'esp32' : fqbn.startsWith('rp2040') ? 'rp2040' : fqbn.includes(':avr:') ? 'avr-other' : fqbn.includes('stm32') ? 'stm32' : fqbn.includes('mbed') ? 'mbed' : 'other')
export const mcuOfFqbn = (fqbn) => (/mega/.test(fqbn) ? 'atmega2560' : archOf(fqbn) === 'avr' ? 'atmega328p' : archOf(fqbn))
