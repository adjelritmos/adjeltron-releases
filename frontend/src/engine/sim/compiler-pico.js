// Transformações do transpilador para o core Arduino-Pico e a Pico4Drive (group-pico):
//  - BOOTSEL é um objeto que se lê como bool (operator bool) → __bootsel()
//  - driver_num_t (enum da biblioteca Pico4Drive) → int
export function picoTransforms(s) {
  if (/\bBOOTSEL\b/.test(s)) s = s.replace(/\bBOOTSEL\b(?!\s*\()/g, '__bootsel()')
  if (/\bdriver_num_t\b/.test(s)) s = s.replace(/\bdriver_num_t\b/g, 'int')
  return s
}

// Depois da conversão para generators: pico4drive.power_off() nunca regressa (while (1) na
// biblioteca real) — passa a ser uma chamada bloqueante, como as de rede (libs/_net.js).
export function picoLateTransforms(s) {
  if (!/\.power_off\s*\(/.test(s)) return s
  return s.replace(/(?<![\w$.])([A-Za-z_$][\w$]*(?:\[[^\[\]]*\])?)\s*\.\s*power_off\s*\(\s*\)/g, '(yield* __await($1.power_off()))')
}
