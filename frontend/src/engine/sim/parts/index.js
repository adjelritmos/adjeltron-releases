// Comportamento (eletrónica + física) dos componentes em plugin.
// Cada ficheiro exporta por omissão um objeto { type, ...ganchos }. Todos opcionais:
//
//   diodes(part) -> [{ key, a, k, vf, r }]
//       Junções díodo (LED, segmentos, díodo, base-emissor…). O solver trata do
//       estado ligado/desligado; corrente em circuit.diodeCurrent(part, key).
//   stamp(ctx)   eletrónica linear em cada iteração do solver. ctx = {
//       part, cfg, s (estado persistente), input (controlo do browser),
//       cond(pinA, pinB, siemens), src(pinPlus, pinMinus, volts, ohms, tag?),
//       vd(pinA, pinB) (tensão da iteração anterior),
//       vccs(outP, outN, ctrlP, ctrlN, gm): injeta gm·(v(ctrlP) − v(ctrlN)) em outP e tira-a de outN
//       (fonte comandada: amp-ops, reguladores — ver lm358.js, _regulator.js) }
//       Também recebe nets e parts (lista de peças). Em cond/src/vccs/vd um pino pode ser
//       { part, pin } de OUTRA peça (ex.: massa implícita das portas lógicas: GND.1 da placa,
//       ver groundRef em _groupF.js). update(ctx) recebe também nets e parts.
//   update(ctx)  estados não lineares (ex.: powered); ctx = { part, cfg, s, input, vd, set(k, v) }
//                Mudar um estado com set() força nova iteração do solver.
//   step(ctx)    a cada 1 ms de simulação, depois do programa. ctx = {
//       part, cfg, s, live, input, vd, dt, timeUs, invalidate(), log(texto, nível),
//       boardPins (estado dos pinos do Arduino), boardPinsOn(pin) -> nºs de pino do Arduino nessa rede,
//       pulse(pin) -> largura (µs) do impulso de servo que chega a esse pino (Servo.h ou PCA9685) ou null,
//       circuit (circuit.st[id] = estado de outra peça; circuit.nets.partsOnNet/netOf) }
//   output(ctx)  antes de cada fotografia (~30 Hz): preencher `live` para o browser
//   diagnose(ctx) diagnóstico estático: ctx = { part, cfg, s, vd, isC(pin), nets, name, issues, parts }
//   i2c: { write(ctx, bytes), read(ctx, n) -> bytes }   dispositivo I2C com registos, usado pela
//       Wire.h e pelas bibliotecas (libs/_i2c.js: i2cDevice(env, addr)); ctx = { part, cfg, s, live, input, env }
//   i2cAddr(ctx) -> endereço I2C atual (ex.: pino AD0 do MPU6050); ctx = { part, cfg, vd }. Sem ele: config.addr
//   pulseOut(ctx, pin) -> µs | null   a peça gera impulsos de servo nesse pino (ex.: canal do PCA9685):
//       servos e ESC ligados a essa rede seguem-nos (0° = 544 µs, 180° = 2400 µs)
//
// Nomes reservados no estado `s` (usados pelo solver): powered, reg, on, burned, damaged,
// i, overT, e d_<key> / x_<key> das junções díodo — use outros nomes nos plugins.
// `live` é um objeto por peça enviado ao browser em cada fotografia (o modelo 3D
// e a vista 2D leem-no em simRef.engine.live[part.id]).
//
// Física de corpos rígidos (Rapier, no browser; ver o cabeçalho de shared/components.js):
//   - peças com def.thrust: preencher live.thrustN (newtons, ≥ 0) e opcionalmente
//     live.spin (+1 CW / −1 CCW visto de cima) em output(); o browser aplica a força e o
//     binário de reação +spin·thrustN·0,02 N·m em torno do eixo (hélice CW → corpo roda CCW).
//   - peças com def.imu: ler ctx.input.imu / env.input(id).imu = { ax, ay, az, gx, gy, gz }
//     (m/s² de força específica — pousado plano ay = +9,81 — e rad/s, no referencial local
//     da peça). Antes da primeira mensagem do browser lê pousado e parado.
//   - engine.setWorld({ bodies, imu }) recebe a mensagem 'world' do browser (~60 Hz):
//     bodies = { [rootPartId]: number[16] } (matriz mundo em cm) substitui a pose das
//     peças-raiz com physics: 'dynamic' em engine.matrices(), e joints = { [servoPartId]: graus }
//     (ângulo real das juntas, 90 = montagem) substitui o ângulo comandado; por isso sonar, IR,
//     etc. montados num robô livre (até numa perna) usam a pose real.
import { GROUP_A } from './group-a.js'
import { GROUP_B } from './group-b.js'
import { GROUP_C } from './group-c.js'
import { GROUP_D } from './group-d.js'
import { GROUP_E } from './group-e.js'
import { GROUP_F } from './group-f.js'
import { GROUP_ROBOT } from './group-robot.js'
import { GROUP_G } from './group-g.js'
import { GROUP_PICO } from './group-pico.js'
import { GROUP_MECH } from './group-mech.js'
import { GROUP_CASA } from './group-casa.js'
import { GROUP_MDF } from './group-mdf.js'
import { GROUP_CAO } from './group-cao.js'
import { GROUP_PATO } from './group-pato.js'
import { GROUP_V } from './group-v.js'
import rgbled from './rgbled.js'
import lcd1602 from './lcd1602.js'

export const BEHAVIORS = Object.fromEntries([rgbled, lcd1602, ...GROUP_A, ...GROUP_B, ...GROUP_C, ...GROUP_D, ...GROUP_E, ...GROUP_F, ...GROUP_ROBOT, ...GROUP_G, ...GROUP_PICO, ...GROUP_MECH, ...GROUP_CASA, ...GROUP_MDF, ...GROUP_CAO, ...GROUP_PATO, ...GROUP_V].map((b) => [b.type, b]))
