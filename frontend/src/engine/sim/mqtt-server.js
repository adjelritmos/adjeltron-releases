// Broker MQTT do adjeltron na rede: TCP (1883; se estiver ocupada, 1884) e MQTT sobre
// WebSocket (porta 9001, caminho /mqtt, subprotocolo "mqtt"; também em ws://localhost:3001/mqtt).
// Assim o Node-RED, o MQTT Explorer, o mosquitto_sub… ligam-se a mqtt://localhost:1883 e veem
// (e comandam) os ESP32 simulados. Implementa MQTT 3.1, 3.1.1 e 5.0 (o essencial):
// CONNECT/CONNACK, PUBLISH QoS 0/1/2, SUBSCRIBE/UNSUBSCRIBE com + e #, retidas,
// testamentos (last will), keepalive, sessões persistentes (clean session = false).
//
// Variáveis de ambiente: MQTT_PORT (1883), MQTT_WS_PORT (9001), MQTT_HOST (0.0.0.0),
// MQTT_USER / MQTT_PASS (se definidas, exige utilizador/palavra-passe).
import { networkInterfaces, hostname } from 'node:os'
import { broker, validTopic, validFilter } from './mqtt.js'
import { T, encode, createParser, P } from './mqtt-packet.js'
import * as i18n from '../../../../shared/i18n.js'

export const mqttInfo = { tcpPort: null, wsPort: null, wsPath: '/mqtt', host: 'localhost', error: null, ips: [] }

const localIps = () => {
  const out = []
  for (const list of Object.values(networkInterfaces())) for (const a of list || []) out.push(a.address.toLowerCase())
  return out
}
const LOCAL_NAMES = new Set(['localhost', 'robolab', 'robolab.local', 'host.docker.internal', 'mqtt', '0.0.0.0', '::1', '::'])

// o endereço aponta para esta máquina (= broker do adjeltron)?
export function isLocalHost(host) {
  const h = String(host || '').trim().toLowerCase().replace(/^\[|\]$/g, '')
  if (!h) return false
  if (LOCAL_NAMES.has(h) || h.startsWith('127.') || h === hostname().toLowerCase() || h === `${hostname().toLowerCase()}.local`) return true
  return localIps().includes(h)
}
// o sketch que liga a host:port deve usar o broker interno (em processo)?
//  - endereços locais na porta do broker do adjeltron → sim;
//  - outra porta local (ex.: um Mosquitto na 1883 quando o adjeltron ficou na 1884) → ligação TCP verdadeira;
//  - sem servidor de rede (verificação dos exemplos, testes) ou MQTT_OFFLINE=1 → tudo no broker interno.
export function usesInternalBroker(host, port) {
  if (!started || process.env.MQTT_OFFLINE === '1') return true
  return isLocalHost(host) && (!mqttInfo.tcpPort || Number(port) === mqttInfo.tcpPort)
}

let started = false
// app desktop: as portas (TCP 1883, WebSocket 9001) são abertas pelo servidor Rust do Tauri, que
// entrega cada ligação ao worker do simulador (frontend/src/sim/desktop/net.js → createConnection)
export function useExternalTransport(info) {
  started = true
  Object.assign(mqttInfo, info)
}
const CONNACK_V3 = { ok: 0, proto: 1, id: 2, unavailable: 3, auth: 4 }
const CONNACK_V5 = { ok: 0, proto: 0x84, id: 0x85, unavailable: 0x88, auth: 0x86 }

// ---------- uma ligação de rede (TCP ou WebSocket) ----------
// io: { write(buf), end(), kind: 'tcp'|'ws', remote: 'ip:porta' }
export function createConnection(io) {
  const parser = createParser(4)
  let v = 4
  let s = null // sessão no broker
  let closed = false
  let ka = 0
  let last = Date.now()
  let timer = null
  const aliases = new Map() // MQTT 5: topic alias do cliente
  const qos2In = new Set() // ids de PUBLISH QoS 2 recebidos à espera de PUBREL

  const send = (pk) => {
    if (!closed) io.write(encode(pk, v))
  }
  const finish = (graceful) => {
    if (closed) return
    closed = true
    clearInterval(timer)
    if (s) {
      const was = s
      s = null
      was.close(graceful)
    }
    try {
      io.end()
    } catch {}
  }
  // envia uma mensagem do broker ao cliente (com o fluxo QoS 1/2)
  const deliver = (m) => {
    if (!s || closed) return
    if (m.qos > 0) {
      let id = s.nextId
      for (let n = 0; s.inflight.has(id) && n < 65535; n++) id = (id % 65535) + 1
      s.nextId = (id % 65535) + 1
      s.inflight.set(id, { m, rel: false })
      send({ type: T.PUBLISH, topic: m.topic, payload: m.payload, qos: m.qos, retain: m.retain, id })
    } else send({ type: T.PUBLISH, topic: m.topic, payload: m.payload, qos: 0, retain: m.retain })
  }

  function onConnect(pk) {
    v = pk.level === 5 ? 5 : 4
    const rc = v === 5 ? CONNACK_V5 : CONNACK_V3
    // tolerante: 'MQTT' ou 'MQIsdp' com nível 3 (3.1), 4 (3.1.1) ou 5
    const okProto = (pk.proto === 'MQTT' || pk.proto === 'MQIsdp') && pk.level >= 3 && pk.level <= 5
    if (!okProto) {
      v = 4
      send({ type: T.CONNACK, rc: CONNACK_V3.proto })
      return finish(true)
    }
    let id = pk.clientId
    let assigned = null
    if (!id) {
      if (!pk.clean && v !== 5) {
        send({ type: T.CONNACK, rc: rc.id })
        return finish(true)
      }
      id = assigned = `auto-${Math.random().toString(36).slice(2, 12)}`
    }
    const U = process.env.MQTT_USER
    if (U && (pk.username !== U || (pk.password ?? '') !== (process.env.MQTT_PASS ?? ''))) {
      send({ type: T.CONNACK, rc: rc.auth })
      return finish(true)
    }
    if (pk.will && !validTopic(pk.will.topic)) return finish(true)
    // MQTT 5: sessão persistente se Session Expiry > 0 e não for "clean start"
    const clean = v === 5 ? pk.clean || !(pk.props?.[P.SESSION_EXPIRY] > 0) : pk.clean
    s = broker.connect({ clientId: id, kind: io.kind, will: pk.will ? { ...pk.will } : null, clean, remote: io.remote, onMessage: deliver })
    s.kicked = () => {
      s = null // o broker já fechou a sessão (com testamento)
      finish(true)
    }
    ka = pk.keepalive
    if (ka > 0) timer = setInterval(() => Date.now() - last > ka * 1500 && finish(false), Math.min(ka * 500, 5000))
    send({ type: T.CONNACK, sessionPresent: s.sessionPresent, rc: 0, props: assigned && v === 5 ? { [P.ASSIGNED_ID]: assigned } : {} })
    // sessão persistente: reenvia o que ficou a meio e o que chegou enquanto estava desligado
    if (s.sessionPresent) {
      for (const [mid, f] of s.inflight) send(f.rel ? { type: T.PUBREL, id: mid } : { type: T.PUBLISH, topic: f.m.topic, payload: f.m.payload, qos: f.m.qos, retain: f.m.retain, id: mid, dup: true })
      for (const m of s.queue.splice(0)) deliver(m)
    } else s.inflight.clear()
  }

  function onPacket(pk) {
    if (!s) {
      if (pk.type !== T.CONNECT) return finish(false)
      return onConnect(pk)
    }
    switch (pk.type) {
      case T.CONNECT: // segundo CONNECT = violação do protocolo
        return finish(false)
      case T.PUBLISH: {
        let topic = pk.topic
        const al = pk.props?.[P.TOPIC_ALIAS]
        if (al) {
          if (topic) aliases.set(al, topic)
          else topic = aliases.get(al)
        }
        if (!validTopic(topic)) return finish(false)
        if (pk.qos === 2) {
          if (!qos2In.has(pk.id)) {
            qos2In.add(pk.id)
            s.publish(topic, pk.payload, pk.retain, 2)
          }
          return send({ type: T.PUBREC, id: pk.id })
        }
        s.publish(topic, pk.payload, pk.retain, pk.qos)
        if (pk.qos === 1) send({ type: T.PUBACK, id: pk.id })
        return
      }
      case T.PUBREL:
        qos2In.delete(pk.id)
        return send({ type: T.PUBCOMP, id: pk.id })
      case T.PUBACK:
      case T.PUBCOMP:
        s.inflight.delete(pk.id)
        return
      case T.PUBREC: {
        const f = s.inflight.get(pk.id)
        if (f) f.rel = true
        return send({ type: T.PUBREL, id: pk.id })
      }
      case T.SUBSCRIBE: {
        // o SUBACK tem de sair antes das mensagens retidas
        const codes = pk.subs.map((x) => (validFilter(x.filter) ? Math.min(2, x.qos) : v === 5 ? 0x8f : 0x80))
        send({ type: T.SUBACK, id: pk.id, codes })
        pk.subs.forEach((x, i) => codes[i] < 3 && s.subscribe(x.filter, x.qos, x))
        return
      }
      case T.UNSUBSCRIBE: {
        const codes = pk.filters.map((f) => (s.unsubscribe(f) ? 0 : 0x11))
        return send({ type: T.UNSUBACK, id: pk.id, codes })
      }
      case T.PINGREQ:
        return send({ type: T.PINGRESP })
      case T.DISCONNECT:
        // MQTT 5: motivo 0x04 = "desligar com testamento"
        return finish(pk.rc !== 4)
      default:
        return finish(false)
    }
  }

  return {
    data(chunk) {
      if (closed) return
      last = Date.now()
      try {
        for (const pk of parser.push(chunk)) {
          onPacket(pk)
          if (closed) break
        }
      } catch {
        finish(false) // pacote inválido
      }
    },
    closed() {
      finish(false) // ligação caiu sem DISCONNECT -> testamento
    },
    get clientId() {
      return s?.id
    },
  }
}

// ---------- servidores ----------
// (exportado para os testes: um broker TCP numa porta qualquer, ex.: 0 = livre)
export function listenTcp(port, hostname = '0.0.0.0') {
  return Bun.listen({
    hostname,
    port,
    socket: {
      open(sock) {
        const pend = [] // escrita com contrapressão
        const io = {
          kind: 'tcp',
          remote: `${sock.remoteAddress}`,
          write(buf) {
            if (pend.length) return pend.push(buf)
            const n = sock.write(buf)
            if (n < buf.length) pend.push(buf.subarray(Math.max(0, n)))
          },
          end: () => sock.end(),
        }
        sock.data = { conn: createConnection(io), pend }
      },
      drain(sock) {
        const { pend } = sock.data
        while (pend.length) {
          const b = pend[0]
          const n = sock.write(b)
          if (n < b.length) {
            pend[0] = b.subarray(Math.max(0, n))
            return
          }
          pend.shift()
        }
      },
      data(sock, chunk) {
        sock.data.conn.data(chunk)
      },
      close(sock) {
        sock.data?.conn.closed()
      },
      error(sock) {
        sock.data?.conn.closed()
      },
    },
  })
}

// handlers WebSocket (partilhados pelo servidor da porta 9001 e pelo :3001/mqtt)
export const mqttWs = {
  // devolve true se o pedido foi aceite como WebSocket MQTT
  upgrade(req, srv) {
    const want = (req.headers.get('sec-websocket-protocol') || '').split(',').map((x) => x.trim())
    const proto = want.find((p) => p === 'mqtt' || p === 'mqttv3.1')
    return srv.upgrade(req, { data: { mqtt: true }, headers: proto ? { 'Sec-WebSocket-Protocol': proto } : {} })
  },
  open(ws) {
    ws.data.conn = createConnection({ kind: 'ws', remote: ws.remoteAddress, write: (b) => ws.sendBinary(b), end: () => ws.close() })
  },
  message(ws, msg) {
    ws.data.conn?.data(typeof msg === 'string' ? Buffer.from(msg, 'latin1') : msg)
  },
  close(ws) {
    ws.data.conn?.closed()
  },
}

export function startMqttServer() {
  if (started) return mqttInfo
  started = true
  const host = process.env.MQTT_HOST || '0.0.0.0'
  const want = +(process.env.MQTT_PORT || 1883)
  for (const port of [want, want + 1]) {
    try {
      listenTcp(port, host)
      mqttInfo.tcpPort = port
      break
    } catch (e) {
      mqttInfo.error = `porta ${port} ocupada (${e.code || e.message})`
    }
  }
  const wsWant = +(process.env.MQTT_WS_PORT || 9001)
  for (const port of [wsWant, wsWant + 1]) {
    try {
      Bun.serve({
        hostname: host,
        port,
        fetch(req, srv) {
          if (mqttWs.upgrade(req, srv)) return undefined
          return new Response(i18n.m('Broker MQTT do adjeltron: use ws://<host>:', 'adjeltron MQTT broker: use ws://<host>:') + port + '/mqtt (subprotocolo "mqtt")\n', { status: 426 })
        },
        websocket: mqttWs,
      })
      mqttInfo.wsPort = port
      break
    } catch {}
  }
  mqttInfo.ips = localIps().filter((a) => /^\d+\.\d+\.\d+\.\d+$/.test(a) && !a.startsWith('127.'))
  if (mqttInfo.tcpPort) {
    if (mqttInfo.tcpPort !== want) console.warn(i18n.m(`[mqtt] a porta ${want} está ocupada (outro broker? Mosquitto?) — broker do adjeltron na porta ${mqttInfo.tcpPort}.`, `[mqtt] port ${want} is busy (another broker? Mosquitto?) — adjeltron broker on port ${mqttInfo.tcpPort}.`))
    console.log(i18n.m(`[mqtt] broker do adjeltron em mqtt://localhost:${mqttInfo.tcpPort}${mqttInfo.wsPort ? ` e ws://localhost:${mqttInfo.wsPort}/mqtt` : ''} (Node-RED: servidor localhost, porta ${mqttInfo.tcpPort})`, `[mqtt] adjeltron broker at mqtt://localhost:${mqttInfo.tcpPort}${mqttInfo.wsPort ? ` and ws://localhost:${mqttInfo.wsPort}/mqtt` : ''} (Node-RED: server localhost, port ${mqttInfo.tcpPort})`))
  } else console.warn(i18n.m(`[mqtt] não foi possível abrir o broker TCP (${mqttInfo.error}) — só os sketches e o painel o veem.`, `[mqtt] could not open the TCP broker (${mqttInfo.error}) — only the sketches and the panel can see it.`))
  return mqttInfo
}

// ---------- HTTP: /api/mqtt/info e /api/node-red-flow (fluxo importável no Node-RED) ----------
export async function handleMqttApi(path, json) {
  if (path === '/api/mqtt/info') return json({ ...mqttInfo, url: mqttInfo.tcpPort ? `mqtt://localhost:${mqttInfo.tcpPort}` : null, ws: mqttInfo.wsPort ? `ws://localhost:${mqttInfo.wsPort}/mqtt` : null, ...broker.stats() })
  if (path === '/api/node-red-flow') {
    // import (e não leitura do disco): fica dentro do binário da app desktop
    let txt = JSON.stringify((await import('./examples/node-red-robolab.json')).default, null, 4)
    if (mqttInfo.tcpPort && mqttInfo.tcpPort !== 1883) txt = txt.replaceAll('"port": "1883"', `"port": "${mqttInfo.tcpPort}"`).replaceAll('localhost:1883', `localhost:${mqttInfo.tcpPort}`)
    return new Response(txt, { headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': 'attachment; filename="node-red-robolab.json"', 'access-control-allow-origin': '*' } })
  }
  return json({ error: 'rota desconhecida' }, 404)
}
