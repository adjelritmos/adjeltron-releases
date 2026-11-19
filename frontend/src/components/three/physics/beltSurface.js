// Correias com corpo na física (def.conveyor, ex.: "Correia GT2 / tapete"): o que se pousa em
// cima é arrastado à velocidade da correia (esteira transportadora).
//
// O contorno da correia (parts/_beltFrame.js: referencial com origem na 1.ª polia, y = eixo) é
// cortado em troços (retas e arcos à volta das polias); cada troço é uma caixa fina, com a face de
// fora onde está a correia desenhada, num corpo cinemático "por velocidade" próprio.
// O Rapier não tem velocidade de superfície; faz-se como nos tapetes rolantes dos jogos: em cada
// passo o troço é reposto no sítio e recebe a velocidade da correia ao longo da sua tangente. O
// atrito normal do Rapier (estático e dinâmico, com rotação) vê a superfície a andar e arrasta o
// que está pousado; como o troço volta ao sítio antes do passo seguinte, a correia não sai do lugar.
// A correia anda −Δθ·r ao longo do contorno CCW quando a 1.ª polia roda Δθ em torno do seu +y (rotação
// 3D, a que o utilizador vê, seja movida pelo motor, por engrenagens ou pela física); a velocidade de
// cada passo cobre o que falta andar (posição seguida, não estimada).
//
// As montagens onde estão as polias da correia (motores, veios, perfis) não chocam com ela
// (filterPair → skipPair): a correia passa por cima dos apoios sem os empurrar.
import * as THREE from 'three'
import { DEFS } from '@shared/components.js'
import { beltLoop } from '@shared/parts/_belt.js'
import { GT2P } from '@shared/parts/gt2Pulley.js'
import { beltDims } from '@shared/parts/correiaGt2.js'
import { beltFrame } from '../parts/_beltFrame.js'

const OUT = 0.135 // face de fora da correia (cm a partir da circunferência primitiva) = _belt.jsx
const THICK = 0.4 // espessura das caixas (para dentro: um objeto rápido não atravessa)
const MU = 0.9 // borracha
const SEG = 24 // pontos por polia no contorno (arcos em caixas)

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))

export function createBeltSurfaces({ world, R, parts, runs, colInfo, group, stepDt }) {
  const belts = []
  // corpos de cada montagem (para não chocar com as montagens das polias)
  const bodiesOfPart = new Map()
  for (const run of runs) {
    const hs = run.bodies.map((b) => b.handle)
    run.asm.segments.forEach((seg) => seg.parts.forEach((p) => bodiesOfPart.set(p.id, hs)))
  }
  for (const p of parts) {
    const def = DEFS[p.type]
    if (!def?.conveyor || !def.belt) continue
    const ids = (p.config?.pulleys || []).filter((id) => parts.some((q) => q.id === id && def.belt.of.includes(q.type)))
    if (ids.length < 2) continue
    const pulleys = ids.map((id) => ({ id, teeth: parts.find((q) => q.id === id).config?.teeth ?? 20 }))
    const { w, dy } = beltDims(p.config)
    const skip = new Set([p.id, ...ids].flatMap((id) => bodiesOfPart.get(id) || []))
    belts.push({ part: p, pulleys, y: GT2P.BELT_Y + dy, w, skip, segs: [], F: new THREE.Matrix4(), theta: null, v: 0, sTarget: 0, sPhys: 0, k: 0, r0: 0, follow: null, built: false })
  }
  if (!belts.length) return null

  const beltOfBody = new Map() // handle do corpo de um troço → correia
  const _p = new THREE.Vector3()
  const _q = new THREE.Quaternion()
  const _s = new THREE.Vector3()
  const _B = new THREE.Matrix4()
  const _M = new THREE.Matrix4()
  const _W = new THREE.Matrix4()
  const _t = new THREE.Vector3()
  const ONE = new THREE.Vector3(1, 1, 1)
  const X = new THREE.Vector3()
  const Y = new THREE.Vector3(0, 1, 0)
  const Z = new THREE.Vector3()

  // pose mundo de cada troço (W = F · L) e tangente no mundo
  const place = (b, F) => {
    for (const s of b.segs) {
      _W.multiplyMatrices(F, s.L).decompose(s.p, s.q, _s)
      s.tw.copy(s.t).transformDirection(F)
    }
  }

  // corpos e colisores (na primeira imagem em que as polias existem no 3D, alinhadas)
  const build = (b) => {
    const bf = beltFrame(b.pulleys, b.y, b.F)
    if (!bf?.ok || bf.circles.length < 2) return false
    const loop = beltLoop(bf.circles, SEG)
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i]
      const c = loop[(i + 1) % loop.length]
      const dx = c[0] - a[0]
      const dz = c[1] - a[1]
      const len = Math.hypot(dx, dz)
      if (len < 1e-4) continue
      const tx = dx / len
      const tz = dz / len
      // normal para fora (contorno CCW) = (tz, −tx); centro da caixa com a face de fora em OUT
      const off = OUT - THICK / 2
      X.set(tx, 0, tz)
      Z.crossVectors(X, Y) // = −normal
      _B.makeBasis(X, Y, Z).setPosition((a[0] + c[0]) / 2 + tz * off, 0, (a[1] + c[1]) / 2 - tx * off)
      const s = { L: _B.clone(), t: new THREE.Vector3(tx, 0, tz), tw: new THREE.Vector3(), p: new THREE.Vector3(), q: new THREE.Quaternion(), body: null }
      b.segs.push(s)
      _W.multiplyMatrices(b.F, s.L).decompose(_p, _q, _s)
      s.body = world.createRigidBody(R.RigidBodyDesc.kinematicVelocityBased().setTranslation(_p.x, _p.y, _p.z).setRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w }))
      const col = world.createCollider(
        R.ColliderDesc.cuboid(len / 2 + 0.03, b.w / 2, THICK / 2).setFriction(MU).setRestitution(0).setCollisionGroups(group).setActiveHooks(R.ActiveHooks.FILTER_CONTACT_PAIRS),
        s.body,
      )
      colInfo.set(col.handle, { partId: b.part.id, type: b.part.type, run: -1, seg: 0, belt: true })
      beltOfBody.set(s.body.handle, b)
    }
    place(b, b.F)
    b.r0 = bf.r0
    b.theta = bf.theta
    b.follow = { p0: new THREE.Vector3(), q0: new THREE.Quaternion(), p1: new THREE.Vector3(), q1: new THREE.Quaternion(), vel: new THREE.Vector3(), n: 1, c: 0, moving: false }
    b.F.decompose(b.follow.p1, b.follow.q1, _s)
    b.built = true
    return true
  }

  return {
    belts,
    // par (handles de corpos) que não deve chocar: correia ↔ montagens das suas polias
    skipPair(h1, h2) {
      const b1 = beltOfBody.get(h1)
      const b2 = beltOfBody.get(h2)
      if (b1 && b2) return true // troços de correias: cinemáticos, não chocam entre si
      const b = b1 || b2
      return !!b && b.skip.has(b1 ? h2 : h1)
    },
    // cada imagem (antes dos passos): pose da correia e velocidade a partir da rotação da 1.ª polia
    frame(dt, n, paused) {
      for (const b of belts) {
        if (!b.built && !build(b)) continue
        const f = b.follow
        f.p0.copy(f.p1)
        f.q0.copy(f.q1)
        const bf = beltFrame(b.pulleys, b.y, b.F)
        if (!bf) continue
        // a 1.ª polia rodou Δθ em torno do seu +y desde a última imagem: a correia andou −Δθ·r (CCW).
        // Segue-se a POSIÇÃO (sTarget), não uma velocidade estimada: os passos da física cobrem o que
        // falta, por isso o que está em cima anda exatamente o que a correia andou, a qualquer fps
        if (!paused) b.sTarget += -wrap(bf.theta - b.theta) * b.r0
        // nunca mais de 5 cm em atraso (física parada, saltos)
        b.sPhys = Math.max(b.sTarget - 5, Math.min(b.sTarget + 5, b.sPhys))
        b.theta = bf.theta
        b.k = 0
        b.F.decompose(f.p1, f.q1, _s)
        f.moving = f.p0.distanceToSquared(f.p1) > 1e-10 || Math.abs(f.q0.dot(f.q1)) < 1 - 1e-10
        // correia num robô que anda: o que está em cima acompanha a translação do referencial
        if (f.moving && !paused && dt > 0) f.vel.copy(f.p1).sub(f.p0).divideScalar(n * stepDt)
        else f.vel.set(0, 0, 0)
        f.n = n
        f.c = 0
      }
    },
    // cada passo: troços repostos no sítio (interpolado ao longo da imagem) e com a velocidade da correia
    step() {
      for (const b of belts) {
        if (!b.built) continue
        const f = b.follow
        if (f.moving && f.c < f.n) {
          f.c++
          const k = f.c / f.n
          _p.copy(f.p0).lerp(f.p1, k)
          _q.copy(f.q0).slerp(f.q1, k)
          place(b, _M.compose(_p, _q, ONE))
        }
        // velocidade da correia neste passo: o que falta andar, repartido pelos passos que faltam
        const left = Math.max(1, (b.follow.n || 1) - b.k)
        b.k++
        b.v = (b.sTarget - b.sPhys) / (left * stepDt)
        b.sPhys += b.v * stepDt
        for (const s of b.segs) {
          s.body.setTranslation({ x: s.p.x, y: s.p.y, z: s.p.z }, false)
          s.body.setRotation({ x: s.q.x, y: s.q.y, z: s.q.z, w: s.q.w }, false)
          _t.copy(s.tw).multiplyScalar(b.v).add(f.vel)
          s.body.setLinvel({ x: _t.x, y: _t.y, z: _t.z }, true)
        }
      }
    },
    dispose(sets) {
      if (!sets.bodies?.raw) return
      for (const b of belts) for (const s of b.segs) if (s.body) sets.bodies.remove(s.body.handle, sets.islands, sets.colliders, sets.ij, sets.mj)
    },
  }
}
