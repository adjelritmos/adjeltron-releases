// Memória não volátil da placa (EEPROM do AVR, flash emulada do ESP32/Pico e NVS das
// Preferences). Persiste entre simulações: a sessão envia-a ao browser, que a guarda no
// projeto (localStorage) e a devolve ao arrancar.
//   formato: { eeprom: base64 | null, prefs: { namespace: { chave: { t: 'i32', v } } }, parts: { idDaPeça: base64 } }
//   (parts: memórias de chips externos, ex.: EEPROM I2C 24LC256)
export function createNvm(init) {
  let eeprom = null
  let prefs = {}
  const parts = {}
  try {
    for (const [k, v] of Object.entries(init?.parts || {})) parts[k] = new Uint8Array(Buffer.from(String(v), 'base64'))
    if (init?.eeprom) eeprom = new Uint8Array(Buffer.from(String(init.eeprom), 'base64'))
    if (init?.prefs && typeof init.prefs === 'object') prefs = JSON.parse(JSON.stringify(init.prefs))
  } catch {
    eeprom = null
    prefs = {}
  }
  let dirty = false
  return {
    // bytes gravados (apagados = 0xFF), com pelo menos `size` bytes
    eeprom(size) {
      if (!eeprom || eeprom.length < size) {
        const n = new Uint8Array(size).fill(0xff)
        if (eeprom) n.set(eeprom)
        eeprom = n
      }
      return eeprom
    },
    // memória de um chip externo (apagada = 0xFF), com exatamente `size` bytes
    part(id, size) {
      let m = parts[id]
      if (!m || m.length !== size) {
        const n = new Uint8Array(size).fill(0xff)
        if (m) n.set(m.subarray(0, size))
        parts[id] = m = n
      }
      return m
    },
    get prefs() {
      return prefs
    },
    changed() {
      dirty = true
    },
    get dirty() {
      return dirty
    },
    toJSON() {
      const ps = Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, Buffer.from(v).toString('base64')]))
      return { eeprom: eeprom ? Buffer.from(eeprom).toString('base64') : null, prefs, ...(Object.keys(ps).length ? { parts: ps } : {}) }
    },
    take() {
      dirty = false
      return this.toJSON()
    },
    clear() {
      eeprom = null
      prefs = {}
      for (const k of Object.keys(parts)) delete parts[k]
      dirty = true
    },
  }
}
