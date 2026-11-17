import { create } from 'zustand'
import { DEFS, autoWireColor, defaultConfig, has2d, pins2dLocal, rot2d, view2dInfo, PITCH_PX, CHASSIS, mountsOf } from '@shared/components.js'
import { syncBreadboards, normalizeSeating, withoutUnknownParts, seatStatus, seatMessage, reconcileSeat, movesOnBreadboard, moveOnBreadboard } from '@shared/placement.js'
import { fixAxleParents, axleHostFor } from '@shared/assembly.js'
import { followSockets, placeInSocket, socketMount } from '@shared/sockets.js'
import { trackInfo } from '@shared/tracks.js'
import { api } from '../services/api.js'
import { rotateEuler } from '@shared/rotation.js'
import { groundParts } from '../functions/ground.js'
import { placeNew, resolvePos, beginMove } from '../functions/buildCollision.js'
import { duplicateParts } from '@shared/duplicate.js'
import { t } from '../i18n/index.js'

// sketch inicial de um projeto novo (os exemplos vêm do backend)
export const NEW_SKETCH = `void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
}
`
const getTrack = (id) => trackInfo(id)

// impressão (hash) do conteúdo do projeto: muda quando há alterações por guardar
// (com cache: só recalcula quando parts/wires/code/nome/pista mudam de referência)
let hashMemo = null
export function projectHash({ projectName, parts, wires, code, track, libs, lang }) {
  const k = [projectName, parts, wires, code, track, libs, lang]
  if (hashMemo && hashMemo.k.every((v, i) => v === k[i])) return hashMemo.h
  const h = hashOf(JSON.stringify(k))
  hashMemo = { k, h }
  return h
}
function hashOf(t) {
  let h = 5381
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0
  return `${t.length}:${h >>> 0}`
}

const SAVE_KEY = 'digitaltwin-robolab-v2'

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignora */
  }
  return null
}

const saved = (() => {
  const s = load()
  if (!s) return s
  // autosave de uma versão anterior com peças que já não existem: tiram-se (ver withoutUnknownParts)
  const ok = withoutUnknownParts(s.parts, s.wires)
  if (ok.removed.length) console.warn('Peças retiradas do projeto (tipos que já não existem):', ok.removed.join(', '))
  return { ...s, parts: ok.parts, wires: ok.wires }
})()
const uid = (p) => `${p}${Math.random().toString(36).slice(2, 6)}`

// alinha a peça para que o 1.º pino caia na grelha de 0,1"
function snapSch(type, x, y, rot) {
  const lp = pins2dLocal(type)[0]
  if (!lp) return { x: Math.round(x / 5) * 5, y: Math.round(y / 5) * 5, rot }
  const [rx, ry] = rot2d(lp.xy, rot)
  const px = Math.round((x + rx) / PITCH_PX) * PITCH_PX
  const py = Math.round((y + ry) / PITCH_PX) * PITCH_PX
  return { x: px - rx, y: py - ry, rot }
}

function freeSchSpot(parts, type) {
  const info = view2dInfo(type)
  const placed = parts.filter((p) => p.sch)
  if (!placed.length) return { x: 0, y: 0 }
  const maxX = Math.max(...placed.map((p) => p.sch.x + view2dInfo(p.type).w / 2))
  const minY = Math.min(...placed.map((p) => p.sch.y - view2dInfo(p.type).h / 2))
  return { x: maxX + 60 + info.w / 2, y: minY + info.h / 2 }
}

function free3dSpot(parts) {
  const roots = parts.filter((p) => !p.parent)
  for (let r = 0; r < 12; r++) {
    for (let k = 0; k < Math.max(1, r * 6); k++) {
      const a = (k / Math.max(1, r * 6)) * Math.PI * 2
      const x = Math.round(Math.cos(a) * r * 12)
      const z = Math.round(Math.sin(a) * r * 12) + 0
      if (roots.every((p) => Math.hypot(p.pos[0] - x, p.pos[2] - z) > 11)) return [x, 0, z]
    }
  }
  return [0, 0, 0]
}

// escolhe automaticamente onde fixar uma peça nova (ex.: motor no chassi)
function autoMount(parts, type) {
  // veículos (chassi 2WD/4WD): primeiro mount de motor livre
  const chassis = parts.find((p) => DEFS[p.type]?.vehicle && !p.parent)
  if (chassis && type === 'motor') {
    const slots = Object.entries(DEFS[chassis.type].mounts || {}).filter(([, m]) => m.slot === 'motor').map(([k]) => k)
    for (const slot of slots) if (!parts.some((p) => p.parent?.id === chassis.id && p.parent.mount === slot)) return { parent: { id: chassis.id, mount: slot }, pos: [0, 0, 0] }
  }
  // moldura dentada: no eixo fixo do servo que já tem a engrenagem
  if (DEFS[type]?.onAxle) {
    const sv = axleHostFor(parts)
    if (sv) return { parent: { id: sv.id, mount: 'eixo' }, pos: [0, 0, 0], rot: [0, 0, 0] }
  }
  if (chassis && type === 'ir') {
    const n = parts.filter((p) => p.parent?.id === chassis.id && p.parent.mount === 'bottom').length
    return { parent: { id: chassis.id, mount: 'bottom' }, pos: [10, 0, [-1.7, 1.7, 0, -3.4, 3.4][n % 5]] }
  }
  return null
}

export const useStore = create((set, get) => ({
  // normalizeSeating: peças da breadboard assentes na pose real (projetos antigos; shared/placement.js)
  parts: normalizeSeating(fixAxleParents(saved?.parts ?? [])),
  wires: saved?.wires ?? [],
  code: saved?.code ?? NEW_SKETCH,
  track: saved?.track ?? 'mesa',
  projectName: saved?.projectName ?? t('wb.projects.newTitle'),
  lang: saved?.lang ?? 'cpp', // linguagem do programa: 'cpp' (Arduino C/C++) ou 'fogu'
  libs: saved?.libs ?? [], // bibliotecas do utilizador: [{ name, files: { 'X.h': texto, 'X.cpp': texto } }]
  nvm: saved?.nvm ?? null, // EEPROM / Preferences da placa (persistem entre simulações)
  // motor de simulação: 'auto' (emulação real quando possível) | 'real' (arduino-cli + avr8js) | 'fast' (tradutor)
  simEngine: saved?.simEngine ?? 'auto',
  savedHash: saved?.savedHash ?? null, // impressão do projeto na última gravação (alterações por guardar)
  saving: false,
  simEngineUsed: null, // motor da simulação a correr: 'avr' | 'transpiler'

  // UI
  view: saved?.view ?? 'split', // '2d' | '3d' | 'split'
  view2d: { x: 0, y: 0, zoom: 0.9 },
  mode: 'build',
  selected: null,
  pendingPin: null, // {part, pin, pts: []}
  wireColor: '#22c55e',
  leftTab: 'parts',
  tab: saved?.tab ?? 'circuit', // separador principal: '3d' | 'circuit' | 'code' | 'split'
  consoleOpen: true,
  compiling: false,
  compileResult: null, // { ok, diagnostics: [{line,col,severity,message}], compiler, ms }
  compileNetError: null, // falha no pedido HTTP de compilação (sem rede…)
  issues: [], // diagnóstico elétrico calculado no backend
  examples: [], // [{id, name, track}] do backend
  snippets: {}, // trechos de código do backend
  pickerOpen: false,
  inputsTick: 0,
  diagOpen: false,
  editorOpen: true,
  showCode: true,
  followCam: true,
  simSpeed: 1,
  paused: false,
  serial: [],
  telemetry: null,
  simError: null,
  realism: true,
  showTrail: true,
  show3dWires: true,
  thumbs: {},
  toast: null,
  consoleTab: 'monitor', // 'monitor' | 'plotter'
  scopeOpen: false,

  set: (patch) => set(patch),
  // pontos de passagem 3D de um fio (vista 3D; [] / null = percurso automático)
  wirePt: null,
  setWirePts3d: (id, pts) => set((s) => ({ wires: s.wires.map((w) => (w.id === id ? { ...w, pts3d: pts?.length ? pts : undefined } : w)) })),
  // muda um ponto de passagem 3D (sliders do painel); p = [x, y, z] em cm
  setWirePt3d: (id, i, p) => set((s) => ({ wires: s.wires.map((w) => (w.id === id && w.pts3d?.[i] ? { ...w, pts3d: w.pts3d.map((v, j) => (j === i ? p : v)) } : w)) })),
  // cantos do fio no esquema 2D (wire.pts, em px); wirePt2d = canto escolhido no painel
  wirePt2d: null,
  setWirePts2d: (id, pts) => set((s) => ({ wires: s.wires.map((w) => (w.id === id ? { ...w, pts } : w)) })),

  addPart: (type, opts = {}) => {
    const def = DEFS[type]
    const { parts } = get()
    const p = { id: uid(type.slice(0, 3)), type, config: defaultConfig(type), parent: null, pos: [0, 0, 0], rot: [0, 0, 0], sch: null }
    if (has2d(type)) {
      const spot = opts.sch || freeSchSpot(parts, type)
      p.sch = snapSch(type, spot.x, spot.y, 0)
    }
    const auto = opts.mount || autoMount(parts, type)
    if (auto) Object.assign(p, auto)
    else p.pos = opts.pos || free3dSpot(parts)
    if (def.vehicle && !opts.pos) {
      const st = getTrack(get().track).start
      if (!parts.some((x) => DEFS[x.type]?.vehicle)) {
        p.pos = [st.x, 0, st.z]
        p.rot = [0, (st.theta * 180) / Math.PI, 0]
      }
    }
    let next = [...parts, p]
    if (p.sch) next = syncBreadboards(next)
    // pousada na mesa: não fica dentro de outra peça (em cima dela ou no sítio livre mais perto)
    if (!next.find((q) => q.id === p.id)?.parent) {
      const fp = placeNew(next, p.id, get().track)
      if (fp) next = next.map((q) => (q.id === p.id ? { ...q, pos: fp } : q))
    }
    set({ parts: next, selected: { kind: 'part', id: p.id } })
    get().notify(`${def.name} adicionado${auto?.parent ? ` (${mountsOf(parts.find((x) => x.id === auto.parent.id))[auto.parent.mount].label})` : ''}`)
    return p
  },
  notify: (msg) => {
    set({ toast: { msg, t: Date.now() } })
    setTimeout(() => {
      if (get().toast?.msg === msg) set({ toast: null })
    }, 2600)
  },
  moveSch: (id, x, y, final = false) =>
    set((s) => {
      // as peças encaixadas num soquete (Pico na Pico4Drive) acompanham a placa-mãe
      let parts = followSockets(s.parts.map((p) => (p.id === id ? { ...p, sch: snapSch(p.type, x, y, p.sch.rot || 0) } : p)), id)
      if (final) parts = syncBreadboards(parts)
      return { parts }
    }),
  // fim de um arrasto (2D ou 3D). plugId: a peça que o utilizador pôs sobre os furos no 2D
  // (encaixa-a mesmo que estivesse desencaixada; módulos: a barra de pinos passa para baixo)
  finishMoves: (plugId) => {
    const before = plugId && seatStatus(get().parts, plugId)
    const prev = plugId && get().parts.find((p) => p.id === plugId)
    set((s) => ({ parts: syncBreadboards(s.parts, { plug: plugId }) }))
    if (!plugId) return
    const now = get().parts.find((p) => p.id === plugId)
    const msg = seatMessage(before, seatStatus(get().parts, plugId))
    const flipped = now && prev && now.config?.pinosDir === 'baixo' && prev.config?.pinosDir !== 'baixo'
    if (msg || flipped) get().notify(flipped ? 'Encaixado na breadboard (barra de pinos virada para baixo)' : msg)
  },
  rotateSch: (id) => {
    const before = seatStatus(get().parts, id)
    set((s) => ({
      parts: syncBreadboards(followSockets(s.parts.map((p) => (p.id === id && p.sch ? { ...p, sch: snapSch(p.type, p.sch.x, p.sch.y, ((p.sch.rot || 0) + 90) % 360) } : p)), id), { plug: id }),
    }))
    const msg = seatMessage(before, seatStatus(get().parts, id))
    if (msg) get().notify(msg)
  },
  seatStatusOf: (id) => seatStatus(get().parts, id),
  // fim do arrasto 3D de uma peça da breadboard (before = estado do encaixe no início)
  dropOnBreadboard: (id, before) => {
    set((s) => ({ parts: syncBreadboards(s.parts) }))
    const after = seatStatus(get().parts, id)
    const msg = before && !after ? t('wb.store.offBreadboard') : seatMessage(before, after)
    if (msg) get().notify(msg)
  },
  // encaixa de novo uma peça desencaixada (botão do painel): assente na pose do 2D
  reseat: (id) => get().finishMoves(id),
  // arrasto 3D de uma peça na breadboard: de furo em furo, o 2D acompanha (shared/placement.js)
  dragOnBreadboard: (id, pos) => set((s) => ({ parts: moveOnBreadboard(s.parts, id, pos, { final: false }) })),
  update3d: (id, patch) => {
    const before = seatStatus(get().parts, id)
    get().update3dRaw(id, patch)
    // mudou a pose de uma peça sobre os furos: encaixada só se ficou assente (shared/seating.js)
    if (!('pos' in patch && Object.keys(patch).length === 1)) set((s) => ({ parts: reconcileSeat(s.parts, id) }))
    const msg = seatMessage(before, seatStatus(get().parts, id))
    if (msg) get().notify(msg)
  },
  update3dRaw: (id, patch) =>
    set((s) => ({
      parts: fixAxleParents(s.parts.map((p) => {
        if (p.id !== id) return p
        const n = { ...p, ...patch }
        // "Fixar em" um soquete: encaixa (3D na origem do soquete + pinos alinhados no 2D)
        const host = patch.parent && s.parts.find((q) => q.id === patch.parent.id)
        if (host && socketMount(host.type, patch.parent.mount)) return placeInSocket(n, host, patch.parent.mount)
        // saiu de um soquete: afasta-a também no 2D (senão os pinos continuavam encaixados)
        const was = p.parent && s.parts.find((q) => q.id === p.parent.id)
        if ('parent' in patch && was && socketMount(was.type, p.parent.mount) && p.sch && (patch.parent?.id !== p.parent.id || patch.parent?.mount !== p.parent.mount)) n.sch = { ...p.sch, y: p.sch.y + 160 }
        const slot = n.parent && mountsOf(s.parts.find((q) => q.id === n.parent.id) || { type: 'arduino' })[n.parent.mount]?.slot
        if (slot) {
          n.pos = [0, 0, 0]
          n.rot = [0, 0, 0]
        }
        return n
      })),
    })),
  // posição escrita no painel: com colisão (functions/buildCollision.js) — encosta/pousa em
  // cima da peça que estiver no caminho em vez de ficar dentro dela
  move3d: (id, pos) => {
    const s = get()
    const part = s.parts.find((p) => p.id === id)
    // na breadboard: de furo em furo, não entra nela, levantada = desencaixada
    if (movesOnBreadboard(s.parts, part)) {
      const before = seatStatus(s.parts, id)
      set({ parts: moveOnBreadboard(s.parts, id, pos) })
      const msg = seatMessage(before, seatStatus(get().parts, id))
      if (msg) get().notify(msg)
      else if (pos[1] < (get().parts.find((p) => p.id === id)?.pos[1] ?? 0) - 1e-3) get().notify(t('wb.store.adjustedBreadboard'))
      return
    }
    const r = resolvePos(s.parts, id, pos, s.track)
    get().update3d(id, { pos: r.pos })
    if (r.adjusted) get().notify(t('wb.store.adjustedPart'))
  },
  // roda a peça `deg` graus em torno do eixo X/Y/Z FIXO do referencial do pai (mesa ou ponto
  // de fixação). Compõe quaterniões em vez de somar ângulos de Euler: somar ao Euler fazia
  // X e Z rodarem em torno do mesmo eixo quando Y estava a ±90° (gimbal lock).
  rotate3d: (id, axis, deg = 90) => {
    const s0 = get()
    const part = s0.parts.find((p) => p.id === id)
    const before = seatStatus(s0.parts, id)
    // encaixada na breadboard e a rodar 90° em y: roda no 2D também (continua encaixada se os
    // pinos caírem noutros furos); inclinar (x/z) tira-a dos furos
    if (before === 'in' && axis === 1 && deg % 90 === 0 && part?.sch) {
      const view = view2dInfo(part.type)?.view
      if (view) {
        const rot = ((((part.sch.rot || 0) - deg) % 360) + 360) % 360
        set((s) => ({ parts: syncBreadboards(s.parts.map((p) => (p.id === id ? { ...p, sch: snapSch(p.type, p.sch.x, p.sch.y, rot) } : p)), { plug: id }) }))
        const msg = seatMessage(before, seatStatus(get().parts, id))
        if (msg) get().notify(msg)
        return
      }
    }
    set((s) => ({ parts: reconcileSeat(s.parts.map((p) => (p.id === id ? { ...p, rot: rotateEuler(p.rot || [0, 0, 0], axis, deg) } : p)), id) }))
    const msg = seatMessage(before, seatStatus(get().parts, id))
    if (msg) get().notify(msg)
  },
  // nome dado pelo utilizador a uma peça (vazio = nome automático, ex.: "Servo 2")
  renamePart: (id, label) => set((s) => ({ parts: s.parts.map((p) => (p.id === id ? { ...p, label: label.trim() ? label.slice(0, 40) : undefined } : p)) })),
  // grava o projeto neste browser (localStorage — services/api.js)
  saveProject: async () => {
    const st = get()
    if (st.saving) return
    set({ saving: true })
    try {
      await api.saveProject(st)
      set({ savedHash: projectHash(get()) })
      get().notify(t('wb.store.saved', { name: st.projectName }))
    } catch {
      get().notify(t('wb.store.saveFailed'))
    } finally {
      set({ saving: false })
    }
  },
  resetRot3d: (id) => {
    const before = seatStatus(get().parts, id)
    set((s) => ({ parts: reconcileSeat(s.parts.map((p) => (p.id === id ? { ...p, rot: [0, 0, 0] } : p)), id) }))
    const msg = seatMessage(before, seatStatus(get().parts, id))
    if (msg) get().notify(msg)
  },
  updateConfig: (id, patch) => set((s) => ({ parts: s.parts.map((p) => (p.id === id ? { ...p, config: { ...p.config, ...patch } } : p)) })),
  // duplica a peça escolhida (Ctrl/⌘+D) — ver duplicatePart
  duplicateSelected: () => {
    const { selected } = get()
    return selected?.kind === 'part' ? get().duplicatePart(selected.id) : null
  },
  // Duplica uma peça com tudo o que está fixo nela e os fios entre essas peças
  // (shared/duplicate.js). A cópia fica ao lado do original, no 2D e no 3D, e fica escolhida.
  // Encaixada numa breadboard/soquete: a cópia fica solta na mesa (os furos já estão ocupados).
  duplicatePart: (id) => {
    const s0 = get()
    if (s0.mode !== 'build') return null
    const src = s0.parts.find((p) => p.id === id)
    const dup = src && duplicateParts(s0.parts, s0.wires, id, { uid })
    if (!dup) return null
    let { parts, wires } = dup
    const patch = (fn) => (parts = parts.map((p) => (p.id === dup.rootId ? fn(p) : p)))
    // 3D: o sítio livre mais perto do original, à mesma altura (ao lado, não em cima dele)
    let moved = null
    try {
      const mv = beginMove(parts, dup.rootId, { ignoreStart: false, track: s0.track })
      const [x0, y0, z0] = mv?.start || []
      const max = dup.where === 'mount' ? 30 : 120
      search: for (let r = 1; mv && r <= max; r += r < 12 ? 1 : 3) {
        for (const [ux, uz] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
          const e = mv.evaluate(ux * r, uz * r)
          if (e.ok && Math.abs(e.dy) < 0.01) {
            moved = [ux * r, uz * r]
            patch((p) => ({ ...p, pos: [x0 + ux * r, y0, z0 + uz * r] }))
            break search
          }
        }
      }
    } catch {
      /* sem caixa de colisão: fica com o afastamento simples abaixo */
    }
    if (!moved) {
      if (dup.where === 'mount') patch((p) => ({ ...p, pos: [(p.pos?.[0] || 0) + 2, p.pos?.[1] || 0, (p.pos?.[2] || 0) + 2] }))
      else if (dup.where !== 'slot') {
        const fp = placeNew(parts, dup.rootId, s0.track)
        if (fp) patch((p) => ({ ...p, pos: fp }))
      }
    }
    // pontos de passagem 3D dos fios copiados (coordenadas do mundo): acompanham a cópia se
    // ela só se deslocou na mesa; senão o fio volta ao percurso automático
    const shift = dup.where === 'table' && moved
    const copied = new Set(dup.wireIds)
    wires = wires.map((w) => {
      if (!copied.has(w.id) || !w.pts3d) return w
      return { ...w, pts3d: shift ? w.pts3d.map(([x, y, z]) => [x + moved[0], y, z + moved[1]]) : undefined }
    })
    parts = syncBreadboards(fixAxleParents(parts))
    set({ parts, wires, selected: { kind: 'part', id: dup.rootId } })
    const extra = dup.idMap.size - 1
    get().notify(extra ? t('wb.store.duplicatedMany', { name: DEFS[src.type].name, n: extra }) : t('wb.store.duplicated', { name: DEFS[src.type].name }))
    return get().parts.find((p) => p.id === dup.rootId) || null
  },
  removeSelected: () => {
    const { selected } = get()
    if (!selected) return
    if (selected.kind === 'part') {
      set((s) => {
        // os filhos voltam para a mesa
        const gone = s.parts.find((p) => p.id === selected.id)
        const parts = s.parts
          .filter((p) => p.id !== selected.id)
          .map((p) => (p.parent?.id === selected.id ? { ...p, parent: null, pos: [gone.pos[0] + (p.pos[0] || 0), 0, gone.pos[2] + (p.pos[2] || 0)], rot: [0, 0, 0] } : p))
        return { parts, wires: s.wires.filter((w) => w.a.part !== selected.id && w.b.part !== selected.id), selected: null }
      })
    } else set((s) => ({ wires: s.wires.filter((w) => w.id !== selected.id), selected: null }))
  },
  clickPin: (partId, pinId, finalPts) => {
    const { pendingPin, wires, parts, wireColor } = get()
    if (!pendingPin) {
      set({ pendingPin: { part: partId, pin: pinId, pts: [] } })
      return
    }
    if (pendingPin.part === partId && pendingPin.pin === pinId) {
      set({ pendingPin: null })
      return
    }
    const kindOf = (pid, pin) => DEFS[parts.find((x) => x.id === pid).type].pins.find((x) => x.id === pin)?.kind
    const color = autoWireColor(kindOf(pendingPin.part, pendingPin.pin), kindOf(partId, pinId), wireColor)
    const wire = { id: uid('w'), a: { part: pendingPin.part, pin: pendingPin.pin }, b: { part: partId, pin: pinId }, color, pts: finalPts ?? pendingPin.pts ?? [] }
    set({ wires: [...wires, wire], pendingPin: null })
  },
  addWaypoint: (x, y) => set((s) => (s.pendingPin ? { pendingPin: { ...s.pendingPin, pts: [...s.pendingPin.pts, [x, y]] } } : {})),
  loadPreset: async (key) => {
    try {
      const p = await api.example(key)
      const ok = withoutUnknownParts(p.parts, p.wires)
      set({ parts: normalizeSeating(ok.parts), wires: ok.wires, code: p.code, track: p.track, projectName: p.projectName, libs: p.libs || [], lang: p.lang || 'cpp', codeAlt: p.alt ? { ...p.alt, name: p.projectName } : null, nvm: null, selected: null, pendingPin: null, mode: 'build', view2d: { x: 0, y: 0, zoom: 0.8 } })
    } catch {
      get().notify(t('wb.store.exampleFailed'))
    }
  },
  placeOnTrackStart: () => {
    const st = getTrack(get().track).start
    set((s) => ({ parts: s.parts.map((q) => (DEFS[q.type]?.vehicle && !q.parent ? { ...q, pos: [st.x, 0, st.z], rot: [0, (st.theta * 180) / Math.PI, 0] } : q)) }))
  },
  newProject: () => set({ parts: [], wires: [], selected: null, pendingPin: null, code: NEW_SKETCH, projectName: t('wb.projects.newTitle'), track: 'mesa', libs: [], lang: 'cpp', codeAlt: null, nvm: null }),
  log: (text, level) => set((s) => ({ serial: [...s.serial.slice(-400), { text, level }] })),
}))

// gravação automática
let saveTimer = null
useStore.subscribe((s) => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ parts: s.parts, wires: s.wires, code: s.code, track: s.track, view: s.view, tab: s.tab, projectName: s.projectName, libs: s.libs, lang: s.lang, nvm: s.nvm, simEngine: s.simEngine, savedHash: s.savedHash }))
    } catch {
      /* ignora */
    }
  }, 400)
})

// exemplos e trechos de código (calculados no browser — services/api.js)
api.examples().then((examples) => useStore.setState({ examples })).catch(() => {})
api.snippets().then((r) => useStore.setState({ snippets: r.snippets })).catch(() => {})
if (!saved) useStore.getState().loadPreset('seguidor')

// diagnóstico elétrico (no browser) sempre que a montagem muda
let diagTimer = null
let diagKey = null
useStore.subscribe((s) => {
  if (s.parts === diagKey?.parts && s.wires === diagKey?.wires) return
  diagKey = { parts: s.parts, wires: s.wires }
  clearTimeout(diagTimer)
  diagTimer = setTimeout(() => {
    api.diagnose(s.parts, s.wires).then((issues) => useStore.setState({ issues })).catch(() => {})
  }, 250)
})

// nada abaixo do chão (functions/ground.js): na construção, uma montagem que fique com alguma
// parte abaixo da mesa (rodada, peça grande presa por baixo, projeto antigo) é subida
let grounding = false
useStore.subscribe((s, prev) => {
  if (grounding || s.parts === prev.parts || s.mode !== 'build') return
  const g = groundParts(s.parts)
  if (g === s.parts) return
  grounding = true
  useStore.setState({ parts: g })
  grounding = false
})

export { CHASSIS }
{
  const s0 = useStore.getState()
  diagKey = { parts: s0.parts, wires: s0.wires }
  api.diagnose(s0.parts, s0.wires).then((issues) => useStore.setState({ issues })).catch(() => {})
}

// depuração e capturas automáticas (só em desenvolvimento): window.__store na consola
if (import.meta.env?.DEV && typeof window !== 'undefined') window.__store = useStore
