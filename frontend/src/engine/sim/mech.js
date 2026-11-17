// Transmissão mecânica entre peças (engrenagens, polias com correia, cremalheiras, fusos,
// lagartas, hélices). Corre a cada 1 ms depois dos plugins (engine.stepMs).
//
// Rotores: cada ponto de fixação com servo: true. São
//   - ativos: servos (ângulo do servo), motores com plugin que publicam live.mountAngle
//     (NEMA 17, 28BYJ-48, motores com encoder — estes também live.mountVel em graus/s);
//   - passivos (mount.idler: mancal, mesa giratória, dobradiça): o ângulo vem das ligações.
// Ligações, detetadas na pose de construção (servos a 90°, carros a 0):
//   - engrenagens retas (def.gear) em rotores diferentes, eixos paralelos, distância entre
//     eixos = r1 + r2 (±0,25 cm) e faces sobrepostas: ω2 = −ω1·z1/z2;
//   - polias GT2 (def.pulley) com a mesma letra de correia, eixos paralelos e no mesmo plano:
//     ω2 = +ω1·z1/z2;
//   - cremalheira (def.rack) e engrenagem com o eixo perpendicular à barra, centro a r da
//     linha primitiva: a barra (mount que desliza) anda r·θ;
//   - def.drive: fuso (carro = voltas do motor × passo), lagartas (velocidade da lagarta =
//     ω × raio da roda motriz) — a partir do veio da peça presa no mount indicado.
// Os rotores passivos ligados a um ativo recebem live[id].mountAngle/mountVel (a vista 3D e
// a física seguem-nos); os não ligados ficam com live[id].mountFree = true (rodam soltos na
// física). As hélices (def.thrust sem plugin) recebem live.thrustN da rotação do seu veio.
//
// APROXIMAÇÕES: transmissão rígida e sem folga; a carga a jusante (inércia das engrenagens,
// atrito, uma roda travada na física durante a simulação) não trava o motor — só uma peça que
// roda encravada noutra na pose de construção (shared/spinClear.js) bloqueia o motor (engine.js); rotores encaixados noutro rotor
// (ex.: engrenagem num servo montado na mesa giratória) usam o ângulo relativo; as ligações
// só se detetam na pose de construção.
import * as THREE from 'three'
import { DEFS, mountsOf, scaleOf } from '../../../../shared/components.js'
import { evalCfg, mountSlide, GEAR_M as GEAR_M_ } from '../../../../shared/parts/_mech.js'
import { worldMatrices, mountMatrix } from './kinematics.js'
import * as i18n from '../../../../shared/i18n.js'

const D2R = Math.PI / 180
const MESH_TOL = 0.25 // cm
const RHO = 1.2
const CT = 0.1 // coeficiente de impulso das hélices (T = CT·ρ·n²·D⁴)
const CQ = 0.012 // coeficiente de binário das ventoinhas (Q = CQ·ρ·n²·D⁵): o ar trava o motor

export function createMechanics({ parts, live, servoAngle, log }) {
  const byId = new Map(parts.map((p) => [p.id, p]))
  const L = (id) => live[id] || (live[id] = {})
  const warned = new Set()
  const warnOnce = (k, msg, level = 'warn') => {
    if (warned.has(k)) return
    warned.add(k)
    log?.(msg, level)
  }
  const name = (p) => DEFS[p.type]?.short || DEFS[p.type]?.name || p.id

  let W
  try {
    W = worldMatrices(parts)
  } catch {
    return { step: () => false }
  }
  const pos = (m, local = [0, 0, 0]) => new THREE.Vector3(...local).applyMatrix4(m)
  const dir = (m, local) => new THREE.Vector3(...local).transformDirection(m).normalize()

  // ---------- rotores ----------
  const rotors = new Map()
  for (const p of parts) {
    for (const [mid, m] of Object.entries(mountsOf(p))) {
      if (!m.servo) continue
      const M = W.get(p.id).clone().multiply(mountMatrix(p, mid))
      rotors.set(`${p.id}:${mid}`, { key: `${p.id}:${mid}`, part: p, mountId: mid, idler: !!m.idler, free: !!m.free, sign: m.rev ? -1 : 1, axis: dir(M, [0, 1, 0]), theta: 0, omega: 0, prev: null, links: [], driven: false })
    }
  }
  // rotor que faz rodar uma peça (o mount com servo mais próximo a subir na árvore)
  const rotorOf = (q) => {
    let c = q
    for (let i = 0; i < 64 && c?.parent && byId.has(c.parent.id); i++) {
      const P = byId.get(c.parent.id)
      if (mountsOf(P)[c.parent.mount]?.servo) return rotors.get(`${P.id}:${c.parent.mount}`) || null
      c = P
    }
    return null
  }
  // rotor do veio da peça presa num mount (ex.: NEMA 17 no fuso, motor na lagarta)
  const childRotor = (p, mountId) => {
    const ch = parts.find((q) => q.parent?.id === p.id && q.parent.mount === mountId)
    if (!ch) return null
    const mid = Object.entries(mountsOf(ch)).find(([, m]) => m.servo)?.[0]
    return mid ? rotors.get(`${ch.id}:${mid}`) : null
  }

  // ---------- correias explícitas (peça "Correia GT2", def.belt): polias escolhidas ----------
  // A polia que está numa correia explícita deixa de usar a letra (config.belt); cada polia só
  // leva uma correia (a primeira que a escolher).
  const beltOfPulley = new Map() // id da polia → chave da correia
  const beltNames = new Map() // chave → nome para os avisos
  for (const q of parts) {
    const bd = DEFS[q.type]?.belt
    if (!bd) continue
    const key = `#${q.id}`
    beltNames.set(key, `${name(q)} (${q.id})`)
    for (const pid of q.config?.pulleys || []) {
      const pl = byId.get(pid)
      if (!pl || !bd.of.includes(pl.type)) continue
      if (beltOfPulley.has(pid)) {
        warnOnce(`belt2${pid}`, i18n.m(`⚠ A polia ${pid} está em duas correias — só cabe uma; fica na ${beltNames.get(beltOfPulley.get(pid))}.`, `⚠ Pulley ${pid} is on two belts — only one fits; it stays on ${beltNames.get(beltOfPulley.get(pid))}.`))
        continue
      }
      beltOfPulley.set(pid, key)
    }
  }
  const beltName = (k) => beltNames.get(k) || `Correia ${k}`

  // ---------- elementos ----------
  const gears = []
  const worms = []
  const wheels = []
  const pulleys = []
  const racks = []
  const drives = []
  const props = []
  for (const q of parts) {
    const def = DEFS[q.type]
    if (!def) continue
    const cfg = q.config || {}
    const M = W.get(q.id)
    // dimensões editadas (config.scale): raios no plano xz, espessuras e alturas em y
    // (espelho: sinal na escala → posições/direções com sinal, tamanhos em módulo)
    const ss = scaleOf(q)
    const sc = ss.map(Math.abs)
    const sr = (sc[0] + sc[2]) / 2
    const S = (v) => v.map((x, i) => x * ss[i])
    const MS = (v) => v.map((x, i) => x * Math.sign(ss[i]))
    if (def.gear) {
      // (lista: engrenagem dupla — as duas rodas no mesmo veio)
      for (const g of [evalCfg(def.gear, cfg)].flat()) {
        const rotor = g.on ? rotors.get(`${q.id}:${g.on}`) : rotorOf(q)
        gears.push({ part: q, rotor, z: g.z, r: ((g.m * g.z) / 2) * sr, w: g.w * sc[1], c: pos(M, [0, (g.y0 + g.w / 2) * ss[1], 0]), a: dir(M, [0, 1, 0]) })
      }
    }
    if (def.worm) {
      const w = evalCfg(def.worm, cfg)
      worms.push({ part: q, rotor: rotorOf(q), r: w.r * sr, len: w.len * sc[1], starts: w.starts || 1, c: pos(M, [0, (w.y0 + w.len / 2) * ss[1], 0]), a: dir(M, [0, 1, 0]) })
    }
    if (def.wormWheel) {
      const g = evalCfg(def.wormWheel, cfg)
      wheels.push({ part: q, rotor: rotorOf(q), z: g.z, r: ((GEAR_M_ * g.z) / 2) * sr, w: g.w * sc[1], c: pos(M, [0, ((g.y0 || 0) + g.w / 2) * ss[1], 0]), a: dir(M, [0, 1, 0]) })
    }
    if (def.pulley) {
      const pl = evalCfg(def.pulley, cfg)
      // z efetivo: a relação de transmissão segue o raio
      const belt = beltOfPulley.get(q.id) ?? pl.belt
      if (belt && belt !== '-') pulleys.push({ part: q, rotor: rotorOf(q), z: pl.z * sr, belt, c: pos(M, [0, pl.y * ss[1], 0]), a: dir(M, [0, 1, 0]) })
    }
    if (def.rack) {
      const rk = evalCfg(def.rack, cfg)
      const mt = mountsOf(q)[rk.slide]
      racks.push({ part: q, mount: rk.slide, slide: mountSlide(mt, cfg), w: rk.w * Math.max(sc[1], sc[2]), len: (rk.len ?? cfg.length ?? 20) * sc[0], p0: pos(M, S(rk.p0 || [0, rk.pitchY, 0])), d: dir(M, MS(rk.dir)), n: dir(M, MS(rk.n)) })
    }
    if (def.drive) {
      for (const dv of [evalCfg(def.drive, cfg)].flat()) {
        const src = childRotor(q, dv.mount)
        const item = { part: q, ...dv, ...(dv.r ? { r: dv.r * sr } : {}), src, x: dir(M, [1, 0, 0]), y: dir(M, [0, 1, 0]) }
        if (dv.slide) {
          const mt = mountsOf(q)[dv.slide]
          item.sl = mountSlide(mt, cfg)
          // eixo do deslizamento no mundo (o carro anda segundo ele)
          item.d = mt ? dir(W.get(q.id).clone().multiply(mountMatrix(q, dv.slide)), item.sl.axis) : item.x
        }
        drives.push(item)
      }
    }
    if (def.thrust && q.type === 'propeller') props.push({ part: q, rotor: rotorOf(q), a: dir(M, [0, 1, 0]), R: ((({ 3: 3.81, 5: 6.35, 7: 8.89, 10: 12.7 })[cfg.inches ?? 5] ?? 6.35) / 100) * sr })
    // hélices de ventoinha: raio da config; mais pás e mais inclinação → mais impulso (k)
    if (def.fan) {
      const f = evalCfg(def.fan, cfg)
      props.push({ part: q, fan: true, rotor: rotorOf(q), a: dir(M, [0, 1, 0]), R: (f.r / 100) * sr, k: (f.blades / 2) * Math.sin((f.pitch * Math.PI) / 180) / Math.sin((22 * Math.PI) / 180) * 0.6 })
    }
  }

  // ---------- ligações rotor ↔ rotor ----------
  const link = (A, B, ratio, what) => {
    if (!A || !B || A === B) return
    A.links.push({ to: B, ratio, what })
    B.links.push({ to: A, ratio: 1 / ratio, what })
  }
  let nLinks = 0
  for (let i = 0; i < gears.length; i++)
    for (let j = i + 1; j < gears.length; j++) {
      const A = gears[i]
      const B = gears[j]
      if (!A.rotor || !B.rotor || A.rotor === B.rotor) continue
      if (Math.abs(A.a.dot(B.a)) < 0.995) continue
      const d = B.c.clone().sub(A.c)
      const ax = d.dot(A.a)
      const perp = d.clone().addScaledVector(A.a, -ax).length()
      if (Math.abs(ax) > (A.w + B.w) / 2) continue
      const gap = perp - (A.r + B.r)
      if (Math.abs(gap) <= MESH_TOL) {
        link(A.rotor, B.rotor, -(A.r / B.r) * A.rotor.axis.dot(B.rotor.axis), 'engrenagem') // = z1/z2 com o mesmo módulo
        nLinks++
      } else if (Math.abs(gap) < 1.0)
        warnOnce(`near${A.part.id}${B.part.id}`, i18n.m(`⚠ ${name(A.part)} (${A.z} dentes) e ${name(B.part)} (${B.z} dentes) estão quase a engrenar mas a distância entre os eixos é ${(perp * 10).toFixed(1)} mm (devia ser ${((A.r + B.r) * 10).toFixed(1)} mm): não transmitem. Acerte a posição.`, `⚠ ${name(A.part)} (${A.z} teeth) and ${name(B.part)} (${B.z} teeth) almost mesh but the distance between the shafts is ${(perp * 10).toFixed(1)} mm (it should be ${((A.r + B.r) * 10).toFixed(1)} mm): they do not transmit. Fix the position.`))
    }
  // sem-fim → coroa (eixos perpendiculares, distância entre eixos = r1 + r2, a coroa centrada no
  // sem-fim): cada volta do sem-fim avança a coroa `entradas` dentes. Só num sentido: a coroa
  // não faz rodar o sem-fim (autobloqueante, como no real).
  for (const Wm of worms)
    for (const G of wheels) {
      if (!Wm.rotor || !G.rotor || Wm.rotor === G.rotor) continue
      if (Math.abs(Wm.a.dot(G.a)) > 0.05) continue
      const d = G.c.clone().sub(Wm.c) // do sem-fim para a coroa
      const n = Wm.a.clone().cross(G.a).normalize() // perpendicular comum
      const dist = Math.abs(d.dot(n))
      if (Math.abs(d.dot(Wm.a)) > Wm.len / 2 + 0.2 || Math.abs(d.dot(G.a)) > G.w / 2 + 0.2) continue
      const gap = dist - (Wm.r + G.r)
      if (Math.abs(gap) <= MESH_TOL) {
        // rosca direita: rodar +ω em torno do eixo do sem-fim empurra os dentes da coroa para −eixo
        const nWh = n.clone().multiplyScalar(-Math.sign(d.dot(n))) // da coroa para o sem-fim
        const s = -Wm.a.dot(G.a.clone().cross(nWh))
        const ratio = (Wm.starts / G.z) * s * Wm.rotor.axis.dot(Wm.a) * G.rotor.axis.dot(G.a)
        Wm.rotor.links.push({ to: G.rotor, ratio, what: 'sem-fim' })
        nLinks++
      } else if (Math.abs(gap) < 1.0)
        warnOnce(`nearW${Wm.part.id}${G.part.id}`, i18n.m(`⚠ O sem-fim ${Wm.part.id} e a coroa ${G.part.id} (${G.z} dentes) estão quase a engrenar mas a distância entre os eixos é ${(dist * 10).toFixed(1)} mm (devia ser ${((Wm.r + G.r) * 10).toFixed(1)} mm).`, `⚠ Worm ${Wm.part.id} and wheel ${G.part.id} (${G.z} teeth) almost mesh but the distance between the shafts is ${(dist * 10).toFixed(1)} mm (it should be ${((Wm.r + G.r) * 10).toFixed(1)} mm).`))
    }
  for (let i = 0; i < pulleys.length; i++)
    for (let j = i + 1; j < pulleys.length; j++) {
      const A = pulleys[i]
      const B = pulleys[j]
      if (A.belt !== B.belt || !A.rotor || !B.rotor || A.rotor === B.rotor) continue
      if (Math.abs(A.a.dot(B.a)) < 0.995) {
        warnOnce(`belt${A.belt}ax`, i18n.m(`⚠ ${beltName(A.belt)}: as polias ${A.part.id} e ${B.part.id} não têm os eixos paralelos — a correia não transmite.`, `⚠ ${beltName(A.belt)}: pulleys ${A.part.id} and ${B.part.id} do not have parallel shafts — the belt does not transmit.`))
        continue
      }
      if (Math.abs(B.c.clone().sub(A.c).dot(A.a)) > 0.4) {
        warnOnce(`belt${A.belt}pl`, i18n.m(`⚠ ${beltName(A.belt)}: as polias ${A.part.id} e ${B.part.id} não estão no mesmo plano (a correia saltava). Alinhe-as à mesma altura ao longo do eixo.`, `⚠ ${beltName(A.belt)}: pulleys ${A.part.id} and ${B.part.id} are not in the same plane (the belt would slip off). Align them at the same height along the shaft.`))
        continue
      }
      link(A.rotor, B.rotor, (A.z / B.z) * A.rotor.axis.dot(B.rotor.axis), 'correia')
      nLinks++
    }
  // o chão (y = 0) é um limite: a parte que desliza (def.moveBox) pára antes de o atravessar
  const floorLimit = (q, mountId, sl) => {
    const box = evalCfg(DEFS[q.type].moveBox, q.config || {})
    if (!box || !sl) return sl
    const M = W.get(q.id)
    const d = dir(M.clone().multiply(mountMatrix(q, mountId)), sl.axis)
    let lo = sl.min ?? -Infinity
    let hi = sl.max ?? Infinity
    for (const x of [box[0][0], box[1][0]]) for (const y of [box[0][1], box[1][1]]) for (const z of [box[0][2], box[1][2]]) {
      const c = pos(M, [x, y, z])
      if (d.y < -1e-6) hi = Math.min(hi, c.y / -d.y)
      else if (d.y > 1e-6) lo = Math.max(lo, -c.y / d.y)
    }
    return lo === sl.min && hi === sl.max ? sl : { ...sl, min: lo, max: hi, floor: true }
  }
  // cremalheiras: slide = k · θ (rad) do rotor da engrenagem
  const slides = []
  for (const R of racks) {
    for (const G of gears) {
      if (!G.rotor || !R.slide) continue
      if (Math.abs(G.a.dot(R.d)) > 0.05) continue
      const v = G.c.clone().sub(R.p0)
      const h = v.dot(R.n)
      const lat = Math.abs(v.dot(R.d.clone().cross(R.n)))
      if (lat > (G.w + R.w) / 2 || Math.abs(v.dot(R.d)) > R.len / 2 + 1) continue
      if (Math.abs(h - G.r) > MESH_TOL) {
        if (Math.abs(h - G.r) < 1) warnOnce(`nearR${R.part.id}${G.part.id}`, i18n.m(`⚠ A engrenagem ${G.part.id} está a ${((h - G.r) * 10).toFixed(1)} mm de engrenar na cremalheira ${R.part.id}: o centro deve ficar ${(G.r * 10).toFixed(1)} mm acima do topo da barra.`, `⚠ Gear ${G.part.id} is ${((h - G.r) * 10).toFixed(1)} mm from meshing with rack ${R.part.id}: its center should be ${(G.r * 10).toFixed(1)} mm above the top of the bar.`))
        continue
      }
      const k = -G.r * G.rotor.axis.clone().cross(R.n).dot(R.d)
      slides.push({ part: R.part, mount: R.mount, sl: floorLimit(R.part, R.mount, R.slide), src: G.rotor, k, what: 'cremalheira' })
      nLinks++
      break
    }
  }
  for (const dv of drives) {
    if (!dv.src) continue
    if (dv.kind === 'screw') {
      // rosca direita: rodar no sentido positivo em torno de +d faz a porca recuar (−d)
      slides.push({ part: dv.part, mount: dv.slide, sl: dv.sl, src: dv.src, k: (-(dv.lead / (2 * Math.PI)) * dv.src.axis.dot(dv.d)), screw: dv.src.axis.dot(dv.d), what: 'fuso' })
    }
  }
  const tracks = drives.filter((d) => d.kind === 'track')
  for (const t of tracks) {
    // velocidade do chassi (frente = +x da peça) imposta pela lagarta: −ω·r·(eixo × −y)·x
    t.k = t.src ? -t.r * t.src.axis.clone().cross(t.y.clone().negate()).dot(t.x) : 0
  }

  // rotores alcançáveis a partir de um ativo (os outros rodam soltos)
  const actives = [...rotors.values()].filter((r) => !r.idler)
  const idlers = [...rotors.values()].filter((r) => r.idler)
  const order = [] // [rotor, from, ratio] por ordem de propagação
  {
    const seen = new Set(actives)
    const queue = [...actives]
    while (queue.length) {
      const r = queue.shift()
      for (const l of r.links) {
        if (seen.has(l.to)) {
          // laço fechado com relação incoerente (3 engrenagens em triângulo…): bloqueado
          continue
        }
        if (!l.to.idler) continue
        seen.add(l.to)
        l.to.driven = true
        order.push([l.to, r, l.ratio])
        queue.push(l.to)
      }
    }
  }
  for (const r of idlers) if (!r.driven || r.free) L(r.part.id).mountFree = true
  if (nLinks) {
    const kinds = [...new Set([...[...rotors.values()].flatMap((r) => r.links.map((l) => l.what)), ...slides.map((x) => x.what)])]
    log?.(i18n.m(`ℹ Transmissão mecânica: ${nLinks} ligação(ões) — ${kinds.join(', ')}.`, `ℹ Mechanical transmission: ${nLinks} link(s) — ${kinds.join(', ')}.`), 'info')
  }

  const busy = actives.length && (order.length || slides.length || tracks.length || props.length)
  if (!busy) return { step: () => false, rotors }

  let lastChange = false
  return {
    rotors,
    step(dt = 0.001) {
      lastChange = false
      // 1) rotores ativos: ângulo (graus de servo − 90) e velocidade
      for (const r of actives) {
        const id = r.part.id
        const lv = live[id]
        const ang = servoAngle(id) ?? lv?.mountAngle ?? 90
        // mount.rev (outra ponta do veio duplo): o +y do mount aponta ao contrário → θ simétrico
        const th = (ang - 90) * D2R * r.sign
        if (lv?.mountVel != null) r.omega = lv.mountVel * D2R * r.sign
        else if (r.prev != null) r.omega += ((th - r.prev) / dt - r.omega) * 0.05
        r.prev = th
        r.theta = th
      }
      // 2) passivos ligados (por ordem de propagação)
      for (const [r, from, ratio] of order) {
        const th = from.theta * ratio
        r.omega = from.omega * ratio
        if (Math.abs(th - r.theta) > 1e-6) lastChange = true
        r.theta = th
        if (r.free) continue
        const lv = L(r.part.id)
        lv.mountAngle = Math.round((90 + th / D2R) * 1000) / 1000
        lv.mountVel = Math.round((r.omega / D2R) * 100) / 100
      }
      // 3) carros e barras que deslizam
      for (const s of slides) {
        let x = s.k * s.src.theta
        const lo = s.sl?.min ?? -Infinity
        const hi = s.sl?.max ?? Infinity
        if (x < lo || x > hi) {
          warnOnce(`end${s.part.id}`, i18n.m(`⚠ ${name(s.part)} (${s.part.id}): ${s.sl?.floor ? 'bateu no chão' : `o ${s.what === 'fuso' ? 'carro' : 'a barra'} chegou ao fim do curso`} (${(x < lo ? lo : hi).toFixed(1)} cm) — no real o motor encravava ou perdia passos.`, `⚠ ${name(s.part)} (${s.part.id}): ${s.sl?.floor ? 'hit the floor' : `the ${s.what === 'fuso' ? 'carriage' : 'bar'} reached the end of travel`} (${(x < lo ? lo : hi).toFixed(1)} cm) — in real life the motor would stall or skip steps.`))
          x = Math.max(lo, Math.min(hi, x))
        }
        const lv = L(s.part.id)
        const sl = lv.slide || (lv.slide = {})
        if (Math.abs((sl[s.mount] ?? 0) - x) > 1e-4) lastChange = true
        sl[s.mount] = Math.round(x * 10000) / 10000
        if (s.screw != null) lv.screwAngle = Math.round(((s.src.theta * s.screw) / D2R) * 10) / 10
      }
      // 4) lagartas: velocidade (cm/s, frente do chassi) e posição da banda (cm)
      for (const t of tracks) {
        const lv = L(t.part.id)
        const v = t.src ? t.k * t.src.omega : 0
        ;(lv.track ||= {})[t.key] = Math.round(v * 100) / 100
        const tp = (lv.trackPos ||= {})
        tp[t.key] = Math.round(((t.src ? t.k * t.src.theta : 0)) * 1000) / 1000
      }
      // 5) hélices em veios: impulso ∝ n²
      for (const pr of props) {
        const lv = L(pr.part.id)
        const w = pr.rotor ? pr.rotor.omega * pr.rotor.axis.dot(pr.a) : 0 // rad/s em torno do +y da hélice
        const n = Math.abs(w) / (2 * Math.PI)
        // ventoinhas: o sentido certo é o do motor ligado normalmente (M+ ao +): sopra para a frente
        const cw = (pr.part.config?.spin ?? (pr.fan ? 'CCW' : 'CW')) === 'CW'
        const right = cw ? w < 0 : w > 0
        // ventoinhas: ao contrário ainda sopram (para trás, ~30 %); lv.jetDir = sentido do jato
        // ao longo do +y da hélice (o vento empurra o que estiver à frente, na física do browser)
        const T = CT * RHO * n * n * (2 * pr.R) ** 4 * (right ? 1 : pr.fan ? 0.3 : 0.05) * (pr.k ?? 1)
        lv.thrustN = Math.round(T * 1000) / 1000
        if (pr.fan) {
          lv.jetDir = right ? 1 : -1
          // o ar trava o motor que roda a ventoinha (N·m no veio, lido em _encMotor.js)
          if (pr.rotor?.part) L(pr.rotor.part.id).aeroLoad = CQ * RHO * n * n * (2 * pr.R) ** 5 * (pr.k ?? 1)
        }
        lv.spin = w < 0 ? 1 : -1
        lv.rpm = Math.round((w * 60) / (2 * Math.PI))
      }
      return lastChange
    },
  }
}
