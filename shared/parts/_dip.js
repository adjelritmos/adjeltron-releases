// Pinos de um circuito integrado DIP (não é um componente): passo de 0,1" e filas a 0,3",
// pino 1 em baixo à esquerda (entalhe à esquerda, −x), numeração no sentido anti-horário
// vista de cima: 1…n/2 em baixo (esquerda → direita), n/2+1…n em cima (direita → esquerda).
// Encaixa sobre o canal central da breadboard (filas e/f), como o 74HC595.
import { PITCH } from '../geometry.js'

export const DIP_ROW = 0.381 // metade de 0,3" (7,62 mm entre filas)

// list: [[id, kind, label?], …] pela ordem dos pinos 1…n
export function dipPins(list) {
  const n = list.length
  const half = n / 2
  const X = (i) => (i - (half - 1) / 2) * PITCH
  return list.map(([id, kind, label], k) => {
    const bottom = k < half
    const i = bottom ? k : n - 1 - k
    return { id, ...(label ? { label: `${label} (pino ${k + 1})` } : { label: `${id} (pino ${k + 1})` }), pos: [X(i), 0, bottom ? DIP_ROW : -DIP_ROW], kind }
  })
}

// comprimento do corpo (cm) de um DIP de n pinos
export const dipLength = (n) => (n / 2) * PITCH - 0.03
export const dipView = (n) => {
  const w = dipLength(n) / 2 + 0.06
  return { view: 'top', x: [-w, w], z: [-0.5, 0.5] }
}
