// Física sem browser para os robôs de patas: corre o sketch no motor (src/engine) e a mecânica no
// Rapier (a mesma lógica de frontend/src/components/three/physics/PhysicsWorld.jsx: juntas de
// revolução com motor de posição saturado), com o IMU e as juntas a voltar ao motor.
// uso (em frontend/): bun scripts/walk-sim.js caoRobo|humanoide|aranha [segundos] [--code=ficheiro.ino] [--trace]
//   ou um projeto exportado (.adjel/.json): bun scripts/walk-sim.js --project=robo.adjel [segundos]
// (motor de src/engine — a app já não usa a pasta backend/)
import { plugin } from 'bun'
const R = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/\/$/, '')
plugin({
  name: 'shared-alias',
  setup(b) {
    b.onResolve({ filter: /^@shared\// }, (a) => ({ path: R + '/shared/' + a.path.slice(8) }))
  },
})
const THREE = await import('three')
const RAPIER = (await import(R + '/frontend/node_modules/@dimforge/rapier3d-compat/rapier.mjs')).default
await RAPIER.init()
const { planAssemblies, lowestPoint, jointInertia, UNITS } = await import(R + '/frontend/src/components/three/physics/assembly.js')
const { PRESETS } = await import(R + '/frontend/src/engine/sim/examples/index.js')
const { compileFast } = await import(R + '/frontend/src/engine/compile-fast.js')
const compileSketch = async (code, o) => compileFast(code, o)
const { createEngine } = await import(R + '/frontend/src/engine/sim/engine.js')
const { getTrackModel } = await import(R + '/frontend/src/engine/sim/track.js')
const { DEFS } = await import(R + '/shared/components.js')

const args = process.argv.slice(2)
const projectFile = args.find((a) => a.startsWith('--project='))?.slice(10)
const project = projectFile ? JSON.parse(await Bun.file(projectFile).text()) : null
const key = project ? project.projectName || 'projeto' : args.find((a) => !a.startsWith('--')) || 'caoRoboAlu'
const T = +(args.filter((a) => !a.startsWith('--'))[project ? 0 : 1] || 20)
const codeFile = args.find((a) => a.startsWith('--code='))?.slice(7)
const TRACE = args.includes('--trace')
const EVERY = +(args.find((a) => a.startsWith('--every='))?.slice(8) || 250)
const SHOW = (args.find((a) => a.startsWith('--show='))?.slice(7) || '').split(',').filter(Boolean)
const P = project ? { build: () => ({ parts: project.parts, wires: project.wires }), code: project.code, track: project.track } : PRESETS[key]
const { parts, wires } = P.build()
const code = codeFile ? await Bun.file(codeFile).text() : P.code
const board = parts.find((p) => DEFS[p.type].board)?.type
const r = await compileSketch(code, { board })
if (!r.ok) {
  console.log(r.diagnostics.filter((d) => d.severity === 'error'))
  process.exit(1)
}
let serial = ''
const engine = createEngine({ parts, wires, code, compiled: r.js, track: getTrackModel(P.track), realism: true, inputs: {}, onSerial: (t, lv) => (serial += lv ? `[${lv}] ${t}` : t) })

// ---------- mundo ----------
const STEP = 1 / 240
const D2R = Math.PI / 180
const SAT = 4 * D2R
const world = new RAPIER.World({ x: 0, y: -UNITS.gravity, z: 0 })
world.timestep = STEP
// os mesmos parâmetros que o <Physics> de PhysicsWorld.jsx (@react-three/rapier)
const ip = world.integrationParameters
ip.numSolverIterations = +(args.find((a) => a.startsWith('--iters='))?.slice(8) || 8)
ip.numInternalPgsIterations = +(args.find((a) => a.startsWith('--pgs='))?.slice(6) || 1)
ip.normalizedAllowedLinearError = 0.0002
ip.minIslandSize = 128
ip.maxCcdSubsteps = 1
ip.normalizedPredictionDistance = 0.002
world.lengthUnit = 100
ip.contact_natural_frequency = +(args.find((a) => a.startsWith('--cnf='))?.slice(6) || 30)
world.createCollider(RAPIER.ColliderDesc.cuboid(500, 2.5, 500).setTranslation(0, -2.5, 0).setFriction(0.9))
const plan = planAssemblies(parts).filter((a) => a.dynamic)
const asm = plan[0]
const lift = Math.max(0, 0.05 - lowestPoint(asm))
const [lin, ang] = DEFS[asm.root.type]?.damping || [0.3, 1.0]
const bit = 1 << 2
const groups = (bit << 16) | (0xffff & ~bit)
const bodies = []
const joints = []
const _p = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _q2 = new THREE.Quaternion()
const _s = new THREE.Vector3()
asm.segments.forEach((seg, i) => {
  seg.B0.decompose(_p, _q, _s)
  const b = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setLinearDamping(lin).setAngularDamping(ang).setCanSleep(false).setTranslation(_p.x, _p.y + lift, _p.z).setRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w }))
  for (const c of seg.colliders) {
    world.createCollider(
      (c.radius ? RAPIER.ColliderDesc.ball(c.radius) : RAPIER.ColliderDesc.cuboid(...c.half))
        .setTranslation(c.pos.x, c.pos.y, c.pos.z)
        .setRotation({ x: c.quat.x, y: c.quat.y, z: c.quat.z, w: c.quat.w })
        .setMass(c.mass)
        .setFriction(c.friction ?? 0.8) // o mesmo atrito do browser (DEFS.friction pode ser uma função do material)
        .setRestitution(0.05)
        .setCollisionGroups(groups),
      b,
    )
  }
  if (!seg.colliders.length) b.setAdditionalMassProperties(0.001, { x: 0, y: 0, z: 0 }, { x: 1e-3, y: 1e-3, z: 1e-3 }, { x: 0, y: 0, z: 0, w: 1 }, false)
  bodies[i] = b
})
asm.segments.forEach((seg, i) => {
  if (!i) return
  const { anchor1, axis, torque } = seg.joint
  const j = world.createImpulseJoint(RAPIER.JointData.revolute({ x: anchor1.x, y: anchor1.y, z: anchor1.z }, { x: 0, y: 0, z: 0 }, { x: axis.x, y: axis.y, z: axis.z }), bodies[seg.parent], bodies[i], true)
  j.setContactsEnabled(false)
  j.configureMotorModel(RAPIER.MotorModel.ForceBased)
  const k = (torque * UNITS.kgfcm) / SAT
  joints[i] = { j, k, d: 2 * Math.sqrt(k * jointInertia(asm, i)), axis, ownerId: seg.owner.id }
})
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
const imus = []
asm.segments.forEach((seg, i) => seg.imus.forEach((u) => imus.push({ i, P: u.P, id: u.partId, prevP: null, prevV: null, prevQ: null, sumA: new THREE.Vector3(), nA: 0, sumW: new THREE.Vector3(), nW: 0, q: new THREE.Quaternion() })))
const bodyM = (b) => {
  const t = b.translation()
  const q = b.rotation()
  return new THREE.Matrix4().compose(new THREE.Vector3(t.x, t.y, t.z), new THREE.Quaternion(q.x, q.y, q.z, q.w), new THREE.Vector3(1, 1, 1))
}

// ---------- ciclo: 1 ms de motor, física a 240 Hz, mundo de volta a ~60 Hz ----------
const root = bodies[0]
const footSegs = asm.segments.map((s, i) => (s.parts.some((p) => /^(pe|pata)/.test(p.id)) ? i : -1)).filter((i) => i >= 0)
const start = { ...root.translation() }
let fell = null
let physAcc = 0
let sendAcc = 0
const trace = []
const euler = new THREE.Euler()
let maxTilt = 0
let tiltSq = 0
let nTilt = 0
for (let ms = 0; ms < T * 1000; ms++) {
  engine.advance(0.001, 1e9)
  physAcc += 0.001
  while (physAcc >= STEP) {
    physAcc -= STEP
    joints.forEach((jt) => {
      if (!jt) return
      const i = joints.indexOf(jt)
      const pr = bodies[asm.segments[i].parent].rotation()
      const cr = bodies[i].rotation()
      _q.set(pr.x, pr.y, pr.z, pr.w).invert().multiply(_q2.set(cr.x, cr.y, cr.z, cr.w))
      const cur = wrap(2 * Math.atan2(_q.x * jt.axis.x + _q.y * jt.axis.y + _q.z * jt.axis.z, _q.w))
      jt.cur = cur
      const target = ((engine.servoOf.get(jt.ownerId)?.angle ?? 90) - 90) * D2R
      const err = Math.max(-SAT, Math.min(SAT, wrap(target - cur)))
      jt.j.configureMotorPosition(cur + err, jt.k, jt.d)
    })
    world.step()
    for (const st of imus) {
      const M = bodyM(bodies[st.i]).multiply(st.P)
      const p = new THREE.Vector3()
      const q = new THREE.Quaternion()
      M.decompose(p, q, _s)
      if (st.prevP) {
        const v = p.clone().sub(st.prevP).divideScalar(STEP)
        if (st.prevV) (st.sumA.add(v.clone().sub(st.prevV).divideScalar(STEP)), st.nA++)
        st.prevV = v
        const dq = st.prevQ.clone().invert().multiply(q)
        if (dq.w < 0) dq.set(-dq.x, -dq.y, -dq.z, -dq.w)
        const s = Math.sqrt(Math.max(0, 1 - dq.w * dq.w))
        if (s > 1e-9) st.sumW.add(new THREE.Vector3(dq.x / s, dq.y / s, dq.z / s).multiplyScalar((2 * Math.atan2(s, dq.w)) / STEP))
        st.nW++
      }
      st.prevP = p
      st.prevQ = q
      st.q.copy(q)
    }
  }
  sendAcc += 1
  if (sendAcc >= 16) {
    sendAcc = 0
    const imu = {}
    for (const st of imus) {
      const a = st.nA ? st.sumA.divideScalar(st.nA) : new THREE.Vector3()
      const f = a.add(new THREE.Vector3(0, UNITS.gravity, 0)).applyQuaternion(st.q.clone().invert()).divideScalar(100)
      const w = st.nW ? st.sumW.divideScalar(st.nW) : new THREE.Vector3()
      imu[st.id] = { ax: f.x, ay: f.y, az: f.z, gx: w.x, gy: w.y, gz: w.z }
      st.sumA = new THREE.Vector3()
      st.sumW = new THREE.Vector3()
      st.nA = st.nW = 0
    }
    const M = bodyM(root).multiply(asm.segments[0].K)
    const jd = {}
    for (const jt of joints) if (jt?.cur != null) jd[jt.ownerId] = jt.cur / D2R + 90
    engine.setWorld({ bodies: { [asm.root.id]: M.elements }, imu, joints: jd })
  }
  if (ms % EVERY === 0) {
    const t = root.translation()
    const q = root.rotation()
    // inclinação = ângulo entre o "cima" do corpo e o cima do mundo
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w))
    const tilt = Math.acos(Math.min(1, up.y)) / D2R
    euler.setFromQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w), 'YXZ')
    const yaw = euler.y / D2R
    if (ms > 1500) maxTilt = Math.max(maxTilt, tilt)
    if (ms > 3000) (tiltSq += tilt * tilt), nTilt++
    if (!fell && tilt > 45) fell = ms / 1000
    trace.push({ t: ms / 1000, x: t.x - start.x, y: t.y, z: t.z - start.z, tilt, yaw })
    let cm = [0, 0, 0], mt = 0
    for (const b of bodies) { const c = b.worldCom(); const m = b.mass(); cm[0] += c.x * m; cm[1] += c.y * m; cm[2] += c.z * m; mt += m }
    cm = cm.map((v) => v / mt)
    // pés (peças de apoio): pontos mais baixos de cada pé
    const feet = footSegs.map((i) => { const c = bodies[i].translation(); const q = bodies[i].rotation(); const up = new THREE.Vector3(0, 1, 0).applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w)); return `${asm.segments[i].key.split(':')[0]}(${(c.x - start.x).toFixed(1)},${c.y.toFixed(1)},${c.z.toFixed(1)} up ${up.x.toFixed(2)},${up.z.toFixed(2)})` }).join(' ')
    if (TRACE) console.log(`com=(${(cm[0] - start.x).toFixed(2)},${cm[1].toFixed(1)},${cm[2].toFixed(2)}) ${feet}`)
    if (TRACE) console.log(`t=${(ms / 1000).toFixed(2)} x=${(t.x - start.x).toFixed(2)} z=${(t.z - start.z).toFixed(2)} y=${t.y.toFixed(2)} incl=${tilt.toFixed(1)}° rumo=${yaw.toFixed(1)}° pitch=${(euler.x / D2R).toFixed(1)} roll=${(euler.z / D2R).toFixed(1)} ${SHOW.map((id) => { const jt = joints.find((j) => j?.ownerId === id); return id + '=' + (engine.servoOf.get(id)?.angle ?? 0).toFixed(0) + '/' + (jt?.cur != null ? (jt.cur / D2R + 90).toFixed(0) : '?') }).join(' ')}`)
  }
}
if (args.includes('--sep')) asm.segments.forEach((seg, i) => { if (!i) return; const pb = bodies[seg.parent]; const t = pb.translation(); const q = pb.rotation(); const a = seg.joint.anchor1.clone().applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w)).add(new THREE.Vector3(t.x, t.y, t.z)); const c = bodies[i].translation(); console.log('sep', seg.key.padEnd(16), a.distanceTo(new THREE.Vector3(c.x, c.y, c.z)).toFixed(3)) })
if (args.includes('--cols')) world.forEachCollider((c) => { const t = c.translation(); const b = c.parent(); const i = bodies.indexOf(b); if (i >= 0 && footSegs.includes(i)) console.log('col', asm.segments[i].key, 'y', t.y.toFixed(3), 'half', JSON.stringify(c.halfExtents?.() || c.radius?.())) })
const end = trace.at(-1)
// avanço segundo a frente inicial do robô (x local da raiz)
console.log(JSON.stringify({ key, T, dx: +end.x.toFixed(2), dz: +end.z.toFixed(2), y: +end.y.toFixed(2), yaw: +end.yaw.toFixed(1), maxTilt: +maxTilt.toFixed(1), rmsTilt: +Math.sqrt(tiltSq / Math.max(1, nTilt)).toFixed(2), fell }))
console.log(serial.trim().split('\n').slice(args.includes('--serial') ? 0 : -6).join('\n'))
