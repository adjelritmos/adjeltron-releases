// Verificação de todos os exemplos: compilação, diagnóstico, simulação, sobreposições 2D/3D.
// uso (em frontend/): bun scripts/check-examples.js [chave...]   (motor de src/engine; tradutor rápido)
const R = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/\/$/, '')
const { PRESETS, CODE_SNIPPETS } = await import(R + '/frontend/src/engine/sim/examples/index.js')
const { compileFast } = await import(R + '/frontend/src/engine/compile-fast.js')
const { compileFogu } = await import(R + '/frontend/src/engine/fogu/fogu.js')
// exemplos em Fogu (lang: 'fogu'): o programa passa a C++ antes de compilar
// --fogu: corre a versão em Fogu (P.fogu) dos exemplos em C++ com o mesmo cenário
const FOGU = process.argv.includes('--fogu')
const sketchCode = (P) => {
  const src = FOGU && P.fogu ? P.fogu : P.code
  if (P.lang !== 'fogu' && !(FOGU && P.fogu)) return src
  const board = P.build().parts.find((p) => DEFS[p.type]?.board)?.type || 'arduino'
  const f = compileFogu(src, { board })
  if (!f.ok) throw new Error(f.diagnostics.map((d) => `linha ${d.line}: ${d.message}`).join('; '))
  return f.cpp
}
const compileSketch = async (code, o) => compileFast(code, o)
const { diagnose } = await import(R + '/frontend/src/engine/sim/electrical.js')
const { createEngine } = await import(R + '/frontend/src/engine/sim/engine.js')
const { getTrackModel } = await import(R + '/frontend/src/engine/sim/track.js')
const { DEFS, view2dInfo, pin2dWorld, rot2d, S2D, boardProfile, partScale } = await import(R + '/shared/components.js')
const { worldMatrices, THREE } = await import(R + '/frontend/src/engine/sim/kinematics.js')
const { plugOverlaps } = await import(R + '/shared/netlist.js')
// fios 3D: o mesmo encaminhamento do frontend (functions/wireRoute.js + wireEnv.js), que importa
// '@shared/…' (alias do vite) e 'three' (do frontend)
Bun.plugin({
  name: 'frontend-alias',
  setup(b) {
    b.onResolve({ filter: /^@shared\// }, (a) => ({ path: R + '/shared/' + a.path.slice(8) }))
    b.onResolve({ filter: /^three$/ }, (a) => (a.importer?.includes('/frontend/src/') ? { path: R + '/frontend/node_modules/three/build/three.module.js' } : undefined))
  },
})
const WR = await import(R + '/frontend/src/functions/wireRoute.js')
const WE = await import(R + '/frontend/src/functions/wireEnv.js')
const TOT = {}
const FT = await import(R + '/frontend/node_modules/three/build/three.module.js')

// --engine=avr: Uno/Nano/Mega com emulação real (arduino-cli + avr8js); as outras placas no tradutor
const ENGINE = (process.argv.find((a) => a.startsWith('--engine=')) || '--engine=fast').slice(9)
const planEngine = null // (emulação real: só no backend Bun / app desktop)
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const TOL = 4.5 // px de sobreposição tolerada (peças vizinhas na breadboard)

// ---------- cenários: entradas ao longo do tempo + verificação ----------
const at = (t0, t1, fn) => ({ t0, t1, fn })
const SCEN = {
  seguidor: { check: (S) => (S.motorsRpm > 20 ? `motores ${S.motorsRpm.toFixed(0)} rpm, veículo andou ${S.moved.toFixed(1)} cm` : 'motores parados') },
  obstaculos: { check: (S) => (S.serial.includes('Distancia') && S.moved > 1 ? `andou ${S.moved.toFixed(1)} cm; ${S.serial.match(/Distancia: [\d.]+/)?.[0]}` : null) },
  botaoLed: {
    inputs: [at(1.0, 1.3, (I) => (I.btn = { pressed: true }))],
    check: (S) => (S.ledMax('led1') > 0.5 && S.serial.includes('LED ligado') ? 'LED acende ao carregar' : null),
  },
  semaforo: {
    check: (S) => {
      const lit = ['ledR', 'ledY', 'ledG'].map((id) => S.ledMax(id) > 0.4)
      const both = S.samples.some((s) => ['ledR', 'ledY', 'ledG'].filter((id) => s.leds[id] > 0.4).length > 1)
      return lit.every(Boolean) && !both ? 'vermelho → verde → amarelo, nunca 2 ao mesmo tempo' : null
    },
  },
  rgb: {
    check: (S) => {
      const mx = (k) => Math.max(...S.samples.map((s) => s.live.rgb?.[k] ?? 0))
      return mx('r') > 0.35 && mx('g') > 0.35 && mx('b') > 0.35 ? `R/G/B máx ${mx('r')}/${mx('g')}/${mx('b')}` : null
    },
  },
  termometroLcd: {
    inputs: [at(2.5, 9, (I) => (I.dht = { ...I.dht, value: 30 }))],
    // emulação real: a LiquidCrystal_I2C verdadeira espera 1 s no init() → 1.ª leitura aos ~3,2 s
    inputsAvr: [at(4.0, 9, (I) => (I.dht = { ...I.dht, value: 30 }))],
    avrSamples: 12,
    check: (S) => {
      const l0 = S.samples.map((s) => s.live.lcd?.lines?.join('|') || '')
      const a = l0.find((x) => x.includes('22.0'))
      const b = l0.find((x) => x.includes('30.0'))
      return a && b ? `LCD "${a}" → "${b}"` : null
    },
  },
  termometroOled: {
    inputs: [at(2.0, 9, (I) => (I.lm35 = { ...I.lm35, value: 40 }))],
    check: (S) => {
      const fb = S.samples.map((s) => s.live.oled?.fb).filter(Boolean)
      const lit = fb.length ? Buffer.from(fb.at(-1), 'base64').reduce((a, v) => a + (v ? 1 : 0), 0) : 0
      return lit > 50 && new Set(fb).size > 3 && /40\.\d/.test(S.serial) ? `OLED com ${lit} bytes acesos, ${new Set(fb).size} imagens; série: ${S.serial.match(/[^\n]*40\.\d[^\n]*/)?.[0]}` : null
    },
  },
  anelNeopixel: {
    inputs: [at(2.5, 9, (I) => (I.pot = { value: 1 }))],
    check: (S) => {
      const cs = S.samples.map((s) => (s.live.anel?.c || []).join(','))
      const distinct = new Set((S.samples.at(-1).live.anel?.c || []).filter((c) => c)).size
      return distinct >= 8 && new Set(cs).size > 5 ? `${distinct} cores diferentes, ${new Set(cs).size} quadros distintos` : null
    },
  },
  fechadura: {
    // emulação real: o lcd.init() verdadeiro demora ~1 s antes de o teclado ser lido
    inputsAvr: [
      at(1.6, 1.75, (I) => (I.kp = { key: '1' })),
      at(1.9, 2.05, (I) => (I.kp = { key: '2' })),
      at(2.2, 2.35, (I) => (I.kp = { key: '3' })),
      at(2.5, 2.65, (I) => (I.kp = { key: '4' })),
      at(2.8, 2.95, (I) => (I.kp = { key: '#' })),
    ],
    avrSamples: 14,
    inputs: [
      at(0.6, 0.75, (I) => (I.kp = { key: '1' })),
      at(0.9, 1.05, (I) => (I.kp = { key: '2' })),
      at(1.2, 1.35, (I) => (I.kp = { key: '3' })),
      at(1.5, 1.65, (I) => (I.kp = { key: '4' })),
      at(1.8, 1.95, (I) => (I.kp = { key: '#' })),
    ],
    release: (I) => (I.kp = { key: null }),
    check: (S) => {
      const open = S.samples.find((s) => (s.servos.trinco ?? 0) > 80)
      const txt = S.samples.map((s) => s.live.lcd?.lines?.join('|') || '').find((x) => x.includes('ABERTO'))
      return open && txt && S.servos('trinco') < 10 ? `servo abriu a ${open.servos.trinco.toFixed(0)}° (t=${open.t}s) e voltou a fechar; LCD "${txt}"` : null
    },
  },
  alarmePir: {
    inputs: [at(1.5, 2.0, (I) => (I.pir = { pressed: true }))],
    release: (I) => (I.pir = { pressed: false }),
    check: (S) => {
      const s = S.samples.find((x) => x.live.rele?.closed)
      const before = S.samples.find((x) => x.t <= 1.5 && (x.live.rele?.closed || x.leds.ledAl > 0.3))
      return s && !before && S.samples.some((x) => x.live.piezo?.freq > 0) && S.ledMax('ledRele') > 0.4 && S.ledMax('ledAl') > 0.4 ? `relé fechou (t=${s.t}s), sirene ${Math.max(...S.samples.map((x) => x.live.piezo?.freq || 0))} Hz, LEDs acesos` : null
    },
  },
  estacionamento: {
    check: (S) => {
      const d = S.serial.match(/Distancia: ([\d.]+)/)
      return d && S.ledMax('ledY') > 0.4 && S.ledMax('ledR') < 0.1 && S.freqSeen.piezo > 0 ? `distância ${d[1]} cm → LED amarelo + bips de ${S.freqSeen.piezo} Hz` : null
    },
  },
  passoPot: {
    inputs: [at(3.0, 9, (I) => (I.pot = { value: 0.25 }))],
    check: (S) => {
      const st = S.samples.map((s) => s.live.passo?.steps ?? 0)
      const mx = Math.max(...st)
      return mx > 600 && st.at(-1) < mx - 100 ? `passos: máx ${mx}, final ${st.at(-1)} (segue o pot)` : null
    },
  },
  panTilt: {
    inputs: [at(1.0, 2.5, (I) => (I.joy = { ...I.joy, x: 0.05 })), at(2.5, 4.0, (I) => (I.joy = { ...I.joy, x: 0.5, y: 0.95 })), at(4.0, 4.4, (I) => (I.joy = { ...I.joy, y: 0.5, pressed: true }))],
    release: (I) => (I.joy = { ...I.joy, pressed: false }),
    check: (S) => {
      const p = S.servoRange('pan')
      const t = S.servoRange('tilt')
      return p > 40 && t > 30 && Math.abs(S.servos('pan') - 90) < 5 ? `pan variou ${p.toFixed(0)}°, tilt ${t.toFixed(0)}°, SW volta ao centro` : null
    },
  },
  contador7seg: {
    inputs: [at(1.0, 1.3, (I) => (I.btn = { pressed: true })), at(2.0, 2.3, (I) => (I.btn = { pressed: true })), at(3.0, 3.3, (I) => (I.btn = { pressed: true }))],
    release: (I) => (I.btn = { pressed: false }),
    check: (S) => {
      const seg = S.samples.at(-1).live.d7?.seg || []
      const on = seg.map((v) => v > 0.4)
      const three = [1, 1, 1, 1, 0, 0, 1].every((b, i) => !!b === on[i])
      return three ? `mostra 3 após 3 cliques (segmentos ${on.map(Number).join('')})` : `seg=${seg}`
    },
  },
  detetorGas: {
    inputs: [at(3.2, 9, (I) => (I.mq2 = { ...I.mq2, value: 3000 }))],
    check: (S) => {
      const pre = S.samples.filter((s) => s.t < 3.2).some((s) => s.leds.ledGas > 0.3 || s.buz.buz)
      const post = S.samples.filter((s) => s.t > 3.6)
      return !pre && post.every((s) => s.leds.ledGas > 0.4) && post.some((s) => s.buz.buz) ? 'sem alarme no pré-aquecimento; 3000 ppm → LED + buzzer' : null
    },
  },
  esp32Pwm: {
    inputs: [at(2.0, 9, (I) => (I.pot = { value: 0.1 }))],
    check: (S) => {
      const mx = S.ledMax('led1')
      const pots = [...S.serial.matchAll(/pot=\s*(\d+)/g)].map((m) => +m[1])
      return mx > 0.2 && /240 MHz/.test(S.serial) && pots.length >= 2 && new Set(pots).size > 1 ? `LED PWM máx ${mx}; ${S.serial.match(/ESP32 a \d+ MHz/)[0]}; pot ${pots[0]} → ${pots.at(-1)}` : null
    },
  },
  esp32Wifi: {
    inputs: [at(3.5, 9, (I) => (I.dht = { ...I.dht, value: 28 }))],
    check: (S) => {
      const ip = S.serial.match(/IP: ([\d.]+)/)?.[1]
      const t = [...S.serial.matchAll(/T=([\d.]+) C/g)].map((m) => m[1])
      const fb = S.samples.map((s) => s.live.oled?.fb).filter(Boolean)
      return ip && t.length && fb.length && new Set(fb).size > 1 ? `Wi-Fi ${ip}; leituras T=${t.join(', ')} C; OLED ${new Set(fb).size} imagens` : null
    },
  },
  // câmara (esp_camera.h): até aos 2,5 s a imagem é a sintética (sem vista 3D); depois chega um
  // frame como o que o browser envia (mensagem 'camFrame' → input.frame) com uma faixa escura em x = 116–123 (de 160)
  camaraEsp32: {
    inputs: [
      at(2.5, 9, (I) => {
        const w = 320
        const h = 240
        const rgb = new Uint8Array(w * h * 3).fill(210)
        for (let y = 0; y < h; y++) for (let x = 232; x < 248; x++) rgb.fill(20, (y * w + x) * 3, (y * w + x) * 3 + 3)
        I.cam = { ...I.cam, frame: { w, h, rgb } }
      }),
    ],
    check: (S) => {
      const L = [...S.serial.matchAll(/brilho medio: (\d+)\s+coluna mais escura: (\d+)/g)].map((m) => [+m[1], +m[2]])
      const syn = L.filter((_, i) => i < 3)
      const real = L.at(-1)
      return /Camara pronta/.test(S.serial) && syn.length && syn.every(([b]) => b > 20 && b < 240) && real && real[1] >= 115 && real[1] <= 123 && S.samples.some((s) => s.live.cam?.cam?.on)
        ? `sintética: brilho ${syn[0][0]}; frame do browser: brilho ${real[0]}, coluna escura ${real[1]} (esperado 116–123)`
        : null
    },
  },
  ventoinha: {
    inputs: [at(3.0, 9, (I) => (I.pot = { value: 0 }))],
    check: (S) => {
      const rpm = S.samples.map((s) => s.live.motor?.rpm ?? 0)
      const mx = Math.max(...rpm)
      const m = S.samples.find((s) => s.t === 2.5)?.live.motor
      return mx > 2000 && rpm.at(-1) < mx * 0.5 ? `máx ${mx} rpm (${m?.v} V, ${m?.i} A), cai para ${rpm.at(-1)} rpm com o pot a 0` : null
    },
  },
  matriz: {
    check: (S) => {
      const fr = new Set(S.samples.map((s) => (s.live.mx?.rows || []).join(',')))
      const lit = Math.max(...S.samples.map((s) => (s.live.mx?.rows || []).reduce((a, v) => a + v.toString(2).split('1').length - 1, 0)))
      return fr.size >= 3 && lit > 10 ? `${fr.size} imagens distintas, até ${lit} LEDs acesos` : null
    },
  },
  cronometro: {
    inputs: [at(0.5, 0.7, (I) => (I.btn = { pressed: true })), at(3.5, 3.7, (I) => (I.btn = { pressed: true }))],
    release: (I) => (I.btn = { pressed: false }),
    check: (S) => {
      const d = S.samples.map((s) => (s.live.tm?.d || []).join(','))
      const mid = new Set(d.filter((_, i) => S.samples[i].t > 1 && S.samples[i].t < 3.5))
      const end = d.filter((_, i) => S.samples[i].t >= 4)
      return mid.size >= 3 && new Set(end).size === 1 && S.samples.at(-1).live.tm?.b > 0 ? `conta ${mid.size} valores e pára ao 2.º clique` : null
    },
  },
}

// ---------- geometria ----------
function box2d(p) {
  const i = view2dInfo(p.type)
  if (!i || !p.sch) return null
  const r = ((p.sch.rot || 0) % 180 + 180) % 180
  const [w, h] = r === 90 ? [i.h, i.w] : [i.w, i.h]
  return [p.sch.x - w / 2, p.sch.y - h / 2, p.sch.x + w / 2, p.sch.y + h / 2]
}
const inter = (a, b) => [Math.min(a[2], b[2]) - Math.max(a[0], b[0]), Math.min(a[3], b[3]) - Math.max(a[1], b[1])]

function foot3d(p) {
  const d = DEFS[p.type]
  if (d.mech && p.type !== 'cube' && p.type !== 'armBase') return null
  let x0, x1, z0, z1
  const v = d.view2d
  if (v?.view === 'top') [x0, x1, z0, z1] = [v.x[0], v.x[1], v.z[0], v.z[1]]
  else [x0, x1, z0, z1] = [-d.size[0] / 2, d.size[0] / 2, -d.size[2] / 2, d.size[2] / 2]
  const th = ((p.rot?.[1] || 0) * Math.PI) / 180
  const pts = [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].map(([x, z]) => [p.pos[0] + x * Math.cos(th) + z * Math.sin(th), p.pos[2] - x * Math.sin(th) + z * Math.cos(th)])
  const xs = pts.map((q) => q[0])
  const zs = pts.map((q) => q[1])
  return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]
}

function routeOf(a, pts, b) {
  const raw = pts?.length ? [a, ...pts, b] : Math.abs(a[1] - b[1]) < 0.5 || Math.abs(a[0] - b[0]) < 0.5 ? [a, b] : [a, [Math.round((a[0] + b[0]) / 10) * 5, a[1]], [Math.round((a[0] + b[0]) / 10) * 5, b[1]], b]
  const out = [raw[0]]
  for (let i = 1; i < raw.length; i++) {
    const p = raw[i - 1]
    const c = raw[i]
    if (p[0] !== c[0] && p[1] !== c[1]) out.push([c[0], p[1]])
    out.push(c)
  }
  return out
}
function segHitsBox(p, q, b, m = 1) {
  const [x0, y0, x1, y1] = [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1])]
  return x1 > b[0] + m && x0 < b[2] - m && y1 > b[1] + m && y0 < b[3] - m
}

// ---------- execução ----------
const rows = []
let allOk = true
for (const [key, P] of Object.entries(PRESETS)) {
  if (only.length && !only.includes(key)) continue
  if (FOGU && !P.fogu) continue
  const problems = []
  const notes = []
  const knownBugs = []
  const { parts, wires } = P.build()
  // --i2c-header: os fios do Uno em A4/A5 passam para os pinos SDA/SCL do cabeçalho (têm de dar o mesmo)
  if (process.argv.includes('--i2c-header')) {
    const unos = new Set(parts.filter((p) => p.type === 'arduino').map((p) => p.id))
    for (const w of wires) for (const e of [w.a, w.b]) if (unos.has(e.part) && (e.pin === 'A4' || e.pin === 'A5')) e.pin = e.pin === 'A4' ? 'SDA' : 'SCL'
  }
  const st = getTrackModel(P.track).start
  for (const q of parts) if (q.type === 'chassis' && !q.parent) Object.assign(q, { pos: [st.x, 0, st.z], rot: [0, (st.theta * 180) / Math.PI, 0] })
  const byId = Object.fromEntries(parts.map((p) => [p.id, p]))
  if (!P.cat) problems.push('sem cat')
  for (const wr of wires) for (const e of [wr.a, wr.b]) if (!byId[e.part] || !DEFS[byId[e.part].type].pins.some((x) => x.id === e.pin)) problems.push(`fio ${wr.id}: pino inexistente ${e.part}.${e.pin}`)
  for (const p of parts) if (DEFS[p.type].pins.length && DEFS[p.type].view2d && !p.sch && p.type !== 'motor') problems.push(`${p.id} sem posição 2D`)

  // compilação
  const boardType = parts.find((p) => DEFS[p.type].board)?.type
  let r
  let firmware = null
  let engineUsed = 'tradutor'
  if (ENGINE === 'avr' && ['uno', 'mega'].includes(boardProfile(boardType || 'arduino').id)) {
    const plan = await planEngine({ code: sketchCode(P), board: boardType, parts, mode: 'real' })
    r = plan.compile
    firmware = plan.firmware || null
    engineUsed = plan.engine === 'avr' ? 'emulador' : 'tradutor'
    for (const n of plan.notes) if (n.level === 'warn') notes.push(`motor: ${n.text}`)
    if (plan.engine === 'avr' && r.ok) r = { ...r, js: null }
  } else r = await compileSketch(sketchCode(P), { board: boardType })
  const errs = r.diagnostics.filter((d) => d.severity === 'error')
  const cwarn = r.diagnostics.filter((d) => d.severity === 'warning')
  if (!r.ok || errs.length) problems.push(`compilação: ${errs.map((d) => `${d.line}: ${d.message}`).join(' | ')}`)
  for (const d of cwarn) notes.push(`aviso clang ${d.line}: ${d.message}`)

  // diagnóstico
  const issues = diagnose(parts, wires).issues
  for (const i of issues) (i.level === 'info' ? notes : problems).push(`diag ${i.level}: ${i.msg}`)

  // 2D
  // breadboards e placas com soquete (Pico na Pico4Drive: shared/sockets.js) — pinos encaixados de propósito
  const bbIds = new Set(parts.filter((p) => DEFS[p.type]?.breadboard || Object.values(DEFS[p.type]?.mounts || {}).some((m) => m.socket)).map((p) => p.id))
  const plugs = plugOverlaps(parts)
  const onBB = new Set()
  for (const [a, b] of plugs) {
    const [pa, pb] = [a.split(':')[0], b.split(':')[0]]
    if (bbIds.has(pa)) onBB.add(pb)
    else if (bbIds.has(pb)) onBB.add(pa)
    else problems.push(`pinos encaixados sem querer: ${a} ↔ ${b}`)
  }
  const p2 = parts.filter((p) => box2d(p))
  for (let i = 0; i < p2.length; i++)
    for (let j = i + 1; j < p2.length; j++) {
      const [a, b] = [p2[i], p2[j]]
      if ((bbIds.has(a.id) && onBB.has(b.id)) || (bbIds.has(b.id) && onBB.has(a.id))) continue
      const [ix, iy] = inter(box2d(a), box2d(b))
      if (ix > 0 && iy > 0 && Math.min(ix, iy) > TOL) problems.push(`2D: ${a.id} sobrepõe ${b.id} (${ix.toFixed(0)}×${iy.toFixed(0)} px)`)
    }
  // fios que atravessam peças (exceto as das pontas)
  let cross = 0
  const crossList = []
  for (const wr of wires) {
    const A = pin2dWorld(byId[wr.a.part], wr.a.pin)
    const B = pin2dWorld(byId[wr.b.part], wr.b.pin)
    if (!A || !B) continue
    const poly = routeOf(A, wr.pts, B)
    for (const p of p2) {
      if (p.id === wr.a.part || p.id === wr.b.part || bbIds.has(p.id)) continue
      const b = box2d(p)
      for (let k = 1; k < poly.length; k++)
        if (segHitsBox(poly[k - 1], poly[k], b, 2)) {
          cross++
          crossList.push(`${wr.a.part}.${wr.a.pin}→${wr.b.part}.${wr.b.pin} sobre ${p.id}`)
          break
        }
    }
  }
  // exemplos arrumados (preset.tidy): nenhum fio pode passar por cima de uma peça
  if (cross) (PRESETS[key]?.tidy ? problems : notes).push(`fios por cima de peças: ${crossList.join('; ')}`)
  // fios 3D que entram em peças (caixas de colisão), com o percurso automático do frontend
  let hit3d = 0
  let wireCross = 0
  {
    const WM = worldMatrices(parts)
    const W = new Map([...WM].map(([k, m]) => [k, new FT.Matrix4().fromArray(m.elements)]))
    const roots = WE.rootsOf(parts)
    const envs = new Map()
    const list = []
    // fios entre si: cada fio afasta-se dos traçados antes dele (faixas, por contentor)
    const lanesOf = new Map()
    const strict = new Map()
    for (const wr of wires) {
      const ra = roots.get(wr.a.part)
      const rb = roots.get(wr.b.part)
      if (!ra || !rb) continue
      const c = ra.id === rb.id ? WE.wireContainerOf(ra, parts) : null
      const inv = c ? W.get(c).clone().invert() : new FT.Matrix4()
      const matOf = (id) => (W.get(id) ? inv.clone().multiply(W.get(id)) : null)
      if (!envs.has(c)) envs.set(c, WE.buildWireEnv(parts, matOf, c, roots))
      const env = envs.get(c)
      const A = WE.wireEndOf(byId[wr.a.part], wr.a.pin, matOf(wr.a.part))
      const B = WE.wireEndOf(byId[wr.b.part], wr.b.pin, matOf(wr.b.part))
      if (!A || !B) continue
      const seed = [...wr.id].reduce((t, ch) => t + ch.charCodeAt(0), 0)
      const via = wr.pts3d?.length ? wr.pts3d.map((v) => new FT.Vector3(...v)) : null
      if (!lanesOf.has(c)) lanesOf.set(c, new WR.Lanes())
      const lanes = lanesOf.get(c)
      const rt = WR.routeWire(A, B, { obstacles: env.obstacles, plates: env.plates, seed, via, ground: c ? null : 0, lanes: process.env.NOLANES ? null : lanes })
      const hits = WR.wireHits(rt.points, env.obstacles, rt.ends)
      // fios que se atravessam: eixos a menos de um diâmetro (2·raio − 0,1 mm) de um fio anterior
      const smp = WR.sampleWire(rt.points, rt.ends)
      if (!strict.has(c)) strict.set(c, [])
      const prev = strict.get(c)
      for (const o of prev) {
        if (smp.hi.x < o.lo.x || smp.lo.x > o.hi.x || smp.hi.y < o.lo.y || smp.lo.y > o.hi.y || smp.hi.z < o.lo.z || smp.lo.z > o.hi.z) continue
        // fios no mesmo pino tocam-se junto à ficha (inevitável): só conta longe dele
        const shared = rt.ends.filter((e) => o.ends.some((f) => f.tip.distanceTo(e.tip) < 0.05)).map((e) => e.tip)
        if (smp.pts.some((p) => shared.every((t) => t.distanceTo(p) > 1.2) && o.pts.some((q) => q.distanceTo(p) < 2 * WR.WIRE_R - 0.01))) wireCross++
      }
      smp.ends = rt.ends
      prev.push(smp)
      lanes.add(smp, rt)
      if (hits.size) {
        hit3d++
        list.push(`${wr.a.part}.${wr.a.pin}→${wr.b.part}.${wr.b.pin} em ${[...hits].map(([k, d]) => `${k} (${d.toFixed(2)} cm)`).join(', ')}`)
      }
    }
    if (hit3d) notes.push(`fios 3D dentro de peças: ${list.join('; ')}`)
    if (wireCross) notes.push(`fios 3D a atravessar outros fios: ${wireCross}`)
    TOT.wireCross = (TOT.wireCross || 0) + wireCross
  }
  // chão: nenhuma peça abaixo de y = 0 na pose de construção (colisores ou caixa da peça)
  {
    const WM = worldMatrices(parts)
    for (const p of parts) {
      const d = DEFS[p.type]
      if (d.vehicle || d.breadboard) continue
      let cs = typeof d.collider === 'function' ? d.collider(p.config || {}) : d.collider
      if (cs === false) continue
      if (!cs) cs = { size: d.size, pos: [0, d.size[1] / 2, 0] }
      const sc = partScale(p) || [1, 1, 1]
      let low = Infinity
      for (const c of [cs].flat()) {
        if (c.radius) {
          const ctr = new THREE.Vector3(...(c.pos || [0, 0, 0]).map((v, i) => v * sc[i])).applyMatrix4(WM.get(p.id))
          low = Math.min(low, ctr.y - c.radius * Math.cbrt(Math.abs(sc[0] * sc[1] * sc[2])))
          continue
        }
        const h = c.radius ? [c.radius, c.radius, c.radius] : c.size.map((v) => v / 2)
        const cp = c.pos || [0, 0, 0]
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
          const v = new THREE.Vector3((cp[0] + sx * h[0]) * sc[0], (cp[1] + sy * h[1]) * sc[1], (cp[2] + sz * h[2]) * sc[2]).applyMatrix4(WM.get(p.id))
          low = Math.min(low, v.y)
        }
      }
      if (low < -0.15) problems.push(`3D: ${p.id} atravessa o chão (${low.toFixed(1)} cm)`)
    }
  }
  // 3D (peças na mesa)
  const t3 = parts.filter((p) => !p.parent && foot3d(p))
  for (let i = 0; i < t3.length; i++)
    for (let j = i + 1; j < t3.length; j++) {
      const [ix, iy] = inter(foot3d(t3[i]), foot3d(t3[j]))
      if (ix > 0.05 && iy > 0.05) problems.push(`3D: ${t3[i].id} sobrepõe ${t3[j].id} (${ix.toFixed(1)}×${iy.toFixed(1)} cm)`)
    }

  // simulação
  let obs = ''
  if (r.ok) {
    const inputs = {}
    for (const p of parts) {
      if (p.type === 'pot') inputs[p.id] = { value: p.config?.value ?? 0.5 }
      const ia = DEFS[p.type]?.interactive
      if (ia && !inputs[p.id]) inputs[p.id] = { value: p.config?.value ?? ia.default ?? 0, on: !!p.config?.on, x: 0.5, y: 0.5 }
    }
    let serial = ''
    const serr = []
    const e = createEngine({ parts, wires, code: sketchCode(P), compiled: r.js, firmware, track: getTrackModel(P.track), realism: true, inputs, onSerial: (t, lv) => (lv ? serr.push(`${lv}: ${t.trim()}`) : (serial += t)) })
    const sc = SCEN[key] || PRESETS[key].scenario || {}
    const samples = []
    const v0 = e.vehicles.map((v) => ({ ...v.pose }))
    let rpmMax = 0
    const freqSeen = {}
    // com a emulação real alguns exemplos precisam de mais tempo (ex.: LiquidCrystal_I2C espera 1 s no init)
    const nSamples = firmware ? sc.avrSamples || 10 : 10
    for (let k = 1; k <= nSamples; k++) {
      const t = k * 0.5
      // aplica as entradas ativas neste intervalo (com resolução de 50 ms)
      for (let sub = 0; sub < 10; sub++) {
        const tt = t - 0.5 + sub * 0.05
        let any = false
        for (const inp of (firmware && sc.inputsAvr) || sc.inputs || []) if (tt >= inp.t0 && tt < inp.t1) (inp.fn(inputs), (any = true))
        if (!any && sc.release) sc.release(inputs)
        e.invalidate()
        e.advance(0.05, 1e9)
        for (const [id, l] of Object.entries(e.live)) if (l?.freq > 0) freqSeen[id] = Math.max(freqSeen[id] || 0, l.freq)
      }
      rpmMax = Math.max(rpmMax, ...e.motors.map((m) => Math.abs((m.w * 60) / (2 * Math.PI))))
      samples.push({
        t,
        live: JSON.parse(JSON.stringify(e.live)),
        leds: Object.fromEntries(e.leds.map((l) => [l.part.id, l.b])),
        servos: Object.fromEntries(e.servos.map((s) => [s.part.id, s.angle])),
        buz: Object.fromEntries(e.buzzers.map((b) => [b.part.id, b.on])),
      })
    }
    if (e.error) problems.push(`erro do motor: ${e.error}`)
    for (const s of serr) (/nos contactos \(máx\. 10 A\)/.test(s) ? knownBugs : s.startsWith('error') || s.startsWith('warn') ? problems : notes).push(`série ${s}`)
    const S = {
      samples,
      serial,
      motorsRpm: rpmMax,
      freqSeen,
      moved: e.vehicles.length ? Math.hypot(e.vehicles[0].pose.x - v0[0].x, e.vehicles[0].pose.z - v0[0].z) : 0,
      ledMax: (id) => Math.max(...samples.map((s) => s.leds[id] ?? 0)),
      servoRange: (id) => Math.max(...samples.map((s) => s.servos[id] ?? 90)) - Math.min(...samples.map((s) => s.servos[id] ?? 90)),
      servos: (id) => samples.at(-1).servos[id],
    }
    const res = sc.check ? sc.check(S) : null
    if (!sc.check) problems.push('sem cenário de teste')
    else if (!res || res.startsWith('seg=')) problems.push(`observação falhou ${res || ''} | série: ${serial.slice(-300).replace(/\n/g, '⏎')}`)
    obs = res || ''
  }
  const ok = !problems.length
  allOk &&= ok
  rows.push({ key, engine: engineUsed, name: P.name, cat: P.cat, parts: parts.length, wires: wires.length, cross, fios3d: hit3d, ok: ok ? 'OK' : 'FALHA', obs })
  console.log(`\n=== ${key} — ${P.name} [${P.cat}] (${engineUsed}) ${ok ? 'OK' : 'FALHA'}`)
  for (const p of problems) console.log('  ✖', p)
  for (const n of notes) console.log('  ·', n)
  for (const n of knownBugs) console.log('  ⚑ bug conhecido do simulador:', n)
  if (obs) console.log('  ✔', obs)
}
console.log()
console.table(rows)
console.log('snippets:', Object.keys(CODE_SNIPPETS).length)
console.log(`fios 3D a atravessar outros fios (pares): ${TOT.wireCross || 0}`)
console.log(`fios 3D dentro de peças: ${rows.reduce((t, r) => t + r.fios3d, 0)} de ${rows.reduce((t, r) => t + r.wires, 0)}`)
for (const eng of [...new Set(rows.map((r) => r.engine))]) {
  const rs = rows.filter((r) => r.engine === eng)
  console.log(`motor ${eng}: ${rs.filter((r) => r.ok === 'OK').length}/${rs.length} OK${rs.some((r) => r.ok !== 'OK') ? ` — falham: ${rs.filter((r) => r.ok !== 'OK').map((r) => r.key).join(', ')}` : ''}`)
}
console.log(allOk ? 'TUDO OK' : 'HÁ FALHAS')
process.exit(allOk ? 0 : 1)
