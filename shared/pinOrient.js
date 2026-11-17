// Orientação dos pinos de cabeçalho (barra de pinos macho) de um módulo: config.pinosDir.
// Num módulo real a barra pode ser soldada com os pinos para cima, para baixo (para encaixar
// numa breadboard ou assentar em espaçadores) ou ser uma barra em ângulo reto (pinos na
// horizontal, para um dos lados). Isto só muda a geometria 3D dos pinos (posição onde o fio
// liga e direção em que sai) e o desenho da barra; a parte elétrica, o esquema 2D e a
// simulação ficam iguais. Sem config.pinosDir vale a orientação original da peça.
//
// Aplica-se às peças cujos pinos de ligação são pinos macho de cabeçalho: pinos sem `conn`
// próprio (nem da peça), acima da placa (y > 0), sem direção ou com uma direção segundo um
// eixo, e todos com a mesma direção. Ficam de fora as placas, a breadboard e as peças cujo
// modelo 3D não desenha uma barra de pinos simples (EXCLUDE).
//
// Geometria (cm, referencial local da peça: +x frente, +y cima, +z direita) com a placa de
// circuito entre pb (baixo) e pt (cima) — por omissão pb = y do pino − 0,3 (a convenção de
// HeaderPins: plástico na base, pino a 0,3 cm), pt = pb + 0,16:
//   cima:    pino em (x, pt + 0,3, z), sai para +y
//   baixo:   plástico por baixo da placa, pino em (x, pb − 0,3, z), sai para −y
//   ângulo reto h: dobra em B = (x, pt + 0,125, z), plástico em B + 0,2·h, pino em B + 0,375·h

export const PIN_DIRS = {
  cima: [0, 1, 0],
  baixo: [0, -1, 0],
  frente: [1, 0, 0],
  tras: [-1, 0, 0],
  direita: [0, 0, 1],
  esquerda: [0, 0, -1],
}
export const PIN_DIR_LABEL = {
  cima: 'Para cima',
  baixo: 'Para baixo',
  frente: 'Para a frente (ângulo reto)',
  tras: 'Para trás (ângulo reto)',
  direita: 'Para a direita (ângulo reto)',
  esquerda: 'Para a esquerda (ângulo reto)',
}

// modelos com pinos desenhados à parte (não por HeaderPins) ou que não são módulos de barra
const EXCLUDE = new Set([
  'l298n', 'sensorAngulo', 'esc', 'pca9685', 'pico4drive', 'keypad4x4', 'keypad3x4', 'nema17', 'biaxialStepper',
])
// placa de circuito [pb, pt] dos módulos que não seguem a convenção (base da barra em cima da placa)
const PCB = {
  mpu6050: [0.02, 0.18],
  pcf8574: [0.2, 0.36],
  gpsNeo6m: [0, 0.16],
  hc05: [0, 0.16],
  lcd1602p: [0, 0.16],
  lcd2004p: [0, 0.16],
  ir: [1.44, 1.56],
  lcd1602: [0, 0.175], // módulo I2C por trás do LCD (a barra original é em ângulo reto)
}

const SKIP_KINDS = new Set(['bb', 'bbp', 'bbn', 'bat+', 'bat-', 'motor', 'mout'])
const dirName = (d) => {
  if (!d) return 'cima'
  for (const [k, v] of Object.entries(PIN_DIRS)) if (v.every((c, i) => Math.abs(c - d[i]) < 1e-6)) return k
  return null
}
const isHeaderPin = (def, p) => !p.conn && !SKIP_KINDS.has(p.kind) && p.pos[1] > 0.02

const infoCache = new Map()
// { d0, options, pb, pt, roots: Map(id → [x, z]) } ou null se a peça não tiver a opção
export function pinOrientInfo(type, def) {
  if (!def) return null
  if (infoCache.has(type)) return infoCache.get(type)
  let info = null
  // orientação própria (def.pinOrient: { d0, options, labels, geom(i, mode) }), ex.: HC-SR04,
  // com a placa de pé e a barra no bordo. Não tem levantamento na breadboard (custom).
  if (def.pinOrient) {
    const c = def.pinOrient
    const roots = new Map(def.pins.map((p) => [p.id, [p.pos[0], p.pos[2]]]))
    info = { d0: c.d0, options: c.options, labels: c.labels, out: null, pb: 0, pt: 0, roots, custom: c, index: new Map(def.pins.map((p, i) => [p.id, i])) }
    infoCache.set(type, info)
    return info
  }
  const ok = !EXCLUDE.has(type) && !def.board && !def.breadboard && !def.mech && !def.conn && def.pins?.length
  const hs = ok ? def.pins.filter((p) => isHeaderPin(def, p)) : []
  const names = new Set(hs.map((p) => dirName(p.dir || def.pinDir)))
  if (hs.length && names.size === 1 && !names.has(null) && !names.has('baixo')) {
    const d0 = [...names][0]
    const h0 = PIN_DIRS[d0]
    const y0 = Math.min(...hs.map((p) => p.pos[1]))
    const [pb, pt] = PCB[type] || [y0 - 0.3, y0 - 0.3 + 0.16]
    // raiz (x, z) de cada pino: onde a barra entra na placa
    const roots = new Map(hs.map((p) => [p.id, d0 === 'cima' ? [p.pos[0], p.pos[2]] : [p.pos[0] - 0.375 * h0[0], p.pos[2] - 0.375 * h0[2]]]))
    const r = [...roots.values()]
    const near = (a, b) => Math.abs(a - b) < 0.02
    // fila ao longo de x (mesmo z) ou de z (mesmo x): o ângulo reto só na perpendicular
    const alongX = r.every((v) => near(v[1], r[0][1]))
    const alongZ = r.every((v) => near(v[0], r[0][0]))
    const options = ['cima', 'baixo']
    let out = null
    if (r.length === 1 || alongX) {
      out = r[0][1] < 0 ? 'esquerda' : 'direita'
      options.push(out, out === 'esquerda' ? 'direita' : 'esquerda')
    }
    if (r.length === 1 || (alongZ && !alongX)) {
      const o = r[0][0] < 0 ? 'tras' : 'frente'
      out = out || o
      options.push(o, o === 'tras' ? 'frente' : 'tras')
    }
    if (!options.includes(d0)) options.push(d0)
    info = { d0, options, out, pb, pt, roots }
  }
  infoCache.set(type, info)
  return info
}

// orientação escolhida (válida) de uma peça
export function pinOrientOf(type, def, config) {
  const info = pinOrientInfo(type, def)
  if (!info) return null
  const m = config?.pinosDir
  return m && info.options.includes(m) ? m : info.d0
}

// geometria de um pino de cabeçalho numa orientação: { pos, dir, bend? }
export function headerPinGeom(info, id, mode) {
  if (info.custom) return info.custom.geom(info.index.get(id), mode)
  const [x, z] = info.roots.get(id)
  if (mode === 'cima') return { pos: [x, info.pt + 0.3, z], dir: PIN_DIRS.cima }
  if (mode === 'baixo') return { pos: [x, info.pb - 0.3, z], dir: PIN_DIRS.baixo }
  const h = PIN_DIRS[mode]
  const B = [x, info.pt + 0.125, z]
  return { pos: [B[0] + 0.375 * h[0], B[1], B[2] + 0.375 * h[2]], dir: h, bend: B }
}

const r4 = (v) => Math.round(v * 1e4) / 1e4
const pinsCache = new Map()
// pinos da peça com a orientação aplicada (os próprios def.pins se for a original)
export function orientedPins(type, def, config) {
  const mode = pinOrientOf(type, def, config)
  const info = mode && pinOrientInfo(type, def)
  if (!info || mode === info.d0) return def.pins
  const k = `${type}|${mode}`
  if (!pinsCache.has(k)) {
    pinsCache.set(
      k,
      def.pins.map((p) => {
        if (!info.roots.has(p.id)) return p
        const g = headerPinGeom(info, p.id, mode)
        return { ...p, pos: g.pos.map(r4), dir: g.dir, conn: 'male' }
      }),
    )
  }
  return pinsCache.get(k)
}
