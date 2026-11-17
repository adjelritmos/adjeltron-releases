// Polyfills para correr o código do simulador (escrito para o Bun) no browser.
// Tem de ser o PRIMEIRO import do worker.
import { Buffer } from 'buffer'

if (!globalThis.Buffer) globalThis.Buffer = Buffer
if (globalThis.crypto && !globalThis.crypto.randomUUID) {
  // crypto.randomUUID só existe em contextos seguros (https / localhost)
  globalThis.crypto.randomUUID = () => '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16))
}

// process.env: o código do servidor lê variáveis de ambiente (MQTT_USER, MQTT_OFFLINE…) — aqui não há nenhuma
if (!globalThis.process) globalThis.process = { env: {}, platform: 'browser' }
