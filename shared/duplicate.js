// Duplicar uma peça da bancada (sem dependências do browser: também corre nos testes).
//
// Copia a peça e tudo o que está fixo nela (filhos, netos… — ex.: chassi com motores, servo
// com suporte no braço, breadboard com o circuito encaixado), com ids novos:
//   - os `parent.id` dentro da cópia apontam para as peças copiadas;
//   - os fios com AS DUAS pontas dentro da cópia são copiados; os que vão para fora, não;
//   - listas de peças na config (campos `type: 'parts'`, ex.: polias de uma correia) passam a
//     apontar para as cópias quando a peça referida também foi copiada.
// No 2D o conjunto vai inteiro para um sítio livre ao lado do original (nenhum pino fica por
// cima de pinos de outras peças: no 2D pinos sobrepostos = ligação elétrica).
// A peça de topo (a que o utilizador escolheu):
//   - na mesa: fica na mesa (o chamador afasta-a no 3D — ver store.duplicatePart);
//   - encaixada numa breadboard ou num soquete: a cópia fica SOLTA na mesa ao lado (os furos
//     e o soquete já estão ocupados pelo original);
//   - num ponto de fixação de lugar único (slot: motor do chassi…): vai para outro lugar livre
//     do mesmo tipo na mesma peça; se não houver, fica solta na mesa;
//   - noutro ponto de fixação (tampo do chassi, braço do servo…): fica fixa no mesmo sítio
//     (o chamador afasta-a um pouco).
import { DEFS, mountsOf, pins2dLocal, rot2d, view2dInfo, PITCH_PX } from './components.js'
import { rootOf } from './assembly.js'
import { socketMount } from './sockets.js'

// ids da peça e de todos os descendentes (pela ordem do projeto)
export function subtreeIds(parts, id) {
  const ids = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const p of parts) {
      if (p.parent && ids.has(p.parent.id) && !ids.has(p.id)) {
        ids.add(p.id)
        grew = true
      }
    }
  }
  return ids
}

// caixa 2D (px) de uma peça: a imagem e os pinos (as pernas podem sair da imagem)
function schBox(p) {
  if (!p.sch) return null
  const info = view2dInfo(p.type)
  const rot = p.sch.rot || 0
  const pts = []
  if (info) {
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) pts.push(rot2d([(sx * info.w) / 2, (sy * info.h) / 2], rot))
  }
  for (const lp of pins2dLocal(p.type)) pts.push(rot2d(lp.xy, rot))
  if (!pts.length) pts.push([0, 0])
  const xs = pts.map((q) => q[0] + p.sch.x)
  const ys = pts.map((q) => q[1] + p.sch.y)
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}
const union = (boxes) => ({ x0: Math.min(...boxes.map((b) => b.x0)), y0: Math.min(...boxes.map((b) => b.y0)), x1: Math.max(...boxes.map((b) => b.x1)), y1: Math.max(...boxes.map((b) => b.y1)) })

// deslocamento 2D (múltiplo do passo de 0,1": os pinos continuam na grelha) para o sítio
// livre mais perto do original — primeiro à direita, depois por baixo, depois à volta
function freeSchDelta(boxes, obstacles) {
  if (!boxes.length) return [0, 0]
  const g = union(boxes)
  const GAP = 2 * PITCH_PX
  const snapUp = (v) => Math.ceil(v / PITCH_PX) * PITCH_PX
  const free = (dx, dy) => boxes.every((b) => obstacles.every((o) => b.x1 + dx + GAP <= o.x0 || b.x0 + dx - GAP >= o.x1 || b.y1 + dy + GAP <= o.y0 || b.y0 + dy - GAP >= o.y1))
  const sx = snapUp(g.x1 - g.x0 + GAP)
  const sy = snapUp(g.y1 - g.y0 + GAP)
  for (let r = 1; r <= 40; r++) {
    const ring = []
    for (let i = -r; i <= r; i++) {
      for (let j = -r; j <= r; j++) if (Math.max(Math.abs(i), Math.abs(j)) === r) ring.push([i, j])
    }
    // à direita e por baixo primeiro; depois o mais perto
    const score = ([i, j]) => Math.hypot(i * sx, j * sy) + (i < 0 ? 0.5 : 0) + (j < 0 ? 0.75 : 0) + (i && j ? 0.25 : 0) + (j && !i ? 0.1 : 0)
    ring.sort((a, b) => score(a) - score(b))
    for (const [i, j] of ring) if (free(i * sx, j * sy)) return [i * sx, j * sy]
  }
  // (nunca deve acontecer) à direita de tudo
  return [snapUp(Math.max(...obstacles.map((o) => o.x1)) - g.x0 + GAP), 0]
}

/**
 * Duplica a peça `id` e a sua subárvore.
 * opts.uid(prefixo) → id novo (o chamador dá o gerador; aqui garante-se que não se repete).
 * Devolve null se a peça não existir; senão
 *   { parts, wires }   projeto com as cópias acrescentadas
 *   rootId             id da cópia da peça escolhida
 *   idMap              Map id original → id da cópia
 *   wireIds            ids dos fios copiados
 *   where              onde ficou a cópia de topo: 'table' (na mesa, mesma pose do original),
 *                      'loose' (saiu da breadboard/soquete/lugar ocupado: solta na mesa),
 *                      'slot' (noutro lugar livre da mesma peça), 'mount' (mesmo ponto de fixação)
 *   schDelta           [dx, dy] aplicado no 2D
 */
export function duplicateParts(parts, wires, id, opts = {}) {
  const root = parts.find((p) => p.id === id)
  if (!root) return null
  const ids = subtreeIds(parts, id)
  const taken = new Set(parts.map((p) => p.id))
  const rnd = opts.uid || ((p) => `${p}${Math.random().toString(36).slice(2, 6)}`)
  const fresh = (prefix, used) => {
    for (let i = 0; i < 1000; i++) {
      const n = rnd(prefix)
      if (!used.has(n)) {
        used.add(n)
        return n
      }
    }
    let k = used.size
    while (used.has(`${prefix}${k}`)) k++
    used.add(`${prefix}${k}`)
    return `${prefix}${k}`
  }
  const idMap = new Map()
  for (const p of parts) if (ids.has(p.id)) idMap.set(p.id, fresh(p.type.slice(0, 3), taken))

  // 2D: o conjunto inteiro para um sítio livre
  const group = parts.filter((p) => ids.has(p.id) && p.sch)
  const [dx, dy] = freeSchDelta(group.map(schBox), parts.map(schBox).filter(Boolean))

  // onde fica a peça de topo
  const host = root.parent && parts.find((q) => q.id === root.parent.id)
  const mount = host && mountsOf(host)[root.parent.mount]
  let where = 'table'
  let rootPatch = {}
  const loose = () => {
    // solta na mesa, ao lado da peça onde o original está (o chamador procura o sítio livre)
    const rp = (host && rootOf(parts, host.id)?.pos) || root.pos || [0, 0, 0]
    where = 'loose'
    rootPatch = { parent: null, unplugged: undefined, pos: [rp[0], 0, rp[2]], rot: [0, 0, 0] }
  }
  if (root.parent && !host) loose() // pai que já não existe
  else if (host) {
    const onBreadboard = DEFS[host.type]?.breadboard && root.parent.mount === 'top'
    if (onBreadboard || socketMount(host.type, root.parent.mount) || !mount || root.parent.mount === 'grip') loose()
    else if (mount.slot || root.parent.mount === 'eixo') {
      // lugar único: outro lugar livre do mesmo tipo na mesma peça
      const other = Object.entries(mountsOf(host)).find(([mid, m]) => m.slot && m.slot === mount.slot && !m.socket && !parts.some((x) => x.parent?.id === host.id && x.parent.mount === mid))
      if (other) {
        where = 'slot'
        rootPatch = { parent: { id: host.id, mount: other[0] }, pos: [0, 0, 0], rot: [0, 0, 0] }
      } else loose()
    } else where = 'mount'
  }

  // listas de peças na config (campos type: 'parts') → cópias, quando existem
  const cloneConfig = (p) => {
    const cfg = p.config == null ? p.config : JSON.parse(JSON.stringify(p.config))
    for (const f of DEFS[p.type]?.fields || []) {
      if (f.type === 'parts' && Array.isArray(cfg?.[f.key])) cfg[f.key] = cfg[f.key].map((x) => idMap.get(x) || x)
    }
    return cfg
  }
  const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)))
  const copies = parts
    .filter((p) => ids.has(p.id))
    .map((p) => {
      const n = { ...clone(p), id: idMap.get(p.id), config: cloneConfig(p) }
      if (p.sch) n.sch = { ...p.sch, x: p.sch.x + dx, y: p.sch.y + dy }
      if (p.id === id) Object.assign(n, rootPatch)
      else n.parent = { ...p.parent, id: idMap.get(p.parent.id) }
      if (n.unplugged === undefined) delete n.unplugged
      return n
    })

  const wireTaken = new Set(wires.map((w) => w.id))
  const wireCopies = wires
    .filter((w) => ids.has(w.a.part) && ids.has(w.b.part))
    .map((w) => ({
      ...clone(w),
      id: fresh('w', wireTaken),
      a: { ...w.a, part: idMap.get(w.a.part) },
      b: { ...w.b, part: idMap.get(w.b.part) },
      pts: (w.pts || []).map(([x, y]) => [x + dx, y + dy]),
    }))

  return {
    parts: [...parts, ...copies],
    wires: [...wires, ...wireCopies],
    rootId: idMap.get(id),
    idMap,
    wireIds: wireCopies.map((w) => w.id),
    where,
    schDelta: [dx, dy],
  }
}
