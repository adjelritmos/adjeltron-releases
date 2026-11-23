// Registo dos componentes em plugin. Cada ficheiro exporta por omissão a
// definição do componente (mesmo formato que DEFS em ../components.js, mais `type`).
// Campos extra opcionais:
//   short        nome curto para rótulos ("LCD", "RGB"…)
//   board        true para placas com microcontrolador (pinos D0–D13, A0–A5)
//   interactive  controlo durante a simulação:
//                { kind: 'slider', label, unit, min, max, step, default }   (sensores)
//                { kind: 'toggle', label } | { kind: 'press', label }       (interruptores, PIR…)
//                { kind: 'joystick' } | { kind: 'keypad', keys: [[...]] }
//   fields       propriedades editáveis no painel:
//                [{ key, label, type: 'select'|'number'|'range'|'color'|'text', options?: [[valor, rótulo]], min?, max?, step? }]
//                resets: ['chave'] apaga essas chaves ao mudar este campo (ex.: material → cor);
//                auto: (config) => valor mostrado quando a chave não está definida
//   loose        true: solta na mesa, cai com a física (modo automático; ver ../physics.js)
//   grab         { mount, min, max } garra que agarra cubos (abertura em cm = min + ângulo/180 × (max − min))
//   lib          { header: 'Biblioteca.h', usage: 'exemplo de uso' } (mostrado no painel)
import { GROUP_A } from './group-a.js'
import { GROUP_B } from './group-b.js'
import { GROUP_C } from './group-c.js'
import { GROUP_D } from './group-d.js'
import { GROUP_E } from './group-e.js'
import { GROUP_F } from './group-f.js'
import { GROUP_ROBOT } from './group-robot.js'
import { GROUP_G } from './group-g.js'
import rgbled from './rgbled.js'
import lcd1602 from './lcd1602.js'
import esp32 from './esp32.js'
import esp32Uno from './esp32Uno.js'
import mega from './mega.js'
import pico from './pico.js'
import frame from './frame.js'
import { GROUP_PICO } from './group-pico.js'
import { GROUP_MECH } from './group-mech.js'
import { GROUP_MATERIAL } from './group-material.js'
import { GROUP_CASA } from './group-casa.js'
import { GROUP_MDF } from './group-mdf.js'
import { GROUP_CAO } from './group-cao.js'
import { GROUP_PATO } from './group-pato.js'
import { GROUP_MICROBAN } from './group-microban.js'
import { GROUP_V } from './group-v.js'

export const PART_DEFS = [frame, mega, esp32, esp32Uno, pico, rgbled, lcd1602, ...GROUP_A, ...GROUP_B, ...GROUP_C, ...GROUP_D, ...GROUP_E, ...GROUP_F, ...GROUP_ROBOT, ...GROUP_G, ...GROUP_PICO, ...GROUP_MECH, ...GROUP_MATERIAL, ...GROUP_CASA, ...GROUP_MDF, ...GROUP_CAO, ...GROUP_PATO, ...GROUP_MICROBAN, ...GROUP_V]
