// Estado de rede do browser: id da sessão do simulador (para a página do WebServer do ESP32)
// e o registo do painel MQTT. As mensagens chegam por simControl.js (Web Worker do simulador).
import { create } from 'zustand'

const MAX = 500

export const useNet = create((set) => ({
  session: null, // id da sessão (/api/gw/<id>/)
  log: [], // [{ id, topic, payload, retain, from, at, dir: 'in' | 'out' }]
  stats: null, // { clients, sketches, external, retained, tcpPort, wsPort, ips, target, watching, sketch }
  target: 'local', // broker que o painel vê: 'local' (adjeltron) | 'sketch' (o broker do sketch)
  filter: '#',
  subscribed: false,
  error: null,
  set: (p) => set(p),
}))

let seq = 0
export function netMessage(msg) {
  const st = useNet.getState()
  switch (msg.type) {
    case 'hello':
      st.set({ session: msg.session })
      return true
    case 'mqtt': {
      const patch = { stats: msg.stats ?? st.stats, error: null }
      if (msg.filter) Object.assign(patch, { filter: msg.filter, subscribed: true })
      if (msg.msgs?.length) patch.log = [...st.log, ...msg.msgs.map((m) => ({ ...m, id: ++seq, dir: m.from === `painel-${st.session}` ? 'out' : 'in' }))].slice(-MAX)
      st.set(patch)
      return true
    }
    case 'mqtt-error':
      st.set({ error: msg.msg })
      return true
  }
  return false
}
