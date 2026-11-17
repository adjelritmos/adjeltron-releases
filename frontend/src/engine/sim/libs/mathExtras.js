// Funções de <math.h> que faltam na API base do simulador e que os sketches de
// sensores usam (ex.: log() na equação Beta do termístor NTC, exp(), log10() para dB).
// Ficam disponíveis sempre, como no Arduino (Arduino.h já inclui math.h).
export default {
  header: 'math.h',
  globals: {
    log: Math.log,
    log10: Math.log10,
    exp: Math.exp,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    fmin: Math.min,
    fmax: Math.max,
    trunc: Math.trunc,
    isinf: (x) => x === Infinity || x === -Infinity,
  },
}
