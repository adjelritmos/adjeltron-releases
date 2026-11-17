// Árvore de montagem (sem dependências): quem está fixo a quem.
import { m } from './i18n.js'
import { DEFS, mountsOf } from './components.js'

export function servoHornRotation(angleDeg) {
  return [0, angleDeg - 90, 0]
}

export function rootOf(parts, id) {
  const byId = new Map(parts.map((p) => [p.id, p]))
  let p = byId.get(id)
  while (p?.parent && byId.get(p.parent.id)) p = byId.get(p.parent.id)
  return p
}

export function isAncestor(parts, ancestorId, id) {
  const byId = new Map(parts.map((p) => [p.id, p]))
  let p = byId.get(id)
  while (p?.parent) {
    if (p.parent.id === ancestorId) return true
    p = byId.get(p.parent.id)
  }
  return false
}

export function childrenOf(parts, id, mount) {
  return parts.filter((p) => p.parent?.id === id && (!mount || p.parent.mount === mount))
}

// pontos de fixação disponíveis para uma peça (exclui ela própria e descendentes)
export function mountOptions(parts, part) {
  const opts = DEFS[part.type]?.onAxle ? [] : [{ id: null, mount: null, label: m('Mesa / chão', 'Table / floor') }]
  for (const q of parts) {
    if (q.id === part.id || isAncestor(parts, part.id, q.id)) continue
    for (const [mid, m] of Object.entries(mountsOf(q))) {
      // peças que vivem no eixo fixo de um servo (moldura dentada): só "eixo", nunca algo que rode
      if (DEFS[part.type]?.onAxle && mid !== 'eixo') continue
      if (m.slot && m.slot !== part.type) continue
      if (m.socket && !(m.socket.accepts?.includes(part.type) || (m.socket.form && DEFS[part.type]?.form === m.socket.form))) continue // soquete (shared/sockets.js)
      if ((m.slot || m.socket) && parts.some((x) => x.id !== part.id && x.parent?.id === q.id && x.parent.mount === mid)) continue
      if (mid === 'grip') continue
      opts.push({ id: q.id, mount: mid, label: `${q.label?.trim() ? `${q.label.trim()} (${DEFS[q.type].short || DEFS[q.type].name})` : DEFS[q.type].name} → ${m.label}` })
    }
  }
  return opts
}

// Peças com onAxle (moldura dentada) presas por engano em algo que roda — o braço do servo ou
// a engrenagem presa nele — passam para o eixo fixo desse servo (senão rodavam com a
// engrenagem em vez de deslizarem). Devolve o mesmo array se não houver nada a corrigir.
export function fixAxleParents(parts) {
  const byId = new Map(parts.map((p) => [p.id, p]))
  let changed = false
  const out = parts.map((p) => {
    if (!DEFS[p.type]?.onAxle || !p.parent) return p
    let host = byId.get(p.parent.id)
    let mount = p.parent.mount
    // engrenagem (ou outra peça no estriado) → o servo onde está
    if (host && !DEFS[host.type]?.mounts?.eixo && host.parent) {
      mount = host.parent.mount
      host = byId.get(host.parent.id)
    }
    if (!host || !DEFS[host.type]?.mounts?.eixo || (host.id === p.parent.id && mount === 'eixo' && p.parent.mount === 'eixo')) return p
    if (host.id === p.parent.id && p.parent.mount === 'eixo') return p
    changed = true
    return { ...p, parent: { id: host.id, mount: 'eixo' }, pos: [0, 0, 0], rot: [0, 0, 0] }
  })
  return changed ? out : parts
}

// servo com uma engrenagem no braço e o eixo livre: onde a moldura dentada encaixa sozinha
export function axleHostFor(parts) {
  for (const g of parts) {
    if (!DEFS[g.type]?.gear || g.parent?.mount !== 'horn') continue
    const sv = parts.find((q) => q.id === g.parent.id)
    if (sv && DEFS[sv.type]?.mounts?.eixo && !parts.some((q) => q.parent?.id === sv.id && q.parent.mount === 'eixo')) return sv
  }
  return null
}
