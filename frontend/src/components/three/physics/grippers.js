// Garras (def.grab + def.jaws) na física do browser.
//
// MAXILAS: colisores presos ao corpo da garra, com a pose das maxilas para o ângulo do servo
// (def.jaws). A cada passo da física avançam para o ângulo do servo no backend, mas só enquanto não
// estiverem a entrar em nada: se uma maxila já está dentro de outro colisor mais do que STOP (um
// cubo que o solver não consegue afastar porque está apertado dos dois lados, a mesa, outra peça),
// param (e recuam o que entraram). Um objeto solto é empurrado (o solver afasta-o a cada passo e a
// maxila continua), por isso a garra centra o cubo antes de o apertar. O ângulo real das maxilas
// vai para os modelos 3D (simRef.jawAngles) e, quando estão encostadas, para o backend (jaws), que
// encrava o servo nesse ângulo — tal como um servo real que bate no objeto.
//
// CUBO AGARRADO (o backend propõe: abertura ≤ largura do cubo; aqui confirma-se que o cubo está
// mesmo entre as maxilas, senão vai 'drop' para o backend): em vez de passar a cinemático (que
// atravessava a mesa e as peças), o cubo continua dinâmico e fica preso ao corpo da garra por uma
// junta fixa, centrado e alinhado com as maxilas (shared/grip.js). Choca com tudo o resto; o
// contacto com a própria garra fica desligado (é a junta que o segura).
import * as THREE from 'three'
import { DEFS, mountsOf, partSize } from '@shared/components.js'
import { gripRel } from '@shared/grip.js'
import { simRef } from '../../../contexts/simRef.js'
import { buildMatrices, trs } from './assembly.js'

const STOP = 0.03 // cm: interpenetração a partir da qual a maxila para
const YIELD = 0.05 // cm: folga extra com corpos dinâmicos (são empurrados)
const PUSH = 6 // cm/s: velocidade de cada maxila enquanto empurra um objeto
const ONE = new THREE.Vector3(1, 1, 1)
const _m = new THREE.Matrix4()
const _m2 = new THREE.Matrix4()
const _p = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _s = new THREE.Vector3()
const _y = new THREE.Vector3(0, 1, 0)

const bodyMatrix = (b, out = _m) => {
  const t = b.translation()
  const r = b.rotation()
  return out.compose(_p.set(t.x, t.y, t.z), _q.set(r.x, r.y, r.z, r.w), ONE)
}

export function createGrippers({ world, R, runs, parts, colInfo, filterPair }) {
  const grippers = []
  const W = buildMatrices(parts)
  runs.forEach((run, ri) => {
    run.asm.segments.forEach((seg, si) => {
      for (const p of seg.parts) {
        const def = DEFS[p.type]
        if (!def?.jaws || !def.grab) continue
        const body = run.bodies[si]
        const P = seg.B0.clone().invert().multiply(W.get(p.id))
        const mt = mountsOf(p)[def.grab.mount || 'grip']
        const gripLocal = P.clone().multiply(trs(mt?.pos || [0, 0, 0], mt?.rot || [0, 0, 0]))
        const angle0 = simRef.engine?.servoOf?.get(p.id)?.angle ?? 90
        const boxes = def.jaws(p.config || {}, angle0)
        const g = { part: p, run, ri, si, body, P, gripLocal, cols: [], cur: angle0, cmd: angle0, from: angle0, n: 1, c: 0, blocked: 0, heldBody: null }
        for (const b of boxes) {
          const cd = R.ColliderDesc.cuboid(...b.size.map((v) => v / 2)).setMass(0).setFriction(1.0).setRestitution(0.05).setCollisionGroups(run.groups)
          if (run.selfHit) cd.setActiveHooks(R.ActiveHooks.FILTER_CONTACT_PAIRS)
          const col = world.createCollider(cd, body)
          colInfo.set(col.handle, { partId: p.id, type: p.type, run: ri, seg: si, jaw: true })
          g.cols.push(col)
        }
        place(g, angle0)
        grippers.push(g)
      }
    })
  })
  const byId = new Map(grippers.map((g) => [g.part.id, g]))

  // pose dos colisores das maxilas para o ângulo `a` (no referencial do corpo da garra)
  function place(g, a) {
    const boxes = DEFS[g.part.type].jaws(g.part.config || {}, a)
    boxes.forEach((b, k) => {
      const col = g.cols[k]
      if (!col) return
      _m2.copy(g.P).multiply(_m.compose(_p.set(...b.pos), _q.setFromAxisAngle(_y, b.yaw || 0), ONE))
      _m2.decompose(_p, _q, _s)
      col.setTranslationWrtParent({ x: _p.x, y: _p.y, z: _p.z })
      col.setRotationWrtParent({ x: _q.x, y: _q.y, z: _q.z, w: _q.w })
    })
  }

  // quanto as maxilas estão dentro de outros colisores (cm), sem contar a própria garra, o cubo
  // que ela segura e os pares que o filtro de contactos ignora (corpos da mesma junta)
  function penetration(g) {
    let max = 0
    g.touch = 0
    const own = g.body.handle
    const held = g.heldBody?.handle
    for (const c of g.cols) {
      const t = c.translation()
      const h = c.halfExtents()
      const r = Math.hypot(h.x, h.y, h.z)
      world.collidersWithAabbIntersectingAabb({ x: t.x, y: t.y, z: t.z }, { x: r, y: r, z: r }, (o) => {
        const ob = o.parent()
        if (!ob || ob.handle === own || ob.handle === held || o.isSensor() || !o.isEnabled()) return true
        if (filterPair(own, ob.handle) === R.SolverFlags.EMPTY) return true
        // grupos de colisão (o que a garra não toca não a trava)
        const g1 = c.collisionGroups()
        const g2 = o.collisionGroups()
        if (!((g1 >>> 16) & g2 & 0xffff) || !((g2 >>> 16) & g1 & 0xffff)) return true
        const ct = c.contactCollider(o, 0)
        // um corpo dinâmico solto é empurrado (o solver afasta-o a cada passo): só trava a
        // maxila se, mesmo assim, ela continuar a entrar nele (apertado dos dois lados)
        if (ct && ct.distance < 0) {
          max = Math.max(max, -ct.distance - (ob.isDynamic() ? YIELD : 0))
          g.touch = Math.max(g.touch, -ct.distance)
        }
        return true
      })
    }
    return max
  }

  // o cubo (pose `rel` na pega) está entre as maxilas, com elas fechadas até ele?
  const _c = new THREE.Vector3()
  function between(g, rel, size) {
    const G = DEFS[g.part.type].grab
    _c.set(0, size[1] / 2, 0).applyMatrix4(rel)
    const w = Math.min(size[0], size[2])
    const opening = G.min + (g.cur / 180) * (G.max - G.min)
    return Math.abs(_c.z) < 0.6 && Math.abs(_c.x) < w / 2 + 0.8 && Math.abs(_c.y) < size[1] / 2 + 0.4 && opening < Math.hypot(size[0], size[2]) + 0.2
  }
  // cubos que o backend julga agarrados mas que a física recusou (vão no próximo 'world')
  const drops = new Set()

  // graus de servo por cm de abertura (as duas maxilas: cada uma recua metade)
  const degPerCm = (g) => 180 / Math.max(0.1, DEFS[g.part.type].grab.max - DEFS[g.part.type].grab.min)

  return {
    grippers,
    // frame: ângulo pedido (servo no backend) e cubos agarrados ↔ soltos
    frame(n) {
      for (const g of grippers) {
        const s = simRef.engine?.servoOf?.get(g.part.id)
        g.cmd = s ? s.angle : g.cmd
        g.from = g.cur
        g.n = n
        g.c = 0
      }
      for (const run of runs) {
        if (!run.isCube) continue
        const info = simRef.engine?.cubes?.find((c) => c.part.id === run.asm.root.id)
        const g = info?.held ? byId.get(info.by) : null
        if (g && !run.gripJoint) {
          const cube = run.bodies[0]
          if (run.kin) continue // (garra sem física: segue o backend, ver PhysicsWorld)
          const G = bodyMatrix(g.body, new THREE.Matrix4()).multiply(g.gripLocal)
          const rel = G.invert().multiply(bodyMatrix(cube, new THREE.Matrix4()))
          const size = (partSize(run.asm.root) || [1, 1, 1]).map((v) => 2.5 * v)
          // o backend decide pela abertura do servo e por uma pose do cubo com algum atraso: aqui
          // confirma-se na física que o cubo está mesmo entre as maxilas e que elas fecharam até
          // ele (um cubo empurrado para fora, ou maxilas travadas mais abertas, não fica agarrado)
          if (!between(g, rel, size)) {
            drops.add(run.asm.root.id)
            continue
          }
          run.gripRel0 = rel.elements.slice() // (depuração: pose do cubo na pega ao agarrar)
          const F = g.gripLocal.clone().multiply(new THREE.Matrix4().fromArray(gripRel(rel.elements, size)))
          F.decompose(_p, _q, _s)
          const data = R.JointData.fixed({ x: _p.x, y: _p.y, z: _p.z }, { x: _q.x, y: _q.y, z: _q.z, w: _q.w }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0, w: 1 })
          const j = world.createImpulseJoint(data, g.body, cube, true)
          j.setContactsEnabled(false)
          run.gripJoint = j
          run.gripper = g
          g.heldBody = cube
          cube.wakeUp()
        } else if (!g && run.gripJoint) {
          if (world.impulseJoints.get(run.gripJoint.handle)) world.removeImpulseJoint(run.gripJoint, true)
          if (run.gripper) run.gripper.heldBody = null
          run.gripJoint = null
          run.gripper = null
          run.bodies[0].wakeUp()
        }
      }
    },
    // é a garra (física) que segura este cubo?
    holds: (run) => !!run.gripJoint,
    // cada passo (dt = 1/240 s): as maxilas avançam para o ângulo pedido, param se estiverem a
    // entrar em algo que não cede
    step(dt) {
      for (const g of grippers) {
        if (g.c < g.n) g.c++
        const want = g.from + ((g.cmd - g.from) * g.c) / g.n
        const closing = g.cmd < g.cur + 0.5
        g.touch = 0
        const d = closing && !g.heldBody ? penetration(g) : 0
        if (want >= g.cur) g.cur = want // a abrir: sem restrições
        else if (d > STOP) {
          // encostada a algo que não cede: recua o que entrou e fica (o servo encrava)
          g.cur = Math.min(g.cur + (d - STOP) * 2 * degPerCm(g), 180)
          g.blocked = 48
        } else {
          // a empurrar um objeto solto: devagar (o servo abranda com a carga), para o solver o
          // afastar com uma velocidade razoável em vez de o projetar
          const v = g.touch > 0.002 ? PUSH * 2 * degPerCm(g) : (DEFS[g.part.type].servo?.speed || 300) * 1.3
          g.cur = Math.max(want, g.cur - v * dt)
        }
        if (g.blocked > 0 && !(d > STOP / 3)) g.blocked--
        place(g, g.cur)
        simRef.jawAngles.set(g.part.id, g.cur)
      }
    },
    // cubos a largar no backend (agarrados lá, mas não entre as maxilas na física)
    takeDrops() {
      if (!drops.size) return undefined
      const out = [...drops]
      drops.clear()
      return out
    },
    // maxilas encravadas (para o backend parar o servo aí): { [garraId]: graus }
    stops() {
      const out = {}
      for (const g of grippers) if (g.blocked > 0 && !g.heldBody && g.cmd <= g.cur + 0.5) out[g.part.id] = Math.round(g.cur * 100) / 100
      return out
    },
    dispose() {
      for (const g of grippers) simRef.jawAngles.delete(g.part.id)
    },
  }
}
