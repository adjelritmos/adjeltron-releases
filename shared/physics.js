// Modo de física de cada montagem (peça-raiz + tudo o que está preso nela), usado pelo motor
// de física do browser (frontend/src/components/three/physics) e pelo backend (engine.setWorld).
//
//   dynamic   livre: o conjunto inteiro cai, tomba, choca e é movido pelos servos (robôs com
//             patas, drone, peças soltas). A pose real volta ao backend.
//   anchored  fixa à mesa: a peça-raiz não se mexe (aparafusada), mas cada junta de servo é
//             um motor com binário limitado e a gravidade puxa os elos — um braço com servos
//             fracos descai, uma carga pesada faz o servo ceder. Os ângulos reais voltam ao
//             backend (a garra segue a pose real).
//   static    sem física: as peças seguem a cinemática ideal (só servem de obstáculo).
//
// part.physics guarda a escolha do utilizador ('auto' ou ausente = automática).
import { m } from './i18n.js'
import { DEFS, mountsOf } from './components.js'

export const PHYSICS_MODES = [
  ['auto', 'Automática'],
  ['dynamic', 'Livre: cai, tomba e choca'],
  ['anchored', 'Fixa à mesa: juntas com gravidade'],
  ['static', 'Sem física (movimento ideal)'],
]

// a montagem tem juntas (mount com servo, rotor livre ou carro que desliza)?
export function isArticulated(root, parts) {
  const kids = new Map()
  for (const p of parts) if (p.parent) (kids.get(p.parent.id) || kids.set(p.parent.id, []).get(p.parent.id)).push(p)
  const seen = new Set()
  const visit = (p) => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    const ms = mountsOf(p) || {}
    for (const k of kids.get(p.id) || []) {
      const mt = ms[k.parent.mount]
      if (mt?.servo || mt?.slide) return true
      if (visit(k)) return true
    }
    return false
  }
  return visit(root)
}

// a montagem (raiz + o que está preso nela) tem alguma caixa de colisão? (sem nenhuma, um corpo
// livre atravessaria a mesa e cairia para sempre: veios, correias, hélices soltas…)
export function hasColliders(root, parts) {
  const kids = new Map()
  for (const p of parts) if (p.parent) (kids.get(p.parent.id) || kids.set(p.parent.id, []).get(p.parent.id)).push(p)
  const stack = [root]
  const seen = new Set()
  while (stack.length) {
    const p = stack.pop()
    if (seen.has(p.id)) continue
    seen.add(p.id)
    if (DEFS[p.type] && DEFS[p.type].collider !== false) return true
    stack.push(...(kids.get(p.id) || []))
  }
  return false
}

// modo automático: como no mundo real, tudo o que está solto cai, tomba e choca (placas,
// sensores, breadboards, motores, peças de construção, robôs). Exceções: montagens com servos
// (braços, pan-tilt, garras) ficam aparafusadas à mesa com gravidade nas juntas; veículos com
// cinemática da simulação, pessoas (controlador próprio) e peças sem colisor ficam como estão.
export function autoPhysics(root, parts) {
  const d = DEFS[root.type]
  if (!d || d.vehicle || d.car || d.walker) return 'static'
  if (d.physics === 'dynamic') return 'dynamic'
  if (isArticulated(root, parts)) return 'anchored'
  return hasColliders(root, parts) ? 'dynamic' : 'static'
}

export function physicsModeOf(root, parts) {
  const d = DEFS[root?.type]
  if (!d) return 'static'
  // veículos com cinemática do backend (chassi 2WD): a pose vem do backend
  if (d.vehicle || d.car || d.walker) return 'static' // (o carro que anda também: posição do backend; pessoas: controlador próprio)
  const m = root.physics
  if (m === 'dynamic' || m === 'static') return m
  if (m === 'anchored') return isArticulated(root, parts) ? 'anchored' : 'static'
  return autoPhysics(root, parts)
}

export const physicsLabel = (mode) => ({ dynamic: m('livre (cai)', 'free (falls)'), anchored: m('fixa à mesa, juntas com gravidade', 'fixed to the table, joints with gravity'), static: m('sem física', 'no physics') })[mode] || mode
