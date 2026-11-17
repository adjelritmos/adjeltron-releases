// Portas lógicas e flip-flops "abstratos" (como no Velxio): pequenos módulos com o símbolo
// impresso, uma fila de pinos à frente (encaixa na breadboard) e alimentação implícita — a
// saída HIGH é a tensão lógica da placa (5 V no Uno, 3,3 V no ESP32/Pico) em relação ao GND
// dela. Para aprender lógica sem ligar VCC/GND; os circuitos integrados reais são os 74HC.
// `gate` = { fn, n } (portas) ou `ff` = 'd' | 'jk' | 't' (flip-flops).
import { PITCH } from '../geometry.js'

const P = PITCH
export const ROW_Z = 0.38 // fila de pinos (frente do módulo)
const LETTERS = ['A', 'B', 'C', 'D']

const FN = {
  and: ['AND', 'E', 'Y = A·B…: HIGH só quando TODAS as entradas estão a HIGH.'],
  or: ['OR', 'OU', 'Y = A+B…: HIGH quando PELO MENOS uma entrada está a HIGH.'],
  nand: ['NAND', 'NÃO-E', 'Y = NÃO(A·B…): LOW só quando todas as entradas estão a HIGH (porta "universal": com NAND faz-se qualquer outra).'],
  nor: ['NOR', 'NÃO-OU', 'Y = NÃO(A+B…): HIGH só quando todas as entradas estão a LOW.'],
  xor: ['XOR', 'OU-exclusivo', 'Y = A⊕B: HIGH quando as entradas são DIFERENTES (somador de 1 bit, comparador).'],
  xnor: ['XNOR', 'NÃO-OU-exclusivo', 'Y = NÃO(A⊕B): HIGH quando as entradas são IGUAIS.'],
  not: ['NOT', 'NÃO (inversor)', 'Y = NÃO A: inverte o sinal.'],
}
const COMMON =
  'Módulo lógico abstrato com alimentação implícita (não tem VCC/GND: usa a tensão e o GND do Arduino). Entradas: HIGH acima de metade da tensão lógica (com histerese), soltas leem LOW (1 MΩ para o GND). Saída: até ~20 mA (50 Ω).'

// pinos ao longo de x: entradas à esquerda, saídas à direita (com um passo de intervalo)
function rowPins(ins, outs) {
  const n = ins.length + outs.length + 1
  const x0 = -((n - 1) / 2) * P
  const pins = ins.map(([id, label], i) => ({ id, label, pos: [x0 + i * P, 0, ROW_Z], kind: 'in' }))
  outs.forEach(([id, label], i) => pins.push({ id, label, pos: [x0 + (ins.length + 1 + i) * P, 0, ROW_Z], kind: 'out' }))
  return pins
}
const sizeOf = (pins) => {
  const xs = pins.map((p) => p.pos[0])
  const w = Math.max(1.3, Math.max(...xs) - Math.min(...xs) + 0.5)
  return [w, 0.5, 1.15]
}
const viewOf = ([w]) => ({ view: 'top', x: [-w / 2 - 0.04, w / 2 + 0.04], z: [-0.68, 0.56] })

const GATES = [
  ...['and', 'or', 'nand', 'nor'].flatMap((fn) => [2, 3, 4].map((n) => [fn, n])),
  ['xor', 2],
  ['xnor', 2],
  ['not', 1],
]

export const GATE_DEFS = GATES.map(([fn, n]) => {
  const [sym, pt, about] = FN[fn]
  const ins = LETTERS.slice(0, n).map((l) => [l, `${l} (entrada)`])
  const pins = rowPins(ins, [['Y', 'Y (saída)']])
  const size = sizeOf(pins)
  return {
    type: `gate${sym[0]}${sym.slice(1).toLowerCase()}${fn === 'not' ? '' : n}`,
    name: fn === 'not' ? 'Porta NOT (inversor)' : `Porta ${sym} de ${n} entradas`,
    short: fn === 'not' ? 'NOT' : `${sym}${n}`,
    cat: 'logic',
    description: `Porta ${sym} (${pt}). ${about} ${COMMON}`,
    size,
    pins,
    gate: { fn, n },
    view2d: viewOf(size),
  }
})

const FFS = [
  ['d', 'ffD', 'Flip-flop D', [['D', 'D (dado)']], 'Na subida do relógio (CLK de LOW para HIGH) copia D para Q e guarda-o até à subida seguinte: memória de 1 bit, registos, divisor por 2 (ligue /Q ao D: Q troca a cada impulso).'],
  ['jk', 'ffJK', 'Flip-flop JK', [['J', 'J'], ['K', 'K']], 'Na subida do CLK: J=K=0 mantém, J=1 K=0 põe Q a 1, J=0 K=1 põe Q a 0, J=K=1 troca Q (toggle). O flip-flop "universal" dos contadores.'],
  ['t', 'ffT', 'Flip-flop T', [['T', 'T (toggle)']], 'Na subida do CLK: com T = HIGH o Q troca (0→1→0…), com T = LOW mantém. Encadeados (Q de um no CLK do seguinte) fazem um contador binário.'],
]

export const FF_DEFS = FFS.map(([ff, type, name, data, about]) => {
  const ins = [...data, ['CLK', 'CLK (relógio, flanco ascendente)'], ['S', 'S (set assíncrono, ativo a HIGH)'], ['R', 'R (reset assíncrono, ativo a HIGH)']]
  const pins = rowPins(ins, [['Q', 'Q (saída)'], ['QN', '/Q (saída negada)']])
  const size = sizeOf(pins)
  return {
    type,
    name,
    short: name.replace('Flip-flop ', 'FF '),
    cat: 'logic',
    description: `${about} S e R (opcionais, ativos a HIGH) forçam Q = 1 / Q = 0 a qualquer momento. Ao ligar Q = 0. ${COMMON} Os botões ressaltam: um botão diretamente no CLK pode dar vários impulsos (use um condensador ou o Arduino).`,
    size,
    pins,
    ff,
    view2d: viewOf(size),
  }
})

export default [...GATE_DEFS, ...FF_DEFS]
