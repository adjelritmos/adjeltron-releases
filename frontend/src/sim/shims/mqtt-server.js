// Versão browser de engine/sim/mqtt-server.js.
//  - site: não há broker de rede; todos os sketches usam o broker simulado (engine/sim/mqtt.js);
//  - app desktop: o servidor Rust abre as portas (TCP 1883 / WS 9001) e entrega as ligações ao
//    worker (desktop/net.js), que corre o protocolo MQTT do mqtt-server.js verdadeiro.
import * as real from '@engine/sim/mqtt-server.js'
import { desktopNet } from '../desktop/state.js'

export const mqttInfo = real.mqttInfo
export const isLocalHost = (h) => (desktopNet() ? real.isLocalHost(h) : true)
export const usesInternalBroker = (h, p) => (desktopNet() ? real.usesInternalBroker(h, p) : true)
export const startMqttServer = () => null
export const mqttWs = { upgrade: () => false, open() {}, message() {}, close() {} }
export const handleMqttApi = () => null
