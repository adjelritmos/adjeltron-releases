// Motor da simulação genérico: Arduino virtual + solver elétrico + mecânica.
// Passo de 1 ms em tempo simulado; o programa corre em sincronia com a física.
import * as THREE from 'three'
import { DEFS, CHASSIS, isBoard, boardProfile, UNO_PROFILE, motorWheel, baseDims, partScale, partSize, partBoxes, liveBoxes } from '../../../../shared/components.js'
import { physicsModeOf } from '../../../../shared/physics.js'
import { fixAxleParents } from '../../../../shared/assembly.js'
import { evalCfg } from '../../../../shared/parts/_mech.js'
import { sonarEyeY } from '../../../../shared/sonar.js'
import { BEHAVIORS } from './parts/index.js'
import { LIBS } from './libs/index.js'
import { createCircuit } from './electrical.js'
import { compile, compileJs } from './compiler.js'
import { ARENA } from '../../../../shared/tracks.js'
import { worldMatrices, mountMatrix, trs } from './kinematics.js'
import { makeHwSerial } from './libs/_uart.js'
import { createInterrupts } from './interrupts.js'
import { createRtos, TASK_DELETE } from './rtos.js'
import { createScope, defaultPwmFreq } from './scope.js'
import { createNvm } from './nvm.js'
import { ctype } from './libs/EEPROM.js'
import { picoExtras } from './rp2.js'
import { createMcuEmulator } from './avr/host.js'
import { createMechanics } from './mech.js'
import { spinJams, spinDriver } from '../../../../shared/spinClear.js'
import { gripRel, gripWidth } from '../../../../shared/grip.js'
import * as i18n from '../../../../shared/i18n.js'

// printf de C (subconjunto): %d %i %u %ld %lu %x %X %o %c %s %f %.Nf %e %%, largura e zeros
export function cprintf(f, args) {
  let i = 0
  return String(f).replace(/%([-+ 0#]*)(\d+)?(?:\.(\d+))?(hh|h|ll|l|z)?([diuxXocsfFeEgG%])/g, (m, flags, width, prec, len, c) => {
    if (c === '%') return '%'
    const v = args[i++]
    let t
    switch (c) {
      case 'd': case 'i': case 'u': t = String(Math.trunc(Number(v) || 0)); break
      case 'x': t = (Math.trunc(Number(v)) >>> 0).toString(16); break
      case 'X': t = (Math.trunc(Number(v)) >>> 0).toString(16).toUpperCase(); break
      case 'o': t = (Math.trunc(Number(v)) >>> 0).toString(8); break
      case 'c': t = typeof v === 'number' ? String.fromCharCode(v) : String(v)[0] || ''; break
      case 's': t = String(v ?? '(null)'); break
      case 'e': case 'E': t = Number(v).toExponential(prec ? +prec : 6); if (c === 'E') t = t.toUpperCase(); break
      case 'g': case 'G': t = String(Number(v.toPrecision ? v.toPrecision(prec ? +prec : 6) : v)); break
      default: t = Number.isNaN(Number(v)) ? 'nan' : Number(v).toFixed(prec ? +prec : 6)
    }
    if (flags.includes('+') && /[dif]/.test(c) && Number(v) >= 0) t = `+${t}`
    if (width && t.length < +width) t = flags.includes('-') ? t.padEnd(+width) : flags.includes('0') && !/[sc]/.test(c) ? t.replace(/^([+-]?)/, (s) => s).padStart(+width, '0') : t.padStart(+width)
    return t
  })
}

const MOTOR = { ke: 0.24, J: 8e-4, iFric: 0.16, b: 2e-4 }

// funções de caracteres (<ctype.h> e WCharacter.h do Arduino)
function charHelpers() {
  const code = (c) => (typeof c === 'string' ? (c.length ? c.charCodeAt(0) : 0) : Number(c) | 0)
  const test = (re) => (c) => re.test(String.fromCharCode(code(c)))
  const conv = (f) => (c) => {
    const r = f(String.fromCharCode(code(c)))
    return typeof c === 'string' ? r : r.charCodeAt(0)
  }
  const isalpha = test(/^[A-Za-z]$/)
  const isdigit = test(/^[0-9]$/)
  const isalnum = test(/^[A-Za-z0-9]$/)
  const isxdigit = test(/^[0-9A-Fa-f]$/)
  const isspace = test(/^[ \t\n\v\f\r]$/)
  const isupper = test(/^[A-Z]$/)
  const islower = test(/^[a-z]$/)
  const ispunct = test(/^[!-\/:-@\[-`{-~]$/)
  const isprint = (c) => code(c) >= 32 && code(c) < 127
  const isgraph = (c) => code(c) > 32 && code(c) < 127
  const iscntrl = (c) => code(c) < 32 || code(c) === 127
  const toupper = conv((s) => s.toUpperCase())
  const tolower = conv((s) => s.toLowerCase())
  return {
    isalpha, isdigit, isalnum, isxdigit, isspace, isupper, islower, ispunct, isprint, isgraph, iscntrl, toupper, tolower,
    isAlpha: isalpha, isDigit: isdigit, isAlphaNumeric: isalnum, isHexadecimalDigit: isxdigit, isSpace: isspace,
    isWhitespace: (c) => code(c) === 32 || code(c) === 9, isUpperCase: isupper, isLowerCase: islower, isPunct: ispunct,
    isPrintable: isprint, isGraph: isgraph, isControl: iscntrl, isAscii: (c) => code(c) >= 0 && code(c) < 128,
    toUpperCase: toupper, toLowerCase: tolower, toAscii: (c) => (typeof c === 'string' ? c : code(c) & 0x7f),
  }
}

export function createEngine({ parts: inParts, wires, code, compiled = null, track, realism = true, onSerial, inputs = {}, nvm: nvmInit = null, net = null, firmware = null }) {
  const disposers = [] // fecho de ligações de rede (MQTT, sockets…) quando a simulação para
  const serialRx = [] // bytes recebidos pela Serial (Monitor Série → sketch)
  // moldura dentada presa por engano na engrenagem/braço do servo → eixo fixo do servo
  const parts = fixAxleParents(JSON.parse(JSON.stringify(inParts)))
  const rand = (a) => (realism ? (Math.random() * 2 - 1) * a : 0)
  const warned = new Set()
  const warnOnce = (k, msg, level = 'warn') => {
    if (warned.has(k)) return
    warned.add(k)
    onSerial?.(`${level === 'error' ? '✖' : '⚠'} ${msg}\n`, level)
  }

  // ---------- estado ----------
  const arduino = parts.find((p) => isBoard(p.type))
  // perfil do microcontrolador (Uno/Nano: ATmega328P a 5 V; ESP32: 3,3 V, ADC 12 bits…)
  const prof = arduino ? boardProfile(arduino.type) : UNO_PROFILE
  const isEsp = prof.id === 'esp32'
  const isPico = prof.family === 'pico' // Raspberry Pi Pico / Pico W / Pico 2 / Pico 2 W (core Arduino-Pico)
  // texto com a lista de pinos PWM (para os avisos)
  const pwmList = Array.isArray(prof.pwm) ? prof.pwm.join(', ').replace(/2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13/, '2–13').replace(/44, 45, 46/, '44–46') : 'todos'
  const pinName = (n) => prof.pins[n]
  const pins = Array.from({ length: prof.pins.length }, () => ({ mode: 'INPUT', out: 0, duty: 0, pwm: false, tone: 0, dac: null }))
  const live = {} // estado dos componentes em plugin enviado ao browser
  const servoOut = new Map() // pino -> ângulo comandado pela biblioteca Servo
  const servoUs = new Map() // pino -> largura do impulso (µs) da biblioteca Servo (ESC, servos…)
  const lastFall = new Map() // pino -> µs
  const pinLog = [] // [µs, pino, nível] das mudanças por digitalWrite no último ms
  const pinRises = new Map() // flancos ascendentes por pino (libs/_spi.js: CS largado entre bytes)
  let dirty = true
  let shortCircuit = null

  const vehicles = parts
    .filter((p) => DEFS[p.type].vehicle && !p.parent)
    .map((p) => ({ part: p, pose: { x: p.pos[0], z: p.pos[2], theta: ((p.rot?.[1] ?? 0) * Math.PI) / 180 }, v: 0, collided: false }))
  const vehicleOf = new Map(vehicles.map((v) => [v.part.id, v]))
  const motors = parts
    .filter((p) => p.type === 'motor')
    .map((p) => {
      const slot = p.parent && vehicleOf.has(p.parent.id) ? p.parent.mount : null
      // motorL / motorL2 (4WD) → lado esquerdo; motorR / motorR2 → direito
      const side = slot?.startsWith('motorL') ? 'L' : slot?.startsWith('motorR') ? 'R' : null
      const yaw = (side === 'R' ? 180 : 0) + (p.rot?.[1] ?? 0)
      return {
        part: p,
        vehicle: slot ? vehicleOf.get(p.parent.id) : null,
        side,
        dir: Math.cos((yaw * Math.PI) / 180) >= 0 ? 1 : -1,
        w: 0,
        angle: 0,
        volts: 0,
        amps: 0,
        gain: 1 + rand(0.05),
      }
    })
  const servos = parts.filter((p) => DEFS[p.type].servo).map((p) => ({ part: p, angle: 90, target: null, moving: 0, speed: DEFS[p.type].servo.speed }))
  const servoOf = new Map(servos.map((s) => [s.part.id, s]))
  const irs = parts.filter((p) => p.type === 'ir').map((p) => ({ part: p, ao: 0.4, do: 0, noise: rand(0.06) }))
  const irOf = new Map(irs.map((s) => [s.part.id, s]))
  const sonars = parts.filter((p) => p.type === 'hcsr04').map((p) => ({ part: p, dist: 0 }))
  const leds = parts.filter((p) => p.type === 'led').map((p) => ({ part: p, b: 0, i: 0, over: 0, burned: false }))
  const buzzers = parts.filter((p) => p.type === 'buzzer').map((p) => ({ part: p, on: false }))
  // carros que andam sozinhos (peça "carro"): distância percorrida ao longo do seu +x
  const cars = parts.filter((p) => DEFS[p.type]?.car && !p.parent).map((p) => ({ part: p, d: 0, v: 0, blocked: false }))
  const carOf = new Map(cars.map((c) => [c.part.id, c]))
  const carRoot = (p) => {
    const c = carOf.get(p.id)
    return c && c.d ? trs(p.pos, p.rot).multiply(new THREE.Matrix4().makeTranslation(c.d, 0, 0)) : null
  }
  // pessoas (def.walker): arrastadas no browser durante a simulação; o deslocamento chega em
  // inputs[id] = { px, py, pz, yaw } (cm / rad, no referencial da peça; já sem atravessar nada:
  // as colisões e os degraus resolvem-se na física do browser) — ver sensePeople
  const walkers = parts.filter((p) => DEFS[p.type]?.walker).map((p) => ({ part: p, key: '', movedAt: -1e12 }))
  const walkLocal = (p) => {
    const i = DEFS[p.type]?.walker ? inputs[p.id] : null
    if (!i || !(i.px || i.pz || i.py || i.yaw)) return null
    // py: altura dos degraus que subiu (a física do browser resolve as colisões e os degraus)
    return trs([+i.px || 0, +i.py || 0, +i.pz || 0], [0, ((+i.yaw || 0) * 180) / Math.PI, 0])
  }
  // largura do cubo que a garra aperta (o lado horizontal mais estreito)
  const cubeW = (c) => Math.min(c.size[0], c.size[2])
  // cubo de 2,5 cm, ou com as dimensões editadas no painel (size = [x, y, z] em cm)
  const cubes = parts.filter((p) => p.type === 'cube').map((p) => ({ part: p, matrix: null, heldBy: null, rel: null, size: (partSize(p) || [1, 1, 1]).map((v) => 2.5 * v) }))
  // canetas (def.pen): traço onde a ponta toca na mesa ou numa placa/bloco/cilindro pousado.
  // ink: pontos ainda não enviados ao browser (null = levantou a caneta); inkLen em live.
  const pens = parts.filter((p) => DEFS[p.type]?.pen).map((p) => ({ part: p, tip: evalCfg(DEFS[p.type].pen, p.config).tip, last: null, down: false, fresh: [], len: 0, n: 0 }))
  // superfícies onde se escreve: placas/blocos/cilindros nivelados (soltos ou presos a peças que
  // não se mexem, ex.: papel colado numa prancha). Calculadas na 1.ª vez, na pose de construção.
  const SURF_TYPES = ['placa', 'bloco', 'cilindro', 'mechPlate']
  let surfaces = null
  const movesWithJoint = (p) => {
    for (let q = p; q?.parent; q = parts.find((x) => x.id === q.parent.id)) {
      const host = parts.find((x) => x.id === q.parent.id)
      const mt = host && DEFS[host.type]?.mounts?.[q.parent.mount]
      if (mt?.servo || mt?.slide) return true
    }
    return false
  }
  const buildSurfaces = () =>
    parts
      .filter((p) => SURF_TYPES.includes(p.type) && !movesWithJoint(p))
      .map((p) => {
        const M = matrices().get(p.id)
        const up = new THREE.Vector3(0, 1, 0).transformDirection(M)
        if (up.y < 0.99) return null // inclinada: não serve de mesa
        const d = baseDims(p)
        const sc = partSize(p) || [1, 1, 1]
        const o = new THREE.Vector3().setFromMatrixPosition(M)
        const xa = new THREE.Vector3(1, 0, 0).transformDirection(M)
        return { x: o.x, z: o.z, yaw: Math.atan2(-xa.z, xa.x), hx: (d[0] * sc[0]) / 2, hz: (d[2] * sc[2]) / 2, top: o.y + d[1] * sc[1], round: p.type === 'cilindro' }
      })
      .filter(Boolean)
  const surfaceAt = (x, z) => {
    surfaces ||= buildSurfaces()
    let y = 0
    for (const S of surfaces) {
      const dx = x - S.x
      const dz = z - S.z
      const lx = dx * Math.cos(S.yaw) - dz * Math.sin(S.yaw)
      const lz = dx * Math.sin(S.yaw) + dz * Math.cos(S.yaw)
      const inside = S.round ? Math.hypot(lx, lz) <= S.hx : Math.abs(lx) <= S.hx && Math.abs(lz) <= S.hz
      if (inside) y = Math.max(y, S.top)
    }
    return y
  }

  // ---------- colisões dos veículos (em planta) ----------
  // Retângulo de cada veículo no seu referencial: comprimento da placa e largura com as rodas.
  const rootIdOf = (() => {
    const byId = new Map(parts.map((q) => [q.id, q]))
    const memo = new Map()
    const f = (q) => {
      if (memo.has(q.id)) return memo.get(q.id)
      const par = q.parent && byId.get(q.parent.id)
      const r = par ? f(par) : q.id
      memo.set(q.id, r)
      return r
    }
    return (id) => (byId.has(id) ? f(byId.get(id)) : id)
  })()
  // O retângulo sai das caixas de colisão de TODAS as peças montadas no veículo (chassi, rodas,
  // sensores à frente…), no referencial do chassi, com 1 mm de folga. Antes era uma fórmula com a
  // bitola do chassi 2WD: ficava 1,3 cm mais largo do que o carro (parava sem tocar nos objetos)
  // e não contava o sensor ultrassónico à frente (que atravessava as coisas).
  {
    const W0 = worldMatrices(parts)
    const _v = new THREE.Vector3()
    for (const veh of vehicles) {
      const inv = W0.get(veh.part.id)?.clone().invert()
      let x0 = Infinity
      let x1 = -Infinity
      let zh = 0
      let yTop = 0
      for (const q of parts) {
        if (rootIdOf(q.id) !== veh.part.id || !inv) continue
        const mw = W0.get(q.id)
        if (!mw) continue
        for (const b of partBoxes(q)) {
          const h = b.radius ? [b.radius, b.radius, b.radius] : b.size.map((v) => v / 2)
          for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
            _v.set(b.pos[0] + sx * h[0], b.pos[1] + sy * h[1], b.pos[2] + sz * h[2]).applyMatrix4(mw).applyMatrix4(inv)
            x0 = Math.min(x0, _v.x)
            x1 = Math.max(x1, _v.x)
            zh = Math.max(zh, Math.abs(_v.z))
            yTop = Math.max(yTop, _v.y)
          }
        }
      }
      if (!Number.isFinite(x0)) {
        const d = DEFS[veh.part.type]
        x0 = -d.size[0] / 2
        x1 = d.size[0] / 2
        zh = d.size[2] / 2
      }
      // yTop: altura do ponto mais alto do veículo acima da sua base (o que estiver mais alto
      // passa por cima dele, ex.: o tampo de uma mesa)
      veh.box = { cx: (x0 + x1) / 2, hx: (x1 - x0) / 2 + 0.1, hz: zh + 0.1, top: Math.max(yTop, 3) }
    }
  }
  const vehObb = (veh, x, z, t) => {
    const c = Math.cos(t)
    const s = Math.sin(t)
    // eixo x local → (cos, −sin) no mundo; eixo z local → (sin, cos)
    return { x: x + veh.box.cx * c, z: z - veh.box.cx * s, ax: [c, -s], az: [s, c], hx: veh.box.hx, hz: veh.box.hz }
  }
  // sobreposição de dois retângulos orientados (eixos separadores); devolve a penetração (≤ 0 = livre)
  function obbPen(a, b) {
    let pen = Infinity
    for (const ax of [a.ax, a.az, b.ax, b.az]) {
      const proj = (o) => o.hx * Math.abs(o.ax[0] * ax[0] + o.ax[1] * ax[1]) + o.hz * Math.abs(o.az[0] * ax[0] + o.az[1] * ax[1])
      const dist = Math.abs((b.x - a.x) * ax[0] + (b.z - a.z) * ax[1])
      pen = Math.min(pen, proj(a) + proj(b) - dist)
      if (pen <= 0) return pen
    }
    return pen
  }
  // Obstáculos dos veículos (retângulos em planta com a altura [y0, y1]): tudo o que é sólido e
  // não é empurrado pela física do browser — paredes, casas, móveis, eletrodomésticos, placas
  // altas, montagens fixas à mesa (braços, portas nas dobradiças: na pose ATUAL das juntas), a
  // pessoa (onde foi arrastada), carros que andam e a cortina de estores/portões. Ficam de fora:
  //   - as montagens com física livre (cubos, blocos, robôs com patas): o carro (corpo
  //     cinemático no browser) empurra-as;
  //   - o que é mais baixo do que CLIMB (folhas, pistas, placas finas: as rodas passam por cima)
  //     e o que fica todo acima do veículo (tampos de mesa, telhados).
  const CLIMB = 1.5 // cm
  const vehIds = new Set(vehicles.map((v) => v.part.id))
  const partById = new Map(parts.map((q) => [q.id, q]))
  // a peça mexe-se durante a simulação? (junta de servo/deslizante, pessoa, carro que anda)
  const movingPart = (q) => {
    for (let x = q; x; x = x.parent ? partById.get(x.parent.id) : null) {
      const d = DEFS[x.type]
      if (d?.walker || d?.car) return true
      if (x.parent) {
        const host = partById.get(x.parent.id)
        const mt = host && DEFS[host.type]?.mounts?.[x.parent.mount]
        if (mt?.servo || mt?.slide) return true
      }
    }
    return false
  }
  const obstacleParts = parts.filter((q) => {
    const rootId = rootIdOf(q.id)
    if (vehIds.has(rootId)) return false
    const root = partById.get(rootId)
    return root && physicsModeOf(root, parts) !== 'dynamic'
  })
  const fixedObstacleParts = obstacleParts.filter((q) => !movingPart(q) && !DEFS[q.type]?.liveCollider)
  const movingObstacleParts = obstacleParts.filter((q) => movingPart(q) || DEFS[q.type]?.liveCollider)
  const _oe = new THREE.Vector3()
  // retângulo (em planta) de uma caixa/bola local de uma peça com a matriz mundo mw
  const pushObb = (out, b, mw) => {
    const half = b.radius ? [b.radius, b.radius, b.radius] : b.size.map((v) => v / 2)
    let y0 = Infinity
    let y1 = -Infinity
    const pts = []
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      _oe.set(b.pos[0] + sx * half[0], b.pos[1] + sy * half[1], b.pos[2] + sz * half[2]).applyMatrix4(mw)
      y0 = Math.min(y0, _oe.y)
      y1 = Math.max(y1, _oe.y)
      pts.push([_oe.x, _oe.z])
    }
    if (y1 < CLIMB) return
    // caixa com o eixo y vertical (para cima ou para baixo): retângulo orientado; senão, o envolvente
    const el = mw.elements
    const up = Math.abs(el[5]) / Math.hypot(el[4], el[5], el[6])
    if (up > 0.99) {
      const c = new THREE.Vector3(...b.pos).applyMatrix4(mw)
      const ax = new THREE.Vector3(el[0], 0, el[2])
      const az = new THREE.Vector3(el[8], 0, el[10])
      const lx = ax.length()
      const lz = az.length()
      ax.normalize()
      az.normalize()
      out.push({ x: c.x, z: c.z, ax: [ax.x, ax.z], az: [az.x, az.z], hx: half[0] * lx, hz: half[2] * lz, y0, y1 })
    } else {
      const xs = pts.map((q2) => q2[0])
      const zs = pts.map((q2) => q2[1])
      const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs)
      out.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, ax: [1, 0], az: [0, 1], hx: (x1 - x0) / 2, hz: (z1 - z0) / 2, y0, y1 })
    }
  }
  let staticObbs = null
  const staticObstacles = () => {
    if (staticObbs) return staticObbs
    staticObbs = []
    // paredes da arena e obstáculos da pista: retângulos exatos (antes usava-se um raio fixo do
    // robô à volta do centro, e o carro parava a vários centímetros das caixas e das paredes)
    const box = (x, z, w, d) => staticObbs.push({ x, z, ax: [1, 0], az: [0, 1], hx: w / 2, hz: d / 2, y0: 0, y1: 1e9 })
    box(0, ARENA.h / 2 + 0.5, ARENA.w + 2, 1)
    box(0, -ARENA.h / 2 - 0.5, ARENA.w + 2, 1)
    box(ARENA.w / 2 + 0.5, 0, 1, ARENA.h)
    box(-ARENA.w / 2 - 0.5, 0, 1, ARENA.h)
    for (const o of track.obstacles || []) box(o.x, o.z, o.w, o.d)
    const M = worldMatrices(parts)
    for (const q of fixedObstacleParts) {
      const mw = M.get(q.id)
      if (mw) for (const b of partBoxes(q)) pushObb(staticObbs, b, mw)
    }
    return staticObbs
  }
  // obstáculos que se mexem: refeitos uma vez por passo de 1 ms (pose atual das juntas, da pessoa…)
  let movingObbs = []
  let movingAt = -1
  const movingObstacles = () => {
    if (movingAt === simUs) return movingObbs
    movingAt = simUs
    movingObbs = []
    if (!movingObstacleParts.length) return movingObbs
    const M = matrices()
    for (const q of movingObstacleParts) {
      const mw = M.get(q.id)
      if (!mw) continue
      for (const b of partBoxes(q)) pushObb(movingObbs, b, mw)
      for (const b of liveBoxes(q, live[q.id])) pushObb(movingObbs, b, mw)
    }
    return movingObbs
  }
  // maior penetração do veículo nesta pose (outros veículos e obstáculos)
  function vehicleHits(veh, x, z, t) {
    const a = vehObb(veh, x, z, t)
    const base = veh.part.pos?.[1] ?? 0
    const top = base + veh.box.top
    let worst = 0
    for (const o of vehicles) if (o !== veh) worst = Math.max(worst, obbPen(a, vehObb(o, o.pose.x, o.pose.z, o.pose.theta)))
    for (const list of [staticObstacles(), movingObstacles()])
      for (const o of list) {
        if (o.y1 < base + CLIMB || o.y0 > top) continue
        worst = Math.max(worst, obbPen(a, o))
      }
    return worst
  }

  // ---------- transformações ----------
  // pose real das peças-raiz com física dinâmica (enviada pelo browser, ver setWorld)
  const bodies = new Map() // partId -> THREE.Matrix4
  const jointAngles = new Map() // partId do servo -> ângulo real da junta (graus, como servo)
  const jawStops = new Map() // garra -> ângulo (graus) abaixo do qual as maxilas batem num objeto (física)
  let wm = null
  const matrices = () => {
    if (!wm) wm = worldMatrices(parts, { pose: (p) => vehicleOf.get(p.id)?.pose, root: (p) => bodies.get(p.id) || carRoot(p), servo: (p) => jointAngles.get(p.id) ?? servoOf.get(p.id)?.angle ?? live[p.id]?.mountAngle ?? 90, slide: (p, mid) => live[p.id]?.slide?.[mid], local: walkers.length ? walkLocal : null })
    return wm
  }
  const _v = new THREE.Vector3()
  const worldPoint = (partId, local) => _v.set(...local).applyMatrix4(matrices().get(partId)).toArray()
  const worldDir = (partId, local) => _v.set(...local).transformDirection(matrices().get(partId)).toArray()
  for (const c of cubes) c.matrix = matrices().get(c.part.id).clone()
  // IMU (def.imu): antes da primeira mensagem do browser lê pousado e parado
  for (const p of parts) if (DEFS[p.type]?.imu) inputs[p.id] = { ...(inputs[p.id] || {}), imu: { ax: 0, ay: 9.81, az: 0, gx: 0, gy: 0, gz: 0 } }

  // Estado mecânico vindo da física de corpos rígidos do browser (~60 Hz):
  //   bodies: { [rootPartId]: number[16] }  matriz mundo (cm, coluna-maior como THREE.Matrix4)
  //   imu:    { [partId]: { ax, ay, az, gx, gy, gz } }  → env.input(partId).imu
  //   joints: { [servoPartId]: graus }  ângulo real das juntas dos robôs dinâmicos (90 = montagem):
  //           as peças presas a esses servos usam a pose real (e não o ângulo comandado)
  //   jaws:   { [garraId]: graus }  as maxilas da garra encostaram a algo e não fecham mais do que
  //           isto (a física do browser não as deixa entrar no objeto): o servo encrava aí
  //   drop:   [cuboId]  cubos que aqui se deram como agarrados mas que, na física, não estão entre as
  //           maxilas (empurrados para fora, maxilas travadas mais abertas): ficam soltos
  function setWorld({ bodies: bs, imu, joints, jaws, drop } = {}) {
    for (const id of Array.isArray(drop) ? drop : []) {
      const c = cubes.find((x) => x.part.id === id)
      if (!c?.heldBy) continue
      c.heldBy = null
      c.rel = null
      c.gw = null
      c.noGrabUntil = simUs + 300000 // (a pose que chega do browser é a real; não volta a agarrar já)
    }
    for (const [id, a] of Object.entries(joints || {})) if (Number.isFinite(+a) && parts.some((q) => q.id === id)) jointAngles.set(id, +a)
    if (jaws !== undefined) {
      jawStops.clear()
      for (const [id, a] of Object.entries(jaws || {})) if (Number.isFinite(+a) && DEFS[parts.find((q) => q.id === id)?.type]?.grab) jawStops.set(id, +a)
    }
    for (const [id, arr] of Object.entries(bs || {})) {
      if (!Array.isArray(arr) || arr.length !== 16 || !arr.every(Number.isFinite)) continue
      const p = parts.find((q) => q.id === id)
      if (!p || p.parent || physicsModeOf(p, parts) !== 'dynamic') continue
      const c = cubes.find((x) => x.part.id === id)
      if (c?.heldBy) continue // na garra quem manda é o backend
      const m = bodies.get(id) || new THREE.Matrix4()
      m.fromArray(arr)
      bodies.set(id, m)
      if (c) c.matrix = m.clone()
    }
    wm = null
    for (const [id, v] of Object.entries(imu || {})) {
      if (!v || !DEFS[parts.find((q) => q.id === id)?.type]?.imu) continue
      const n = (x) => (Number.isFinite(+x) ? +x : 0)
      inputs[id] = { ...(inputs[id] || {}), imu: { ax: n(v.ax), ay: n(v.ay), az: n(v.az), gx: n(v.gx), gy: n(v.gy), gz: n(v.gz) } }
    }
  }

  // ---------- circuito ----------
  const circuit = createCircuit(parts, wires, {
    arduinoPins: () => pins,
    ir: (p) => irOf.get(p.id) || { do: 0, ao: 0 },
    motorEmf: (p) => {
      const m = motors.find((x) => x.part.id === p.id)
      if (m) m.solvedEmf = MOTOR.ke * m.w
      return m ? MOTOR.ke * m.w : 0
    },
    servoMoving: (p) => servoOf.get(p.id)?.moving ?? 0,
    button: (p) => !!inputs[p.id]?.pressed,
    pot: (p) => inputs[p.id]?.value ?? p.config?.value ?? 0.5,
    batteryOn: () => true,
    input: (p) => inputs[p.id] || {},
  })
  const { nets } = circuit
  const solve = () => {
    if (!dirty) return
    dirty = false
    circuit.solve()
    for (const s of circuit.sources) {
      const i = circuit.sourceCurrent(s)
      if (s.kind === 'pin' && Math.abs(i) > 0.04) warnOnce(`pin${s.pin}`, i18n.m(`Pino ${s.pin} a fornecer ${(Math.abs(i) * 1000).toFixed(0)} mA (máx. 40 mA). Falta uma resistência? No real o pino pode queimar.`, `Pin ${s.pin} sourcing ${(Math.abs(i) * 1000).toFixed(0)} mA (max 40 mA). Missing a resistor? In real life the pin could burn out.`))
      if (s.kind === 'bat' && i > 6) shortCircuit = i18n.m(`Curto-circuito na bateria (${i.toFixed(0)} A)! Simulação parada por segurança.`, `Short circuit on the battery (${i.toFixed(0)} A)! Simulation stopped for safety.`)
      if (s.kind === 'usb' && i > 0.5) warnOnce('usb', i18n.m(`O consumo pela USB passa de 500 mA (${(i * 1000).toFixed(0)} mA): o fusível do Arduino pode atuar. Alimente servos/motores por fonte externa.`, `USB current draw exceeds 500 mA (${(i * 1000).toFixed(0)} mA): the Arduino's fuse may trip. Power servos/motors from an external supply.`))
    }
  }
  const arduinoPinsOnNet = (partId, pin) => {
    if (!arduino) return []
    const net = nets.netOf(partId, pin)
    return prof.pins.map((pid, n) => (pid && nets.netOf(arduino.id, pid) === net ? n : -1)).filter((n) => n >= 0)
  }
  const servoPin = new Map(servos.map((s) => [s.part.id, arduinoPinsOnNet(s.part.id, 'SIG')]))
  const sonarPins = new Map(sonars.map((s) => [s.part.id, { trig: arduinoPinsOnNet(s.part.id, 'Trig'), echo: arduinoPinsOnNet(s.part.id, 'Echo') }]))
  const arduinoRunning = () => {
    const s = arduino ? circuit.st[arduino.id] : null
    return !!s && s.powered && !s.damaged
  }

  // ---------- sensores ----------
  function readIR(s) {
    const [x, y, z] = worldPoint(s.part.id, [1.0, 0.8, 0])
    let refl = y > 3.2 ? 0.02 : track.reflectance(x, z) * Math.max(0, 1 - Math.max(0, y - 1.2) / 2.5)
    for (const c of cubes) {
      const cp = new THREE.Vector3().setFromMatrixPosition(c.matrix)
      if (Math.abs(cp.x - x) < c.size[0] / 2 && Math.abs(cp.z - z) < c.size[2] / 2 && y > cp.y) refl = 0.6
    }
    const ao = Math.max(0, Math.min(5, 5 * (1 - refl) * 0.92 + 0.18 + s.noise * 0.3 + rand(0.04)))
    const d = ao > (s.part.config?.threshold ?? 0.5) * 5 ? 1 : 0
    if (d !== s.do || Math.abs(ao - s.ao) > 0.05) dirty = true
    s.ao = ao
    s.do = d
  }

  function raycast(ox, oz, dx, dz, max = 400) {
    let best = max
    const hw = ARENA.w / 2
    const hh = ARENA.h / 2
    if (dx > 1e-6) best = Math.min(best, (hw - ox) / dx)
    if (dx < -1e-6) best = Math.min(best, (-hw - ox) / dx)
    if (dz > 1e-6) best = Math.min(best, (hh - oz) / dz)
    if (dz < -1e-6) best = Math.min(best, (-hh - oz) / dz)
    // (os cubos entram no raycast3d como caixas 3D)
    for (const o of track.obstacles) {
      let t0 = 0
      let t1 = best
      let hit = true
      for (const [orig, dir, mn, mx] of [[ox, dx, o.x - o.w / 2, o.x + o.w / 2], [oz, dz, o.z - o.d / 2, o.z + o.d / 2]]) {
        if (Math.abs(dir) < 1e-9) {
          if (orig < mn || orig > mx) hit = false
        } else {
          let a = (mn - orig) / dir
          let b = (mx - orig) / dir
          if (a > b) [a, b] = [b, a]
          t0 = Math.max(t0, a)
          t1 = Math.min(t1, b)
        }
      }
      if (hit && t0 <= t1 && t0 > 0) best = Math.min(best, t0)
    }
    return best
  }
  // ---------- carros que andam ----------
  // Segue em frente (+x do carro); raios à frente do para-choques (3 alturas × 3 posições na
  // largura) veem o primeiro obstáculo; para à folga escolhida e arranca quando fica livre.
  let carTick = 0
  function stepCar(c, dt) {
    const cfg = c.part.config || {}
    const moving = (cfg.andar !== false) !== !!inputs[c.part.id]?.on
    const v = moving ? Math.max(0, Number(cfg.velocidade) || 8) : 0
    c.v = 0
    c.blocked = false
    const L = (live[c.part.id] ||= {})
    L.d = Math.round(c.d * 100) / 100
    L.v = 0
    L.blocked = false
    if (!v) return
    const sz = partSize(c.part) || [1, 1, 1]
    const M = matrices().get(c.part.id)
    const fwd = new THREE.Vector3(1, 0, 0).transformDirection(M)
    const skip = (c.skip ||= new Set([c.part.id, ...parts.filter((q) => q.parent?.id === c.part.id).map((q) => q.id)]))
    let free = 60
    for (const y of [0.25, 0.5, 0.85])
      for (const z of [-0.42, 0, 0.42]) {
        const o = new THREE.Vector3(9.6 * sz[0], (y * 5.0 + 0.4) * sz[1], z * 7.6 * sz[2]).applyMatrix4(M)
        free = Math.min(free, raycast3d(o, fwd, skip, 60))
      }
    const gap = Number(cfg.folga) || 1.5
    const step = Math.min(v * dt, Math.max(0, free - gap))
    c.blocked = free - gap < v * dt
    if (step > 1e-6) {
      c.d += step
      c.v = step / dt
      if (c.d >= (Number(cfg.percurso) || 60)) c.d = 0 // volta ao ponto de partida
      wm = null
    }
    L.d = Math.round(c.d * 100) / 100
    L.v = Math.round(c.v * 10) / 10
    L.blocked = c.blocked
  }

  // ---------- obstáculos 3D (todas as peças) ----------
  // Caixas de colisão de cada peça (shared partBoxes) na pose atual (juntas, veículos), para
  // os sensores de distância verem blocos, cilindros, paredes feitas de placas, outros robôs…
  // Refeitas quando as matrizes mudam (wm volta a null quando algo se mexe).
  let solids = null
  let solidsWm = null
  const _ro = new THREE.Vector3()
  const _rd = new THREE.Vector3()
  const _ci = new THREE.Matrix4()
  // peças com partes que se mexem pelo estado (cortina de estores/portões): também se veem
  const liveColParts = parts.filter((p) => DEFS[p.type]?.liveCollider)
  let solidsLive = ''
  const solidList = () => {
    const W = matrices()
    const lk = liveColParts.length ? liveColParts.map((p) => live[p.id]?.pos).join() : ''
    if (solids && solidsWm === W && solidsLive === lk) return solids
    solidsWm = W
    solidsLive = lk
    solids = []
    for (const p of parts) {
      if (p.type === 'cube') continue // cubos da garra: posição própria (cubes)
      const M = W.get(p.id)
      if (!M) continue
      const boxes = DEFS[p.type]?.liveCollider ? [...partBoxes(p), ...liveBoxes(p, live[p.id])] : partBoxes(p)
      if (!boxes.length) continue
      solids.push({ id: p.id, inv: M.clone().invert(), boxes })
    }
    return solids
  }
  // distância (cm) ao primeiro obstáculo segundo o raio o + t·d (mundo), ignorando `skip`
  function raycast3d(o, d, skip, max = 400) {
    let best = max
    // paredes da arena e obstáculos da pista (altura infinita): o raycast 2D devolve
    // o mesmo parâmetro t do raio 3D (ponto = o + t·d, só com as componentes x e z)
    best = Math.min(best, raycast(o.x, o.z, d.x, d.z, max))
    // cubos (posição própria: podem estar na garra)
    for (const c of cubes) {
      if (!c.matrix || skip.has(c.part.id)) continue
      _ro.copy(o).applyMatrix4(_ci.copy(c.matrix).invert())
      _rd.copy(d).transformDirection(_ci)
      const t = rayBox(_ro, _rd, [0, c.size[1] / 2, 0], c.size)
      if (t != null && t < best) best = t
    }
    for (const sd of solidList()) {
      if (skip.has(sd.id)) continue
      _ro.copy(o).applyMatrix4(sd.inv)
      _rd.copy(d).transformDirection(sd.inv) // matrizes sem escala: distâncias iguais
      for (const b of sd.boxes) {
        const t = b.radius ? raySphere(_ro, _rd, b.pos, b.radius) : rayBox(_ro, _rd, b.pos, b.size)
        if (t != null && t < best) best = t
      }
    }
    return best
  }
  function rayBox(o, d, c, size) {
    let t0 = 0
    let t1 = Infinity
    for (let i = 0; i < 3; i++) {
      const oi = o.getComponent(i)
      const di = d.getComponent(i)
      const mn = c[i] - size[i] / 2
      const mx = c[i] + size[i] / 2
      if (Math.abs(di) < 1e-9) {
        if (oi < mn || oi > mx) return null
        continue
      }
      let a = (mn - oi) / di
      let b = (mx - oi) / di
      if (a > b) [a, b] = [b, a]
      t0 = Math.max(t0, a)
      t1 = Math.min(t1, b)
      if (t0 > t1) return null
    }
    // origem dentro da caixa (a peça onde o sensor está encaixado): não conta
    return t0 > 1e-4 ? t0 : null
  }
  function raySphere(o, d, c, r) {
    const ox = o.x - c[0]
    const oy = o.y - c[1]
    const oz = o.z - c[2]
    const b = ox * d.x + oy * d.y + oz * d.z
    const q = ox * ox + oy * oy + oz * oz - r * r
    if (q < 0) return null
    const h = b * b - q
    if (h < 0) return null
    const t = -b - Math.sqrt(h)
    return t > 1e-4 ? t : null
  }
  // o sensor e as peças onde está montado (não se vê a si próprio)
  const selfOf = (id) => {
    const out = new Set([id])
    for (let q = parts.find((x) => x.id === id); q?.parent; q = parts.find((x) => x.id === q.parent.id)) out.add(q.parent.id)
    return out
  }
  const _so = new THREE.Vector3()
  const _sd = new THREE.Vector3()
  const _up = new THREE.Vector3()
  function sonarDistance(s) {
    // cone de ~30° (HC-SR04): 5 raios na horizontal × 3 na vertical, a partir dos transdutores
    const M = matrices().get(s.part.id)
    _so.set(0.8, sonarEyeY(s.part.config), 0).applyMatrix4(M) // centro dos transdutores (shared/sonar.js)
    const fwd = new THREE.Vector3(1, 0, 0).transformDirection(M)
    const up = _up.set(0, 1, 0).transformDirection(M)
    const side = new THREE.Vector3().crossVectors(fwd, up).normalize()
    const skip = (s.skip ||= selfOf(s.part.id))
    let d = 400
    for (const a of [-0.26, -0.13, 0, 0.13, 0.26])
      for (const e of [-0.09, 0, 0.09]) {
        _sd.copy(fwd).addScaledVector(side, Math.tan(a)).addScaledVector(up, Math.tan(e)).normalize()
        d = Math.min(d, raycast3d(_so, _sd, skip))
      }
    s.dist = d + rand(0.3)
    return s.dist
  }

  // ---------- pessoas e sensores PIR ----------
  // A cada 10 ms: se a pessoa mudou de sítio (arrastada no browser) as matrizes refazem-se e ela
  // conta como "a mexer-se" durante 0,4 s. Um PIR vê-a se estiver a mexer-se, a menos de
  // PIR_RANGE do sensor, dentro do cone de ±55° em torno do +y da cúpula e sem nada pelo meio
  // (raio até ao peito ou à cabeça). O PIR (parts/pir.js) lê s.pessoa como movimento.
  const PIR_RANGE = 60 // cm ≈ 7 m à escala 1:12 (alcance do HC-SR501)
  const PIR_COS = Math.cos((55 * Math.PI) / 180)
  const pirParts = walkers.length ? parts.filter((p) => p.type === 'pir') : []
  const _pp = new THREE.Vector3()
  const _pa = new THREE.Vector3()
  const _pt = new THREE.Vector3()
  const _pd = new THREE.Vector3()
  function sensePeople() {
    for (const wk of walkers) {
      const i = inputs[wk.part.id] || {}
      const key = `${+i.px || 0},${+i.py || 0},${+i.pz || 0},${+i.yaw || 0}`
      if (key !== wk.key) {
        if (wk.key) wk.movedAt = simUs
        wk.key = key
        wm = null
      }
      const L = (live[wk.part.id] ||= {})
      L.moving = simUs - wk.movedAt < 400000
    }
    if (!pirParts.length) return
    const W = matrices()
    for (const pir of pirParts) {
      const st = circuit.st[pir.id]
      if (!st) continue
      const M = W.get(pir.id)
      _pp.set(0.15, 1.65, 0).applyMatrix4(M)
      _pa.set(0, 1, 0).transformDirection(M)
      let seen = false
      for (const wk of walkers) {
        if (simUs - wk.movedAt >= 400000) continue
        const MW = W.get(wk.part.id)
        const k = (+wk.part.config?.altura || 14.5) / 14.5
        for (const y of [10 * k, 13.3 * k, 5 * k]) {
          _pt.set(0, y, 0).applyMatrix4(MW)
          _pd.subVectors(_pt, _pp)
          const dist = _pd.length()
          if (dist > PIR_RANGE || dist < 1e-3) continue
          _pd.multiplyScalar(1 / dist)
          if (_pd.dot(_pa) < PIR_COS) continue
          // linha de vista: nada (paredes, móveis…) entre a cúpula e a pessoa
          if (raycast3d(_pp, _pd, new Set([pir.id, wk.part.id]), dist) < dist - 0.6) continue
          seen = true
          break
        }
        if (seen) break
      }
      if (seen !== !!st.pessoa) {
        st.pessoa = seen
        dirty = true
      }
    }
  }

  // ---------- runtime Arduino ----------
  // relógio do programa (µs). Protegido contra NaN/Infinity: um valor inválido
  // somado por uma biblioteca (ex.: fillRect(…, NaN, …)) congelaria o programa.
  let rtT = 0
  const rt = {
    target: 0,
    get t() {
      return rtT
    },
    set t(v) {
      rtT = Number.isFinite(v) ? v : rtT + 1
    },
  }
  let serialBegun = false
  let baud = 9600
  let txFree = 0
  let simUs = 0
  const serialOut = (txt) => {
    if (!serialBegun) return warnOnce('serial', i18n.m('Serial.print() sem Serial.begin(): no Arduino real nada seria enviado.', 'Serial.print() without Serial.begin(): on a real Arduino nothing would be sent.'))
    const charUs = 1e7 / baud
    txFree = Math.max(txFree, rt.t) + txt.length * charUs
    if (txFree - rt.t > 64 * charUs) rt.t = txFree - 64 * charUs
    onSerial?.(txt)
  }
  const fmt = (v, base) => {
    // objetos com formato próprio (ex.: struct tm em Serial.println(&timeinfo, "%H:%M"))
    if (v && typeof v.__fmt === 'function') return v.__fmt(base)
    if (typeof v === 'number') {
      if (base === 16) return Math.trunc(v).toString(16).toUpperCase()
      // print(x, 2): BIN para inteiros; com um float (valor não inteiro) são 2 casas decimais
      if (base === 2 && Number.isInteger(v)) return Math.trunc(v).toString(2)
      // print(x, n) com n casas decimais (n ≠ 2, que é BIN)
      if (typeof base === 'number' && base >= 0 && base < 10 && base !== 2) return Number.isNaN(v) ? 'nan' : v.toFixed(base)
      if (Number.isNaN(v)) return 'nan'
      if (!Number.isInteger(v)) return v.toFixed(typeof base === 'number' && base < 10 ? base : 2)
      return String(v)
    }
    if (typeof v === 'boolean') return v ? '1' : '0'
    return String(v)
  }
  const checkPin = (n, fn) => {
    if (typeof n !== 'number' || Number.isNaN(n) || !prof.pins[n]) throw new Error(i18n.m(`${fn}(): o pino ${n} não existe no ${prof.mcu}${isEsp ? ' (use o número GPIO, ex.: 2, 4, 13…)' : isPico ? ` (use o número GPn: 0–22 ou 26–28; LED_BUILTIN = ${prof.consts.LED_BUILTIN})` : ''}`, `${fn}(): pin ${n} does not exist on the ${prof.mcu}${isEsp ? ' (use the GPIO number, e.g. 2, 4, 13…)' : isPico ? ` (use the GPn number: 0–22 or 26–28; LED_BUILTIN = ${prof.consts.LED_BUILTIN})` : ''}`))
  }
  // massa da placa (o ATtiny85 só tem "GND") e tensão lógica atual: num chip sem regulador
  // (prof.power.direct) é a própria VCC — as entradas e o ADC (referência = VCC) seguem-na
  const BOARD_GND = prof.power?.gnd || 'GND.1'
  const vioNow = () => (prof.power?.direct && arduino ? Math.max(0.1, circuit.vdiff(arduino.id, prof.power.direct, BOARD_GND)) : prof.vio)
  const pinV = (n) => {
    solve()
    return circuit.vdiff(arduino.id, pinName(n), BOARD_GND)
  }
  const touch = () => {
    dirty = true
  }

  class Servo {
    constructor() {
      this.pin = -1
      this.angle = 90
      this.min = 544
      this.max = 2400
    }
    attach(pin, min = 544, max = 2400) {
      checkPin(pin, 'servo.attach')
      this.pin = pin
      this.min = min
      this.max = max
      pins[pin].mode = 'OUTPUT'
      servoOut.set(pin, this.angle)
      // sem write(), a biblioteca envia impulsos de 1500 µs (DEFAULT_PULSE_WIDTH)
      servoUs.set(pin, this.us ?? 1500)
      rt.t += 10
      return 1
    }
    write(a) {
      let ang = Number(a) || 0
      let us = null
      if (ang >= 544) {
        // valor ≥ 544 é uma largura de impulso em µs (como na Servo.h)
        us = Math.max(this.min, Math.min(this.max, ang))
        ang = ((us - this.min) / (this.max - this.min)) * 180
      }
      // writeMicroseconds()/write(µs) mantêm a resolução fina (≈0,1°): um braço que desenha
      // com µs faz curvas suaves; write(graus) arredonda ao grau, como a Servo.h
      this.angle = Math.max(0, Math.min(180, us != null ? Math.round(ang * 100) / 100 : Math.round(ang)))
      this.us = Math.round(us ?? this.min + (this.angle / 180) * (this.max - this.min))
      if (this.pin >= 0) {
        servoOut.set(this.pin, this.angle)
        servoUs.set(this.pin, this.us)
      }
      rt.t += 5
    }
    writeMicroseconds(us) {
      this.write(Math.max(this.min, Math.min(this.max, us)))
    }
    read() {
      return Math.round(this.angle)
    }
    readMicroseconds() {
      return this.us ?? 1500
    }
    attached() {
      return this.pin >= 0
    }
    // ESP32Servo: frequência dos impulsos (50 Hz nos servos; a simulação usa o ângulo)
    setPeriodHertz() {}
    detach() {
      if (this.pin >= 0) {
        servoOut.delete(this.pin)
        servoUs.delete(this.pin)
      }
      this.pin = -1
    }
  }

  const api = {
    __rt: rt,
    __delay: function* (ms) {
      rt.t += Math.max(0, ms) * 1000
      if (rt.t >= rt.target) yield
    },
    __delayUs: function* (us) {
      rt.t += Math.max(0, us)
      if (rt.t >= rt.target) yield
    },
    Servo,
    HIGH: 1, LOW: 0, INPUT: 'INPUT', OUTPUT: 'OUTPUT', INPUT_PULLUP: 'INPUT_PULLUP', INPUT_PULLDOWN: 'INPUT_PULLDOWN',
    ...prof.consts, DEC: 10, HEX: 16, BIN: 2, PI: Math.PI, HALF_PI: Math.PI / 2, TWO_PI: 2 * Math.PI, EULER: Math.E, DEG_TO_RAD: Math.PI / 180, RAD_TO_DEG: 180 / Math.PI,
    INFINITY: Infinity, NAN: NaN, M_PI: Math.PI,
    pinMode(n, mode) {
      checkPin(n, 'pinMode')
      if (prof.inputOnly?.includes(n) && mode !== 'INPUT') {
        if (isEsp) warnOnce(`io${n}`, i18n.m(`GPIO${n} do ESP32 é só de entrada (sem saída nem pull-up/pull-down internos). Use outro pino.`, `ESP32 GPIO${n} is input-only (no output and no internal pull-up/pull-down). Use another pin.`))
        else warnOnce(`io${n}`, i18n.m(`${pinName(n)} do ${prof.mcu} é só uma entrada analógica (analogRead): não tem saída nem pull-up. Use outro pino.`, `${pinName(n)} on the ${prof.mcu} is an analog input only (analogRead): no output and no pull-up. Use another pin.`))
        mode = 'INPUT'
      }
      if (mode === 'INPUT_PULLDOWN' && !prof.pulldown) throw new Error(i18n.m(`INPUT_PULLDOWN não existe no ${prof.mcu} (só INPUT_PULLUP)`, `INPUT_PULLDOWN does not exist on the ${prof.mcu} (only INPUT_PULLUP)`))
      pins[n].dac = null
      if (pins[n].mode !== mode) touch()
      pins[n].mode = mode
      rt.t += 2
    },
    digitalWrite(n, val) {
      checkPin(n, 'digitalWrite')
      const p = pins[n]
      const v = val ? 1 : 0
      if (p.mode !== 'OUTPUT') {
        warnOnce(`dw${n}`, i18n.m(`digitalWrite(${n}) sem pinMode(${n}, OUTPUT): só ativa o pull-up interno (fraco).`, `digitalWrite(${n}) without pinMode(${n}, OUTPUT): it only enables the (weak) internal pull-up.`))
        const nm = v ? 'INPUT_PULLUP' : 'INPUT'
        if (p.mode !== nm) touch()
        p.mode = nm
      }
      if (p.out === 1 && v === 0) lastFall.set(n, rt.t)
      if (p.out === 0 && v === 1) pinRises.set(n, (pinRises.get(n) || 0) + 1) // fim de uma seleção SPI (CS)
      if (p.out !== v || p.pwm) touch()
      // registo das escritas deste ms (74HC595, A4988… veem impulsos mais curtos que 1 ms)
      if (p.out !== v && pinLog.length < 100000) pinLog.push([rt.t, n, v])
      const was = p.out
      p.out = v
      p.pwm = false
      rt.t += 4
      if (was !== v) irq.onWrite(n, v) // attachInterrupt() num pino ligado a este
    },
    digitalRead(n) {
      checkPin(n, 'digitalRead')
      rt.t += 4
      const p = pins[n]
      if (p.mode === 'OUTPUT') return p.out
      if (edgeOv?.has(n)) return edgeOv.get(n)
      solve()
      if (circuit.floating(arduino.id, pinName(n))) {
        warnOnce(`float${n}`, i18n.m(`Pino ${pinName(n)} a "flutuar" (nada define o nível): leituras aleatórias, tal como no real. Use INPUT_PULLUP ou uma resistência pull-down.`, `Pin ${pinName(n)} is "floating" (nothing sets its level): random readings, just like in real life. Use INPUT_PULLUP or a pull-down resistor.`))
        return Math.random() < 0.5 ? 1 : 0
      }
      return pinV(n) > vioNow() / 2 ? 1 : 0
    },
    analogWrite(n, val) {
      checkPin(n, 'analogWrite')
      const p = pins[n]
      const v255 = Math.max(0, Math.min(pwmMax, Math.round(Number(val) || 0)))
      const v = pwmMax === 255 ? v255 : (v255 / pwmMax) * 255 // analogWriteResolution/Range (RP2040)
      const before = `${p.mode}${p.out}${p.duty}${p.pwm}`
      p.mode = 'OUTPUT'
      p.dac = null
      if (prof.pwm === 'all' ? prof.inputOnly?.includes(n) : !prof.pwm.includes(n)) {
        warnOnce(`pwm${n}`, isEsp ? i18n.m(`analogWrite(${n}): GPIO${n} é só de entrada.`, `analogWrite(${n}): GPIO${n} is input-only.`) : i18n.m(`analogWrite(${n}): o pino ${n} não tem PWM no ${prof.mcu} (só ${pwmList}). Fica LOW se <128, HIGH se ≥128.`, `analogWrite(${n}): pin ${n} has no PWM on the ${prof.mcu} (only ${pwmList}). It stays LOW if <128, HIGH if ≥128.`))
        p.out = v >= 128 ? 1 : 0
        p.pwm = false
      } else {
        p.out = v > 0 ? 1 : 0
        p.duty = v / 255
        p.pwm = v > 0 && v < 255
      }
      if (before !== `${p.mode}${p.out}${p.duty}${p.pwm}`) touch()
      rt.t += 6
    },
    analogRead(n) {
      n = prof.analogAlias(n)
      checkPin(n, 'analogRead')
      if (!prof.analog.includes(n)) {
        warnOnce(`adc${n}`, i18n.m(`analogRead(${n}): ${isEsp ? `GPIO${n}` : isPico ? `GP${n}` : `o pino ${n}`} não tem ADC.${isEsp ? ' Use GPIO32–39 (ADC1).' : isPico ? ' Use A0–A2 (GP26–GP28).' : prof.id === 'mega' ? ' Use A0–A15.' : ' Use A0–A5.'}`, `analogRead(${n}): ${isEsp ? `GPIO${n}` : isPico ? `GP${n}` : `pin ${n}`} has no ADC.${isEsp ? ' Use GPIO32–39 (ADC1).' : isPico ? ' Use A0–A2 (GP26–GP28).' : prof.id === 'mega' ? ' Use A0–A15.' : ' Use A0–A5.'}`))
        return 0
      }
      if (isEsp && prof.adc2.includes(n) && wifiOn) warnOnce(`adc2${n}`, i18n.m(`analogRead(${n}): GPIO${n} usa o ADC2, que não funciona com o Wi‑Fi ligado. Use GPIO32–39.`, `analogRead(${n}): GPIO${n} uses ADC2, which does not work while Wi‑Fi is on. Use GPIO32–39.`))
      rt.t += isEsp ? 10 : isPico ? 2 : 112
      solve()
      const max = isEsp || isPico ? (1 << adcBits) - 1 : prof.adcMax
      if (circuit.floating(arduino.id, pinName(n)) && pins[n].mode !== 'INPUT_PULLUP') return Math.round(max * (0.25 + Math.random() * 0.5))
      let ratio = pinV(n) / (prof.power?.direct ? vioNow() : prof.adcRef)
      // ADC do ESP32 (atenuação 11 dB): zona morta abaixo de ~0,1 V e saturação acima de ~3,1 V
      if (isEsp) ratio = Math.max(0, Math.min(1, (pinV(n) - 0.1) / 3.05))
      return Math.max(0, Math.min(max, Math.round(ratio * max + rand(isEsp ? 6 : isPico ? max / 1023 : 1.5))))
    },
    millis: () => Math.floor(rt.t / 1000),
    micros: () => Math.floor(rt.t / 4) * 4,
    pulseIn(n, state, timeout = 1000000) {
      checkPin(n, 'pulseIn')
      for (const s of sonars) {
        const sp = sonarPins.get(s.part.id)
        if (!sp.echo.includes(n) || !circuit.st[s.part.id].powered) continue
        const fell = sp.trig.map((t) => lastFall.get(t)).find((f) => f != null && rt.t - f < 2000)
        if (fell == null) break
        sp.trig.forEach((t) => lastFall.delete(t))
        const d = sonarDistance(s)
        if (d >= 399) {
          rt.t += Math.min(timeout, 38000)
          return timeout < 38000 ? 0 : 38000
        }
        const dur = Math.round((d * 2) / 0.0343)
        rt.t += 460 + Math.min(dur, timeout)
        if (dur > timeout) return 0
        return state ? dur : 0
      }
      // peças em plugin que geram impulsos (gancho pulseIn: JSN-SR04T, TCS3200…) → { us, wait } | null
      for (const pl of plugs) {
        if (!pl.B.pulseIn) continue
        const r = pl.B.pulseIn(plugCtx(pl), n, state, timeout, { now: rt.t, fell: (t) => lastFall.get(t) ?? null, clearFall: (t) => lastFall.delete(t) })
        if (r != null) {
          rt.t += r.wait ?? r.us
          return r.us
        }
      }
      rt.t += timeout
      warnOnce(`pulse${n}`, i18n.m(`pulseIn(${n}) esgotou o tempo (${timeout} µs) sem pulso. Verifique Trig/Echo e o pulso de 10 µs.`, `pulseIn(${n}) timed out (${timeout} µs) without a pulse. Check Trig/Echo and the 10 µs pulse.`))
      return 0
    },
    // onda quadrada a 50 %: em média 2,5 V; a frequência fica em pins[n].tone
    tone(n, freq = 1000, duration = 0) {
      checkPin(n, 'tone')
      Object.assign(pins[n], { mode: 'OUTPUT', out: 1, pwm: true, duty: 0.5, tone: Math.max(31, Number(freq) || 0) })
      toneUntil.set(n, duration > 0 ? rt.t + duration * 1000 : Infinity)
      touch()
      rt.t += 10
    },
    noTone(n) {
      Object.assign(pins[n], { out: 0, pwm: false, duty: 0, tone: 0 })
      toneUntil.delete(n)
      touch()
    },
    F: (x) => x,
    // PROGMEM: as tabelas ficam na memória normal (pgm_read_*(&t[i]) recebe já o valor)
    pgm_read_byte: (x) => x, pgm_read_word: (x) => x, pgm_read_dword: (x) => x, pgm_read_float: (x) => x, pgm_read_ptr: (x) => x,
    pgm_read_byte_near: (x) => x, pgm_read_word_near: (x) => x, pgm_read_dword_near: (x) => x,
    // <setjmp.h>: só se declara (jmp_buf = int); setjmp devolve 0, longjmp não é suportado
    setjmp: () => 0, longjmp: () => { throw new Error('longjmp não é suportado no simulador') },
    // shiftOut/shiftIn por software (bit a bit com digitalWrite, ~0,1 ms por byte como no Uno)
    shiftOut(dataPin, clockPin, order, val) {
      for (let i = 0; i < 8; i++) {
        const bit = order === 0 ? (val >> i) & 1 : (val >> (7 - i)) & 1
        api.digitalWrite(dataPin, bit)
        api.digitalWrite(clockPin, 1)
        api.digitalWrite(clockPin, 0)
      }
    },
    shiftIn(dataPin, clockPin, order) {
      let v = 0
      for (let i = 0; i < 8; i++) {
        api.digitalWrite(clockPin, 1)
        const b = api.digitalRead(dataPin)
        v |= order === 0 ? b << i : b << (7 - i)
        api.digitalWrite(clockPin, 0)
      }
      return v
    },
    Wire: { begin() {}, setClock() {}, beginTransmission() {}, endTransmission: () => 0, write() {}, requestFrom: () => 0, available: () => 0, read: () => 0 },
    map: (x, a, b, c, d) => Math.trunc(((x - a) * (d - c)) / (b - a) + c),
    constrain: (x, a, b) => Math.min(b, Math.max(a, x)),
    abs: Math.abs, fabs: Math.abs, min: Math.min, max: Math.max, sqrt: Math.sqrt, pow: Math.pow,
    sin: Math.sin, cos: Math.cos, tan: Math.tan, atan2: Math.atan2, round: Math.round, floor: Math.floor, ceil: Math.ceil,
    sq: (x) => x * x, isnan: Number.isNaN, isinf: (x) => !Number.isFinite(x) && !Number.isNaN(x),
    log: Math.log, log10: Math.log10, exp: Math.exp, asin: Math.asin, acos: Math.acos, atan: Math.atan, fmin: Math.min, fmax: Math.max, trunc: Math.trunc,
    // variantes de <math.h> em float/long (fabsf, sqrtf, atan2f…) e restantes funções C
    fabsf: Math.abs, sqrtf: Math.sqrt, powf: Math.pow, sinf: Math.sin, cosf: Math.cos, tanf: Math.tan, atan2f: Math.atan2, atanf: Math.atan, asinf: Math.asin, acosf: Math.acos,
    expf: Math.exp, logf: Math.log, log10f: Math.log10, floorf: Math.floor, ceilf: Math.ceil, roundf: Math.round, truncf: Math.trunc, fminf: Math.min, fmaxf: Math.max,
    fmod: (a, b) => a % b, fmodf: (a, b) => a % b, hypot: Math.hypot, hypotf: Math.hypot, cbrt: Math.cbrt, cbrtf: Math.cbrt, log2: Math.log2, log2f: Math.log2,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, sinhf: Math.sinh, coshf: Math.cosh, tanhf: Math.tanh,
    labs: Math.abs, llabs: Math.abs, lround: Math.round, lroundf: Math.round, lrint: Math.round, copysign: (a, b) => (b < 0 ? -Math.abs(a) : Math.abs(a)), copysignf: (a, b) => (b < 0 ? -Math.abs(a) : Math.abs(a)),
    signbit: (x) => x < 0 || Object.is(x, -0), isfinite: Number.isFinite, isinff: (x) => !Number.isFinite(x) && !Number.isNaN(x), isnanf: Number.isNaN,
    radians: (d) => (d * Math.PI) / 180, degrees: (r) => (r * 180) / Math.PI,
    // <ctype.h> e WCharacter.h: os caracteres podem chegar como texto de 1 letra (linha[0],
    // Serial.read() convertido…) ou como número; toupper devolve o mesmo tipo que recebe
    ...charHelpers(),
    // (int)c de um caractere em texto = código ASCII (os casts usam esta função)
    __toInt: (v) => (typeof v === 'string' ? (v.length ? v.charCodeAt(0) : 0) : Math.trunc(v)),
    // divisão inteira do C (o tradutor só a usa com os dois operandos inteiros); /0 → 0 em vez de Infinity
    __idiv: (a, b) => {
      const x = typeof a === 'string' ? (a.length ? a.charCodeAt(0) : 0) : a
      const y = typeof b === 'string' ? (b.length ? b.charCodeAt(0) : 0) : b
      return y ? Math.trunc(x / y) : 0
    },
    bitRead: (v, b) => (v >> b) & 1,
    random: (a, b) => (b === undefined ? Math.floor(Math.random() * a) : Math.floor(a + Math.random() * (b - a))),
    randomSeed: () => {},
    String: (v, d) => (typeof v === 'number' && d !== undefined ? (d === 16 && Number.isInteger(v) ? (Math.trunc(v) >>> 0).toString(16) : v.toFixed(d)) : String(v)),
    Serial: {
      begin(b) {
        serialBegun = true
        baud = b || 9600
      },
      print: (v, b) => serialOut(fmt(v, b)),
      println: (v = '', b) => serialOut(fmt(v, b) + '\n'),
      write: (v) => serialOut(typeof v === 'number' ? String.fromCharCode(v) : String(v)),
      // receção: texto enviado pelo Monitor Série do browser (engine.serialInput)
      available: () => serialRx.length,
      read: () => (serialRx.length ? serialRx.shift() : -1),
      peek: () => (serialRx.length ? serialRx[0] : -1),
      readString: () => String.fromCharCode(...serialRx.splice(0)),
      readStringUntil(c) {
        const ch = typeof c === 'number' ? c : String(c).charCodeAt(0)
        const i = serialRx.indexOf(ch)
        const out = serialRx.splice(0, i < 0 ? serialRx.length : i + 1)
        if (i >= 0) out.pop()
        return String.fromCharCode(...out)
      },
      parseInt() {
        while (serialRx.length && !/[-\d]/.test(String.fromCharCode(serialRx[0]))) serialRx.shift()
        let t = ''
        while (serialRx.length && /[-\d]/.test(String.fromCharCode(serialRx[0]))) t += String.fromCharCode(serialRx.shift())
        return parseInt(t, 10) || 0
      },
      parseFloat() {
        while (serialRx.length && !/[-\d.]/.test(String.fromCharCode(serialRx[0]))) serialRx.shift()
        let t = ''
        while (serialRx.length && /[-\d.]/.test(String.fromCharCode(serialRx[0]))) t += String.fromCharCode(serialRx.shift())
        return parseFloat(t) || 0
      },
      flush: () => {},
    },
  }

  // ---------- extras do core ESP32 (Arduino-ESP32 2.x e 3.x) ----------
  let adcBits = prof.adcBits ?? 12
  let pwmMax = 255 // analogWrite(): 8 bits por omissão (RP2040: analogWriteResolution/Range)
  let wifiOn = false
  if (isEsp) {
    const ledcRes = new Map() // pino -> bits
    const chanPin = new Map() // canal (API 2.x) -> pino
    const chanRes = new Map()
    const writeDuty = (n, duty, bits) => {
      const max = (1 << bits) - 1
      const v = Math.max(0, Math.min(max, Math.round(duty)))
      Object.assign(pins[n], { mode: 'OUTPUT', dac: null, out: v > 0 ? 1 : 0, duty: v / max, pwm: v > 0 && v < max })
      touch()
    }
    Object.assign(api, {
      analogReadResolution: (b) => (adcBits = Math.max(9, Math.min(12, b | 0))),
      analogSetAttenuation: () => {},
      analogReadMilliVolts: (n) => Math.round((api.analogRead(n) / ((1 << adcBits) - 1)) * 3150),
      analogWriteResolution: () => {},
      // API 3.x
      ledcAttach: (n, freq, bits = 8) => (checkPin(n, 'ledcAttach'), ledcRes.set(n, bits), (pins[n].freq = +freq || 0), true),
      ledcAttachChannel: (n, freq, bits = 8, ch) => (chanPin.set(ch, n), chanRes.set(ch, bits), ledcRes.set(n, bits), (pins[n].freq = +freq || 0), true),
      ledcDetach: (n) => ledcRes.delete(n),
      // API 2.x
      ledcSetup: (ch, freq, bits = 8) => (chanRes.set(ch, bits), freq),
      ledcAttachPin: (n, ch) => (checkPin(n, 'ledcAttachPin'), chanPin.set(ch, n)),
      ledcDetachPin: () => {},
      ledcWrite(a, duty) {
        // 2.x: ledcWrite(canal, …) se o canal foi ligado a um pino; 3.x: ledcWrite(pino, …)
        if (chanPin.has(a) && !ledcRes.has(a)) return writeDuty(chanPin.get(a), duty, chanRes.get(a) ?? 8)
        if (!ledcRes.has(a)) warnOnce(`ledc${a}`, i18n.m(`ledcWrite(${a}): pino sem ledcAttach(${a}, freq, bits) — a usar 8 bits.`, `ledcWrite(${a}): pin without ledcAttach(${a}, freq, bits) — using 8 bits.`))
        writeDuty(a, duty, ledcRes.get(a) ?? 8)
        return true
      },
      ledcWriteTone: (n, f) => (f ? api.tone(chanPin.get(n) ?? n, f) : api.noTone(chanPin.get(n) ?? n)),
      dacWrite(n, v) {
        if (!prof.dac.includes(n)) return warnOnce(`dac${n}`, i18n.m(`dacWrite(${n}): só GPIO25 e GPIO26 têm DAC.`, `dacWrite(${n}): only GPIO25 and GPIO26 have a DAC.`))
        Object.assign(pins[n], { mode: 'OUTPUT', pwm: false, dac: (Math.max(0, Math.min(255, v | 0)) / 255) * 3.3 })
        touch()
      },
      touchRead: () => 70 + Math.round(rand(3)),
      ESP: {
        restart: () => {
          onSerial?.('ℹ ESP.restart()\n', 'info')
          resetArduino()
        },
        getFreeHeap: () => 296000 - Math.round(Math.random() * 2000),
        getChipModel: () => 'ESP32-D0WDQ6',
        getCpuFreqMHz: () => 240,
        getEfuseMac: () => 0x24a1607c3b10,
      },
    })
    api.Serial.printf = (f, ...a) => {
      const t = cprintf(f, a)
      serialOut(t)
      return t.length
    }
  }
  const setWifiOn = (v) => (wifiOn = v)

  // ---------- portas série extra (Mega: Serial1–3 em 14–19; ESP32: Serial1/2; Pico: Serial1/2 = UART0/1) ----------
  // UART a sério nos pinos TX/RX (libs/_uart.js): recebem o que os módulos ligados ao RX
  // enviam (GPS, HC-05…) e o que enviam sai pelo TX (não pela USB nem pelo monitor série).
  for (const u of prof.uarts || []) api[u] = makeHwSerial(() => env, u, prof)

  // ---------- extras do core Arduino-Pico (RP2040) ----------
  if (isPico) {
    let freq = 1000
    Object.assign(api, {
      INPUT_PULLDOWN: 'INPUT_PULLDOWN',
      analogReadResolution: (b) => (adcBits = Math.max(1, Math.min(16, b | 0))),
      analogWriteResolution: (b) => (pwmMax = (1 << Math.max(1, Math.min(16, b | 0))) - 1),
      analogWriteRange: (r) => (pwmMax = Math.max(15, Math.min(65535, r | 0))),
      analogWriteFreq: (f) => (freq = Math.max(100, Math.min(1000000, f | 0))),
      // sensor de temperatura interno (ADC4)
      analogReadTemp: () => 27 + rand(0.8),
      rp2040: {
        getCpuFreqMHz: () => 133,
        f_cpu: () => 133000000,
        getFreeHeap: () => 250000 - Math.round(Math.random() * 2000),
        getUsedHeap: () => 12000,
        getTotalHeap: () => 262144,
        getCycleCount: () => Math.floor(rt.t * 133),
        getCycleCount64: () => Math.floor(rt.t * 133),
        reboot: () => {
          onSerial?.('ℹ rp2040.reboot()\n', 'info')
          resetArduino()
        },
        restart: () => api.rp2040.reboot(),
        idleOtherCore: () => {},
        resumeOtherCore: () => {},
        get pwmFreq() {
          return freq
        },
      },
    })
    api.Serial.printf = (f, ...a) => {
      const t = cprintf(f, a)
      serialOut(t)
      return t.length
    }
  }

  // Pico W / Pico 2 / Pico 2 W: RP2350, BOOTSEL, VSYS/3 no A3 (rp2.js, group-pico)
  if (isPico) picoExtras({ api, prof, rt, inputs, arduino, circuit, solve, adcBits: () => adcBits, rand })

  // ---------- interrupções, FreeRTOS (ESP32), osciloscópio, EEPROM/Preferences ----------
  const netPinsCache = new Map()
  const netPins = (n) => {
    if (!netPinsCache.has(n)) netPinsCache.set(n, arduino && pinName(n) ? arduinoPinsOnNet(arduino.id, pinName(n)) : [n])
    return netPinsCache.get(n)
  }
  const pwmFreq = (n) => pins[n].tone || pins[n].freq || (isPico ? api.rp2040.pwmFreq : defaultPwmFreq(prof, n))
  const readLevel = (n) => {
    if (!arduino) return null
    if (pins[n].mode === 'OUTPUT') return pins[n].out
    if (edgeOv?.has(n)) return edgeOv.get(n)
    solve()
    if (circuit.floating(arduino.id, pinName(n))) return null
    return pinV(n) > vioNow() / 2 ? 1 : 0
  }
  const readVolt = (n) => {
    if (!arduino) return null
    solve()
    return circuit.floating(arduino.id, pinName(n)) ? null : pinV(n)
  }
  const irq = createInterrupts({ prof, pins, rt, warnOnce, readLevel, netPins, pwmFreq, now: () => simUs })
  Object.assign(api, irq.api)
  api.attachInterruptArg = (pin, fn, arg, mode) => api.attachInterrupt(pin, function* () { return yield* fn(arg) }, mode)
  const rtos = isEsp ? createRtos({ rt, warnOnce }) : null
  if (rtos) Object.assign(api, rtos.api)
  // sizeof(tipo) (o transpilador troca-o por __sizeofT('tipo'))
  // sizeof(variável): vetores (também matrizes e char[]) = elementos × tamanho do tipo
  const flatLen = (v) => (Array.isArray(v) ? v.reduce((n, x) => n + (Array.isArray(x) ? flatLen(x) : 1), 0) : 1)
  // referência a uma variável do programa (&x passado a uma biblioteca: PID, getMotion6…)
  api.__ref = (get, set) => ({
    get v() {
      return get()
    },
    set v(x) {
      set(x)
    },
  })
  api.__arrLen = (v) => (Array.isArray(v) || typeof v === 'string' ? v.length : 1)
  api.__sizeofV = (v, t) => (typeof v === 'string' ? v.length + 1 : flatLen(v)) * api.__sizeofT(t) // char t[] = "…": com o \0 final
  api.__sizeofT = (t) => ({ u8: 1, i8: 1, i16: 2, u16: 2, i32: 4, u32: 4, i64: 8, u64: 8, f32: 4, f64: 8 })[ctype(t, prof, 0)] ?? (t === 'void' ? 1 : 4)
  api.__yield = function* () {
    rt.t += 2
    if (rt.t >= rt.target) yield
  }
  const delay0 = api.__delay
  api.__delay = function* (ms) {
    if (irq.inIsr) warnOnce('isr-delay', i18n.m('delay() dentro de uma ISR (attachInterrupt): no Arduino real não funciona — o millis() pára durante a interrupção. Use uma flag volatile e trate-a no loop().', 'delay() inside an ISR (attachInterrupt): it does not work on a real Arduino — millis() stops during the interrupt. Use a volatile flag and handle it in loop().'))
    yield* delay0(ms)
  }
  const scope = createScope({ prof, pins, pinLog, readVolt, netPins, pwmFreq })
  const nvm = createNvm(nvmInit)

  // ---------- componentes em plugin e bibliotecas ----------
  const toneUntil = new Map()
  const plugs = parts.filter((p) => BEHAVIORS[p.type]).map((p) => ({ part: p, B: BEHAVIORS[p.type], live: (live[p.id] = {}), diodes: BEHAVIORS[p.type].diodes?.(p) || [] }))
  let avgI = new Map() // corrente média nas junções díodo (com PWM), atualizada a cada fotografia
  // transmissão mecânica (engrenagens, polias, fusos, cremalheiras, lagartas, hélices): sim/mech.js
  const mech = createMechanics({ parts, live, servoAngle: (id) => servoOf.get(id)?.angle, log: (t, level) => onSerial?.(t.endsWith('\n') ? t : `${t}\n`, level) })
  // peças que rodam encravadas noutras na pose de construção (roda dentro da placa, hélice no
  // suporte…: shared/spinClear.js): o motor que as roda fica bloqueado (sem rodar, corrente de
  // arranque) e a roda não dá tração. O diagnóstico (electrical.js) explica porquê.
  const jammedOwners = new Set()
  try {
    for (const j of spinJams(parts, worldMatrices(parts))) {
      const d = spinDriver(parts, parts.find((p) => p.id === j.id))
      if (d) jammedOwners.add(d.owner.id)
      onSerial?.(`⚠ ${j.msg}\n`, 'warn')
    }
  } catch {
    /* geometria inválida: sem encravamentos */
  }
  const plugCtx = (pl) => ({
    part: pl.part,
    jammed: jammedOwners.has(pl.part.id),
    env, // ambiente das bibliotecas (env.jointAngle: ângulo real das juntas vindo da física)
    cfg: pl.part.config || {},
    s: circuit.st[pl.part.id],
    live: pl.live,
    input: inputs[pl.part.id] || {},
    vd: (a, b) => circuit.vdiff(pl.part.id, a, b),
    dt: 0.001,
    timeUs: simUs,
    invalidate: touch,
    log: (t, level) => onSerial?.(t.endsWith('\n') ? t : `${t}\n`, level),
    boardPins: pins,
    boardPinsOn: (pin) => arduinoPinsOnNet(pl.part.id, pin),
    pinLog, // escritas digitais deste ms: [[µs, pino, nível]…] por ordem
    // flanco num pino da peça com instante exato (µs): encoders rápidos dão vários por ms.
    // Entregue às interrupções (attachInterrupt) no início do ms seguinte, por ordem, com o
    // digitalRead() a ver o nível de cada pino nesse instante (ver deliverEdges)
    edge: (pin, lv, t) => pushEdge(pl.part.id, pin, lv, t),
    // impulso de servo (µs) que chega a um pino da peça (Servo.h num pino do Arduino ou PCA9685) ou null
    pulse: (pin) => pulseAt(pl.part.id, pin),
    circuit,
    // corrente média (A) numa junção díodo, contando com o PWM (só em output())
    avgCurrent: (key) => avgI.get(`${pl.part.id}|${key}`) ?? circuit.diodeCurrent(pl.part, key),
    // queima uma junção (fica aberta)
    burn: (key) => {
      circuit.st[pl.part.id][`x_${key}`] = true
      touch()
    },
  })
  // impulsos de servo gerados por peças em plugin com o gancho pulseOut (ex.: canais do PCA9685)
  const pulseSrc = new Map() // rede -> [[plug, pino]]
  for (const pl of plugs) {
    if (!pl.B.pulseOut) continue
    for (const pin of DEFS[pl.part.type].pins) {
      const n = nets.netOf(pl.part.id, pin.id)
      if (!pulseSrc.has(n)) pulseSrc.set(n, [])
      pulseSrc.get(n).push([pl, pin.id])
    }
  }
  const pluginPulse = (partId, pin) => {
    for (const [pl, pid] of pulseSrc.get(nets.netOf(partId, pin)) || []) {
      const us = pl.B.pulseOut(plugCtx(pl), pid)
      if (us != null) return us
    }
    return null
  }
  const pinsOnNetCache = new Map()
  // ---------- flancos sintetizados pelas peças (ctx.edge) ----------
  const extEdges = [] // [µs, pino da placa, nível]
  let edgeOv = null // nível de cada pino no instante do flanco a ser entregue (digitalRead na ISR)
  const pushEdge = (partId, pin, lv, t) => {
    const k = `${partId}|${pin}`
    if (!pinsOnNetCache.has(k)) pinsOnNetCache.set(k, arduinoPinsOnNet(partId, pin))
    for (const n of pinsOnNetCache.get(k)) if (pins[n].mode !== 'OUTPUT' && extEdges.length < 100000) extEdges.push([t, n, lv ? 1 : 0])
  }
  function deliverEdges() {
    if (!extEdges.length) return
    extEdges.sort((a, b) => a[0] - b[0])
    edgeOv = new Map()
    for (const [, n, lv] of extEdges) if (!edgeOv.has(n)) edgeOv.set(n, lv ? 0 : 1)
    try {
      for (const [t, n, lv] of extEdges) {
        edgeOv.set(n, lv)
        irq.onWrite(n, lv, t)
      }
    } finally {
      edgeOv = null
      extEdges.length = 0
    }
  }
  // largura do impulso (µs) na rede do pino `pin` da peça, ou null se não houver impulsos
  const pulseAt = (partId, pin) => {
    const k = `${partId}|${pin}`
    if (!pinsOnNetCache.has(k)) pinsOnNetCache.set(k, arduinoPinsOnNet(partId, pin))
    if (arduinoRunning()) for (const n of pinsOnNetCache.get(k)) if (servoUs.has(n)) return servoUs.get(n)
    return pluginPulse(partId, pin)
  }
  const otherParts = (net) => nets.partsOnNet(net).filter((q) => q.id !== arduino?.id && !DEFS[q.type]?.breadboard)
  const resetHooks = []
  const env = {
    api: null, // preenchido abaixo
    // fn() chamada a cada arranque da placa, antes do setup() (os objetos globais são criados
    // uma só vez, quando o programa é carregado; ex.: Encoder.h volta a ligar as suas ISR)
    onReset: (fn) => resetHooks.push(fn),
    rt,
    partsOnPin: (n, type) => {
      if (!arduino) return []
      return otherParts(nets.netOf(arduino.id, pinName(n))).filter((q) => !type || q.type === type)
    },
    i2c: (addr, type) => {
      if (!arduino) return null
      // Wire.setSDA/setSCL/setPins (ESP32, Pico) mudam os pinos do barramento
      const pick = (n, def) => (n != null && pinName(n) ? pinName(n) : def)
      const sda = nets.netOf(arduino.id, pick(env.i2cPins?.sda, prof.i2c.sda))
      const scl = nets.netOf(arduino.id, pick(env.i2cPins?.scl, prof.i2c.scl))
      return (
        parts.find((q) => {
          const d = DEFS[q.type]
          if (!d.pins.some((x) => x.id === 'SDA') || (type && q.type !== type)) return false
          // endereço: gancho i2cAddr do plugin (ex.: pino AD0 do MPU6050) ou config.addr
          const a = BEHAVIORS[q.type]?.i2cAddr?.({ part: q, cfg: q.config || {}, vd: (x, y) => circuit.vdiff(q.id, x, y) }) ?? q.config?.addr ?? d.config?.addr
          return (addr == null || a === addr) && nets.netOf(q.id, 'SDA') === sda && nets.netOf(q.id, 'SCL') === scl
        }) || null
      )
    },
    powered: (id) => !!circuit.st[id]?.powered,
    // ângulo real (graus, 90 = montagem) da junta movida pela peça `id`, vindo da física do
    // browser (setWorld.joints); sem física: o ângulo de montagem
    jointAngle: (id) => jointAngles.get(id) ?? live[id]?.mountAngle ?? 90,
    // direção (mundo) de um vetor local de uma peça, com as juntas e veículos na pose atual
    worldDir: (id, local) => worldDir(id, local),
    state: (id) => circuit.st[id], // estado persistente da peça (o mesmo `s` dos ganchos)
    pinsOf: (id, pin) => arduinoPinsOnNet(id, pin), // pinos do Arduino na rede do pino de uma peça
    parts, // peças do projeto (libs/_spi.js procura os dispositivos SPI)
    pinRises: (n) => pinRises.get(n) || 0, // nº de flancos ascendentes do pino n (digitalWrite)
    addTimer: (us, fn) => irq.addTimer(us, fn), // temporizador por hardware (libs: TimerOne, Ticker…)
    input: (id) => inputs[id] || {}, // controlo interativo da peça (valor do slider, tecla…)
    vd: (id, a, b) => circuit.vdiff(id, a, b),
    live: (id) => live[id] || (live[id] = {}),
    touch,
    warnOnce,
    fmt: (v, base) => fmt(v, base),
    board: prof,
    setWifiOn,
    cprintf,
    // rede (libs/_net.js): estado da sessão (ponte do WebServer) e fecho de ligações ao parar
    net,
    onDispose: (fn) => disposers.push(fn),
    // linhas série (libs/_uart.js): rede elétrica de um pino da placa, circuito e solver
    netOfPin: (n) => (arduino && pinName(n) ? nets.netOf(arduino.id, pinName(n)) : null),
    circuit,
    solve: () => solve(),
  }
  env.nvm = nvm // EEPROM/Preferences (persistem entre simulações, ver nvm.js)
  for (const lib of LIBS) {
    Object.assign(api, lib.globals || {})
    Object.assign(api, lib.env?.(env) || {})
    for (const [name, factory] of Object.entries(lib.classes || {})) if (factory) api[name] = factory(env)
  }
  env.api = api

  let program = null
  let error = null
  // emulação real (firmware do arduino-cli a correr no avr8js): ver sim/avr/host.js
  let mcuEmu = null
  try {
    if (firmware) mcuEmu = createMcuEmulator(firmware, { prof, pins, pinLog, servoOut, servoUs, parts, arduino, circuit, env, touch, isDirty: () => dirty, solve: () => solve(), pinV, readVolt, rand, onSerial, warnOnce, nvm, arduinoPinsOnNet, sonarDistance: (id) => { const s = sonars.find((x) => x.part.id === id); return s ? sonarDistance(s) : 400 } })
    else program = compiled ? compileJs(compiled, api) : compile(code, api)
  } catch (e) {
    error = e.message
  }
  let gen = null
  let wasRunning = false
  let halted = false
  let boots = 0
  const resetArduino = () => {
    rt.t = simUs - 1000
    txFree = 0
    serialBegun = false
    servoOut.clear()
    servoUs.clear()
    for (const p of pins) Object.assign(p, { mode: 'INPUT', out: 0, duty: 0, pwm: false, tone: 0, dac: null, freq: 0 })
    toneUntil.clear()
    irq.reset()
    rtos?.reset()
    for (const f of resetHooks) f() // bibliotecas que preparam o hardware antes do setup() (Encoder.h)
    dirty = true
    gen = program ? program.main() : null
    mcuEmu?.reset(simUs - 1000)
  }

  function stepMs() {
    simUs += 1000
    wm = null
    for (const s of irs) readIR(s)
    solve()
    // buzzer ativo: guarda que apitou neste ms (um bip curto ou um bip-bip rápido podia cair
    // entre duas fotografias e não se ouvir); a fotografia seguinte conta-o e limpa
    for (const b of buzzers) if (circuit.vdiff(b.part.id, '+', '-') > 1.2) b.hit = true

    // arranque / brownout do Arduino
    const running = !!arduino && arduinoRunning()
    if (running && !wasRunning) {
      if (boots++ > 0) onSerial?.(i18n.m('⚠ O Arduino reiniciou (a alimentação voltou).\n', '⚠ The Arduino restarted (power came back).\n'), 'warn')
      resetArduino()
    } else if (!running && wasRunning) {
      onSerial?.(i18n.m('⚠ O Arduino desligou: 5 V abaixo de 4,3 V (brownout).\n', '⚠ The Arduino shut down: 5 V dropped below 4.3 V (brownout).\n'), 'warn')
      for (const p of pins) Object.assign(p, { mode: 'INPUT', out: 0, pwm: false })
      servoOut.clear()
      servoUs.clear()
      dirty = true
      gen = null
    }
    wasRunning = running

    // 1) programa (+ interrupções externas e tarefas do FreeRTOS)
    if (mcuEmu) {
      if (running && !halted) {
        try {
          mcuEmu.run(simUs)
        } catch (e) {
          halted = true
          error = i18n.m(`Erro no emulador: ${e.message}`, `Emulator error: ${e.message}`)
          onSerial?.(`✖ ${error}\n`, 'error')
        }
      }
      rt.t = simUs
    } else if ((gen || rtos?.active) && !halted && running) {
      rt.target = simUs
      let guard = 0
      try {
        deliverEdges()
        irq.poll()
        while (gen && rt.t < simUs) {
          let r
          try {
            r = gen.next()
          } catch (e) {
            if (e !== TASK_DELETE) throw e
            gen = null // vTaskDelete(NULL) no loop(): as outras tarefas continuam
            break
          }
          if (r.done) {
            halted = true
            break
          }
          if (++guard > 200000) throw new Error(i18n.m('O programa não avança no tempo (laço infinito?).', 'The program does not advance in time (infinite loop?).'))
        }
        rtos?.run(simUs)
        if (!gen) rt.t = simUs
      } catch (e) {
        halted = true
        error = i18n.m(`Erro em execução: ${e.message}`, `Runtime error: ${e.message}`)
        onSerial?.(`✖ ${error}\n`, 'error')
      }
    } else rt.t = simUs
    solve()

    const dt = 0.001
    // 2) servos
    for (const s of servos) {
      const powered = circuit.st[s.part.id].powered
      s.powered = !!powered
      let cmd = running ? servoPin.get(s.part.id).map((n) => servoOut.get(n)).find((a) => a != null) : undefined
      // sem Servo.h no pino: impulsos de um driver (ex.: canal do PCA9685), 544–2400 µs → 0–180°
      if (cmd == null && pulseSrc.size) {
        const us = pluginPulse(s.part.id, 'SIG')
        if (us != null) cmd = Math.max(0, Math.min(180, ((us - 544) / (2400 - 544)) * 180))
      }
      s.target = cmd ?? null
      let moving = 0
      let target = s.target
      // garra a apertar um cubo: o servo encrava (stall) e continua a puxar corrente
      const grab = DEFS[s.part.type].grab
      const held = grab ? cubes.find((c) => c.heldBy === s.part.id) : null
      const holding = !!held
      // o servo para quando as maxilas tocam no cubo (2,5 cm na garra pequena: 94,5°)
      const stallAt = grab ? ((Math.min(held ? held.gw ?? cubeW(held) : 2.5, grab.max) - grab.min) / (grab.max - grab.min)) * 180 : 0
      if (holding && target != null && target < stallAt) {
        target = stallAt
        if (powered) moving = 1
      }
      // maxilas encostadas a um objeto que não se deixa empurrar (física do browser): param aí
      const jawStop = grab && !holding ? jawStops.get(s.part.id) : undefined
      const jammed = jawStop != null && target != null && target < jawStop
      if (jammed) {
        target = jawStop
        if (powered) moving = 1
      }
      s.stalled = (holding || jammed) && moving === 1
      if (powered && target != null) {
        const vcc = circuit.vdiff(s.part.id, 'VCC', 'GND')
        const maxStep = s.speed * Math.min(1.25, vcc / 4.8) * dt
        const diff = target - s.angle
        if (Math.abs(diff) > 0.05) {
          s.angle += Math.sign(diff) * Math.min(Math.abs(diff), maxStep)
          moving = 1
          wm = null
        }
      }
      if (moving !== s.moving) {
        s.moving = moving
        dirty = true
      }
    }

    // 3) motores DC (força contraeletromotriz: travagem e corrente emergem do circuito)
    for (const m of motors) {
      // roda encravada na placa/noutra peça: o motor não roda (sem tração; corrente de arranque)
      if (jammedOwners.has(m.part.id)) m.w = 0
      const emf = MOTOR.ke * m.w
      const i = circuit.motorCurrent(m.part, emf)
      m.amps = i
      m.volts = circuit.vdiff(m.part.id, 'M+', 'M-')
      let torqueI
      if (Math.abs(m.w) < 0.3 && Math.abs(i) < MOTOR.iFric * 1.3) {
        m.w *= 0.9 // atrito estático (zona morta)
        torqueI = 0
      } else torqueI = i - Math.sign(m.w || i) * MOTOR.iFric
      m.w += ((MOTOR.ke * m.gain * torqueI - MOTOR.b * m.w) / MOTOR.J) * dt
      if (jammedOwners.has(m.part.id)) m.w = 0
      // novo cálculo se a f.c.e.m. se afastou da usada na última solução
      if (Math.abs(MOTOR.ke * m.w - (m.solvedEmf ?? emf)) > 0.03) dirty = true
      m.angle += m.w * dt
    }

    // 4) veículos: cinemática diferencial
    for (const veh of vehicles) {
      // velocidade de cada lado = média das rodas desse lado (4WD: duas por lado; uma roda
      // mais lenta é arrastada pelas outras); raio da roda escolhida em cada motor
      const sideV = (s) => {
        const ms = motors.filter((m) => m.vehicle === veh && m.side === s)
        return ms.length ? ms.reduce((a, m) => a + m.w * motorWheel(m.part.config).r * m.dir, 0) / ms.length : 0
      }
      const vl = sideV('L')
      const vr = sideV('R')
      const v = (vl + vr) / 2
      let w = (vr - vl) / (DEFS[veh.part.type].trackEff || CHASSIS.trackWidth)
      if (realism && Math.abs(v) > 1) w += rand(0.04)
      const p = veh.pose
      const nt = p.theta + w * dt
      const nx = p.x + Math.cos(nt) * v * dt
      const nz = p.z - Math.sin(nt) * v * dt
      // limite de segurança (as paredes e os obstáculos da pista são retângulos em staticObstacles)
      const hw = ARENA.w / 2 + 5
      const hh = ARENA.h / 2 + 5
      // colisões: paredes da arena, obstáculos da pista, outros veículos e peças fixas na mesa
      // (retângulos em planta). Se já estiver a tocar na pose atual, só deixa afastar-se.
      const touching = vehicleHits(veh, p.x, p.z, p.theta)
      const free = (x, z, t = nt) => {
        if (Math.abs(x) > hw || Math.abs(z) > hh) return false
        const hits = vehicleHits(veh, x, z, t)
        return hits <= 0 || (touching > 0 && hits < touching - 1e-6)
      }
      // rodar no sítio contra um obstáculo também é bloqueado
      if (free(p.x, p.z, nt) || !free(p.x, p.z, p.theta)) p.theta = nt
      veh.v = v
      veh.collided = false
      if (free(nx, nz, p.theta)) {
        p.x = nx
        p.z = nz
      } else {
        veh.collided = true
        if (free(nx, p.z, p.theta)) p.x += (nx - p.x) * 0.3
        else if (free(p.x, nz, p.theta)) p.z += (nz - p.z) * 0.3
      }
      wm = null
    }

    // 5a) canetas: a ponta a ≤ 1,5 mm da superfície escreve (pontos a cada ≥ 0,6 mm)
    for (const P of pens) {
      const [x, y, z] = worldPoint(P.part.id, P.tip)
      const top = surfaceAt(x, z)
      const down = y - top <= 0.15
      if (down) {
        const pt = [Math.round(x * 1000) / 1000, Math.round((top + 0.02) * 1000) / 1000, Math.round(z * 1000) / 1000]
        const d = P.last ? Math.hypot(pt[0] - P.last[0], pt[2] - P.last[2]) : Infinity
        if (!P.down || d >= 0.06) {
          if (P.down && P.last) P.len += d
          if (P.n < 60000) {
            P.fresh.push(pt)
            P.n++
          }
          P.last = pt
        }
      } else if (P.down) P.fresh.push(null)
      P.down = down
      const L = (live[P.part.id] ||= {})
      L.penDown = down
      L.inkLen = Math.round(P.len * 10) / 10
    }

    // 5) garra e cubos
    for (const s of servos) {
      // garras (def.grab): abertura entre as maxilas, em cm, proporcional ao ângulo do servo
      const G = DEFS[s.part.type].grab
      if (!G) continue
      const opening = G.min + (s.angle / 180) * (G.max - G.min)
      const gm = matrices().get(s.part.id).clone().multiply(mountMatrix(s.part, G.mount || 'grip'))
      const gp = new THREE.Vector3().setFromMatrixPosition(gm)
      for (const c of cubes) {
        if (c.heldBy === s.part.id) {
          if (opening > (c.gw ?? cubeW(c)) + 0.3) {
            const pos = new THREE.Vector3().setFromMatrixPosition(c.matrix)
            const yaw = new THREE.Euler().setFromRotationMatrix(c.matrix, 'YXZ').y
            c.matrix = new THREE.Matrix4().compose(new THREE.Vector3(pos.x, 0, pos.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(1, 1, 1))
            c.heldBy = null
            onSerial?.('ℹ A garra largou o cubo.\n', 'info')
          } else c.matrix = gm.clone().multiply(c.rel)
        } else if (!c.heldBy && !(c.noGrabUntil > simUs) && opening <= cubeW(c) + 0.12 && opening > cubeW(c) - 0.6) {
          const center = new THREE.Vector3(0, c.size[1] / 2, 0).applyMatrix4(c.matrix)
          if (center.distanceTo(gp) < Math.max(1.8, cubeW(c) * 0.72)) {
            c.heldBy = s.part.id
            // apertado entre as maxilas: fica centrado e alinhado com elas (shared/grip.js)
            const rel = gm.clone().invert().multiply(c.matrix).elements
            c.rel = new THREE.Matrix4().fromArray(gripRel(rel, c.size))
            c.gw = gripWidth(rel, c.size) // largura entre as maxilas (depois de alinhado)
            onSerial?.('ℹ A garra agarrou o cubo!\n', 'ok')
          }
        }
      }
    }

    // 6) LEDs: sobrecorrente prolongada queima
    for (const l of leds) {
      const i = circuit.ledCurrent(l.part)
      l.i = i
      if (i > 0.05) {
        l.over += 1
        if (l.over > 150 && !circuit.st[l.part.id].burned) {
          circuit.st[l.part.id].burned = true
          dirty = true
          onSerial?.(i18n.m(`💥 Um LED queimou: passaram ${(i * 1000).toFixed(0)} mA (máx. ~20 mA). Use uma resistência de 220 Ω em série.\n`, `💥 An LED burned out: ${(i * 1000).toFixed(0)} mA flowed (max ~20 mA). Use a 220 Ω series resistor.\n`), 'error')
        }
      } else l.over = 0
    }
    // 7) componentes em plugin
    for (const [n, until] of toneUntil) if (simUs >= until) api.noTone(n) // tempo físico, não o relógio do programa (que salta nos delay)
    for (const pl of plugs) pl.B.step?.(plugCtx(pl))
    if (mcuEmu || !running || halted || !(gen || rtos?.active)) extEdges.length = 0 // ninguém os lê (o emulador usa pinProto)
    if (mech.step()) wm = null // transmissão: engrenagens, polias, fusos, lagartas (sim/mech.js)
    // carros: a cada 10 ms
    if (cars.length && ++carTick % 10 === 0) for (const c of cars) stepCar(c, 0.01)
    // pessoas arrastadas e PIR: a cada 10 ms
    if (walkers.length && simUs % 10000 < 1000) sensePeople()
    scope.sample(simUs)
    pinLog.length = 0

    if (shortCircuit) {
      halted = true
      error = shortCircuit
    }
  }

  // LEDs com PWM: o olho vê a média da corrente da fase ligada × duty (e não a
  // corrente com a tensão média, que para um LED daria quase sempre "apagado").
  function pwmAverages() {
    const measure = () => {
      const m = new Map()
      for (const l of leds) m.set(l.part.id, circuit.ledCurrent(l.part))
      for (const pl of plugs) for (const d of pl.diodes) m.set(`${pl.part.id}|${d.key}`, circuit.diodeCurrent(pl.part, d.key))
      return m
    }
    const pwmPins = arduinoRunning() ? pins.map((p, n) => (p.mode === 'OUTPUT' && p.pwm && p.duty > 0 && p.duty < 1 ? n : -1)).filter((n) => n >= 0) : []
    if (!pwmPins.length || (!leds.length && !plugs.some((pl) => pl.diodes.length))) {
      solve()
      return measure()
    }
    const duty = pwmPins.map((n) => pins[n].duty)
    const setAll = (k) => pwmPins.forEach((n, i) => (pins[n].duty = k === i ? 1 : k === 'orig' ? duty[i] : 0))
    setAll(-1)
    circuit.solve()
    const base = measure()
    const avg = new Map(base)
    pwmPins.forEach((n, i) => {
      setAll(i)
      circuit.solve()
      for (const [k, v] of measure()) avg.set(k, avg.get(k) + duty[i] * (v - base.get(k)))
    })
    setAll('orig')
    dirty = true
    solve()
    return avg
  }

  function updateOutputs() {
    avgI = pwmAverages()
    for (const l of leds) {
      l.burned = circuit.st[l.part.id].burned
      l.b = l.burned ? 0 : Math.min(1.4, Math.max(0, avgI.get(l.part.id) ?? l.i ?? 0) / 0.015)
    }
    // buzzer ativo: apita com tensão contínua e também com uma onda quadrada (tone(), PWM): em
    // média fica ~2,5 V (50 %), mas os impulsos de 5 V fazem soar o oscilador interno
    for (const b of buzzers) b.on = circuit.vdiff(b.part.id, '+', '-') > 1.2
    for (const s of sonars) if (!s.dist) sonarDistance(s)
    for (const pl of plugs) pl.B.output?.(plugCtx(pl))
  }

  const trails = new Map(vehicles.map((v) => [v.part.id, []]))
  let trailAcc = 0
  return {
    dispose() {
      for (const d of disposers.splice(0)) {
        try {
          d()
        } catch {}
      }
    },
    serialInput(text) {
      if (mcuEmu) return mcuEmu.serialInput([...Buffer.from(String(text), 'utf8')])
      for (const ch of String(text)) serialRx.push(ch.charCodeAt(0) & 0xff)
      if (serialRx.length > 1024) serialRx.splice(0, serialRx.length - 1024)
    },
    parts,
    live,
    circuit,
    pins,
    motors,
    servos,
    servoOf,
    // pontos novos dos traços das canetas desde a última chamada: { [penId]: [[x,y,z] | null…] }
    inkTake() {
      const out = {}
      for (const P of pens) if (P.fresh.length) (out[P.part.id] = P.fresh), (P.fresh = [])
      return Object.keys(out).length ? out : null
    },
    irs,
    sonars,
    leds,
    buzzers,
    cubes,
    vehicles,
    trails,
    matrices: () => matrices(),
    setWorld,
    get error() {
      return error
    },
    get timeMs() {
      return simUs / 1000
    },
    get halted() {
      return halted
    },
    get shortCircuit() {
      return shortCircuit
    },
    arduinoRunning,
    hasArduino: !!arduino,
    engineKind: firmware ? 'emulador' : 'tradutor',
    mcuEmu,
    pinVoltage: (partId, pin) => {
      solve()
      if (circuit.floating(partId, pin)) return null
      return circuit.v(partId, pin) - (arduino ? circuit.v(arduino.id, BOARD_GND) : 0)
    },
    invalidate: () => {
      dirty = true
    },
    advance(seconds, budgetMs = 25) {
      if (halted && shortCircuit) return 1
      const steps = Math.round(seconds * 1000)
      const t0 = performance.now()
      let done = 0
      for (; done < steps; done++) {
        stepMs()
        if ((done & 15) === 0 && performance.now() - t0 > budgetMs) break
        if (++trailAcc >= 40) {
          trailAcc = 0
          for (const v of vehicles) {
            const t = trails.get(v.part.id)
            t.push([v.pose.x, v.pose.z])
            if (t.length > 1500) t.shift()
          }
        }
      }
      updateOutputs()
      return done / Math.max(1, steps)
    },
    // osciloscópio: escolher pinos (até 4; [] desliga) e levar os eventos acumulados
    scopeSet: (list) => scope.set(list),
    scopeTake: () => scope.take(simUs),
    get scopeOn() {
      return scope.on
    },
    // EEPROM / Preferences
    get nvmDirty() {
      return nvm.dirty
    },
    nvmTake: () => nvm.take(),
    nvmClear: () => nvm.clear(),
    get isrCount() {
      return irq.count
    },
    pinState: () => pins.map((p, n) => ({ n, id: pinName(n), ...p, servo: servoOut.get(n) })),
  }
}
