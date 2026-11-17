// Parte de rede de uma sessão de simulação (usada por session.js):
//  - id da sessão + ponte HTTP para o WebServer do sketch (gateway.js, /api/gw/<id>/…)
//  - painel MQTT do browser: um cliente MQTT por sessão ("telemóvel/dashboard") que vê o broker
//    do adjeltron (o mesmo do Node-RED em mqtt://localhost:1883) ou o broker verdadeiro a que o
//    sketch está ligado (broker.hivemq.com…)
//    mensagens do browser: { type: 'mqtt-sub', filter } | { type: 'mqtt-pub', topic, payload, retain }
//                          | { type: 'mqtt-target', target: 'local' | 'sketch' }
//    para o browser:       { type: 'mqtt', msgs: [{ topic, payload, retain, from, at }], stats }
import { broker, validFilter, validTopic } from './mqtt.js'
import { mqttInfo } from './mqtt-server.js'
import { mqttConnect } from './mqtt-client.js'
import { binToText, utf8Bin } from './mqtt-packet.js'
import { createNet, dropNet } from './gateway.js'
import * as i18n from '../../../../shared/i18n.js'

export function createSessionNet(send) {
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
  const me = `painel-${id}`
  const net = createNet(id)
  let target = 'local' // 'local' | 'sketch'
  let watch = null // { key, label, remote, state, sub(f), unsub(f), pub(t, p, r), close() }
  let filter = null
  let out = []
  let timer = null
  let lastStats = ''
  const recentPub = new Map() // "tópico\0payload" -> instante (para marcar as nossas mensagens no broker remoto)

  const push = (m, from) => {
    const p = binToText(m.payload)
    out.push({ topic: m.topic, payload: p.length > 4096 ? `${p.slice(0, 4096)}…` : p, retain: m.retain, from, at: m.at ?? Date.now() })
    if (out.length > 300) out = out.slice(-300)
  }

  const localWatch = () => {
    const c = broker.connect({ clientId: me, kind: 'panel', onMessage: (m) => push(m, m.origin) })
    return {
      key: 'local',
      label: `localhost:${mqttInfo.tcpPort || 1883}`,
      remote: false,
      state: 'ligado',
      sub: (f) => c.subscribe(f, 0),
      unsub: (f) => c.unsubscribe(f),
      pub: (t, p, r) => c.publish(t, p, r),
      close: () => c.disconnect(true),
    }
  }
  const remoteWatch = (host, port) => {
    let cli = null
    let dead = false
    const w = {
      key: `${host}:${port}`,
      label: `${host}:${port}`,
      remote: true,
      state: 'a ligar',
      sub: (f) => cli?.subscribe(f, 0),
      unsub: (f) => cli?.unsubscribe(f),
      pub: (t, p, r) => {
        if (!cli) return false
        const k = `${t}\0${p}`
        recentPub.set(k, Date.now())
        return cli.publish(t, p, r)
      },
      close: () => {
        dead = true
        cli?.disconnect(true)
      },
    }
    mqttConnect({
      host,
      port,
      clientId: `robolab-painel-${id}`,
      keepalive: 30,
      timeoutMs: 8000,
      onMessage: (m) => {
        const k = `${m.topic}\0${m.payload}`
        const mine = recentPub.has(k) && Date.now() - recentPub.get(k) < 5000
        if (mine) recentPub.delete(k)
        push(m, mine ? me : 'remoto')
      },
      onClose: (why) => (w.state = i18n.m(`desligado: ${why}`, `disconnected: ${why}`)),
    }).then((r) => {
      if (dead) return r.ok && r.client.disconnect(true)
      if (!r.ok) return (w.state = i18n.m(`erro: ${r.error}`, `error: ${r.error}`))
      cli = r.client
      w.state = 'ligado'
      if (filter) cli.subscribe(filter, 0)
    })
    return w
  }

  // escolhe o broker a ver: o do adjeltron ou o broker remoto a que o sketch está ligado
  const desired = () => {
    const m = net.mqtt
    return target === 'sketch' && m?.remote ? { key: `${m.host}:${m.port}`, host: m.host, port: m.port } : { key: 'local' }
  }
  const ensure = () => {
    const d = desired()
    if (watch && watch.key === d.key) return watch
    watch?.close()
    watch = d.key === 'local' ? localWatch() : remoteWatch(d.host, d.port)
    if (filter) watch.sub(filter)
    if (!timer) timer = setInterval(flush, 100)
    return watch
  }
  const stats = () => {
    const m = net.mqtt
    return {
      ...broker.stats(),
      tcpPort: mqttInfo.tcpPort,
      wsPort: mqttInfo.wsPort,
      ips: mqttInfo.ips,
      target,
      watching: watch ? { label: watch.label, remote: watch.remote, state: watch.state } : null,
      sketch: m ? { host: m.host, port: m.port, remote: m.remote, connected: m.connected, clientId: m.clientId } : null,
    }
  }
  function flush() {
    // o sketch mudou de broker? (só interessa quando o painel segue o broker do sketch)
    if (target === 'sketch' && watch && watch.key !== desired().key) ensure()
    // envia as mensagens novas (e as estatísticas do broker quando mudam)
    const st = stats()
    const key = JSON.stringify(st)
    if (!out.length && key === lastStats) return
    lastStats = key
    send({ type: 'mqtt', msgs: out, stats: st })
    out = []
  }
  send({ type: 'hello', session: id })

  return {
    id,
    net,
    // devolve true se a mensagem era de rede
    message(msg) {
      switch (msg.type) {
        case 'mqtt-sub': {
          const w = ensure()
          const f = String(msg.filter ?? '#').trim() || '#'
          if (!validFilter(f)) return send({ type: 'mqtt-error', msg: i18n.m(`Filtro inválido: "${f}" ('+' e '#' ocupam um nível inteiro; '#' só no fim)`, `Invalid filter: "${f}" ('+' and '#' take a whole level; '#' only at the end)`) }), true
          // o mesmo filtro outra vez não volta a entregar as mensagens retidas
          if (filter !== f) {
            if (filter) w.unsub(filter)
            filter = f
            w.sub(f)
          }
          send({ type: 'mqtt', msgs: [], stats: stats(), filter: f })
          return true
        }
        case 'mqtt-unsub':
          if (watch && filter) watch.unsub(filter)
          filter = null
          return true
        case 'mqtt-pub': {
          const w = ensure()
          const topic = String(msg.topic ?? '').trim()
          if (!validTopic(topic)) return send({ type: 'mqtt-error', msg: i18n.m(`Tópico inválido: "${topic}" (não pode estar vazio nem ter + ou #)`, `Invalid topic: "${topic}" (it cannot be empty or contain + or #)`) }), true
          // texto do browser -> bytes UTF-8 (como o Node-RED envia)
          if (w.pub(topic, utf8Bin(String(msg.payload ?? '').slice(0, 65536)), !!msg.retain) === false && w.remote) send({ type: 'mqtt-error', msg: i18n.m(`Ainda não ligado a ${w.label} (${w.state})`, `Not connected to ${w.label} yet (${w.state})`) })
          return true
        }
        case 'mqtt-target':
          target = msg.target === 'sketch' ? 'sketch' : 'local'
          ensure()
          lastStats = ''
          flush()
          return true
      }
      return false
    },
    close() {
      clearInterval(timer)
      timer = null
      watch?.close()
      watch = null
      dropNet(id)
    },
  }
}
