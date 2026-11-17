// Fios no mundo 3D, como jumpers verdadeiros: saem de cada pino na direção natural
// (com a ficha Dupont nos pinos de cabeçalho, ou o pino nu num furo da breadboard),
// fazem um arco por cima das peças que estão pelo caminho (ou contornam as altas: paredes,
// torres) sem nunca entrar nas caixas de colisão das peças, e atravessam o chassi por um
// furo (ou contornam a borda) quando as pontas estão em lados opostos da placa.
// As posições vêm das matrizes dos objetos 3D (simRef.objects), por isso os fios
// seguem também os corpos da física. O percurso só é recalculado quando as pontas mexem
// ou quando mudam as peças perto do fio (assinatura dos obstáculos na zona do fio).
import { useEffect, useRef, useState } from 'react'
import { TransformControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../contexts/store.js'
import { simRef } from '../../contexts/simRef.js'
import { routeWire, tubeFor, PLUG, pushOut, WIRE_R } from '../../functions/wireRoute.js'
import { wireContainerOf, rootsOf, buildWireEnv, wireEndOf } from '../../functions/wireEnv.js'

// fios presos ao corpo de um robô que se mexe como um todo (veículos, robôs com física livre)
export { wireContainerOf }

const objects = simRef.objects

// ---------- estado partilhado ----------
// env: obstáculos por contentor; last: pontas do último percurso de cada fio; frame: orçamento
const route = { epoch: 0, env: new Map(), last: new Map(), frame: { t: -1, spent: 0 } }
// ms por frame para recalcular percursos (construção / simulação); acima disto os fios a mexer
// são esticados e os outros esperam
const BUDGET = 7
const BUDGET_SIM = 3

// ---------- pontos de passagem postos à mão (wire.pts3d, no referencial do contentor) ----------
// pontas do último percurso de um fio (para pôr pontos novos entre elas)
export const wireEnds3d = (id) => route.last.get(id) || null
const _seg = new THREE.Line3()
const _cp = new THREE.Vector3()
// índice onde entra um ponto novo: no troço (ponta, pontos…, ponta) mais perto dele
export function insertIndex(id, pts, p) {
  const e = route.last.get(id)
  if (!e) return pts.length
  const chain = [e.a, ...pts.map((v) => new THREE.Vector3(...v)), e.b]
  let best = 0
  let bd = Infinity
  for (let i = 0; i < chain.length - 1; i++) {
    _seg.set(chain[i], chain[i + 1]).closestPointToPoint(p, true, _cp)
    const d = _cp.distanceTo(p)
    if (d < bd) [bd, best] = [d, i]
  }
  return best
}
// ponto novo no meio do troço mais comprido
export function midpointToAdd(id, pts) {
  const e = route.last.get(id)
  if (!e) return null
  const chain = [e.a, ...pts.map((v) => new THREE.Vector3(...v)), e.b]
  let best = 0
  for (let i = 1; i < chain.length - 1; i++) if (chain[i].distanceTo(chain[i + 1]) > chain[best].distanceTo(chain[best + 1])) best = i
  const m = chain[best].clone().lerp(chain[best + 1], 0.5)
  m.y += 0.8
  const q = clampWirePoint(id, m).p
  return { index: best, p: q.toArray().map((v) => Math.round(v * 100) / 100) }
}
const r2 = (v) => Math.round(v * 100) / 100
/**
 * Ponto de passagem posto à mão: não pode ficar dentro de uma peça — é empurrado para fora,
 * para a superfície mais próxima (com folga para o fio). p no referencial do contentor do fio.
 * → { p: Vector3, moved }
 */
export function clampWirePoint(id, p) {
  const container = route.last.get(id)?.container ?? null
  const env = envOf(container)
  const q = pushOut(p.clone(), env.obstacles, WIRE_R + 0.15, null, container ? null : 0)
  return { p: q, moved: q.distanceTo(p) > 0.005 }
}
export const clampWirePt = (id, arr) => {
  const r = clampWirePoint(id, new THREE.Vector3(...arr))
  return { p: r.p.toArray().map(r2), moved: r.moved }
}
// o rato está nas setas de mover um ponto (ou acabou de as largar): os cliques não são para a cena
export const gizmoBusy = () => !!simRef.wireGizmo?.axis || performance.now() - (simRef.wireGizmoT || 0) < 350
const partsInfo = () => {
  const parts = useStore.getState().parts
  if (route.partsRef !== parts) {
    route.partsRef = parts
    route.byId = new Map(parts.map((p) => [p.id, p]))
    route.roots = rootsOf(parts)
  }
  return route
}

// obstáculos (caixas de colisão) e placas no referencial do contentor; refeitos quando as
// peças mudam (epoch) e, na simulação, a cada 40 ms (os corpos da física mexem-se)
function envOf(container) {
  const now = performance.now()
  const sim = useStore.getState().mode !== 'build'
  const c = route.env.get(container)
  if (c && c.epoch === route.epoch && now - c.t < (sim ? 40 : 1000)) return c
  const { partsRef: parts, roots } = partsInfo()
  let inv = null
  if (container) {
    const co = objects.get(container)
    if (co) {
      co.updateWorldMatrix(true, false)
      inv = co.matrixWorld.clone().invert()
    }
  }
  const matOf = (id) => {
    const o = objects.get(id)
    if (!o) return null
    o.updateWorldMatrix(true, false)
    return inv ? new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld) : o.matrixWorld.clone()
  }
  const env = buildWireEnv(parts, matOf, container, roots)
  env.t = now
  env.epoch = route.epoch
  env.ver = (c?.ver || 0) + 1
  route.env.set(container, env)
  return env
}

// assinatura das caixas perto do fio (só se recalcula o percurso se mudar)
function zoneSig(env, pts) {
  const M = 25
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, y1 = -Infinity
  for (const p of pts) {
    if (p.x < x0) x0 = p.x
    if (p.x > x1) x1 = p.x
    if (p.z < z0) z0 = p.z
    if (p.z > z1) z1 = p.z
    if (p.y > y1) y1 = p.y
  }
  // caixas perto do fio: centro e meias-medidas ordenadas (sem a rotação: rodas e polias a girar
  // no sítio não contam)
  const out = []
  for (const o of env.obstacles)
    if (o.hi[0] > x0 - M && o.lo[0] < x1 + M && o.hi[2] > z0 - M && o.lo[2] < z1 + M && o.lo[1] < y1 + M) out.push(o.c[0], o.c[1], o.c[2], ...[...o.h].sort((p, q) => p - q))
  return out
}
// mudou de verdade? (com tolerância: o tremor da física fica abaixo de 4 mm)
function sigChanged(a, b, tol = 0.4) {
  if (!a || !b || a.length !== b.length) return true
  for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > tol) return true
  return false
}

// ponta de um fio (referencial do contentor)
function endOf(partId, pinId, inv) {
  const o = objects.get(partId)
  const part = partsInfo().byId.get(partId)
  if (!o || !part) return null
  o.updateWorldMatrix(true, false)
  const M = inv ? new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld) : o.matrixWorld
  return wireEndOf(part, pinId, M)
}

// ---------- fichas nas pontas ----------
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1)
UNIT_BOX.translate(0, 0.5, 0)
const UNIT_PIN = new THREE.CylinderGeometry(0.032, 0.032, 1, 6)
UNIT_PIN.translate(0, 0.5, 0)
const MAT_HOUSING = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.55 })
const MAT_METAL = new THREE.MeshStandardMaterial({ color: '#d9d9d9', metalness: 0.9, roughness: 0.3 })
const MAT_COPPER = new THREE.MeshStandardMaterial({ color: '#c8794a', metalness: 0.85, roughness: 0.35 })
const Y = new THREE.Vector3(0, 1, 0)

function placeEnd(g, e) {
  if (!g) return
  const [housing, metal] = g.children
  const k = PLUG[e.conn] || PLUG.male
  g.position.copy(e.base)
  g.quaternion.setFromUnitVectors(Y, e.d)
  const len = e.base.distanceTo(e.tip)
  housing.visible = !k.metal && len > 0.2
  metal.visible = !!k.metal
  if (housing.visible) housing.scale.set(k.w, len, k.w)
  if (metal.visible) {
    metal.scale.set(1, len, 1)
    metal.material = k.copper ? MAT_COPPER : MAT_METAL
  }
}
function End({ refFn }) {
  return (
    <group ref={refFn}>
      <mesh geometry={UNIT_BOX} material={MAT_HOUSING} castShadow visible={false} />
      <mesh geometry={UNIT_PIN} material={MAT_METAL} visible={false} />
    </group>
  )
}

// fio a mexer sem orçamento para recalcular: o último percurso acompanha as pontas novas.
// Cada ponta move-se como um corpo rígido (deslocação + rotação do pino desde o último
// percurso), e cada ponto do fio mistura os movimentos das duas pontas conforme a distância
// ao longo do fio. Assim o troço junto ao pino roda com ele (antes só era deslocado e, com o
// sensor a rodar num servo, o fio saía do pino).
const rigidOf = (p0, p1, d0, d1) => ({ p0, p1, q: d0 && d1 ? new THREE.Quaternion().setFromUnitVectors(d0.clone().normalize(), d1.clone().normalize()) : new THREE.Quaternion() })
const applyRigid = (T, v) => v.clone().sub(T.p0).applyQuaternion(T.q).add(T.p1)
function warp(m, S, a, b, gA, gB) {
  const TA = rigidOf(S.pa, a.p, S.da, a.d)
  const TB = rigidOf(S.pb, b.p, S.db, b.d)
  const P = S.r.points
  const acc = [0]
  for (let i = 1; i < P.length; i++) acc.push(acc[i - 1] + P[i].distanceTo(P[i - 1]))
  const L = acc[acc.length - 1] || 1
  // peso da ponta B: 0 junto a A, 1 junto a B (suave, para os primeiros cm seguirem o pino à risca)
  const w = (i) => {
    const t = acc[i] / L
    return t * t * (3 - 2 * t)
  }
  const pts = P.map((p, i) => applyRigid(TA, p).lerp(applyRigid(TB, p), w(i)))
  m.geometry.dispose()
  m.geometry = tubeFor(pts)
  const [eA, eB] = S.r.ends
  // fichas: o mesmo movimento rígido da sua ponta
  placeEnd(gA, moveEnd(eA, TA))
  placeEnd(gB, moveEnd(eB, TB))
}
const moveEnd = (e, T) => ({ ...e, d: e.d.clone().applyQuaternion(T.q), tip: applyRigid(T, e.tip), base: applyRigid(T, e.base) })

// ---------- um fio ----------
function Wire3D({ wire, container }) {
  const mesh = useRef()
  const endA = useRef()
  const endB = useRef()
  const selected = useStore((s) => s.selected?.kind === 'wire' && s.selected.id === wire.id)
  const set = useStore((s) => s.set)
  const seed = [...wire.id].reduce((s, c) => s + c.charCodeAt(0), 0)
  const st = useRef({ sig: null, pts: '', t: 0, full: false, envVer: -1 })
  useFrame((state) => {
    const m = mesh.current
    if (!m) return
    let inv = null
    if (container) {
      const c = objects.get(container)
      if (!c) return
      c.updateWorldMatrix(true, false)
      inv = c.matrixWorld.clone().invert()
    }
    const a = endOf(wire.a.part, wire.a.pin, inv)
    const b = endOf(wire.b.part, wire.b.pin, inv)
    if (!a || !b) return
    const ptsKey = wire.pts3d?.length ? wire.pts3d.flat().join(',') : ''
    const S = st.current
    const sim = useStore.getState().mode !== 'build'
    const env = envOf(container)
    const via = wire.pts3d?.length ? wire.pts3d.map((v) => new THREE.Vector3(...v)) : null
    const now = performance.now()
    const fr = route.frame
    if (fr.t !== state.clock.elapsedTime) [fr.t, fr.spent] = [state.clock.elapsedTime, 0]
    const budget = sim ? BUDGET_SIM : BUDGET
    // Estabilidade: o percurso só muda de forma quando há uma mudança real (ponta deslocada mais
    // de STEP, ficha rodada, pontos editados, obstáculos à volta mexeram ≥ 5 mm). Pequenos
    // deslocamentos (ruído da física, servo a segurar) só esticam o percurso que já existe —
    // antes cada décima de milímetro refazia o fio e ele alternava entre duas formas (piscava).
    // na simulação o fio só estica enquanto as peças se mexem (sem saltos de forma); o percurso
    // completo refaz-se 1 s depois de parar, ou se a ponta se afastar muito (> 8 cm)
    const STEP = sim ? 8 : 0.6
    const has = !!S.r
    // (na simulação as fichas rodam com o braço: até 60° só se esticam e rodam as fichas)
    const cosMax = sim ? 0.5 : 0.995
    const dirOk = has && a.d.dot(S.da) > cosMax && b.d.dot(S.db) > cosMax
    const offA = has ? a.p.distanceTo(S.pa) : Infinity
    const offB = has ? b.p.distanceTo(S.pb) : Infinity
    const small = has && ptsKey === S.pts && dirOk && offA < STEP && offB < STEP
    const drawnMoved = has && (a.p.distanceTo(S.wa) > 0.02 || b.p.distanceTo(S.wb) > 0.02)
    let fast = false
    let why = !has ? 'novo' : ptsKey !== S.pts ? 'pts' : small ? 'obst' : 'mexeu'
    if (small) {
      if (drawnMoved) {
        // segue as pontas sem mudar a forma
        warp(m, S, a, b, endA.current, endB.current)
        S.wa = a.p.clone()
        S.wb = b.p.clone()
        S.mv = now
        return
      }
      const settled = now - (S.mv || 0) > 450
      if (!settled) return
      // no editor, depois de parar: um percurso completo nas pontas finais (uma só vez)
      const offset = offA > 0.05 || offB > 0.05
      if (offset && (!sim || now - (S.mv || 0) > 1000)) {
        why = 'assentar'
        if (fr.spent > budget) return
      } else if (S.full) {
        why = 'full'
        // o último foi o rápido (estava a mexer): o completo, uma vez
        if (fr.spent > budget) return
      } else {
        // obstáculos à volta mudaram de verdade? (na simulação no máximo 1× a cada 3 s por fio: sem saltos)
        if (S.envVer === env.ver) return
        S.envVer = env.ver
        const sig = zoneSig(env, [a.p, b.p, ...(via || [])])
        if (!sigChanged(sig, S.sig)) return
        if (fr.spent > budget || (sim && now - S.t < 3000)) {
          S.envVer = -1
          return
        }
      }
    } else if (has && ptsKey === S.pts) {
      // a mexer a sério (braço, peça arrastada): percurso rápido; sem orçamento, estica
      fast = now - (S.mv || -1e9) < 500
      S.mv = now
      if (fr.spent > budget && now - S.t < (sim ? 350 : 150)) {
        warp(m, S, a, b, endA.current, endB.current)
        S.wa = a.p.clone()
        S.wb = b.p.clone()
        return
      }
    }
    S.envVer = env.ver
    const sig = zoneSig(env, [a.p, b.p, ...(via || [])])
    const t0 = performance.now()
    const r = routeWire(a, b, { obstacles: env.obstacles, plates: env.plates, seed, via, fast, ground: container ? null : 0 })
    fr.spent += performance.now() - t0
    if (import.meta.env.DEV) {
      const k = (route.stats ||= { n: 0, fast: 0, ms: 0 })
      k.n++
      k.fast += fast ? 1 : 0
      ;(k.why ||= {})[why] = (k.why[why] || 0) + 1
      k.ms += performance.now() - t0
    }
    Object.assign(S, { sig, pts: ptsKey, t: now, full: fast, r, pa: a.p.clone(), pb: b.p.clone(), wa: a.p.clone(), wb: b.p.clone(), da: a.d.clone(), db: b.d.clone() })
    route.last.set(wire.id, { a: r.ends[0].start.clone(), b: r.ends[1].start.clone(), container, moved: r.moved })
    if (import.meta.env.DEV) (route.dbg ||= new Map()).set(wire.id, { a, b, r, container })
    placeEnd(endA.current, r.ends[0])
    placeEnd(endB.current, r.ends[1])
    m.geometry.dispose()
    m.geometry = tubeFor(r.points)
  })
  useEffect(() => () => mesh.current?.geometry.dispose(), [])
  return (
    <group
      userData={{ wire: true }}
      onClick={(e) => {
        if (useStore.getState().mode !== 'build') return
        e.stopPropagation()
        if (gizmoBusy()) return
        if (!selected) set({ selected: { kind: 'wire', id: wire.id }, leftTab: 'props', wirePt: null })
      }}
      onDoubleClick={(e) => {
        // duplo clique no fio selecionado: novo ponto de passagem onde se clicou
        const st = useStore.getState()
        if (st.mode !== 'build' || !selected) return
        e.stopPropagation()
        const p = e.point.clone()
        if (container) p.applyMatrix4(objects.get(container).matrixWorld.clone().invert())
        const pts = wire.pts3d || []
        const i = insertIndex(wire.id, pts, p)
        // na superfície do fio clicado, mas nunca dentro de uma peça
        st.setWirePts3d(wire.id, [...pts.slice(0, i), clampWirePt(wire.id, p.toArray()).p, ...pts.slice(i)])
        set({ wirePt: i })
      }}
    >
      <mesh ref={mesh} castShadow>
        <bufferGeometry />
        <meshStandardMaterial color={selected ? '#ffffff' : wire.color} roughness={0.42} metalness={0.02} emissive={selected ? '#ffffff' : '#000'} emissiveIntensity={selected ? 0.6 : 0} />
      </mesh>
      <End refFn={(g) => (endA.current = g)} />
      <End refFn={(g) => (endB.current = g)} />
      {selected && <WireHandles wire={wire} />}
    </group>
  )
}

// esferas nos pontos de passagem do fio selecionado; a escolhida ganha as setas de mover
function WireHandles({ wire }) {
  const mode = useStore((s) => s.mode)
  const active = useStore((s) => s.wirePt)
  const [obj, setObj] = useState(null)
  const set = useStore((s) => s.set)
  if (mode !== 'build' || !wire.pts3d?.length) return null
  const sel = active != null && active < wire.pts3d.length ? active : null
  // durante o arrasto o fio já contorna as peças (o ponto é empurrado para fora ao desenhar);
  // ao largar, o ponto guardado fica também fora das peças
  const commit = (final) => {
    const o = obj
    if (!o || sel == null) return
    const v = o.position.toArray().map(r2)
    const q = final ? clampWirePt(wire.id, v) : { p: v, moved: false }
    const pts = wire.pts3d.map((w, i) => (i === sel ? q.p : w))
    useStore.getState().setWirePts3d(wire.id, pts)
    if (q.moved) o.position.set(...q.p)
  }
  return (
    <>
      {wire.pts3d.map((v, i) =>
        i === sel ? null : (
          <mesh
            key={i}
            position={v}
            onClick={(e) => {
              e.stopPropagation()
              set({ wirePt: i })
            }}
          >
            <sphereGeometry args={[0.28, 14, 10]} />
            <meshStandardMaterial color="#ffd54f" emissive="#ffb300" emissiveIntensity={0.5} />
          </mesh>
        ),
      )}
      {sel != null && (
        <>
          <mesh ref={setObj} position={wire.pts3d[sel]} onClick={(e) => e.stopPropagation()}>
            <sphereGeometry args={[0.34, 14, 10]} />
            <meshStandardMaterial color="#ffffff" emissive="#4fc3f7" emissiveIntensity={0.8} />
          </mesh>
          {obj && <TransformControls
            ref={(c) => (simRef.wireGizmo = c)}
            object={obj}
            mode="translate"
            size={0.7}
            onObjectChange={() => commit(false)}
            onMouseDown={() => (simRef.wireGizmoT = performance.now())}
            onMouseUp={() => {
              simRef.wireGizmoT = performance.now()
              commit(true)
            }}
          />}
        </>
      )}
    </>
  )
}

// (só em desenvolvimento) câmara acessível para testes automáticos (puppeteer)
function DevHook() {
  const { camera, controls, scene } = useThree()
  if (import.meta.env.DEV && typeof window !== 'undefined') window.__three = { camera, controls, scene, THREE, objects, route }
  return null
}

// quando as peças mudam: refaz os obstáculos (os objetos 3D só ficam no sítio novo no frame
// seguinte; os fios só se recalculam se as caixas perto deles mudarem)
function useInvalidate(parts, active) {
  useEffect(() => {
    if (!active) return
    route.epoch++
    const ts = [150, 700, 1800].map((ms) =>
      setTimeout(() => {
        route.epoch++
      }, ms),
    )
    return () => ts.forEach(clearTimeout)
  }, [parts, active])
}

export function Wires3D({ container = null }) {
  const wires = useStore((s) => s.wires)
  const parts = useStore((s) => s.parts)
  const show = useStore((s) => s.show3dWires)
  const isMain = !container
  useInvalidate(parts, isMain)
  if (!show) return isMain ? <DevHook /> : null
  const roots = rootsOf(parts)
  return (
    <>
      {isMain && <DevHook />}
      {wires
        .filter((w) => {
          const ra = roots.get(w.a.part)
          const rb = roots.get(w.b.part)
          if (!ra || !rb) return false
          const c = ra.id === rb.id ? wireContainerOf(ra, parts) : null
          return c === container
        })
        .map((w) => (
          <Wire3D key={w.id} wire={w} container={container} />
        ))}
    </>
  )
}
