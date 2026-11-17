// Árvore mecânica: cada peça está presa ao "mundo" (mesa/chão) ou a um ponto de
// fixação (mount) de outra peça. Servos rodam o seu mount "horn"; chassis móveis
// recebem a pose da física.
import * as THREE from 'three'
import { mountsOf, vehicleLift } from '../../../../shared/components.js'
import { servoHornRotation } from '../../../../shared/assembly.js'
import { mountSlide } from '../../../../shared/parts/_mech.js'

const D2R = Math.PI / 180
const _e = new THREE.Euler()
const _q = new THREE.Quaternion()
const _v = new THREE.Vector3()
const _one = new THREE.Vector3(1, 1, 1)

export function trs(pos = [0, 0, 0], rotDeg = [0, 0, 0], out = new THREE.Matrix4()) {
  _e.set(rotDeg[0] * D2R, rotDeg[1] * D2R, rotDeg[2] * D2R, 'XYZ')
  _q.setFromEuler(_e)
  return out.compose(_v.set(pos[0], pos[1], pos[2]), _q, _one)
}

// matriz do ponto de fixação no referencial da peça-mãe
// slide: deslocamento (cm) de um mount que desliza (mount.slide.axis, no referencial do mount)
export function mountMatrix(parent, mountId, servoAngle = 90, slide = 0) {
  const m = mountsOf(parent)[mountId]
  if (!m) return new THREE.Matrix4()
  const base = trs(m.pos, m.rot || [0, 0, 0])
  // mount.rev: o outro lado do mesmo veio (motor TT de veio duplo) — o +y aponta ao contrário,
  // por isso, para rodar no mesmo sentido físico, o ângulo em torno do +y do mount é o simétrico
  if (m.servo) base.multiply(trs([0, 0, 0], servoHornRotation(m.rev ? 180 - servoAngle : servoAngle)))
  if (m.slide && slide) {
    const sl = mountSlide(m, parent.config)
    if (sl) base.multiply(trs(sl.axis.map((v) => v * slide)))
  }
  return base
}

export function partLocalMatrix(part) {
  return trs(part.pos || [0, 0, 0], part.rot || [0, 0, 0])
}

// Calcula as matrizes mundo de todas as peças.
// opts.pose(part) -> {x,z,theta} para chassis em movimento; opts.servo(part) -> ângulo
// opts.root(part) -> THREE.Matrix4 | null: matriz mundo de uma peça-raiz dinâmica (física do browser)
// opts.slide(part, mountId) -> cm: deslocamento dos mounts que deslizam (fusos, cremalheiras)
// opts.local(part) -> THREE.Matrix4 | null: movimento extra no referencial da própria peça
//   (ex.: a pessoa que se arrasta durante a simulação), aplicado depois da pose montada
export function worldMatrices(parts, opts = {}) {
  const byId = new Map(parts.map((p) => [p.id, p]))
  const out = new Map()
  const visiting = new Set()
  const calc = (p) => {
    if (out.has(p.id)) return out.get(p.id)
    if (visiting.has(p.id)) return new THREE.Matrix4() // ciclo (não deveria acontecer)
    visiting.add(p.id)
    let m
    const parent = p.parent && byId.get(p.parent.id)
    if (!parent) {
      const pose = opts.pose?.(p)
      const rootM = opts.root?.(p)
      m = rootM ? rootM.clone() : pose ? trs([pose.x, p.pos?.[1] ?? 0, pose.z], [0, pose.theta / D2R, 0]) : partLocalMatrix(p)
      // chassi com rodas maiores: sobe para as rodas tocarem no chão
      if (!rootM) m.elements[13] += vehicleLift(p, parts)
    } else {
      m = calc(parent).clone().multiply(mountMatrix(parent, p.parent.mount, opts.servo?.(parent) ?? 90, opts.slide?.(parent, p.parent.mount) ?? 0)).multiply(partLocalMatrix(p))
    }
    const extra = opts.local?.(p)
    if (extra) m.multiply(extra)
    out.set(p.id, m)
    visiting.delete(p.id)
    return m
  }
  for (const p of parts) calc(p)
  return out
}

export { THREE }
