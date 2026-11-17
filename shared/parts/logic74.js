// Portas lógicas CMOS da série 74HC em DIP-14 (um ficheiro, várias peças no catálogo):
// 74HC00 (NAND), 74HC02 (NOR), 74HC04 (NOT), 74HC08 (AND), 74HC32 (OR), 74HC86 (XOR)
// e 74HC14 (NOT com Schmitt trigger). `logic` descreve as portas: [entradas…, saída].
import { dipPins, dipLength, dipView } from './_dip.js'

const QUAD = [
  ['1A', 'in'], ['1B', 'in'], ['1Y', 'out'], ['2A', 'in'], ['2B', 'in'], ['2Y', 'out'], ['GND', 'gnd'],
  ['3Y', 'out'], ['3A', 'in'], ['3B', 'in'], ['4Y', 'out'], ['4A', 'in'], ['4B', 'in'], ['VCC', 'pwr'],
]
const quadNor = [
  ['1Y', 'out'], ['1A', 'in'], ['1B', 'in'], ['2Y', 'out'], ['2A', 'in'], ['2B', 'in'], ['GND', 'gnd'],
  ['3A', 'in'], ['3B', 'in'], ['3Y', 'out'], ['4A', 'in'], ['4B', 'in'], ['4Y', 'out'], ['VCC', 'pwr'],
]
const hex = [
  ['1A', 'in'], ['1Y', 'out'], ['2A', 'in'], ['2Y', 'out'], ['3A', 'in'], ['3Y', 'out'], ['GND', 'gnd'],
  ['4Y', 'out'], ['4A', 'in'], ['5Y', 'out'], ['5A', 'in'], ['6Y', 'out'], ['6A', 'in'], ['VCC', 'pwr'],
]
const G2 = [1, 2, 3, 4].map((g) => [`${g}A`, `${g}B`, `${g}Y`])
const G1 = [1, 2, 3, 4, 5, 6].map((g) => [`${g}A`, `${g}Y`])

const CHIPS = [
  ['hc00', '74HC00', 'NAND', 'nand', QUAD, G2, 'Y = NÃO (A E B): a saída só vai a LOW quando as duas entradas estão a HIGH. Com NAND faz-se qualquer outra porta (é "universal").'],
  ['hc02', '74HC02', 'NOR', 'nor', quadNor, G2, 'Y = NÃO (A OU B): a saída só fica a HIGH com as duas entradas a LOW. Atenção: a disposição dos pinos é diferente da do 74HC00 (a saída vem primeiro: 1Y, 1A, 1B…).'],
  ['hc04', '74HC04', 'NOT', 'not', hex, G1, 'Seis inversores: Y = NÃO A.'],
  ['hc08', '74HC08', 'AND', 'and', QUAD, G2, 'Y = A E B: a saída só vai a HIGH com as duas entradas a HIGH.'],
  ['hc32', '74HC32', 'OR', 'or', QUAD, G2, 'Y = A OU B: a saída vai a HIGH se pelo menos uma entrada estiver a HIGH.'],
  ['hc86', '74HC86', 'XOR', 'xor', QUAD, G2, 'Y = A OU-exclusivo B: HIGH quando as entradas são diferentes (soma de 1 bit, comparação).'],
  ['hc14', '74HC14', 'NOT Schmitt', 'not', hex, G1, 'Seis inversores com Schmitt trigger (histerese: sobe a ~3,0 V e desce a ~1,8 V com 5 V) — limpam sinais lentos ou com ruído (botões com RC, sensores) e fazem osciladores com uma resistência e um condensador.'],
]

export const LOGIC_TYPES = CHIPS.map((c) => c[0])

const LOGIC_DEFS = CHIPS.map(([type, chip, kind, fn, list, gates, about]) => ({
  type,
  name: `Porta lógica ${chip} (${gates.length}× ${kind})`,
  short: chip,
  cat: 'discrete',
  description: `${about} Circuito integrado CMOS em DIP-14 (encaixe-o sobre o canal central da breadboard, entalhe à esquerda): VCC (pino 14) → 5V e GND (pino 7) → GND. Entradas: HIGH acima de ~3,5 V, LOW abaixo de ~1,5 V — nunca as deixe soltas (ligue as não usadas ao GND). Cada saída dá ~4 mA a 5 V (máx. 25 mA): um LED precisa de 220 Ω… ou mais. Pinos: ${list.map((p, i) => `${i + 1} ${p[0]}`).join(', ')}.`,
  size: [dipLength(14), 0.55, 0.65],
  pins: dipPins(list),
  logic: { fn, gates, schmitt: type === 'hc14' },
  view2d: dipView(14),
}))

export default LOGIC_DEFS
