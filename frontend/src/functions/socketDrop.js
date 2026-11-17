// Encaixe por arrasto no Mundo 3D (group-pico): ao largar uma peça encaixável (Pico, Pico W,
// Pico 2, Pico 2 W…) perto de um soquete livre que a aceita (ex.: Pico4Drive), ela encaixa —
// fica presa ao soquete no 3D e com os pinos alinhados no 2D (ligações automáticas, ver
// shared/sockets.js). Arrastar uma peça encaixada para longe do soquete tira-a e pousa-a na mesa.
import * as THREE from 'three'
import { useStore } from '../contexts/store.js'
import { simRef } from '../contexts/simRef.js'
import { DEFS } from '@shared/components.js'
import { socketsFor, placeInSocket, socketMount } from '@shared/sockets.js'
import { t } from '../i18n/index.js'

const SNAP_CM = 3 // distância horizontal (cm) até onde a peça largada encaixa
const OUT_CM = 1.2 // deslocamento a partir do qual uma peça encaixada sai do soquete

const _v = new THREE.Vector3()
const _w = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()

export function socketDrop(id) {
  const st = useStore.getState()
  const part = st.parts.find((p) => p.id === id)
  const obj = part && simRef.objects.get(id)
  if (!part || !obj) return
  // posição mundo a partir do estado (o grupo 3D só é atualizado no frame seguinte)
  if (obj.parent) {
    obj.parent.updateWorldMatrix(true, false)
    _v.set(...part.pos).applyMatrix4(obj.parent.matrixWorld)
  } else _v.set(...part.pos)
  const host = part.parent && st.parts.find((q) => q.id === part.parent.id)
  const inSocket = host && socketMount(host.type, part.parent.mount)

  // soquete livre mais próximo (o atual também conta)
  let best = null
  for (const { host: h, mount } of socketsFor(st.parts, part.type)) {
    if (h.id === part.id) continue
    if (st.parts.some((x) => x.id !== part.id && x.parent?.id === h.id && x.parent.mount === mount)) continue
    const mo = simRef.mountObjects.get(`${h.id}:${mount}`)
    if (!mo) continue
    mo.updateWorldMatrix(true, false)
    mo.getWorldPosition(_w)
    const d = Math.hypot(_w.x - _v.x, _w.z - _v.z)
    if (d < SNAP_CM && (!best || d < best.d)) best = { h, mount, d }
  }

  if (best) {
    const same = inSocket && host.id === best.h.id && part.parent.mount === best.mount
    st.set({ parts: st.parts.map((p) => (p.id === id ? placeInSocket(p, best.h, best.mount) : p)) })
    if (!same) st.notify(t({ pt: `${DEFS[part.type].name} encaixada no ${DEFS[best.h.type].mounts[best.mount].label} da ${DEFS[best.h.type].short || DEFS[best.h.type].name} — pinos ligados`, en: `${DEFS[part.type].name} plugged into the ${DEFS[best.h.type].mounts[best.mount].label} of the ${DEFS[best.h.type].short || DEFS[best.h.type].name} — pins connected` }))
    return
  }
  if (!inSocket) return
  // arrastada para fora do soquete: pousa na mesa, onde está, com a mesma orientação
  if (Math.hypot(part.pos[0] || 0, part.pos[2] || 0) < OUT_CM) {
    st.set({ parts: st.parts.map((p) => (p.id === id ? placeInSocket(p, host, part.parent.mount) : p)) })
    return
  }
  obj.getWorldQuaternion(_q)
  _e.setFromQuaternion(_q, 'YXZ')
  const yaw = Math.round((_e.y * 180) / Math.PI)
  st.set({
    parts: st.parts.map((p) =>
      p.id === id ? { ...p, parent: null, pos: [Math.round(_v.x * 4) / 4, 0, Math.round(_v.z * 4) / 4], rot: [0, yaw, 0], sch: p.sch ? { ...p.sch, y: p.sch.y + 160 } : p.sch } : p,
    ),
  })
  st.notify(t({ pt: `${DEFS[part.type].name} tirada do soquete`, en: `${DEFS[part.type].name} removed from the socket` }))
}

// peças encaixadas também se podem arrastar (para as tirar do soquete)
export const isSocketMount = (m) => !!m?.socket
