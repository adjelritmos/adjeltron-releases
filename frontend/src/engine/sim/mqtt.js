// Broker MQTT do adjeltron (um só para todo o servidor, partilhado).
// Clientes "internos" (sketches com PubSubClient a apontar para localhost, painéis MQTT do
// browser) e clientes de rede verdadeiros (Node-RED, MQTT Explorer, mosquitto_sub… por TCP
// 1883 ou WebSocket 9001 — ver mqtt-server.js) partilham as mesmas subscrições,
// mensagens retidas, testamentos e sessões persistentes.
// Os payloads são "texto binário" (1 carácter = 1 byte).

import * as i18n from '../../../../shared/i18n.js'
const sessions = new Map() // clientId -> sessão (ligada, ou desligada mas persistente)
const retained = new Map() // tópico -> { payload, qos, at }
const listeners = new Set() // observadores de tudo o que passa (estatísticas)
let seq = 0
const MAX_QUEUE = 1000 // mensagens QoS>0 guardadas para uma sessão persistente desligada

// tópico válido para publicar: sem wildcards, não vazio
export const validTopic = (t) => typeof t === 'string' && t.length > 0 && t.length < 65536 && !/[+#\0]/.test(t)
// filtro válido para subscrever: '+' ocupa um nível inteiro, '#' só no fim
export function validFilter(f) {
  if (typeof f !== 'string' || !f.length || f.length > 65535 || f.includes('\0')) return false
  const lv = f.split('/')
  return lv.every((l, i) => (l.includes('+') ? l === '+' : true) && (l.includes('#') ? l === '#' && i === lv.length - 1 : true))
}
// o filtro (com + e #) aceita o tópico? (tópicos começados por $ não casam com wildcards no 1.º nível)
export function topicMatches(filter, topic) {
  if (filter === topic) return true
  const f = filter.split('/')
  const t = topic.split('/')
  if (topic.startsWith('$') && (f[0] === '+' || f[0] === '#')) return false
  for (let i = 0; i < f.length; i++) {
    if (f[i] === '#') return true
    if (i >= t.length) return false
    if (f[i] !== '+' && f[i] !== t[i]) return false
  }
  return f.length === t.length
}

// caracteres > 255 (texto Unicode vindo de JS) passam a bytes UTF-8
const norm = (p) => {
  const s = String(p ?? '')
  return /[^\x00-\xff]/.test(s) ? Buffer.from(s, 'utf8').toString('latin1') : s
}

function route(topic, payload, retain, qos, origin) {
  const msg = { topic, payload: norm(payload), retain: !!retain, qos: qos | 0, origin, id: ++seq, at: Date.now() }
  if (retain) {
    // retido com payload vazio apaga a mensagem retida
    if (msg.payload === '') retained.delete(topic)
    else retained.set(topic, { payload: msg.payload, qos: msg.qos, at: msg.at })
  }
  for (const s of sessions.values()) {
    let best = -1
    let rap = false
    for (const [f, o] of s.subs) {
      if (o.nl && s.id === origin) continue
      if (topicMatches(f, topic)) {
        best = Math.max(best, o.qos)
        rap ||= o.rap
      }
    }
    if (best < 0) continue
    // quem recebe "ao vivo" vê retain=false (só as retidas entregues ao subscrever vêm com retain)
    const m = { ...msg, retain: rap ? msg.retain : false, qos: Math.min(best, msg.qos) }
    if (s.open) s.push(m)
    else if (m.qos > 0 && s.queue.length < MAX_QUEUE) s.queue.push(m)
  }
  for (const l of listeners) l(msg)
}

export const broker = {
  // liga um cliente. opts: { clientId, onMessage(msg), will: { topic, payload, retain, qos }, kind, clean }
  // kind: 'sketch' | 'panel' | 'tcp' | 'ws'. Devolve a sessão (s.sessionPresent diz se havia sessão guardada).
  connect({ clientId, onMessage = () => {}, will = null, kind = 'sketch', clean = true, remote = '' }) {
    let id = String(clientId ?? '')
    if (!id) id = `anon-${Math.random().toString(36).slice(2, 10)}`
    const old = sessions.get(id)
    // o mesmo clientId já ligado: o broker desliga o anterior (comportamento normal do MQTT)
    if (old?.open) old.kick(i18n.m('outro cliente ligou-se com o mesmo clientId', 'another client connected with the same clientId'))
    const keep = !clean && old && sessions.get(id) === old
    const s = {
      id,
      kind,
      remote,
      subs: keep ? old.subs : new Map(), // filtro -> { qos, nl, rap }
      queue: keep ? old.queue : [],
      inflight: keep ? old.inflight : new Map(), // usado pelo transporte de rede (QoS 1/2)
      nextId: keep ? old.nextId : 1,
      sessionPresent: !!keep,
      clean,
      will,
      open: true,
      since: Date.now(),
      push: onMessage,
      kicked: null,
      kick(why) {
        if (!s.open) return
        s.close(false)
        s.kicked?.(why)
      },
      // devolve a QoS concedida (0..2) ou false se o filtro for inválido
      subscribe(filter, qos = 0, o = {}) {
        if (!s.open || !validFilter(filter)) return false
        const existed = s.subs.has(filter)
        const q = Math.max(0, Math.min(2, qos | 0))
        s.subs.set(filter, { qos: q, nl: !!o.nl, rap: !!o.rap })
        // mensagens retidas que casam com o novo filtro (MQTT 5: retain handling 1/2)
        if (o.rh === 2 || (o.rh === 1 && existed)) return q
        for (const [t, r] of retained) if (topicMatches(filter, t)) s.push({ topic: t, payload: r.payload, retain: true, qos: Math.min(q, r.qos), id: ++seq, at: Date.now() })
        return q
      },
      unsubscribe(filter) {
        return s.subs.delete(filter)
      },
      publish(topic, payload, retain = false, qos = 0) {
        if (!s.open || !validTopic(topic)) return false
        route(topic, payload, retain, qos, id)
        return true
      },
      // graceful = DISCONNECT enviado (sem testamento); senão publica o "last will"
      close(graceful = true) {
        if (!s.open) return
        s.open = false
        if (s.clean && sessions.get(id) === s) sessions.delete(id)
        if (!graceful && s.will?.topic) route(s.will.topic, s.will.payload ?? '', !!s.will.retain, s.will.qos | 0, id)
      },
      disconnect(graceful = true) {
        s.close(graceful)
      },
    }
    sessions.set(id, s)
    return s
  },
  // publicação "anónima" (ex.: verificação dos exemplos)
  publish(topic, payload, retain = false, qos = 0, origin = 'robolab') {
    if (!validTopic(topic)) return false
    route(topic, payload, retain, qos, origin)
    return true
  },
  onAny(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
  stats() {
    const on = [...sessions.values()].filter((s) => s.open)
    const net = on.filter((s) => s.kind === 'tcp' || s.kind === 'ws')
    return {
      clients: on.length,
      sketches: on.filter((s) => s.kind === 'sketch').length,
      external: net.length,
      externalIds: net.slice(0, 8).map((s) => s.id),
      retained: retained.size,
    }
  },
  retainedTopics: () => [...retained.keys()],
  // para os testes
  _reset() {
    for (const s of [...sessions.values()]) s.close(true)
    sessions.clear()
    retained.clear()
  },
}
