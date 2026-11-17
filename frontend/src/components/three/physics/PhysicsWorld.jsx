// Física de corpos rígidos (Rapier via @react-three/rapier) durante a simulação.
//
// Divisão de responsabilidades:
//   - backend (Bun): eletrónica, código do Arduino, servos (ângulo comandado), veículos
//     com cinemática diferencial, garra/cubos agarrados;
//   - aqui (browser): mecânica das montagens com physics: 'dynamic' (robôs livres, cubos
//     soltos) e colisões com tudo o resto. A pose real e o IMU voltam ao backend.
//
// UNIDADES: cm, kg, s. Gravidade −981 cm/s². lengthUnit = 100 (o Rapier escala as
// tolerâncias internas: 1 m = 100 unidades; a interpenetração tolerada é baixada para
// 0,02 cm). Passo fixo de 1/240 s (vários subpassos por frame), 8 iterações do solver. Força em kg·cm/s² (1 N = 100), binário em kg·cm²/s²
// (1 N·m = 10⁴; 1 kg·cm de servo = 981).
//
// CONTRATO (campos das defs, ver também o cabeçalho de shared/components.js):
//   physics: 'dynamic'   peça-raiz → sistema articulado livre. Corpo novo em cada mount com
//                        servo: true, ligado por junta de revolução no Y local do mount com
//                        motor de posição: alvo = servoHornRotation(ângulo do servo no
//                        backend), binário máximo = servo.torque (kg·cm; 1,8 por omissão).
//                        Mounts sem servo são fixos (colisores compostos no mesmo corpo).
//   mass                 gramas (ou (config) => g); sem ela: volume dos colisores × 0,5 g/cm³.
//   collider             { size, pos } (caixa) | { radius, pos } (bola) | [...] | (config) => … | false,
//                        no referencial da peça;
//                        sem ele: caixa `size` com centro em [0, size[1]/2, 0].
//   thrust               { axis: [x,y,z], pos: [x,y,z] } local (o ar sai no sentido −eixo: vento
//                        nos corpos livres à frente, ver blowAir). Em cada passo aplica-se uma força
//                        de simRef.engine.live[id].thrustN newtons segundo o eixo (transformado
//                        para o mundo) nesse ponto, e um binário de reação em torno do eixo de
//                        +(live.spin || 1) · thrustN · 0,02 N·m (spin +1 = hélice CW vista do lado
//                        para onde o eixo aponta → o corpo roda CCW).
//   friction             atrito dos colisores da peça, número ou (config) => número (peças com
//                        material: o do material); por omissão 0,8; o chão tem 0,9; combina-se
//                        pela média.
//   imu: true            o browser envia { ax, ay, az, gx, gy, gz } no referencial local da peça
//                        (x frente, y cima, z direita): força específica em m/s² (pousado plano:
//                        ay = +9,81) e velocidade angular em rad/s.
//   damping              [linear, angular] da raiz dinâmica (por omissão [0,3, 1,0] /s) para um
//                        PID no código (comandos a ~30 Hz) conseguir estabilizar.
//
// MENSAGEM para o motor (~60 Hz, para o Web Worker da simulação):
//   { type: 'world', bodies: { [rootPartId]: number[16] }, imu: { [partId]: {ax,ay,az,gx,gy,gz} },
//     joints: { [servoPartId]: graus }, jaws: { [garraId]: graus }, drop: [cuboId] }
//   bodies = matriz mundo (cm, coluna-maior como THREE.Matrix4.elements) de cada peça-raiz
//   dinâmica; joints = ângulo real de cada junta de servo das montagens
//   dinâmicas (90 = posição de montagem, como o ângulo do servo); jaws = garras cujas maxilas
//   encostaram a algo que não cede (o servo encrava aí); drop = cubos que o backend deu como
//   agarrados mas que não estão entre as maxilas (grippers.js). O backend chama engine.setWorld(msg).
//
// RIGIDEZ (nada atravessa nada): contactos a 300 Hz e passos de 1/240 s, CCD nos corpos soltos (o
// CCD "suave" nos elos foi testado e piorava: patas do cão 1,3 mm dentro da mesa em vez de 0,4);
// os pares de corpos da mesma montagem ignorados por se sobreporem na construção voltam a chocar
// mal se afastam (releaseSeparated); as maxilas das garras são colisores que param no objeto e o
// cubo agarrado fica dinâmico, preso por uma junta (nunca cinemático: atravessava a mesa).
//
// Montagens "fixas à mesa" (anchored, ex.: braço robótico): o corpo da raiz é cinemático e
// segue o grupo 3D; os corpos depois de cada servo são dinâmicos, ligados por juntas com
// motor de binário limitado — a gravidade puxa os elos e um servo fraco cede. Os ângulos
// reais vão para o backend (joints).
// Montagens estáticas (mesa, veículos) têm corpos cinemáticos que seguem os grupos 3D (que
// continuam a ser movidos como antes): servem para empurrar cubos.
// Os grupos 3D das montagens dinâmicas passam a ser movidos pelos corpos (simRef.physicsOwned),
// por isso os fios 3D (que leem simRef.objects) seguem-nos.
import { Suspense, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Physics, RigidBody, CuboidCollider, useRapier, useBeforePhysicsStep, useAfterPhysicsStep, useFilterContactPair } from '@react-three/rapier'
import * as THREE from 'three'
import { useStore } from '../../../contexts/store.js'
import { DEFS, liveBoxes } from '@shared/components.js'
import { pessoaK } from '@shared/parts/pessoa.js'
import { spinJams } from '@shared/spinClear.js'
import { ARENA } from '@shared/tracks.js'
import { simRef } from '../../../contexts/simRef.js'
import { getTrack } from '../../../functions/trackTexture.js'
import { sendWorld, setInput } from '../../../services/simControl.js'
import { planAssemblies, lowestPoint, jointInertia, UNITS, buildMatrices } from './assembly.js'
import { createTraction } from './traction.js'
import { createGrippers } from './grippers.js'
import { mountAngleNow } from '../../../functions/mechLive.js'

export const STEP = 1 / 240
const CONTACT_HZ = 300 // frequência natural dos contactos (Rapier: 30 por omissão)
const D2R = Math.PI / 180
// Servo real = controlador proporcional muito rígido que satura no binário de bloqueio:
// dá o binário máximo a ~4° de erro (o alvo do motor é limitado a ±SAT do ângulo atual).
const SAT = 4 * D2R
const SEND_MS = 16 // ~60 Hz
const DEFAULT_DAMPING = [0.3, 1.0]
const FRICTION = 0.8
const G_KIN = 0b10 // grupo de colisão das montagens cinemáticas e corpos soltos simples

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
const r4 = (v) => Math.round(v * 1e4) / 1e4

// assinatura da geometria (muda → mundo da física recriado). Não inclui valores de
// potenciómetros/sliders, que mudam durante a simulação.
const physicsSignature = (parts) => JSON.stringify(parts.map((p) => [p.id, p.type, p.parent?.id, p.parent?.mount, p.pos, p.rot, p.config?.length, p.physics, p.config?.material, p.config?.scale, p.config?.x, p.config?.y, p.config?.z, p.config?.r, p.config?.h, p.config?.width, p.config?.height, p.config?.thick, p.config?.l, p.config?.w, p.config?.t]))

// ---------- camada (só no modo simulação) ----------
export function PhysicsLayer() {
  const mode = useStore((s) => s.mode)
  const paused = useStore((s) => s.paused)
  const debug = useStore((s) => !!s.physicsDebug)
  const epoch = useStore((s) => s.physicsEpoch || 0)
  const sig = useStore((s) => physicsSignature(s.parts))
  const g = UNITS.gravity / 100 // gravidade da Terra (9,81 m/s²)
  if (mode !== 'sim') return null
  return (
    <Suspense fallback={null}>
      <Physics
        key={`${epoch}|${sig}`}
        gravity={[0, -g * 100, 0]}
        lengthUnit={100}
        timeStep={STEP}
        numSolverIterations={8}
        allowedLinearError={0.0002} // × lengthUnit = 0,02 cm de interpenetração tolerada
        interpolate={false}
        colliders={false}
        paused={paused}
        debug={debug}
        updatePriority={-50}
      >
        <ArenaColliders />
        <Assemblies />
      </Physics>
    </Suspense>
  )
}

// chão da mesa, paredes e obstáculos da pista: colisores fixos
function ArenaColliders() {
  const track = getTrack(useStore((s) => s.track))
  return (
    <RigidBody type="fixed" colliders={false}>
      {/* tampo da mesa: a face de cima fica 0,02 cm acima de y = 0 para compensar a pequena
          interpenetração de contacto que o solver ainda deixa. É grosso (40 cm): um corpo que
          caia depressa e entre no tampo é empurrado de volta pela face de cima em vez de o
          atravessar (os robôs articulados não têm CCD). Estende-se muito para lá da mesa: um
          drone ou uma peça atirada que saia por cima das paredes pousa no chão em vez de cair
          para sempre */}
      <CuboidCollider args={[2500, 20, 2500]} position={[0, -19.98, 0]} friction={0.9} />
      {[
        [0, ARENA.h / 2 + 0.5, ARENA.w + 2, 1],
        [0, -ARENA.h / 2 - 0.5, ARENA.w + 2, 1],
        [ARENA.w / 2 + 0.5, 0, 1, ARENA.h],
        [-ARENA.w / 2 - 0.5, 0, 1, ARENA.h],
      ].map(([x, z, w, d], i) => (
        <CuboidCollider key={i} args={[w / 2, 3, d / 2]} position={[x, 3, z]} />
      ))}
      {track.obstacles.map((o, i) => (
        <CuboidCollider key={`o${i}`} args={[o.w / 2, o.h / 2, o.d / 2]} position={[o.x, o.h / 2, o.z]} />
      ))}
    </RigidBody>
  )
}

function Assemblies() {
  const { world, rapier } = useRapier()
  const sys = useRef(null)
  useEffect(() => {
    const s = createSystem(world, rapier, useStore.getState().parts)
    sys.current = s
    simRef.physicsSystem = s // depuração (consola: __simRef.physicsSystem)
    return () => {
      sys.current = null
      if (simRef.physicsSystem === s) simRef.physicsSystem = null
      s.dispose()
    }
  }, [world, rapier])
  useFrame((_, dt) => sys.current?.prepareFrame(dt), -60) // antes do passo da física (−50)
  useBeforePhysicsStep(() => {
    // contacto rígido (reposto a cada passo: o @react-three/rapier volta a aplicar os seus
    // parâmetros). No Rapier a rigidez do contacto é proporcional à massa do corpo que toca: um pé
    // ou pata leve a segurar o robô inteiro afundava 0,5–0,9 cm no chão com os 30 Hz por omissão.
    const ip = world.integrationParameters
    ip.contact_natural_frequency = CONTACT_HZ
    ip.numInternalPgsIterations = 2
    // cadeias longas de juntas (pernas de humanoide: 5 servos em série com um tronco pesado em cima):
    // com as iterações por omissão o solver não converge e as juntas ficam muito mais moles do que o
    // binário do servo — o robô "cede" parado. Só nesses casos se dobram as iterações.
    if (sys.current?.deepChain) {
      ip.numSolverIterations = 16
      ip.numInternalPgsIterations = 4
    }
    sys.current?.beforeStep()
  })
  useAfterPhysicsStep(() => sys.current?.afterStep())
  // (no Rapier, devolver null = par sem contacto NENHUM: os outros pares têm de devolver
  // COMPUTE_IMPULSE, senão os pés dos robôs atravessavam o chão)
  useFilterContactPair((c1, c2, b1, b2) => sys.current?.filterPair(b1, b2) ?? rapier.SolverFlags.COMPUTE_IMPULSE)
  useFrame(() => sys.current?.sync(), -40) // depois do passo, antes de PartNode/fios (0)
  return null
}

// ---------- sistema (imperativo: corpos e juntas criados à mão no mundo do Rapier) ----------
function createSystem(world, R, parts) {
  const owned = simRef.physicsOwned
  owned.clear()
  // conjuntos do mundo atual: se o <Physics> já libertou o mundo, raw fica undefined
  const sets = { bodies: world.bodies, islands: world.islands, colliders: world.colliders, ij: world.impulseJoints, mj: world.multibodyJoints }
  const plan = planAssemblies(parts)
  const runs = []
  // colisor (handle) → { partId, type, run, seg } — depuração/medição (__simRef.physicsSystem.colInfo)
  const colInfo = new Map()
  // rodas/engrenagens/hélices encravadas noutra peça na pose de construção (pneu dentro da placa,
  // pás no suporte: shared/spinClear.js): no real não rodam. A junta do veio fica presa (junta
  // fixa) em vez de a peça rodar através da outra — o contacto entre as duas continua ignorado
  // (sobrepostas desde o início: o solver separava-as à bruta). O backend bloqueia o motor.
  let jammed = new Set()
  try {
    jammed = new Set(spinJams(parts, buildMatrices(parts)).map((j) => j.id))
  } catch {
    /* geometria inválida */
  }
  simRef.physicsJams = jammed
  let slot = 0

  const _m = new THREE.Matrix4()
  const _m2 = new THREE.Matrix4()
  const _p = new THREE.Vector3()
  const _q = new THREE.Quaternion()
  const _q2 = new THREE.Quaternion()
  const _s = new THREE.Vector3()
  const _a = new THREE.Vector3()
  const ONE = new THREE.Vector3(1, 1, 1)
  const bodyMatrix = (b, out = _m) => {
    const t = b.translation()
    const r = b.rotation()
    return out.compose(_p.set(t.x, t.y, t.z), _q.set(r.x, r.y, r.z, r.w), ONE)
  }
  const anchorObj = (asm, seg) => (seg.parent < 0 ? simRef.objects.get(asm.root.id) : simRef.mountObjects.get(seg.key))

  for (const asm of plan) {
    // grupos de colisão. Montagens articuladas: os corpos da mesma montagem também colidem entre
    // si (uma perna não atravessa a outra, um pé não entra no outro, a garra não entra na base);
    // o filtro de pares (filterPair) só deixa de fora os corpos ligados pela mesma junta e os que
    // já se tocam na pose de construção
    const selfHit = (asm.dynamic || asm.anchored) && asm.articulated
    let groups
    if (selfHit) {
      const bit = 1 << (2 + (slot++ % 14))
      groups = (bit << 16) | 0xffff
    } else groups = (G_KIN << 16) | 0xffff
    // "largar": um robô dinâmico que atravesse o chão na pose de construção é levantado
    const lift = asm.dynamic ? Math.max(0, 0.05 - lowestPoint(asm)) : 0
    const [lin, ang] = DEFS[asm.root.type]?.damping || DEFAULT_DAMPING
    // anch: só o corpo da raiz é cinemático (aparafusado à mesa); kin: todos são
    const run = { asm, dynamic: asm.dynamic, anch: asm.anchored, kin: !asm.dynamic && !asm.anchored, bodies: [], joints: [], follow: [], isCube: asm.root.type === 'cube', groups, selfHit }
    const segDyn = (i) => asm.dynamic || (asm.anchored && i > 0)
    asm.segments.forEach((seg, i) => {
      seg.B0.decompose(_p, _q, _s)
      const desc = segDyn(i)
        ? R.RigidBodyDesc.dynamic().setLinearDamping(asm.dynamic ? lin : 0.05).setAngularDamping(asm.dynamic ? ang : 0.3).setCanSleep(!asm.articulated).setCcdEnabled(!asm.articulated)
        : R.RigidBodyDesc.kinematicPositionBased().setCcdEnabled(!!(DEFS[asm.root.type]?.vehicle || DEFS[asm.root.type]?.car)) // carros: sem atravessar peças soltas
      desc.setTranslation(_p.x, _p.y + lift, _p.z).setRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w })
      const body = world.createRigidBody(desc)
      for (const c of seg.colliders) {
        const cd = (c.radius ? R.ColliderDesc.ball(c.radius) : R.ColliderDesc.cuboid(...c.half))
          .setTranslation(c.pos.x, c.pos.y, c.pos.z)
          .setRotation({ x: c.quat.x, y: c.quat.y, z: c.quat.z, w: c.quat.w })
          .setMass(segDyn(i) ? c.mass : 0)
          .setFriction(c.friction ?? FRICTION) // atrito da peça (ou do seu material)
          // rodas omni/mecanum, lagartas, roda livre: o atrito com o chão é o menor dos dois
          .setFrictionCombineRule(DEFS[c.type]?.frictionMin ? R.CoefficientCombineRule.Min : R.CoefficientCombineRule.Average)
          .setRestitution(asm.articulated ? 0.05 : (c.restitution ?? 0.05))
          .setCollisionGroups(groups)
        if (selfHit) cd.setActiveHooks(R.ActiveHooks.FILTER_CONTACT_PAIRS)
        const col = world.createCollider(cd, body)
        colInfo.set(col.handle, { partId: c.partId, type: c.type, run: runs.length, seg: i })
      }
      if (segDyn(i) && !seg.colliders.length) body.setAdditionalMassProperties(0.001, { x: 0, y: 0, z: 0 }, { x: 1e-3, y: 1e-3, z: 1e-3 }, { x: 0, y: 0, z: 0, w: 1 }, false)
      run.bodies[i] = body
      run.follow[i] = { p0: new THREE.Vector3(), q0: new THREE.Quaternion(), p1: new THREE.Vector3(), q1: new THREE.Quaternion(), moving: false, n: 1, c: 0 }
    })
    // juntas dos servos (montagens livres e fixas; nas estáticas os corpos seguem o 3D)
    if (asm.dynamic || asm.anchored) {
      asm.segments.forEach((seg, i) => {
        if (i === 0) return
        const { anchor1, axis, torque } = seg.joint
        if (!seg.joint.slide && seg.parts.some((p) => jammed.has(p.id))) {
          // na pose de construção os dois corpos têm a mesma orientação: referenciais identidade
          const fx = world.createImpulseJoint(R.JointData.fixed({ x: anchor1.x, y: anchor1.y, z: anchor1.z }, { x: 0, y: 0, z: 0, w: 1 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0, w: 1 }), run.bodies[seg.parent], run.bodies[i], true)
          fx.setContactsEnabled(false)
          run.joints[i] = null
          return
        }
        if (seg.joint.slide) {
          run.joints[i] = prismaticJoint(world, R, run, asm, seg, i)
          return
        }
        const data = R.JointData.revolute({ x: anchor1.x, y: anchor1.y, z: anchor1.z }, { x: 0, y: 0, z: 0 }, { x: axis.x, y: axis.y, z: axis.z })
        const j = world.createImpulseJoint(data, run.bodies[seg.parent], run.bodies[i], true)
        j.setContactsEnabled(false)
        j.configureMotorModel(R.MotorModel.ForceBased)
        // binário de saturação = torque do servo; amortecimento crítico com a inércia a jusante.
        // (O motor de posição amortece em relação a velocidade 0: mais amortecimento travaria
        // os movimentos comandados — testado com o cão e o humanoide.)
        const tau = torque * UNITS.kgfcm
        const k = tau / SAT
        const d = 2 * Math.sqrt(k * jointInertia(asm, i))
        run.joints[i] = { j, k, d, axis, ownerId: seg.owner.id, free: !!seg.joint.free, damp: seg.joint.damping, sign: seg.joint.rev ? -1 : 1 }
      })
    }
    runs.push(run)
  }

  // ---------- colisões dentro da mesma montagem articulada ----------
  // corpo (handle) → { run, segmento }; pares a ignorar por montagem: pai/filho (a junta) e os que
  // se sobrepõem (ou tocam, < 1 mm) na pose de construção — senão explodiam logo ao começar
  const bodyInfo = new Map()
  const ignorePairs = new Map() // run → Set("i,j")
  const _c = new THREE.Vector3()
  const obbOf = (seg, c) => {
    const M = seg.B0.clone().multiply(_m.compose(c.pos, c.quat, ONE))
    const ax = [0, 1, 2].map((k) => new THREE.Vector3().setFromMatrixColumn(M, k).normalize())
    const h = c.radius ? [c.radius, c.radius, c.radius] : c.half
    return { c: new THREE.Vector3().setFromMatrixPosition(M), ax, h }
  }
  const obbPen = (A, B) => {
    const axes = [...A.ax, ...B.ax]
    for (const a of A.ax) for (const b of B.ax) {
      const x = new THREE.Vector3().crossVectors(a, b)
      if (x.lengthSq() > 1e-8) axes.push(x.normalize())
    }
    _c.subVectors(B.c, A.c)
    let min = Infinity
    for (const L of axes) {
      const ra = A.ax.reduce((sum, v, k) => sum + Math.abs(v.dot(L)) * A.h[k], 0)
      const rb = B.ax.reduce((sum, v, k) => sum + Math.abs(v.dot(L)) * B.h[k], 0)
      min = Math.min(min, ra + rb - Math.abs(_c.dot(L)))
      if (min < -0.1) return min
    }
    return min
  }
  for (const run of runs) {
    const segs = run.asm.segments
    if (!(run.dynamic || run.anch) || !run.asm.articulated) continue
    const ign = new Set()
    segs.forEach((seg, i) => {
      bodyInfo.set(run.bodies[i].handle, { run, i })
      if (seg.parent >= 0) ign.add(seg.parent < i ? `${seg.parent},${i}` : `${i},${seg.parent}`)
    })
    const obbs = segs.map((seg) => seg.colliders.map((c) => obbOf(seg, c)))
    for (let i = 0; i < segs.length; i++)
      for (let j = i + 1; j < segs.length; j++) {
        if (ign.has(`${i},${j}`)) continue
        if (obbs[i].some((A) => obbs[j].some((B) => obbPen(A, B) > -0.1))) ign.add(`${i},${j}`)
      }
    ignorePairs.set(run, ign)
  }
  // filtro de pares de contacto (useFilterContactPair): COMPUTE_IMPULSE = contacto normal;
  // EMPTY = calcula o contacto mas não empurra (null, no Rapier, ignoraria o par por completo)
  const filterPair = (b1, b2) => {
    const A = bodyInfo.get(b1)
    const B = bodyInfo.get(b2)
    if (!A || !B || A.run !== B.run) return R.SolverFlags.COMPUTE_IMPULSE
    const key = A.i < B.i ? `${A.i},${B.i}` : `${B.i},${A.i}`
    return ignorePairs.get(A.run).has(key) ? R.SolverFlags.EMPTY : R.SolverFlags.COMPUTE_IMPULSE
  }

  // Pares ignorados por se sobreporem (ou quase tocarem) na pose de construção, sem ser os da
  // própria junta: voltam a chocar assim que se afastam mais do que SEP. Senão escondiam colisões
  // reais — uma perna que se afasta da outra e volta atravessava-a, um elo passava pela base.
  const SEP = 0.15
  const pendingSep = []
  for (const [run, ign] of ignorePairs)
    for (const key of ign) {
      const [i, j] = key.split(',').map(Number)
      const segs = run.asm.segments
      if (segs[j].parent === i || segs[i].parent === j) continue
      pendingSep.push({ run, key, a: run.bodies[i], b: run.bodies[j] })
    }
  // folga mínima entre os colisores de dois corpos (Infinity se for maior do que SEP)
  const gapOf = (a, b) => {
    let min = Infinity
    for (let k = 0; k < a.numColliders(); k++)
      for (let l = 0; l < b.numColliders(); l++) {
        const ct = a.collider(k).contactCollider(b.collider(l), SEP)
        if (ct) min = Math.min(min, ct.distance)
      }
    return min
  }
  let sepTick = 0
  const releaseSeparated = () => {
    if (!pendingSep.length || ++sepTick % 12) return
    for (let n = pendingSep.length - 1; n >= 0; n--) {
      const p = pendingSep[n]
      if (gapOf(p.a, p.b) > SEP) {
        ignorePairs.get(p.run).delete(p.key)
        pendingSep.splice(n, 1)
      }
    }
  }

  // garras: maxilas que param no objeto e cubo agarrado preso por uma junta (grippers.js)
  const grip = createGrippers({ world, R, runs, parts, colInfo, filterPair })

  // estado do IMU por peça: diferenças finitas de posição/rotação a cada passo
  const imus = new Map()
  for (const run of runs) run.asm.segments.forEach((seg, i) => seg.imus.forEach((u) => imus.set(u.partId, { run, i, P: u.P, prevP: null, prevV: null, prevQ: null, sumA: new THREE.Vector3(), nA: 0, sumW: new THREE.Vector3(), nW: 0, q: new THREE.Quaternion() })))
  let lastSend = 0

  // ângulo do servo, ou de um veio contínuo (motores, engrenagens movidas) extrapolado entre
  // fotografias do backend (mechLive.js)
  const servoDeg = (id) => mountAngleNow(id)
  // rodas omni/mecanum e lagartas (traction.js)
  const traction = createTraction(runs)
  // ---------- vento de todas as hélices a rodar (ventoinhas, drones, hélices em motores) ----------
  // Uma hélice que gira empurra ar: o jato sai no sentido contrário ao impulso (def.thrust) ou,
  // nas ventoinhas (def.fan), segundo o +y da hélice (× live.jetDir). 7 raios paralelos ao eixo
  // (centro + 6 a 60 % do raio) procuram o primeiro corpo à frente — sem contar a própria
  // montagem (o drone não se empurra a si mesmo); cada raio leva 1/7 do impulso do jato, que
  // enfraquece com a distância (o jato abre e abranda: ~1/e a 60 cm). A força aplica-se no ponto
  // de impacto, por isso uma placa pendurada roda (plano defletor, pêndulo de ar) e um papel,
  // um cubo ou uma peça solta à frente de um drone ou de uma hélice num motor são empurrados.
  const runOfPart = new Map()
  runs.forEach((run, i) => run.asm.segments.forEach((seg) => seg.parts.forEach((p) => runOfPart.set(p.id, i))))
  const propRadius = (p) => {
    const d = DEFS[p.type]
    if (d.fan) return d.fan(p.config || {}).r
    const c = p.config || {}
    if (c.inches) return c.inches * 1.27 // hélice de N polegadas: raio em cm
    if (p.type === 'brushless') return 6.35 // hélice de 5" do motor brushless
    return d.size ? Math.max(d.size[0], d.size[2]) / 2 : 3
  }
  const windParts = parts.filter((p) => DEFS[p.type]?.fan || DEFS[p.type]?.thrust)
  const RAYS = [[0, 0], ...Array.from({ length: 6 }, (_, i) => [Math.cos((i * Math.PI) / 3) * 0.6, Math.sin((i * Math.PI) / 3) * 0.6])]
  const _o = new THREE.Vector3()
  const _d = new THREE.Vector3()
  const _u = new THREE.Vector3()
  const _w = new THREE.Vector3()
  const blowAir = () => {
    for (const f of windParts) {
      const L = simRef.engine?.live?.[f.id]
      const N = +L?.thrustN || 0
      if (!(N > 0)) continue
      const obj = simRef.objects.get(f.id)
      if (!obj) continue
      obj.updateWorldMatrix(true, false)
      const d = DEFS[f.type]
      let ahead
      if (d.fan) {
        _d.set(0, 1, 0).transformDirection(obj.matrixWorld).multiplyScalar(L.jetDir ?? 1)
        _o.set(0, 0.8, 0).applyMatrix4(obj.matrixWorld)
        ahead = 1.2
      } else {
        // impulso para +eixo → o ar vai para −eixo
        _d.set(...(d.thrust.axis || [0, 1, 0])).transformDirection(obj.matrixWorld).negate()
        _o.set(...(d.thrust.pos || [0, 0, 0])).applyMatrix4(obj.matrixWorld)
        ahead = 0.3
      }
      const r = propRadius(f)
      const own = runOfPart.get(f.id)
      const notOwn = (col) => colInfo.get(col.handle)?.run !== own
      // base perpendicular ao eixo
      _u.set(1, 0, 0)
      if (Math.abs(_u.dot(_d)) > 0.9) _u.set(0, 0, 1)
      _u.cross(_d).normalize()
      _w.crossVectors(_d, _u)
      for (const [a, b] of RAYS) {
        const sx = _o.x + _d.x * ahead + (_u.x * a + _w.x * b) * r
        const sy = _o.y + _d.y * ahead + (_u.y * a + _w.y * b) * r
        const sz = _o.z + _d.z * ahead + (_u.z * a + _w.z * b) * r
        const hit = world.castRay(new R.Ray({ x: sx, y: sy, z: sz }, { x: _d.x, y: _d.y, z: _d.z }), 150, true, undefined, undefined, undefined, undefined, notOwn)
        if (!hit) continue
        const body = hit.collider.parent()
        if (!body || !body.isDynamic()) continue
        const dist = hit.timeOfImpact ?? hit.toi ?? 0
        const imp = (N / RAYS.length) * UNITS.N * Math.exp(-dist / 60) * STEP
        body.applyImpulseAtPoint({ x: _d.x * imp, y: _d.y * imp, z: _d.z * imp }, { x: sx + _d.x * dist, y: sy + _d.y * dist, z: sz + _d.z * dist }, true)
      }
    }
  }
  // gravidade em cm/s²
  const gNow = () => UNITS.gravity

  // ---------- agarrar com o rato (peças soltas: cubo, bloco, esfera…) ----------
  // O corpo é puxado para o cursor com uma velocidade limitada (não é teletransportado): continua
  // a chocar com a mesa, paredes e outras peças, e cai quando se larga.
  let grab = null
  const _ga = new THREE.Vector3()
  const _gq = new THREE.Quaternion()
  const grabApi = {
    // devolve true se a peça pertence a uma montagem livre (dinâmica) e foi agarrada
    start(partId, point) {
      for (const run of runs) {
        if (!run.dynamic || run.kin) continue
        const i = run.asm.segments.findIndex((seg) => seg.parts.some((p) => p.id === partId))
        if (i < 0) continue
        // robôs articulados: agarra-se o corpo principal (a raiz), não um elo solto
        const body = run.bodies[run.asm.articulated ? 0 : i]
        const t = body.translation()
        const r = body.rotation()
        _gq.set(r.x, r.y, r.z, r.w).invert()
        const local = new THREE.Vector3(point.x - t.x, point.y - t.y, point.z - t.z).applyQuaternion(_gq)
        grab = { body, local, target: new THREE.Vector3(point.x, point.y, point.z) }
        body.wakeUp()
        return true
      }
      return false
    },
    move(point) {
      if (grab) grab.target.set(point.x, point.y, point.z)
    },
    end() {
      if (!grab) return
      // larga com uma velocidade moderada (pode-se "atirar" a peça, mas sem exageros)
      const v = grab.body.linvel()
      const k = Math.min(1, 120 / Math.max(1e-6, Math.hypot(v.x, v.y, v.z)))
      grab.body.setLinvel({ x: v.x * k, y: v.y * k, z: v.z * k }, true)
      grab = null
    },
    active: () => !!grab,
  }
  simRef.physicsGrab = grabApi
  const grabStep = () => {
    if (!grab) return
    const b = grab.body
    const t = b.translation()
    const r = b.rotation()
    _ga.copy(grab.local).applyQuaternion(_gq.set(r.x, r.y, r.z, r.w)).add(t)
    // velocidade para chegar ao alvo em ~0,1 s, no máximo 150 cm/s; compensa a gravidade
    const d = grab.target.clone().sub(_ga)
    const v = d.multiplyScalar(10)
    const len = v.length()
    if (len > 150) v.multiplyScalar(150 / len)
    b.setLinvel({ x: v.x, y: v.y + gNow() * STEP, z: v.z }, true)
    // sem rodopiar enquanto está pendurada no cursor
    const w = b.angvel()
    b.setAngvel({ x: w.x * 0.85, y: w.y * 0.85, z: w.z * 0.85 }, true)
  }

  // ---------- pessoas (def.walker): corpo cinemático com controlador de personagem ----------
  // A pessoa é arrastada com o rato (functions/walkDrag.js → walkTo). Em cada frame avança para o
  // alvo com o controlador de personagem do Rapier (varrimento da forma: não atravessa nada,
  // escorrega ao longo das paredes) e o corpo cinemático (cápsula dos pés à cabeça) segue-a.
  //   - sobe degraus até WALK_STEP × escala (1,2 cm ≈ 14 cm reais: a laje da casa, pistas, placas)
  //     e desce-os (gravidade + "agarrar ao chão"); o que for mais alto é parede;
  //   - tudo é obstáculo (paredes, móveis, eletrodomésticos, veículos, outras pessoas, portas);
  //     nos corpos dinâmicos (peças soltas, robôs livres, portas na dobradiça, elos de servos) o
  //     controlador aplica um impulso de empurrão (pessoa de WALK_MASS): um cubo é empurrado e
  //     fica entalado contra a parede em vez de a atravessar, uma porta na dobradiça livre
  //     abre-se, uma porta segura por um servo resiste.
  // As coisas que já tocam na pessoa na pose de partida (ex.: posta encostada a uma parede) são
  // ignoradas, senão ficava presa. A posição resolvida (px, py, pz, yaw no referencial da peça) vai
  // para simRef.inputs (modelo 3D) e para o backend (sensores PIR/ultrassom, colisões dos carros).
  const WALK_MASS = 2 // kg
  const WALK_STEP = 1.2 // cm (× escala da pessoa) ≈ 14 cm reais; mais alto já não passava no vão da porta (o degrau precisa de folga por cima da cabeça)
  const walkers = new Map()
  const walkerParts = parts.filter((p) => DEFS[p.type]?.walker)
  const cc = walkerParts.length ? world.createCharacterController(0.03) : null
  if (cc) {
    const k = Math.min(...walkerParts.map((p) => pessoaK(p.config || {})))
    cc.setUp({ x: 0, y: 1, z: 0 })
    cc.setSlideEnabled(true)
    cc.enableAutostep(WALK_STEP * k, 0.5 * k, false)
    cc.enableSnapToGround(WALK_STEP * k)
    cc.setMaxSlopeClimbAngle(50 * D2R)
    cc.setMinSlopeSlideAngle(60 * D2R)
    cc.setApplyImpulsesToDynamicBodies(true)
    cc.setCharacterMass(WALK_MASS)
  }
  const walkPose = (w, outP, outQ) => {
    _m.copy(w.W).multiply(_m2.makeRotationY(w.yaw).setPosition(w.x, w.y, w.z))
    _m.decompose(outP, outQ, _s)
  }
  // A cápsula começa FOOT acima da sola (com a cápsula rente à sola, o degrau automático falhava à
  // porta da casa). O controlador deixa a cápsula ~0,01 cm dentro do apoio: o corpo fica SINK
  // abaixo da posição real dos pés, que se corrige na altura enviada (py).
  const FOOT = 0.14
  const SINK = FOOT + 0.01
  for (const p of walkerParts) {
    const obj = simRef.objects.get(p.id)
    if (!obj) continue
    obj.updateWorldMatrix(true, false)
    const k = pessoaK(p.config || {})
    const r = 1.45 * k // ombros (3 cm de largura à escala 1)
    const H = 14.5 * k
    const hh = Math.max(0.05, (H - FOOT) / 2 - r)
    const i0 = simRef.inputs[p.id] || {}
    const w = { part: p, W: obj.matrixWorld.clone(), Winv: null, x: +i0.px || 0, y: +i0.py || 0, z: +i0.pz || 0, yaw: +i0.yaw || 0, vy: 0, air: false, target: null, released: false, ignore: null, sent: '', lastSend: 0, f: { p0: new THREE.Vector3(), q0: new THREE.Quaternion(), p1: new THREE.Vector3(), q1: new THREE.Quaternion(), moving: false, n: 1, c: 0 } }
    w.Winv = w.W.clone().invert()
    w.rot = new THREE.Quaternion().setFromRotationMatrix(w.W)
    walkPose(w, _p, _q)
    w.body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(_p.x, _p.y, _p.z).setRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w }).setCcdEnabled(true))
    w.cy = FOOT + r + hh
    w.col = world.createCollider(R.ColliderDesc.capsule(hh, r).setTranslation(0, w.cy, 0).setFriction(0.6).setCollisionGroups((G_KIN << 16) | 0xffff), w.body)
    colInfo.set(w.col.handle, { partId: p.id, type: p.type, run: -1, seg: 0, walker: true })
    w.shape = new R.Capsule(Math.max(0.01, hh - 0.05), Math.max(0.01, r - 0.05))
    walkers.set(p.id, w)
    simRef.walkPhys.add(p.id)
  }
  let stepped = false
  const walkApi = {
    walkers, // (depuração: __simRef.physicsWalk.walkers)
    has: (id) => walkers.has(id),
    // alvo da pessoa no referencial da peça (cm, no plano do chão)
    walkTo(id, x, z) {
      const w = walkers.get(id)
      if (!w) return false
      w.target = { x, z }
      w.released = false
      return true
    },
    release(id) {
      const w = walkers.get(id)
      if (w) w.released = true
    },
    pos: (id) => walkers.get(id) && { x: walkers.get(id).x, y: walkers.get(id).y, z: walkers.get(id).z, yaw: walkers.get(id).yaw },
  }
  const _wd = new THREE.Vector3()
  const walkFrame = (dt, n) => {
    if (!cc) return
    const paused = useStore.getState().paused
    const dtF = STEP * n
    for (const [id, w] of walkers) {
      const f = w.f
      const t = w.body.translation()
      const r = w.body.rotation()
      f.p0.set(t.x, t.y, t.z)
      f.q0.set(r.x, r.y, r.z, r.w)
      // posição real do corpo no referencial da peça (o controlador parte daí)
      _wd.set(t.x, t.y, t.z).applyMatrix4(w.Winv)
      w.x = _wd.x
      w.y = _wd.y
      w.z = _wd.z
      f.moving = false
      f.n = n
      f.c = 0
      if ((!w.target && !w.air) || paused || !stepped) continue
      // coisas já encostadas à pessoa na partida: ignoradas (senão ficava presa)
      if (!w.ignore) {
        w.ignore = new Set()
        _p.set(0, w.cy, 0).applyQuaternion(f.q0).add(f.p0)
        world.intersectionsWithShape({ x: _p.x, y: _p.y, z: _p.z }, { x: f.q0.x, y: f.q0.y, z: f.q0.z, w: f.q0.w }, w.shape, (c) => { w.ignore.add(c.handle); return true }, undefined, undefined, w.col, w.body)
      }
      let want = 0
      let dx = 0
      let dz = 0
      if (w.target) {
        dx = w.target.x - w.x
        dz = w.target.z - w.z
        const dist = Math.hypot(dx, dz)
        if (dist < 0.01) {
          if (w.released) w.target = null
          dx = dz = 0
        } else {
          // segue o cursor com suavização (~18/s) e no máximo 90 cm/s
          want = Math.min(dist, Math.max(dist * (1 - Math.exp(-Math.min(dt, 0.1) * 18)), Math.min(dist, 0.02)), 90 * Math.min(dt, 0.1))
          dx /= dist
          dz /= dist
        }
      }
      if (!want && !w.air) continue
      // horizontal: o controlador sobe degraus (autostep) e desce os baixos ("agarra-se" ao chão)
      _wd.set(dx * want, 0, dz * want).applyQuaternion(w.rot)
      // o impulso nos corpos empurrados usa o dt dos parâmetros do mundo: aqui o deslocamento é o
      // de um frame inteiro (n passos), não de um passo
      const ip = world.integrationParameters
      ip.dt = dtF
      const pred = (c) => !w.ignore.has(c.handle)
      cc.computeColliderMovement(w.col, { x: _wd.x, y: 0, z: _wd.z }, undefined, undefined, pred)
      ip.dt = STEP
      const m = cc.computedMovement()
      let my = m.y
      // queda (degrau mais alto do que o "agarrar ao chão"): gravidade até ao primeiro apoio por
      // baixo (varrimento da forma para baixo; o varrimento vertical do controlador afundava no chão)
      if (cc.computedGrounded()) {
        w.vy = 0
        w.air = false
      } else {
        w.vy = Math.max(-300, w.vy - UNITS.gravity * dtF)
        const fall = -w.vy * dtF
        _p.set(0, w.cy, 0).applyQuaternion(f.q0).add(f.p0)
        const hit = world.castShape({ x: _p.x + m.x, y: _p.y + m.y, z: _p.z + m.z }, { x: f.q0.x, y: f.q0.y, z: f.q0.z, w: f.q0.w }, { x: 0, y: -1, z: 0 }, w.shape, 0, fall + 0.2, false, undefined, undefined, w.col, w.body, pred)
        const gap = hit ? Math.max(0, (hit.time_of_impact ?? hit.timeOfImpact ?? 0) - 0.08) : Infinity
        my -= Math.min(fall, gap)
        w.air = gap > fall
        if (!w.air) w.vy = 0
      }
      _wd.set(m.x, my, m.z).applyQuaternion(_q2.copy(w.rot).invert())
      const got = Math.hypot(_wd.x, _wd.z)
      // largou o rato e já não avança (encostada a uma parede): para
      if (w.released && got < want * 0.1) w.target = null
      if (got < 1e-4 && Math.abs(_wd.y) < 1e-4) continue
      w.x += _wd.x
      w.y += _wd.y
      w.z += _wd.z
      // vira-se para onde anda (o +x da pessoa é a frente)
      if (got > 0.02) w.yaw = Math.atan2(-_wd.z, _wd.x)
      walkPose(w, f.p1, f.q1)
      f.moving = true
      // modelo 3D (sem atraso: lê simRef.inputs) e backend (~30 Hz)
      simRef.inputs[id] = { ...(simRef.inputs[id] || {}), px: w.x, py: w.y + SINK, pz: w.z, yaw: w.yaw }
    }
    const now = performance.now()
    for (const [id, w] of walkers) {
      if (now - w.lastSend < 33) continue
      const rd = (v) => Math.round(v * 100) / 100
      const msg = { px: rd(w.x), py: rd(Math.max(0, w.y + SINK)), pz: rd(w.z), yaw: Math.round(w.yaw * 1000) / 1000 }
      const key = `${msg.px},${msg.py},${msg.pz},${msg.yaw}`
      if (key === w.sent || !w.ignore) continue
      w.sent = key
      w.lastSend = now
      setInput(id, msg)
    }
  }
  const walkSubstep = () => {
    for (const w of walkers.values()) {
      const f = w.f
      if (!f.moving || f.c >= f.n) continue
      f.c++
      const k = f.c / f.n
      _p.copy(f.p0).lerp(f.p1, k)
      _q.copy(f.q0).slerp(f.q1, k)
      w.body.setNextKinematicTranslation({ x: _p.x, y: _p.y, z: _p.z })
      w.body.setNextKinematicRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w })
    }
  }
  simRef.physicsWalk = walkApi

  // ---------- partes que se mexem pelo estado da simulação (def.liveCollider) ----------
  // ex.: cortina de um estore/portão de garagem: um corpo cinemático segue a peça e o colisor muda
  // de tamanho com live.pos (empurra o que estiver por baixo; a pessoa e os carros param nela)
  const liveParts = parts
    .filter((p) => DEFS[p.type]?.liveCollider)
    .map((p) => ({ part: p, body: world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased()), cols: [] }))
  const liveFrame = () => {
    for (const L of liveParts) {
      const obj = simRef.objects.get(L.part.id)
      if (!obj) continue
      obj.updateWorldMatrix(true, false)
      obj.matrixWorld.decompose(_p, _q, _s)
      L.body.setNextKinematicTranslation({ x: _p.x, y: _p.y, z: _p.z })
      L.body.setNextKinematicRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w })
      const boxes = liveBoxes(L.part, simRef.engine?.live?.[L.part.id])
      boxes.forEach((b, i) => {
        let c = L.cols[i]
        const h = b.size.map((v) => v / 2)
        if (!c) {
          c = L.cols[i] = world.createCollider(R.ColliderDesc.cuboid(...h).setCollisionGroups((G_KIN << 16) | 0xffff).setFriction(FRICTION), L.body)
          colInfo.set(c.handle, { partId: L.part.id, type: L.part.type, run: -1, seg: 0, live: true })
        }
        c.setEnabled(true)
        c.setHalfExtents({ x: h[0], y: h[1], z: h[2] })
        c.setTranslationWrtParent({ x: b.pos[0], y: b.pos[1], z: b.pos[2] })
      })
      for (let i = boxes.length; i < L.cols.length; i++) L.cols[i].setEnabled(false)
    }
  }

  // profundidade da cadeia de juntas mais longa (segmentos raiz → ponta) das montagens articuladas
  const chainDepth = (asm) => Math.max(0, ...asm.segments.map((seg) => { let d = 0; for (let p = seg; p && p.parent >= 0; p = asm.segments[p.parent]) d++; return d }))
  const deepChain = runs.some((run) => (run.dynamic || run.anch) && run.asm.articulated && chainDepth(run.asm) >= 4)

  return {
    filterPair,
    colInfo,
    world, // (depuração)
    grip,
    ignorePairs,
    deepChain,
    runs,
    grab: grabApi,
    // frame (antes dos passos): cubos agarrados ↔ soltos e alvos dos corpos cinemáticos
    prepareFrame(dt) {
      const n = Math.max(1, Math.round(Math.min(dt, 0.5) / STEP))
      // servos: o ângulo comandado chega uma vez por imagem. Com poucas imagens por segundo, aplicá-lo
      // de uma vez era um degrau de vários graus por imagem (um passo de robô a 15 fps: ~12°), que o
      // motor da junta seguia com o binário todo — os robôs de patas eram atirados ao chão. O alvo
      // passa a ir do valor anterior ao novo ao longo dos subpassos da imagem (movimento contínuo).
      for (const run of runs)
        for (const jt of run.joints) {
          if (!jt || jt.slide || !simRef.engine?.servoOf?.get(jt.ownerId)) continue
          const t1 = (servoDeg(jt.ownerId) - 90) * D2R * jt.sign
          jt.t0 = jt.ts ?? t1
          jt.t1 = t1
          jt.c = 0
          jt.n = n
        }
      walkFrame(dt, n)
      liveFrame()
      grip.frame(n)
      for (const run of runs) {
        if (run.isCube) {
          // cubo agarrado: preso à garra por uma junta (grippers.js); só se a garra não estiver na
          // física (não devia acontecer) é que passa a cinemático e segue o backend
          const held = !!simRef.engine?.cubes?.find((c) => c.part.id === run.asm.root.id)?.held && !grip.holds(run)
          const b = run.bodies[0]
          if (held && !run.kin) {
            b.setBodyType(R.RigidBodyType.KinematicPositionBased, true)
            run.kin = true
            owned.delete(run.asm.root.id)
          } else if (!held && run.kin) {
            b.setBodyType(R.RigidBodyType.Dynamic, true)
            b.setLinvel({ x: 0, y: 0, z: 0 }, true)
            b.setAngvel({ x: 0, y: 0, z: 0 }, true)
            run.kin = false
          }
        }
        if (!run.kin && !run.anch) continue
        run.asm.segments.forEach((seg, i) => {
          if (run.anch && i > 0) return // elos dinâmicos: quem manda é a física
          const obj = anchorObj(run.asm, seg)
          if (!obj) return
          obj.updateWorldMatrix(true, false)
          _m2.copy(seg.K).invert()
          const f = run.follow[i]
          const t = run.bodies[i].translation()
          const r = run.bodies[i].rotation()
          f.p0.set(t.x, t.y, t.z)
          f.q0.set(r.x, r.y, r.z, r.w)
          _m.copy(obj.matrixWorld).multiply(_m2).decompose(f.p1, f.q1, _s)
          // parado (peças na mesa, braço quieto): não é preciso mexer no corpo
          f.moving = f.p0.distanceToSquared(f.p1) > 1e-10 || Math.abs(f.q0.dot(f.q1)) < 1 - 1e-10
          f.n = n
          f.c = 0
        })
      }
    },

    // cada passo de 1/240 s: corpos cinemáticos (interpolados), motores dos servos, hélices
    beforeStep() {
      grip.step(STEP)
      grabStep()
      walkSubstep()
      traction?.apply(STEP)
      blowAir()
      for (const run of runs) {
        if (run.kin || run.anch) {
          // o alvo chega uma vez por frame: interpola-se ao longo dos subpassos para o
          // corpo ter velocidade contínua (empurra cubos sem solavancos)
          run.bodies.forEach((b, i) => {
            if (run.anch && i > 0) return
            const f = run.follow[i]
            if (!f.moving || f.c >= f.n) return
            f.c++
            const k = f.c / f.n
            _p.copy(f.p0).lerp(f.p1, k)
            _q.copy(f.q0).slerp(f.q1, k)
            b.setNextKinematicTranslation({ x: _p.x, y: _p.y, z: _p.z })
            b.setNextKinematicRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w })
          })
          if (run.kin) continue
        }
        // servos: motor de posição com o alvo limitado a ±SAT do ângulo atual
        // (binário ≤ torque do servo; também evita dar a volta pelo lado errado em ±180°)
        run.joints.forEach((jt, i) => {
          if (!jt) return
          if (jt.slide) {
            // carro/cremalheira movido pelo backend (live.slide); molas: alvo 0 fixo
            if (!jt.spring) jt.j.configureMotorPosition(+simRef.engine?.live?.[jt.ownerId]?.slide?.[jt.mountId] || 0, jt.k, jt.d)
            return
          }
          const pr = run.bodies[run.asm.segments[i].parent].rotation()
          const cr = run.bodies[i].rotation()
          _q.set(pr.x, pr.y, pr.z, pr.w).invert().multiply(_q2.set(cr.x, cr.y, cr.z, cr.w))
          const cur = wrap(2 * Math.atan2(_q.x * jt.axis.x + _q.y * jt.axis.y + _q.z * jt.axis.z, _q.w))
          jt.cur = cur
          // rotor passivo sem nada ligado (mancal solto, dobradiça): roda livre, só atrito
          if (jt.free || simRef.engine?.live?.[jt.ownerId]?.mountFree) {
            jt.j.configureMotorVelocity(0, jt.damp ?? jt.d * 0.01)
            return
          }
          // (jt.sign = −1: outra ponta de um veio duplo, com o eixo ao contrário)
          let target = (servoDeg(jt.ownerId) - 90) * D2R * jt.sign // = servoHornRotation(ângulo)[1]
          if (jt.n && simRef.engine?.servoOf?.get(jt.ownerId)) {
            // alvo suavizado ao longo dos subpassos da imagem (ver prepareFrame)
            if (jt.c < jt.n) jt.c++
            target = jt.t0 + (jt.t1 - jt.t0) * (jt.c / jt.n)
            jt.ts = target
          }
          const err = Math.max(-SAT, Math.min(SAT, wrap(target - cur)))
          // veios contínuos (motores, engrenagens movidas): o amortecimento é relativo à
          // velocidade pedida (live.mountVel), senão a junta não passava de ~10 rad/s
          const vt = (+simRef.engine?.live?.[jt.ownerId]?.mountVel || 0) * D2R * jt.sign
          if (vt && !simRef.engine?.servoOf?.get(jt.ownerId)) jt.j.configureMotor(cur + err, vt, jt.k, jt.d)
          else jt.j.configureMotorPosition(cur + err, jt.k, jt.d)
          jt.cur = cur
          jt.target = target
        })
        // hélices
        const live = simRef.engine?.live
        if (!live) continue
        run.asm.segments.forEach((seg, i) => {
          for (const t of seg.thrusts) {
            const L = live[t.partId]
            const N = +L?.thrustN || 0
            if (!(N > 0)) continue
            const b = run.bodies[i]
            const M = bodyMatrix(b).multiply(t.P)
            const ax = _a.copy(t.axis).transformDirection(M).multiplyScalar(L.jetDir ?? 1)
            const pt = t.pos.clone().applyMatrix4(M)
            const imp = N * UNITS.N * STEP
            b.applyImpulseAtPoint({ x: ax.x * imp, y: ax.y * imp, z: ax.z * imp }, { x: pt.x, y: pt.y, z: pt.z }, true)
            // hélice CW (spin +1, vista de cima) roda em −eixo: a reação no corpo é +eixo (CCW)
            const tq = (L.spin || 1) * N * 0.02 * UNITS.Nm * STEP
            b.applyTorqueImpulse({ x: ax.x * tq, y: ax.y * tq, z: ax.z * tq }, true)
          }
        })
      }
    },

    // depois de cada passo: acelerómetro e giroscópio por diferenças finitas
    afterStep() {
      stepped = true
      releaseSeparated()
      // rede de segurança: nada fica debaixo da mesa. Um robô livre que, num choque violento
      // (ex.: um drone virado com os motores a fundo), tenha passado através do tampo volta a
      // ser posto em cima, inteiro (todos os corpos juntos, para não partir as juntas)
      {
        for (const run of runs) {
          if (!run.dynamic) continue
          let lo = Infinity
          for (const b of run.bodies) if (b.isDynamic()) lo = Math.min(lo, b.translation().y)
          if (!(lo < -2)) continue
          const dy = 0.5 - lo
          for (const b of run.bodies) {
            if (!b.isDynamic()) continue
            const t = b.translation()
            const v = b.linvel()
            b.setTranslation({ x: t.x, y: t.y + dy, z: t.z }, true)
            b.setLinvel({ x: v.x * 0.3, y: Math.max(0, v.y), z: v.z * 0.3 }, true)
          }
        }
      }
      for (const st of imus.values()) {
        const M = bodyMatrix(st.run.bodies[st.i]).multiply(st.P)
        const p = new THREE.Vector3()
        const q = new THREE.Quaternion()
        M.decompose(p, q, _s)
        if (st.prevP) {
          const v = p.clone().sub(st.prevP).divideScalar(STEP)
          if (st.prevV) {
            st.sumA.add(v.clone().sub(st.prevV).divideScalar(STEP))
            st.nA++
          }
          st.prevV = v
          // rotação entre passos no referencial local: q = qAnterior · dq
          const dq = st.prevQ.clone().invert().multiply(q)
          if (dq.w < 0) dq.set(-dq.x, -dq.y, -dq.z, -dq.w)
          const s = Math.sqrt(Math.max(0, 1 - dq.w * dq.w))
          const ang = 2 * Math.atan2(s, dq.w)
          if (s > 1e-9) st.sumW.add(new THREE.Vector3(dq.x / s, dq.y / s, dq.z / s).multiplyScalar(ang / STEP))
          st.nW++
        }
        st.prevP = p
        st.prevQ = q
        st.q.copy(q)
      }
    },

    // frame (depois dos passos): grupos 3D seguem os corpos; envia o estado ao backend
    sync() {
      for (const run of runs) {
        if (run.kin) continue
        // os segmentos estão por ordem (pai antes dos filhos)
        run.asm.segments.forEach((seg, i) => {
          if (run.anch && i === 0) return // a base fixa continua a ser posta pelo 3D
          const obj = anchorObj(run.asm, seg)
          if (!obj) return
          const D = bodyMatrix(run.bodies[i]).multiply(seg.K)
          if (obj.parent) {
            obj.parent.updateWorldMatrix(true, false)
            D.premultiply(_m2.copy(obj.parent.matrixWorld).invert())
          }
          D.decompose(obj.position, obj.quaternion, obj.scale)
          owned.add(seg.key)
        })
      }
      const now = performance.now()
      if (now - lastSend < SEND_MS || !simRef.engine) return
      lastSend = now
      const bodies = {}
      for (const run of runs) {
        if (!run.dynamic || run.kin) continue
        const M = bodyMatrix(run.bodies[0]).multiply(run.asm.segments[0].K)
        bodies[run.asm.root.id] = M.elements.map(r4)
      }
      const imu = {}
      for (const [id, st] of imus) {
        const a = st.nA ? st.sumA.divideScalar(st.nA) : new THREE.Vector3()
        // força específica = aceleração − gravidade (gravidade = −981 ŷ), no referencial da peça
        const f = a.add(new THREE.Vector3(0, gNow(), 0)).applyQuaternion(st.q.clone().invert()).divideScalar(100)
        const w = st.nW ? st.sumW.divideScalar(st.nW) : new THREE.Vector3()
        imu[id] = { ax: r4(f.x), ay: r4(f.y), az: r4(f.z), gx: r4(w.x), gy: r4(w.y), gz: r4(w.z) }
        st.sumA = new THREE.Vector3()
        st.sumW = new THREE.Vector3()
        st.nA = st.nW = 0
      }
      // ângulo real de cada junta (em graus "de servo": 90 = braço na posição de montagem)
      const joints = {}
      for (const run of runs) if (!run.kin) for (const jt of run.joints) if (jt?.cur != null && jt.sign !== -1) joints[jt.ownerId] = r4(jt.cur / D2R + 90)
      // também as juntas das montagens fixas à mesa (ex.: sensor de ângulo do plano defletor)
      const jaws = grip.grippers.length ? grip.stops() : undefined
      const drop = grip.takeDrops()
      if (Object.keys(bodies).length || Object.keys(imu).length || Object.keys(joints).length || jaws) sendWorld(bodies, imu, joints, jaws, drop)
    },

    dispose() {
      owned.clear()
      grip.dispose()
      if (simRef.physicsGrab === grabApi) simRef.physicsGrab = null
      if (simRef.physicsWalk === walkApi) {
        simRef.physicsWalk = null
        for (const id of walkers.keys()) simRef.walkPhys.delete(id)
      }
      // se o mundo ainda existe (ex.: StrictMode), remove os corpos; se o <Physics> já o
      // libertou, não lhe tocar (o proxy criaria um mundo novo)
      if (!sets.bodies?.raw) return
      for (const run of runs) for (const b of run.bodies) sets.bodies.remove(b.handle, sets.islands, sets.colliders, sets.ij, sets.mj)
      for (const w of walkers.values()) sets.bodies.remove(w.body.handle, sets.islands, sets.colliders, sets.ij, sets.mj)
      for (const L of liveParts) sets.bodies.remove(L.body.handle, sets.islands, sets.colliders, sets.ij, sets.mj)
      if (cc) world.removeCharacterController(cc)
    },
  }
}

// junta prismática de um mount que desliza (carro de fuso, cremalheira, amortecedor):
// motor de posição que segue live.slide (rígido: ~8 Hz com a massa a jusante) ou mola com
// amortecimento (mount.spring: k em N/cm, c em N·s/cm), com os limites do curso
function prismaticJoint(world, R, run, asm, seg, i) {
  const { anchor1, axis, slide } = seg.joint
  const data = R.JointData.prismatic({ x: anchor1.x, y: anchor1.y, z: anchor1.z }, { x: 0, y: 0, z: 0 }, { x: axis.x, y: axis.y, z: axis.z })
  if (Number.isFinite(slide.min) && Number.isFinite(slide.max)) {
    data.limitsEnabled = true
    data.limits = [slide.min, slide.max]
  }
  const j = world.createImpulseJoint(data, run.bodies[seg.parent], run.bodies[i], true)
  j.setContactsEnabled(false)
  j.configureMotorModel(R.MotorModel.ForceBased)
  const under = (n) => n === i || (n > 0 && under(asm.segments[n].parent))
  const m = Math.max(0.005, asm.segments.reduce((a, sg, n) => a + (under(n) ? sg.mass : 0), 0))
  let k
  let d
  if (slide.spring) {
    k = slide.spring.k * UNITS.N
    d = slide.spring.c * UNITS.N
    j.configureMotorPosition(0, k, d)
  } else {
    const w = 2 * Math.PI * 8
    k = m * w * w
    d = 2 * m * w
  }
  return { j, k, d, axis, slide: true, spring: !!slide.spring, ownerId: seg.owner.id, mountId: seg.mountId }
}
