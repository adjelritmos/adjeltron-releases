// Verificação da física "tudo o que está solto cai": para cada exemplo, cria no Rapier as
// montagens como na física do browser (livres = corpos dinâmicos de um só segmento; as outras =
// fixas) e deixa assentar 2 s sem código. Lista as peças livres que se mexem muito (tombam,
// afundam ou caem de onde estavam): sinal de colisor errado ou de peça pousada no ar.
// uso (em frontend/): bun scripts/settle-check.js [exemplo…] [--all]
import { plugin } from 'bun'
const R = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/\/$/, '')
plugin({ name: 'shared-alias', setup(b) { b.onResolve({ filter: /^@shared\// }, (a) => ({ path: R + '/shared/' + a.path.slice(8) })) } })
const THREE = await import('three')
const RAPIER = (await import(R + '/frontend/node_modules/@dimforge/rapier3d-compat/rapier.mjs')).default
await RAPIER.init()
const { planAssemblies, lowestPoint, UNITS } = await import(R + '/frontend/src/components/three/physics/assembly.js')
const { PRESETS } = await import(R + '/frontend/src/engine/sim/examples/index.js')
const { DEFS } = await import(R + '/shared/components.js')

const args = process.argv.slice(2)
const keys = args.filter((a) => !a.startsWith('--'))
const ALL = args.includes('--all')
const STEP = 1 / 240
const D2R = Math.PI / 180
let problems = 0
for (const key of keys.length ? keys : Object.keys(PRESETS)) {
  const P = PRESETS[key]
  let parts
  try {
    parts = P.build().parts
  } catch (e) {
    console.log(`${key}: erro a montar (${e.message})`)
    continue
  }
  const world = new RAPIER.World({ x: 0, y: -UNITS.gravity, z: 0 })
  world.timestep = STEP
  const ip = world.integrationParameters
  ip.numSolverIterations = 16
  ip.numInternalPgsIterations = 4
  ip.contact_natural_frequency = 300
  world.lengthUnit = 100
  world.createCollider(RAPIER.ColliderDesc.cuboid(2000, 2.5, 2000).setTranslation(0, -2.5, 0).setFriction(0.9))
  const plan = planAssemblies(parts)
  const watch = []
  const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3()
  for (const asm of plan) {
    // (robôs articulados livres: ver walk-sim.js) — aqui ficam fixos como obstáculos
    const dyn = asm.dynamic && asm.segments.length === 1
    // como no browser: a montagem livre é levantada até não entrar na mesa
    const lift = dyn ? Math.max(0, 0.05 - lowestPoint(asm)) : 0
    asm.segments.forEach((seg) => {
      seg.B0.decompose(_p, _q, _s)
      const desc = (dyn ? RAPIER.RigidBodyDesc.dynamic().setLinearDamping(0.3).setAngularDamping(1.0) : RAPIER.RigidBodyDesc.fixed()).setTranslation(_p.x, _p.y + lift, _p.z).setRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w })
      const b = world.createRigidBody(desc)
      for (const c of seg.colliders) world.createCollider((c.radius ? RAPIER.ColliderDesc.ball(c.radius) : RAPIER.ColliderDesc.cuboid(...c.half)).setTranslation(c.pos.x, c.pos.y, c.pos.z).setRotation({ x: c.quat.x, y: c.quat.y, z: c.quat.z, w: c.quat.w }).setMass(c.mass).setFriction(0.8), b)
      if (dyn) watch.push({ id: asm.root.id, type: asm.root.type, b, p0: { ..._p, y: _p.y + lift }, q0: _q.clone(), lift })
    })
  }
  for (let i = 0; i < 480; i++) world.step()
  const bad = []
  for (const w of watch) {
    const t = w.b.translation()
    const r = w.b.rotation()
    const d = Math.hypot(t.x - w.p0.x, t.y - w.p0.y, t.z - w.p0.z)
    const ang = (2 * Math.acos(Math.min(1, Math.abs(w.q0.clone().invert().multiply(new THREE.Quaternion(r.x, r.y, r.z, r.w)).w)))) / D2R
    if (ALL || d > 1 || ang > 10 || w.lift > 0.5) bad.push(`${w.id} (${DEFS[w.type]?.name || w.type}): moveu ${d.toFixed(1)} cm, rodou ${ang.toFixed(0)}°${w.lift > 0.5 ? `, estava ${w.lift.toFixed(1)} cm dentro da mesa` : ''}, y ${w.p0.y.toFixed(1)}→${t.y.toFixed(1)}`)
  }
  problems += bad.length
  console.log(`${key}: ${watch.length} montagens livres${bad.length ? ` — ${bad.length} mexeram-se:` : ' — ok'}`)
  for (const b of bad) console.log('   ', b)
}
console.log(`total de montagens livres que se mexeram: ${problems}`)
