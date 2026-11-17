// WiFi.h do ESP32 (simulado). Há uma lista fixa de pontos de acesso virtuais:
//   RoboLab-GUEST e Wokwi-GUEST (abertas), RoboLab (WPA2, "12345678") e Laboratorio-IoT (WPA2, "robolab2024").
// WiFi.begin() demora ~1,5 s como no real; SSID desconhecido → WL_NO_SSID_AVAIL, palavra-passe
// errada → WL_CONNECT_FAILED. Depois de ligado, PubSubClient/HTTPClient/WebServer/NTP funcionam
// (ver as bibliotecas ao lado). O IP é fictício (rede 192.168.4.0/24).
// (O Velxio emula o ESP32 completo com QEMU; aqui o Wi‑Fi é um modelo de estados.)
import { netState } from './_net.js'
import * as i18n from '../../../../../shared/i18n.js'

export const ACCESS_POINTS = [
  { ssid: 'RoboLab-GUEST', pass: '', rssi: -48, ch: 6, enc: 0, bssid: '0A:52:4F:42:4C:01' },
  { ssid: 'Wokwi-GUEST', pass: '', rssi: -55, ch: 6, enc: 0, bssid: '0A:57:4F:4B:57:49' },
  { ssid: 'RoboLab', pass: '12345678', rssi: -61, ch: 1, enc: 3, bssid: '0A:52:4F:42:4C:02' },
  { ssid: 'Laboratorio-IoT', pass: 'robolab2024', rssi: -72, ch: 11, enc: 3, bssid: '0A:4C:41:42:49:4F' },
]
const ENC_NAME = ['aberta', 'WEP', 'WPA', 'WPA2', 'WPA/WPA2']

export class IPAddressBase {
  constructor(a = 0, b, c, d) {
    if (typeof a === 'string') this.o = a.split('.').map((x) => +x || 0)
    else if (a instanceof IPAddressBase) this.o = [...a.o]
    else if (b === undefined) this.o = [a >>> 0 & 255, (a >>> 8) & 255, (a >>> 16) & 255, (a >>> 24) & 255]
    else this.o = [a, b, c, d].map((x) => (x | 0) & 255)
    for (let i = 0; i < 4; i++) this[i] = this.o[i] ?? 0
  }
  toString() {
    return this.o.join('.')
  }
  valueOf() {
    return this.o.join('.')
  }
  fromString(s) {
    const o = String(s).split('.')
    if (o.length !== 4 || o.some((x) => !/^\d+$/.test(x) || +x > 255)) return false
    this.o = o.map(Number)
    for (let i = 0; i < 4; i++) this[i] = this.o[i]
    return true
  }
  printTo() {
    return this.toString().length
  }
}

export default {
  header: 'WiFi.h',
  globals: {
    WL_IDLE_STATUS: 0, WL_NO_SSID_AVAIL: 1, WL_SCAN_COMPLETED: 2, WL_CONNECTED: 3, WL_CONNECT_FAILED: 4, WL_CONNECTION_LOST: 5, WL_DISCONNECTED: 6,
    WL_NO_SHIELD: 255,
    WIFI_STA: 1, WIFI_AP: 2, WIFI_AP_STA: 3, WIFI_OFF: 0, WIFI_MODE_STA: 1, WIFI_MODE_AP: 2, WIFI_MODE_APSTA: 3, WIFI_MODE_NULL: 0,
    WIFI_AUTH_OPEN: 0, WIFI_AUTH_WEP: 1, WIFI_AUTH_WPA_PSK: 2, WIFI_AUTH_WPA2_PSK: 3, WIFI_AUTH_WPA_WPA2_PSK: 4, WIFI_AUTH_WPA2_ENTERPRISE: 5, WIFI_AUTH_WPA3_PSK: 6,
    WIFI_SCAN_RUNNING: -1, WIFI_SCAN_FAILED: -2,
    WIFI_PS_NONE: 0, WIFI_PS_MIN_MODEM: 1, WIFI_PS_MAX_MODEM: 2,
  },
  classes: {
    IPAddress: () => IPAddressBase,
  },
  env(env) {
    if (!env.board.wifi) return {}
    const net = netState(env)
    // estado da estação (STA)
    let since = null // µs do begin()
    let ssid = ''
    let ap = null // ponto de acesso escolhido (ou null)
    let fail = 0 // WL_NO_SSID_AVAIL / WL_CONNECT_FAILED quando falha
    let staticIp = null
    let hostname = 'esp32-robolab'
    let mode = 0
    let softAp = null // { ssid, pass }
    let scan = [] // resultados do último scanNetworks
    let scanning = null // µs de fim da procura assíncrona
    let reported = false
    const ip = () => staticIp || new IPAddressBase(192, 168, 4, 42)
    const DELAY = { ok: 1_500_000, nossid: 2_200_000, fail: 3_000_000 }
    const status = () => {
      if (since == null) return 0
      const dt = env.rt.t - since
      if (fail) return dt >= (fail === 1 ? DELAY.nossid : DELAY.fail) ? fail : 6
      return dt >= DELAY.ok ? 3 : 6
    }
    const connected = () => status() === 3
    net.wifi = {
      connected,
      ip: () => ip().toString(),
      softAP: () => !!softAp,
      apIP: () => '192.168.4.1',
      ssid: () => ssid,
    }
    const report = () => {
      // mensagens explicativas (uma vez) quando a ligação falha
      if (reported || !fail || status() !== fail) return
      reported = true
      const list = ACCESS_POINTS.map((a) => `${a.ssid} (${ENC_NAME[a.enc]}${a.pass ? `, "${a.pass}"` : ''})`).join(', ')
      if (fail === 1) env.warnOnce(`nossid:${ssid}`, i18n.m(`WiFi.begin("${ssid}"): rede não encontrada (WL_NO_SSID_AVAIL). Redes virtuais disponíveis: ${list}.`, `WiFi.begin("${ssid}"): network not found (WL_NO_SSID_AVAIL). Available virtual networks: ${list}.`), 'info')
      else env.warnOnce(`wifipass:${ssid}`, `WiFi.begin("${ssid}"): palavra-passe errada (WL_CONNECT_FAILED). Redes virtuais: ${list}.`, 'info')
    }
    const rssiOf = (a) => a.rssi + Math.round((Math.random() - 0.5) * 6)
    const doScan = () => {
      scan = ACCESS_POINTS.map((a) => ({ ...a, rssi: rssiOf(a) })).sort((a, b) => b.rssi - a.rssi)
      return scan.length
    }
    const WiFi = {
      mode: (m) => ((mode = m ?? mode), true),
      getMode: () => mode,
      begin(s = '', pass = '') {
        ssid = String(s ?? '')
        pass = pass == null ? '' : String(pass)
        if (!(mode & 1)) mode |= 1
        since = env.rt.t
        reported = false
        ap = ACCESS_POINTS.find((a) => a.ssid === ssid) || null
        fail = !ap ? 1 : ap.pass && ap.pass !== pass ? 4 : 0
        env.setWifiOn(true)
        if (pass && pass.length < 8 && (!ap || ap.pass)) env.warnOnce('wifipass', i18n.m('WiFi.begin(): a palavra-passe WPA2 tem de ter pelo menos 8 caracteres.', 'WiFi.begin(): the WPA2 password must be at least 8 characters long.'))
        env.rt.t += 2000
        return 6
      },
      status() {
        env.rt.t += 5
        const s = status()
        if (s === 1 || s === 4) report()
        return s
      },
      isConnected: () => connected(),
      waitForConnectResult(timeout = 60000) {
        if (since == null) return 6
        const need = (fail === 1 ? DELAY.nossid : fail ? DELAY.fail : DELAY.ok) - (env.rt.t - since)
        if (need > 0) env.rt.t += Math.min(need, timeout * 1000)
        const s = status()
        report()
        return s
      },
      disconnect(wifioff = false) {
        since = null
        fail = 0
        if (wifioff) mode = 0
        if (!softAp) env.setWifiOn(false)
        return true
      },
      reconnect: () => {
        if (ssid) since = env.rt.t
        return true
      },
      setAutoReconnect: () => true,
      getAutoReconnect: () => true,
      setAutoConnect: () => true,
      persistent: () => {},
      setSleep: () => true,
      setTxPower: () => true,
      onEvent: () => 0,
      config(a) {
        staticIp = a ? new IPAddressBase(a) : null
        return true
      },
      localIP: () => (connected() ? ip() : new IPAddressBase(0, 0, 0, 0)),
      gatewayIP: () => (connected() ? new IPAddressBase(192, 168, 4, 1) : new IPAddressBase(0, 0, 0, 0)),
      subnetMask: () => new IPAddressBase(255, 255, 255, 0),
      dnsIP: () => new IPAddressBase(192, 168, 4, 1),
      broadcastIP: () => new IPAddressBase(192, 168, 4, 255),
      // SSID() da ligação atual ou SSID(i) de uma rede encontrada no scanNetworks()
      SSID: (i) => (i == null ? (connected() ? ssid : '') : scan[i]?.ssid ?? ''),
      RSSI: (i) => (i == null ? (connected() ? rssiOf(ap) : 0) : scan[i]?.rssi ?? 0),
      encryptionType: (i) => scan[i]?.enc ?? 0,
      channel: (i) => (i == null ? (connected() ? ap.ch : 0) : scan[i]?.ch ?? 0),
      BSSIDstr: (i) => (i == null ? (connected() ? ap.bssid : '') : scan[i]?.bssid ?? ''),
      psk: () => (connected() ? ap.pass : ''),
      macAddress: () => '24:A1:60:7C:3B:10',
      setHostname: (n) => ((hostname = String(n)), true),
      getHostname: () => hostname,
      // procura de redes: síncrona (~2 s) ou assíncrona (scanNetworks(true) + scanComplete())
      scanNetworks(async = false) {
        if (async) {
          scanning = env.rt.t + 2_000_000
          return -1
        }
        env.rt.t += 2_000_000
        return doScan()
      },
      scanComplete() {
        if (scanning == null) return scan.length ? scan.length : -2
        if (env.rt.t < scanning) return -1
        scanning = null
        return doScan()
      },
      scanDelete: () => {
        scan = []
      },
      // ponto de acesso próprio (o browser liga-se a ele pelo botão "Abrir página do ESP32")
      softAP(s, pass) {
        softAp = { ssid: String(s ?? 'ESP32'), pass: pass ? String(pass) : '' }
        mode |= 2
        env.setWifiOn(true)
        if (softAp.pass && softAp.pass.length < 8) {
          env.warnOnce('softappass', i18n.m('WiFi.softAP(): a palavra-passe tem de ter pelo menos 8 caracteres (o ponto de acesso não arranca).', 'WiFi.softAP(): the password must be at least 8 characters long (the access point does not start).'))
          softAp = null
          return false
        }
        return true
      },
      softAPConfig: () => true,
      softAPIP: () => new IPAddressBase(192, 168, 4, 1),
      softAPgetStationNum: () => (softAp ? 1 : 0),
      softAPdisconnect: () => {
        softAp = null
        return true
      },
      softAPmacAddress: () => '24:A1:60:7C:3B:11',
      softAPSSID: () => softAp?.ssid ?? '',
    }
    return { WiFi }
  },
}
