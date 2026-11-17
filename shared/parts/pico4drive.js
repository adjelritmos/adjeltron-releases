// Pico4Drive (Paulo Costa / Paulo Marques, vendida pela Botnroll): placa de 77 × 55 mm para pequenos
// robôs onde ENCAIXA uma Raspberry Pi Pico (Pico, Pico W, Pico 2, Pico 2 W) num soquete 2 × 20.
// Hardware (esquema "pico4drive" de 04/10/2022):
//  - 4 pontes H completas DRV8212P (modo PWM: IN1/IN2; 2 A contínuos, 4 A de pico, proteção contra
//    sobrecorrente), entradas DRV1 = GP11/GP10, DRV2 = GP13/GP12, DRV3 = GP15/GP14, DRV4 = GP17/GP16
//  - borne de 10 vias: 1 GND, 2 VBAT, 3/4 DRV4 B/A, 5/6 DRV3 B/A, 7/8 DRV2 B/A, 9/10 DRV1 B/A
//  - entrada 5–11 V (2 células Li-ion/LiPo), proteção de inversão de polaridade e sobretensão,
//    regulador comutado de 5 V / 1,5 A (AP62200) que alimenta o VSYS da Pico (via Q1, como na USB)
//  - ATtiny412 a gerir a energia: botão ON (também lido pela Pico), botão OFF, corte por bateria
//    fraca, desligar pedido pela Pico (GP21 a LOW) e envio da tensão da bateria pela série no GP21
//  - multiplexador analógico 74HC4051: 8 entradas AN0–AN7 (470 Ω) para o GP28 (A2), seleção GP18–20
//  - 13 GPIO nos conectores (GP0–GP9, GP22, GP26, GP27), cada um com 2 pinos + GND + trilho de
//    alimentação (3V3 / 5 V / VIN por jumper): servos encaixam diretamente
//  - 2 divisores resistivos (2K2 / 1K2 / 4K7) para ler sinais de 5 V ou 12 V com 3,3 V
import { PITCH } from '../geometry.js'
import pico from './pico.js'
import { PICO40 } from './picoFamily.js'

const P = PITCH
// geometria (cm, vista de cima: +x direita, +z para baixo no 2D)
export const P4D = {
  W: 7.7,
  D: 5.5,
  PCB_Y: 0.25, // face de baixo da placa (espaçadores)
  PCB_T: 0.16,
  HDR_H: 0.85, // altura dos conectores (fêmea do soquete e machos dos GPIO)
  SOCK: [0.75, 0.15], // centro do soquete da Pico (x, z); a Pico fica com a USB virada para +x
  TERM_X: -3.55,
  ROWS: { S2: -2.4, S1: -2.146, V: -1.892, G: -1.638 },
  GPIO: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 22, 26, 27],
  AN_X: 1.15,
  AN_ROWS: { AN: 1.7, V: 1.954, G: 2.208 },
  ON: [-1.35, 2.25],
  OFF: [-0.55, 2.25],
}
const TOP = P4D.PCB_Y + P4D.PCB_T
const HY = +(TOP + P4D.HDR_H).toFixed(3)
const MY = +(TOP + 0.25).toFixed(3) // pinos machos: a ficha do jumper assenta logo acima do plástico
P4D.TOP = TOP
P4D.HY = HY
P4D.MY = MY

export const colX = (k) => +(-2.75 + k * P + (k >= 4 ? P : 0)).toFixed(4)
export const TERMINAL = ['GND', 'VBAT', 'M4B', 'M4A', 'M3B', 'M3A', 'M2B', 'M2A', 'M1B', 'M1A'] // borne 1 → 10
const LEFT = [
  ['J.VBUS', 'J.VBAT', 'J.5V', 'J.GND1'],
  ['D1.12V', 'D1.5V', 'D1.OUT', 'J.GND2'],
  ['D2.12V', 'D2.5V', 'D2.OUT', 'J.GND3'],
  ['J.3V3a', 'J.3V3b', 'J.VIN', 'J.GND4'],
]
const LBL = {
  'J.VBUS': 'VBUS (5 V da USB da Pico; jumper para VBAT)', 'J.VBAT': 'VBAT (bateria, antes do interruptor)', 'J.5V': '5V (regulador 1,5 A)',
  'J.VIN': 'VIN (bateria depois do interruptor = alimentação dos motores)', 'J.3V3a': '3V3 (da Pico)', 'J.3V3b': '3V3 (da Pico)',
  'D1.12V': 'Divisor 1 · entrada até 12 V (4K7)', 'D1.5V': 'Divisor 1 · entrada até 5 V (1K2)', 'D1.OUT': 'Divisor 1 · saída 0–3,3 V (ligue a um GPIO/ADC)',
  'D2.12V': 'Divisor 2 · entrada até 12 V (4K7)', 'D2.5V': 'Divisor 2 · entrada até 5 V (1K2)', 'D2.OUT': 'Divisor 2 · saída 0–3,3 V (ligue a um GPIO/ADC)',
  GND: 'GND · borne 1', VBAT: 'VBAT (bateria 5–11 V) · borne 2',
}
const KIND = (id) => (/GND|\.G$/.test(id) ? 'gnd' : id === 'VBAT' || id === 'J.VBAT' || id === 'J.VIN' ? 'vin' : id === 'J.5V' ? 'p5' : /3V3|\.V$/.test(id) ? 'p33' : /^M\d/.test(id) ? 'mout' : 'io')

function pins() {
  const out = []
  // borne de parafuso (fios entram pela esquerda)
  TERMINAL.forEach((id, i) => {
    const m = id.match(/^M(\d)([AB])$/)
    out.push({ id, label: LBL[id] || `Motor ${m[1]} · DRV${m[1]} OUT${m[2]} · borne ${i + 1}`, pos: [+(P4D.TERM_X - 0.376).toFixed(3), +(TOP + 0.24).toFixed(3), +(2.25 - i * 0.5).toFixed(3)], kind: KIND(id), conn: 'screw', dir: [-1, 0, 0] })
  })
  const R = P4D.ROWS
  LEFT.forEach((col, k) => col.forEach((id, r) => out.push({ id, label: LBL[id] || id.replace(/^J\./, '').replace(/\d$/, ''), pos: [colX(k), MY, [R.S2, R.S1, R.V, R.G][r]], kind: KIND(id) })))
  P4D.GPIO.forEach((g, i) => {
    const x = colX(5 + i)
    out.push(
      { id: `GP${g}.b`, label: `GP${g} (2.º pino)`, pos: [x, MY, R.S2], kind: 'io' },
      { id: `GP${g}.a`, label: `GP${g}${g >= 26 ? ` (A${g - 26})` : ''}`, pos: [x, MY, R.S1], kind: 'io' },
      { id: `GP${g}.V`, label: `Trilho de alimentação (coluna GP${g})`, pos: [x, MY, R.V], kind: 'p33' },
      { id: `GP${g}.G`, label: `GND (coluna GP${g})`, pos: [x, MY, R.G], kind: 'gnd' },
    )
  })
  for (let k = 0; k < 8; k++) {
    const x = +(P4D.AN_X + k * P).toFixed(4)
    out.push(
      { id: `AN${k}`, label: `AN${k} (entrada analógica do multiplexador, read_adc(${k}))`, pos: [x, MY, P4D.AN_ROWS.AN], kind: 'io' },
      { id: `AN${k}.V`, label: '3V3', pos: [x, MY, P4D.AN_ROWS.V], kind: 'p33' },
      { id: `AN${k}.G`, label: 'GND', pos: [x, MY, P4D.AN_ROWS.G], kind: 'gnd' },
    )
  }
  // soquete da Pico: pinos fêmea por baixo de cada pino da Pico (rodada 180°: USB para +x)
  for (const p of pico.pins) {
    out.push({ id: `S.${p.id}`, label: `Soquete da Pico · ${p.label}`, pos: [+(P4D.SOCK[0] - p.pos[0]).toFixed(4), HY, +(P4D.SOCK[1] - p.pos[2]).toFixed(4)], kind: 'sock', conn: 'female', dir: [0, 1, 0] })
  }
  return out
}

const GPIO_IDS = P4D.GPIO.map((g) => `GP${g}`)
const internal = [
  ['GND', 'J.GND1', 'J.GND2', 'J.GND3', 'J.GND4', ...GPIO_IDS.map((g) => `${g}.G`), ...Array.from({ length: 8 }, (_, k) => `AN${k}.G`), ...pico.pins.filter((p) => p.kind === 'gnd').map((p) => `S.${p.id}`)],
  ['S.3V3', 'J.3V3a', 'J.3V3b', ...Array.from({ length: 8 }, (_, k) => `AN${k}.V`)],
  GPIO_IDS.map((g) => `${g}.V`),
  ...GPIO_IDS.map((g) => [`S.${g}`, `${g}.a`, `${g}.b`]),
  ['VBAT', 'J.VBAT'],
  ['S.VBUS', 'J.VBUS'],
]

export default {
  type: 'pico4drive',
  name: 'Pico4Drive (placa para Pico)',
  short: 'Pico4Drive',
  cat: 'robot',
  description:
    'Placa de robótica (77 × 55 mm) com soquete para Raspberry Pi Pico / Pico W / Pico 2 / Pico 2 W: arraste a Pico para cima do soquete e os GPIO ligam-se sozinhos. 4 pontes H DRV8212P (2 A, 4 A de pico; DRV1 = GP11/GP10 … DRV4 = GP17/GP16), bateria 5–11 V no borne (VBAT/GND), regulador de 5 V / 1,5 A, botão ON (lido pela Pico) e corte por bateria fraca (ATtiny412 no GP21), 8 entradas analógicas multiplexadas (AN0–AN7 → GP28 = A2), 13 GPIO com GND e alimentação (servos), 2 divisores para sinais de 5 V / 12 V. Biblioteca Pico4Drive.h.',
  size: [P4D.W, HY, P4D.D],
  pins: pins(),
  internal,
  mounts: {
    socket: {
      pos: [P4D.SOCK[0], HY, P4D.SOCK[1]],
      rot: [0, 180, 0],
      label: 'soquete da Raspberry Pi Pico',
      // soquete: a peça encaixada fica com os pinos `${prefix}${pino}` ligados aos seus (ver shared/sockets.js)
      socket: { form: 'pico40', accepts: PICO40, prefix: 'S.' },
    },
  },
  config: { rail: '3V3', usbJumper: false, autoOn: true, uvp: true },
  fields: [
    { key: 'rail', label: 'Trilho dos GPIO (jumper)', type: 'select', options: [['3V3', '3,3 V (Pico)'], ['5V', '5 V (regulador)'], ['VIN', 'VIN (bateria)']] },
    { key: 'autoOn', label: 'Ao iniciar', type: 'select', options: [[true, 'Ligada (ON carregado)'], [false, 'Desligada (carregue em ON)']] },
    { key: 'uvp', label: 'Proteção de bateria fraca', type: 'select', options: [[true, '2S Li-ion (< 6,0 V desliga)'], [false, 'Desativada (fonte de 5 V)']] },
    { key: 'usbJumper', label: 'Jumper VBUS–VBAT', type: 'select', options: [[false, 'Aberto (bateria)'], [true, 'Fechado (USB da Pico alimenta tudo, máx. 500 mA)']] },
  ],
  interactive: { kind: 'press', label: 'Botão ON' },
  lib: {
    header: 'Pico4Drive.h',
    usage: '#include <Pico4Drive.h>\npico4drive_t pico4drive;\npico4drive.init();\npico4drive.update();\npico4drive.set_driver_voltage(4.0, p2d_drv1);\nSerial.println(pico4drive.battery_voltage);',
  },
  mass: 32,
  view2d: { view: 'top', x: [-3.95, 3.95], z: [-2.85, 2.85] },
}
