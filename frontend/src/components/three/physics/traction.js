// Tração própria de rodas omnidirecionais/mecanum e de lagartas (def.traction), aplicada
// em cada passo da física às montagens dinâmicas.
//
// O Rapier só tem atrito isotrópico: uma roda com rolos livres (omni, mecanum) ou uma lagarta
// (contacto longo que derrapa a virar) não se consegue representar com colisores. Por isso
// estas peças têm atrito ~0 com o chão (frictionMin) e a força de contacto é calculada aqui:
//   kind 'wheel' { r, center, axis, roller, mu }  roda (no corpo que roda com o veio): ponto
//       de contacto = centro + r para baixo; só resiste ao escorregamento segundo o eixo dos
//       rolos (roller = ângulo dos rolos ao eixo da roda: 90° omni, ±45° mecanum). A velocidade
//       do ponto de contacto já inclui a rotação da roda (corpo do veio).
//   kind 'belt'  { key, pos, fwd, mu }  ponto de contacto de uma lagarta (fixo no chassi): a
//       banda anda a live[id].track[key] cm/s (para a frente do chassi, ver src/engine/sim/mech.js);
//       resiste à diferença em frente e ao escorregamento de lado.
// Impulso por passo = −escorregamento × massa efetiva, limitado a μ·N·dt (N = peso a dividir
// pelos pontos de contacto que tocam no chão). Só conta o chão da mesa (y = 0).
import * as THREE from 'three'
import { simRef } from '../../../contexts/simRef.js'
import { UNITS } from './assembly.js'

const CONTACT_Y = 0.5 // cm acima do chão: ainda em contacto
const GAIN = 0.5 // fração do escorregamento corrigida por passo

export function createTraction(runs) {
  const items = []
  for (const run of runs) {
    if (!run.dynamic) continue
    let total = 0
    run.asm.segments.forEach((seg) => (total += seg.mass))
    run.asm.segments.forEach((seg, i) => {
      for (const t of seg.tractions || [])
        for (const spec of t.list) items.push({ run, i, P: t.P, partId: t.partId, spec, mass: total })
    })
  }
  if (!items.length) return null

  const M = new THREE.Matrix4()
  const _p = new THREE.Vector3()
  const _q = new THREE.Quaternion()
  const ONE = new THREE.Vector3(1, 1, 1)
  const c = new THREE.Vector3()
  const a = new THREE.Vector3()
  const f = new THREE.Vector3()
  const lat = new THREE.Vector3()
  const d = new THREE.Vector3()
  const p = new THREE.Vector3()
  const UP = new THREE.Vector3(0, 1, 0)
  const DOWN = new THREE.Vector3(0, -1, 0)

  return {
    apply(dt) {
      // pontos em contacto por montagem (para repartir o peso)
      const touching = new Map()
      const contacts = []
      for (const it of items) {
        const b = it.run.bodies[it.i]
        if (!b) continue
        const t = b.translation()
        const r = b.rotation()
        M.compose(_p.set(t.x, t.y, t.z), _q.set(r.x, r.y, r.z, r.w), ONE).multiply(it.P)
        const s = it.spec
        if (s.kind === 'wheel') {
          c.set(...s.center).applyMatrix4(M)
          a.set(...(s.axis || [0, 1, 0])).transformDirection(M)
          // direção do centro para o chão, perpendicular ao eixo
          const n = DOWN.clone().addScaledVector(a, -a.dot(DOWN))
          if (n.lengthSq() < 0.1) continue // roda deitada
          n.normalize()
          p.copy(c).addScaledVector(n, s.r)
          if (p.y > CONTACT_Y) continue
          f.crossVectors(a, UP)
          if (f.lengthSq() < 1e-6) continue
          f.normalize()
          lat.copy(a).addScaledVector(UP, -a.dot(UP)).normalize()
          // eixo dos rolos no contacto: resiste-se ao escorregamento segundo ele
          const rho = ((s.roller ?? 90) * Math.PI) / 180
          d.copy(lat).multiplyScalar(Math.cos(rho)).addScaledVector(f, Math.sin(rho)).normalize()
          contacts.push({ it, b, p: p.clone(), dirs: [[d.clone(), 0]], mu: s.mu ?? 1 })
        } else if (s.kind === 'belt') {
          p.set(...s.pos).applyMatrix4(M)
          if (p.y > CONTACT_Y) continue
          f.set(...(s.fwd || [1, 0, 0])).transformDirection(M)
          f.addScaledVector(UP, -f.dot(UP)).normalize()
          lat.crossVectors(UP, f).normalize()
          const vt = +simRef.engine?.live?.[it.partId]?.track?.[s.key] || 0
          contacts.push({ it, b, p: p.clone(), dirs: [[f.clone(), vt], [lat.clone(), 0]], mu: s.mu ?? 1 })
        }
        touching.set(it.run, (touching.get(it.run) || 0) + 1)
      }
      for (const ct of contacts) {
        const n = touching.get(ct.it.run) || 1
        const mEff = (ct.it.mass / n) * GAIN
        const maxJ = ct.mu * ((ct.it.mass * UNITS.gravity) / n) * dt
        const v = ct.b.velocityAtPoint({ x: ct.p.x, y: ct.p.y, z: ct.p.z })
        let jx = 0
        let jy = 0
        let jz = 0
        for (const [dir, target] of ct.dirs) {
          const slip = v.x * dir.x + v.y * dir.y + v.z * dir.z - target
          const j = -slip * mEff
          jx += dir.x * j
          jy += dir.y * j
          jz += dir.z * j
        }
        const mag = Math.hypot(jx, jy, jz)
        if (mag > maxJ) {
          const k = maxJ / mag
          jx *= k
          jy *= k
          jz *= k
        }
        ct.b.applyImpulseAtPoint({ x: jx, y: jy, z: jz }, { x: ct.p.x, y: ct.p.y, z: ct.p.z }, true)
      }
    },
  }
}
