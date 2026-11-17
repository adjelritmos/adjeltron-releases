// Cliente MQTT 3.1.1 nativo (Bun.connect, sem dependências): é o que o PubSubClient do ESP32
// simulado usa para falar com brokers verdadeiros (broker.hivemq.com, test.mosquitto.org,
// um Mosquitto na rede local…) e o que o painel MQTT usa para ver esse mesmo broker.
//
//   const r = await mqttConnect({ host, port, clientId, will, keepalive, onMessage, onClose })
//   r.ok ? r.client.publish(t, p) : r.state  // -2 = falhou a ligação TCP, -4 = sem CONNACK, 1..5 = recusado
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { T, encode, createParser } from './mqtt-packet.js'
import * as i18n from '../../../../shared/i18n.js'

export function mqttConnect({ host, port = 1883, clientId = '', username, password, will = null, keepalive = 15, clean = true, tls = false, insecure = false, timeoutMs = 10_000, onMessage = () => {}, onClose = () => {} }) {
  return new Promise((resolve) => {
    const parser = createParser(4)
    let sock = null
    let settled = false
    let closed = false
    let nextId = 1
    let pingTimer = null
    let lastRx = Date.now()
    const qos2In = new Set()
    const acks = new Map() // id -> resolve (SUBACK/UNSUBACK/PUBACK/PUBCOMP)
    const pend = []

    const write = (pk) => {
      if (closed || !sock) return false
      const b = encode(pk, 4)
      if (pend.length) pend.push(b)
      else {
        const n = sock.write(b)
        if (n < b.length) pend.push(b.subarray(Math.max(0, n)))
      }
      return true
    }
    const id = () => {
      const i = nextId
      nextId = (nextId % 65535) + 1
      return i
    }
    const done = (r) => {
      if (settled) return
      settled = true
      clearTimeout(connTimer)
      resolve(r)
    }
    const shutdown = (why, notify) => {
      if (closed) return
      closed = true
      clearInterval(pingTimer)
      clearTimeout(connTimer)
      try {
        sock?.end()
      } catch {}
      for (const r of acks.values()) r(null)
      acks.clear()
      if (notify) onClose(why)
    }
    const waitAck = (i) => new Promise((r) => acks.set(i, r))

    const client = {
      host,
      port,
      remote: true,
      get connected() {
        return !closed && settled
      },
      publish(topic, payload, retain = false, qos = 0) {
        if (qos > 0) {
          const i = id()
          const p = waitAck(i)
          return write({ type: T.PUBLISH, topic, payload, retain, qos, id: i }) ? p : Promise.resolve(null)
        }
        return write({ type: T.PUBLISH, topic, payload, retain, qos: 0 })
      },
      // devolve uma Promise com os códigos do SUBACK (null se a ligação cair)
      subscribe(filter, qos = 0) {
        const i = id()
        const p = waitAck(i)
        return write({ type: T.SUBSCRIBE, id: i, subs: [{ filter, qos }] }) ? p : Promise.resolve(null)
      },
      unsubscribe(filter) {
        const i = id()
        const p = waitAck(i)
        return write({ type: T.UNSUBSCRIBE, id: i, filters: [filter] }) ? p : Promise.resolve(null)
      },
      // graceful: DISCONNECT (sem testamento); senão a ligação simplesmente cai
      disconnect(graceful = true) {
        if (graceful) write({ type: T.DISCONNECT })
        shutdown(i18n.m('desligado', 'disconnected'), false)
      },
    }

    const onPacket = (pk) => {
      switch (pk.type) {
        case T.CONNACK:
          if (pk.rc !== 0) {
            done({ ok: false, state: pk.rc, error: i18n.m(`o broker recusou a ligação (código ${pk.rc})`, `the broker refused the connection (code ${pk.rc})`) })
            return shutdown('recusado', false)
          }
          if (keepalive > 0) {
            pingTimer = setInterval(() => {
              if (Date.now() - lastRx > keepalive * 2000) return shutdown(i18n.m('o broker deixou de responder (keepalive)', 'the broker stopped responding (keepalive)'), true)
              write({ type: T.PINGREQ })
            }, keepalive * 1000)
          }
          return done({ ok: true, client, sessionPresent: pk.sessionPresent })
        case T.PUBLISH:
          if (pk.qos === 1) write({ type: T.PUBACK, id: pk.id })
          if (pk.qos === 2) {
            write({ type: T.PUBREC, id: pk.id })
            if (qos2In.has(pk.id)) return
            qos2In.add(pk.id)
          }
          return onMessage({ topic: pk.topic, payload: pk.payload, retain: pk.retain, qos: pk.qos, at: Date.now() })
        case T.PUBREL:
          qos2In.delete(pk.id)
          return write({ type: T.PUBCOMP, id: pk.id })
        case T.PUBREC:
          return write({ type: T.PUBREL, id: pk.id })
        case T.PUBACK:
        case T.PUBCOMP:
        case T.SUBACK:
        case T.UNSUBACK: {
          const r = acks.get(pk.id)
          acks.delete(pk.id)
          return r?.(pk.codes ?? [0])
        }
      }
    }

    const connTimer = setTimeout(() => {
      done({ ok: false, state: -4, error: i18n.m(`sem resposta de ${host}:${port} (tempo esgotado)`, `no response from ${host}:${port} (timed out)`) })
      shutdown('timeout', false)
    }, timeoutMs)

    // o Bun diz ECONNREFUSED também quando o nome não existe: resolvemos o DNS antes.
    // IPv4 primeiro (muitas redes não têm rota IPv6) e tenta os endereços um a um.
    const resolved = isIP(host) ? Promise.resolve([host]) : lookup(host, { all: true }).then((a) => a.sort((x, y) => x.family - y.family).map((x) => x.address), () => [])
    const handlers = {
      open(s) {
        sock = s
        if (closed) return s.end()
        write({ type: T.CONNECT, level: 4, clientId, clean, keepalive, will, username, password })
      },
      data(_s, chunk) {
        lastRx = Date.now()
        try {
          for (const pk of parser.push(chunk)) onPacket(pk)
        } catch (e) {
          shutdown(i18n.m(`pacote inválido do broker (${e.message})`, `invalid packet from the broker (${e.message})`), settled)
        }
      },
      drain(s) {
        while (pend.length) {
          const n = s.write(pend[0])
          if (n < pend[0].length) {
            pend[0] = pend[0].subarray(Math.max(0, n))
            return
          }
          pend.shift()
        }
      },
      close() {
        if (!settled) done({ ok: false, state: -2, error: i18n.m('o broker fechou a ligação', 'the broker closed the connection') })
        shutdown(i18n.m('a ligação caiu', 'the connection dropped'), true)
      },
      error(_s, e) {
        if (!settled) done({ ok: false, state: -2, error: e?.message || i18n.m('erro de rede', 'network error') })
        shutdown(i18n.m(`erro de rede (${e?.message || ''})`, `network error (${e?.message || ''})`), true)
      },
      connectError() {}, // tratado no .catch() abaixo
    }
    const attempt = (addrs, i) => {
      if (closed) return
      Bun.connect({ hostname: addrs[i], port: Number(port) || 1883, tls: tls ? { rejectUnauthorized: !insecure, serverName: host } : undefined, socket: handlers }).catch((e) => {
        if (i + 1 < addrs.length) return attempt(addrs, i + 1)
        done({ ok: false, state: -2, error: e?.code === 'ECONNREFUSED' ? i18n.m('ligação recusada (nenhum broker nessa porta)', 'connection refused (no broker on that port)') : e?.message || i18n.m('falhou a ligação TCP', 'TCP connection failed') })
        shutdown(i18n.m('falhou', 'failed'), false)
      })
    }
    resolved.then((addrs) => {
      if (closed) return
      if (!addrs.length) {
        done({ ok: false, state: -2, error: i18n.m(`nome "${host}" não encontrado (DNS) — sem Internet, ou endereço mal escrito?`, `host "${host}" not found (DNS) — no Internet, or a mistyped address?`) })
        return shutdown(i18n.m('falhou', 'failed'), false)
      }
      attempt(addrs, 0)
    })
  })
}
