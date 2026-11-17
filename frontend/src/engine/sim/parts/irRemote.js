// Comando IR (NEC): ao premir uma tecla envia uma trama a todos os recetores IR
// alimentados; mantendo-a premida envia códigos de repetição a cada 108 ms.
import { REMOTE_CODE } from '../../../../../shared/parts/irRemote.js'

function send(ctx, frame) {
  const { circuit } = ctx
  for (const q of circuit.nets.partOf.values()) {
    if (q.type !== 'irReceiver') continue
    const st = circuit.st[q.id]
    if (!st?.powered) continue
    ;(st.irQ ||= []).push(frame)
    if (st.irQ.length > 4) st.irQ.shift()
    ;(st.irLog ||= []).push(frame)
  }
}

export default {
  type: 'irRemote',
  step(ctx) {
    const { s, input, timeUs } = ctx
    const k = input.key || null
    const cmd = k != null ? REMOTE_CODE[k] : undefined
    if (k && k !== s.lastKey && cmd !== undefined) {
      send(ctx, { t: timeUs, cmd, rep: false })
      s.next = timeUs + 108000
    } else if (k && k === s.lastKey && cmd !== undefined && timeUs >= s.next) {
      send(ctx, { t: timeUs, cmd, rep: true })
      s.next += 108000
    }
    s.lastKey = k
  },
  output({ live, input }) {
    live.key = input.key || null
  },
}
