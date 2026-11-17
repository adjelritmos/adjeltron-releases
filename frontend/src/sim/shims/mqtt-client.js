// Versão browser de engine/sim/mqtt-client.js: o site não abre ligações TCP; a app desktop
// abre-as pelo servidor Rust (Bun.connect de desktop/net.js) e usa o cliente verdadeiro.
import { mqttConnect as realConnect } from '@engine/sim/mqtt-client.js'
import { desktopNet } from '../desktop/state.js'

export function mqttConnect(opts) {
  if (desktopNet()) return realConnect(opts)
  return Promise.resolve({ ok: false, error: 'sem ligações TCP no browser (use o broker simulado)' })
}
