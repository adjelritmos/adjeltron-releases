// Controlos físicos das peças, para mexer durante a simulação na vista 3D e no circuito 2D:
// manípulos (arrastar para cima/baixo ou roda do rato), teclas (clique) e peças que são elas
// próprias um manípulo (potenciómetros).
//
// Na definição da peça (shared/parts): `controls: [{ kind, pos: [x, y, z], r, … }]`, com a
// posição no referencial da peça (cm):
//   knob    { key, min, max, step, wheel?, log? }   valor numérico (log: passo proporcional)
//           ou { param: (inp, cfg) => ({ key, min, max, step, wheel?, log? }) } quando o
//           manípulo regula o parâmetro escolhido por outra tecla (gerador de sinais)
//   toggle  { key, values: [a, b] }                  alterna entre dois valores
//   cycle   { key, options: [v…], dir? }            passa ao valor seguinte (dir −1: anterior)
// Peças inteiras que são um manípulo: o `pot` e as que têm `interactive.knob`.
import { DEFS } from './components.js'

// controlo debaixo do ponto (referencial da peça; só x e z, vistos de cima)
export function controlAt(type, lx, lz) {
  let best = null
  let bd = Infinity
  for (const c of DEFS[type]?.controls || []) {
    const d = Math.hypot(lx - c.pos[0], lz - c.pos[2])
    if (d < (c.r ?? 0.4) && d < bd) (best = c), (bd = d)
  }
  return best
}

// a peça inteira é um manípulo?
export function wholeKnob(type) {
  if (type === 'pot') return { kind: 'knob', key: 'value', min: 0, max: 1, step: 0.01, wheel: 0.02, pot: true }
  const ia = DEFS[type]?.interactive
  if (ia?.kind === 'slider' && ia.knob) return { kind: 'knob', key: 'value', min: ia.min, max: ia.max, step: ia.step ?? 1, wheel: ia.wheelStep ?? ia.step ?? 1, def: ia.default }
  return null
}

const cur = (part, inp, key, d) => inp?.[key] ?? part.config?.[key] ?? d
const roundTo = (v, step) => {
  const dec = String(step).split('.')[1]?.length ?? 0
  return Number((Math.round(v / step) * step).toFixed(dec))
}
// especificação efetiva de um manípulo (resolve `param`)
export function knobSpec(part, c, inp) {
  return c.param ? { ...c, ...c.param(inp || {}, part.config || {}) } : c
}
export const knobValue = (part, k, inp) => +cur(part, inp, k.key, k.def ?? k.min ?? 0)

const clampK = (k, v) => roundTo(Math.max(k.min, Math.min(k.max, v)), k.step ?? 1)
// roda do rato: dir = +1 (para cima) / −1; fine = passo pequeno (Shift)
export function knobWheel(k, v, dir, fine) {
  if (k.log) return clampK(k, v * (1 + dir * (fine ? 0.01 : 0.05)))
  return clampK(k, v + dir * (fine ? k.step ?? 1 : k.wheel ?? k.step ?? 1))
}
// arrasto: dy em píxeis (para cima = negativo) desde o início, v0 = valor inicial
export function knobDrag(k, v0, dy) {
  if (k.log) return clampK(k, Math.max(k.min, v0) * Math.exp(-dy / 120))
  return clampK(k, v0 - (dy / 250) * (k.max - k.min))
}
// clique numa tecla: devolve { key: valor } para setInput
export function keyPress(part, c, inp) {
  const v = cur(part, inp, c.key, c.kind === 'toggle' ? c.values[0] : c.options[0])
  if (c.kind === 'toggle') return { [c.key]: String(v) === String(c.values[0]) ? c.values[1] : c.values[0] }
  const i = c.options.findIndex((o) => String(o) === String(v))
  const n = c.options.length
  return { [c.key]: c.options[(((i < 0 ? 0 : i) + (c.dir ?? 1)) % n + n) % n] }
}
