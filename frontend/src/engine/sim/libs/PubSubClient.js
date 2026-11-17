// PubSubClient (Nick O'Leary) — cliente MQTT para o ESP32 simulado.
// Como no ESP32 real, liga-se mesmo ao broker escolhido em client.setServer():
//  - "localhost", "127.0.0.1", "robolab", "host.docker.internal" ou um IP desta máquina →
//    broker do adjeltron (backend/sim/mqtt.js), o mesmo onde o Node-RED liga (mqtt://localhost:1883);
//  - outro endereço (broker.hivemq.com, test.mosquitto.org, broker.emqx.io, 192.168.1.x…) →
//    ligação MQTT verdadeira pela rede (mqtt-client.js, Bun.connect).
// O sketch fica parado em tempo virtual enquanto liga; as mensagens recebidas ficam em fila
// e são entregues ao callback em client.loop().
import { broker, validTopic, validFilter } from '../mqtt.js'
import { usesInternalBroker, mqttInfo } from '../mqtt-server.js'
import { mqttConnect } from '../mqtt-client.js'
import { blocking, sleepUs, callUser, wifiUp, onDispose, cstr, bytesOf, ipToString, waitPromise } from './_net.js'
import { payloadBuf } from './CString.js'
import * as i18n from '../../../../../shared/i18n.js'

const ST = { TIMEOUT: -4, LOST: -3, FAILED: -2, DISCONNECTED: -1, CONNECTED: 0, BAD_PROTOCOL: 1, BAD_CLIENT_ID: 2, UNAVAILABLE: 3, BAD_CREDENTIALS: 4, UNAUTHORIZED: 5 }
const LATENCY_US = 15_000 // atraso de rede de cada mensagem (virtual)

export default {
  header: 'PubSubClient.h',
  globals: {
    MQTT_CONNECTION_TIMEOUT: -4, MQTT_CONNECTION_LOST: -3, MQTT_CONNECT_FAILED: -2, MQTT_DISCONNECTED: -1, MQTT_CONNECTED: 0,
    MQTT_CONNECT_BAD_PROTOCOL: 1, MQTT_CONNECT_BAD_CLIENT_ID: 2, MQTT_CONNECT_UNAVAILABLE: 3, MQTT_CONNECT_BAD_CREDENTIALS: 4, MQTT_CONNECT_UNAUTHORIZED: 5,
    MQTT_MAX_PACKET_SIZE: 256, MQTT_KEEPALIVE: 15, MQTT_SOCKET_TIMEOUT: 15, MQTTQOS0: 0, MQTTQOS1: 1, MQTTQOS2: 2,
  },
  classes: {
    PubSubClient: (env) =>
      class PubSubClient {
        constructor(...args) {
          this.host = null
          this.port = 1883
          this.cb = null
          this.conn = null
          this.st = ST.DISCONNECTED
          this.queue = []
          this.bufSize = 256
          this.keepAlive = 15
          this.sockTimeout = 15
          this.lastLoop = 0
          this.id = ''
          // PubSubClient(client) | (host, port, client) | (host, port, callback, client)
          for (const a of args) {
            if (typeof a === 'function') this.cb = a
            else if (a && typeof a === 'object' && 'secure' in a) this.net = a // WiFiClient / WiFiClientSecure (TLS)
          }
          if (typeof args[0] === 'string' || (args[0] && args[0].o)) {
            this.host = ipToString(args[0])
            this.port = Number(args[1]) || 1883
          }
          onDispose(env, () => this.drop(false))
        }
        setServer(host, port = 1883) {
          this.host = ipToString(host)
          this.port = Number(port) || 1883
          return this
        }
        setCallback(cb) {
          this.cb = cb
          return this
        }
        setClient(c) {
          if (c && typeof c === 'object' && 'secure' in c) this.net = c
          return this
        }
        setStream() {
          return this
        }
        setKeepAlive(s) {
          this.keepAlive = Math.max(1, Number(s) || 15)
          return this
        }
        setSocketTimeout(s) {
          this.sockTimeout = Math.max(1, Number(s) || 15)
          return this
        }
        setBufferSize(n) {
          this.bufSize = Math.max(16, Math.min(65535, Number(n) || 256))
          return true
        }
        getBufferSize() {
          return this.bufSize
        }
        drop(graceful) {
          const c = this.conn
          this.conn = null
          if (c) c.disconnect(graceful)
          if (env.net?.mqtt && env.net.mqtt.owner === this) env.net.mqtt.connected = false
        }
        // connect(id) | (id, user, pass) | (id, willTopic, willQos, willRetain, willMessage)
        // | (id, user, pass, willTopic, willQos, willRetain, willMessage[, cleanSession])
        connect(id, ...a) {
          let will = null
          let user
          let pass
          let clean = true
          if (a.length === 4 && typeof a[1] === 'number') will = { topic: cstr(a[0]), qos: a[1] | 0, retain: !!a[2], payload: cstr(a[3]) }
          else if (a.length >= 2) {
            user = a[0] == null ? undefined : cstr(a[0])
            pass = a[1] == null ? undefined : cstr(a[1])
            if (a.length >= 6 && a[2] != null) will = { topic: cstr(a[2]), qos: a[3] | 0, retain: !!a[4], payload: cstr(a[5]) }
            if (a.length >= 7) clean = !!a[6]
          }
          if (will && !will.topic) will = null
          const self = this
          return blocking(function* () {
            if (!self.host) {
              env.warnOnce('mqttnohost', i18n.m('client.connect(): falta client.setServer("localhost", 1883) antes de ligar.', 'client.connect(): client.setServer("localhost", 1883) is missing before connecting.'), 'info')
              self.st = ST.FAILED
              yield* sleepUs(env, 1000)
              return false
            }
            if (!wifiUp(env)) {
              // sem Wi-Fi a ligação TCP falha ao fim de algum tempo
              env.warnOnce('mqttnowifi', i18n.m('client.connect(): o ESP32 ainda não está ligado ao Wi-Fi (WiFi.status() != WL_CONNECTED).', 'client.connect(): the ESP32 is not connected to Wi-Fi yet (WiFi.status() != WL_CONNECTED).'), 'info')
              self.st = ST.FAILED
              yield* sleepUs(env, 500_000)
              return false
            }
            self.drop(true)
            self.id = cstr(id)
            self.queue = []
            const push = (m) => {
              if (self.queue.length < 200) self.queue.push({ ...m, due: env.rt.t + LATENCY_US })
            }
            const where = `${self.host}:${self.port}`
            let conn
            if (usesInternalBroker(self.host, self.port)) {
              // broker do adjeltron (em processo): o mesmo que o Node-RED vê em mqtt://localhost:1883
              yield* sleepUs(env, 40_000 + Math.random() * 30_000) // TCP + CONNECT/CONNACK
              const s = broker.connect({ clientId: self.id, will, clean, onMessage: push })
              s.kicked = (why) => {
                if (self.conn !== conn) return
                self.conn = null
                self.st = ST.LOST
                env.warnOnce(`mqttkick:${self.id}`, i18n.m(`MQTT: o broker desligou "${self.id}" (${why}). Use um clientId único por placa.`, `MQTT: the broker disconnected "${self.id}" (${why}). Use a unique clientId per board.`), 'info')
              }
              conn = {
                remote: false,
                publish: (t, p, r) => s.publish(t, p, r, 0),
                subscribe: (f, q) => s.subscribe(f, q) !== false,
                unsubscribe: (f) => s.unsubscribe(f),
                disconnect: (g) => s.disconnect(g),
              }
              env.warnOnce('mqttlocal', i18n.m(`MQTT: "${self.host}" é o broker do adjeltron${mqttInfo.tcpPort ? ` — o Node-RED, MQTT Explorer… ligam-se a mqtt://localhost:${mqttInfo.tcpPort}` : ''}.`, `MQTT: "${self.host}" is the adjeltron broker${mqttInfo.tcpPort ? ` — Node-RED, MQTT Explorer… connect to mqtt://localhost:${mqttInfo.tcpPort}` : ''}.`), 'info')
            } else {
              // broker verdadeiro na rede/Internet
              const secure = !!self.net?.secure
              const p = mqttConnect({
                host: self.host,
                port: self.port,
                clientId: self.id,
                username: user,
                password: pass,
                will,
                clean,
                keepalive: self.keepAlive,
                tls: secure,
                insecure: !!self.net?.insecure,
                timeoutMs: self.sockTimeout * 1000,
                onMessage: push,
                onClose: (why) => {
                  if (self.conn !== conn) return
                  self.conn = null
                  self.st = ST.LOST
                  if (env.net?.mqtt?.owner === self) env.net.mqtt.connected = false
                  env.warnOnce(`mqttlost:${where}`, i18n.m(`MQTT: perdeu-se a ligação a ${where} (${why}).`, `MQTT: lost the connection to ${where} (${why}).`), 'info')
                },
              })
              env.rt.t += 5000
              const r = yield* waitPromise(env, p, (self.sockTimeout + 1) * 1e6)
              if (!r.ok || !r.value.ok) {
                if (r.timeout) p.then((x) => x.ok && x.client.disconnect(true))
                const v = r.ok ? r.value : null
                self.st = r.timeout ? ST.TIMEOUT : v?.state ?? ST.FAILED
                const why = r.timeout ? i18n.m('sem resposta (tempo esgotado)', 'no response (timed out)') : v?.error || i18n.m('falhou', 'failed')
                env.warnOnce(
                  `mqttfail:${where}`,
                  i18n.m(`MQTT: não foi possível ligar a ${where}: ${why}. O ESP32 simulado liga-se mesmo a este broker (precisa de Internet). Para usar o broker do adjeltron (e o Node-RED nesta máquina) escreva client.setServer("localhost", ${mqttInfo.tcpPort || 1883}).`, `MQTT: could not connect to ${where}: ${why}. The simulated ESP32 really connects to this broker (it needs Internet). To use the adjeltron broker (and Node-RED on this machine) write client.setServer("localhost", ${mqttInfo.tcpPort || 1883}).`),
                  'info',
                )
                return false
              }
              conn = r.value.client
              const c0 = conn
              conn = {
                remote: true,
                publish: (t, p, rt) => c0.publish(t, p, rt, 0),
                subscribe: (f, q) => (c0.subscribe(f, Math.min(1, q | 0)), true),
                unsubscribe: (f) => (c0.unsubscribe(f), true),
                disconnect: (g) => c0.disconnect(g),
              }
              env.warnOnce(`mqttremote:${where}`, i18n.m(`MQTT: ligado ao broker verdadeiro ${where}${secure ? ' (TLS)' : ''}.`, `MQTT: connected to the real broker ${where}${secure ? ' (TLS)' : ''}.`), 'info')
            }
            self.conn = conn
            self.st = ST.CONNECTED
            self.lastLoop = env.rt.t
            // o painel MQTT do browser pode ver este broker
            if (env.net) env.net.mqtt = { owner: self, host: self.host, port: self.port, remote: conn.remote, clientId: self.id, connected: true }
            return true
          })
        }
        alive() {
          if (!this.conn) return false
          if (!wifiUp(env)) {
            this.drop(false)
            this.st = ST.LOST
            return false
          }
          // sem client.loop() durante 1,5 × keepalive o broker considera o cliente morto
          if (env.rt.t - this.lastLoop > this.keepAlive * 1.5e6) {
            this.drop(false)
            this.st = ST.TIMEOUT
            env.warnOnce('mqttkeepalive', i18n.m(`MQTT: client.loop() não foi chamado durante ${(this.keepAlive * 1.5).toFixed(0)} s — o broker fechou a ligação (keepalive). Chame client.loop() no loop() e evite delay() longos.`, `MQTT: client.loop() was not called for ${(this.keepAlive * 1.5).toFixed(0)} s — the broker closed the connection (keepalive). Call client.loop() in loop() and avoid long delay() calls.`), 'info')
            return false
          }
          return true
        }
        connected() {
          return this.alive()
        }
        state() {
          this.alive()
          return this.st
        }
        disconnect() {
          this.drop(true)
          this.st = ST.DISCONNECTED
        }
        // publish(topic, payload[, retained]) | (topic, byte* payload, length[, retained])
        publish(topic, payload, a, b) {
          if (!this.alive()) return false
          let retained = false
          let data
          if (typeof a === 'number') {
            data = bytesOf(payload, a)
            retained = !!b
          } else {
            data = typeof payload === 'number' ? env.fmt(payload) : Array.isArray(payload) ? cstr(payload) : cstr(payload)
            retained = !!a
          }
          const t = cstr(topic)
          const size = 5 + 2 + t.length + data.length
          if (size > this.bufSize) {
            env.warnOnce(`mqttbuf${this.bufSize}`, i18n.m(`client.publish("${t}"): a mensagem tem ${size} bytes e o buffer do PubSubClient só ${this.bufSize} — não foi enviada. Use client.setBufferSize(${Math.ceil(size / 128) * 128}).`, `client.publish("${t}"): the message has ${size} bytes and the PubSubClient buffer only ${this.bufSize} — it was not sent. Use client.setBufferSize(${Math.ceil(size / 128) * 128}).`))
            return false
          }
          if (!validTopic(t)) return false
          env.rt.t += 200 + data.length * 2
          return this.conn.publish(t, data, retained)
        }
        publish_P(topic, payload, a, b) {
          return this.publish(topic, payload, a, b)
        }
        beginPublish(topic, len, retained) {
          this.pending = { topic: cstr(topic), data: '', retained: !!retained }
          return this.alive()
        }
        write(v) {
          if (!this.pending) return 0
          this.pending.data += typeof v === 'number' ? String.fromCharCode(v & 255) : cstr(v)
          return 1
        }
        print(v) {
          return this.write(typeof v === 'number' ? env.fmt(v) : cstr(v))
        }
        endPublish() {
          const p = this.pending
          this.pending = null
          return p && this.alive() ? (this.conn.publish(p.topic, p.data, p.retained) ? 1 : 0) : 0
        }
        subscribe(topic, qos = 0) {
          if (!this.alive()) return false
          const f = cstr(topic)
          if (!validFilter(f)) {
            env.warnOnce(`mqttfilter:${f}`, i18n.m(`client.subscribe("${f}"): filtro inválido ('+' e '#' têm de ocupar um nível inteiro, '#' só no fim).`, `client.subscribe("${f}"): invalid filter ('+' and '#' must take a whole level, '#' only at the end).`))
            return false
          }
          env.rt.t += 300
          return this.conn.subscribe(f, qos)
        }
        unsubscribe(topic) {
          if (!this.alive()) return false
          return this.conn.unsubscribe(cstr(topic))
        }
        // processa as mensagens recebidas (chama o callback) e mantém a ligação viva
        loop() {
          if (!this.alive()) return false
          this.lastLoop = env.rt.t
          env.rt.t += 20
          const due = this.queue.length && this.queue[0].due <= env.rt.t
          if (!due) return true
          const self = this
          return blocking(function* () {
            // como no PubSubClient real, uma mensagem por chamada de loop()
            const m = self.queue.shift()
            const size = 5 + 2 + m.topic.length + m.payload.length
            if (size > self.bufSize) {
              env.warnOnce(`mqttrxbuf${self.bufSize}`, i18n.m(`MQTT: mensagem em "${m.topic}" com ${size} bytes ignorada (buffer de ${self.bufSize}). Use client.setBufferSize().`, `MQTT: message on "${m.topic}" with ${size} bytes ignored (buffer of ${self.bufSize}). Use client.setBufferSize().`))
              return true
            }
            if (self.cb) yield* callUser(self.cb, m.topic, payloadBuf(m.payload), m.payload.length)
            return self.alive()
          })
        }
      },
  },
}
