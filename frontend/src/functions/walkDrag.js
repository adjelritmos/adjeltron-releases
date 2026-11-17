// Arrastar a pessoa (def.walker) com o rato durante a simulação: ela anda pelo plano do chão
// onde foi posta. O deslocamento vai para o simulador em inputs[id] = { px, pz, yaw } (cm e rad,
// no referencial da peça — o grupo da peça fica onde foi posta na construção e o modelo é que
// se desloca, ver three/parts/pessoa.jsx). A pessoa vira-se para a direção em que anda.
// Com a física da simulação (PhysicsWorld) o rato só dá o alvo (simRef.physicsWalk.walkTo): é a
// física que a leva até lá sem atravessar nada, sobe degraus e envia a posição ao backend.
import * as THREE from 'three'
import { setInput } from '../services/simControl.js'
import { simRef } from '../contexts/simRef.js'

const SEND_MS = 33 // ~30 mensagens por segundo para o backend

// obj: grupo 3D da peça (pose de construção); point: ponto onde se agarrou (mundo)
export function startWalkDrag(id, ev, obj, point) {
  const three = simRef.three
  if (!three || !obj) return false
  obj.updateWorldMatrix(true, false)
  const inv = obj.matrixWorld.clone().invert()
  const n = new THREE.Vector3(0, 1, 0).transformDirection(obj.matrixWorld)
  const origin = new THREE.Vector3().setFromMatrixPosition(obj.matrixWorld)
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, origin)
  const rc = new THREE.Raycaster()
  const hit = new THREE.Vector3()
  const toLocal = (e) => {
    const r = three.gl.domElement.getBoundingClientRect()
    rc.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), three.camera)
    return rc.ray.intersectPlane(plane, hit) ? hit.clone().applyMatrix4(inv) : null
  }
  const i0 = simRef.inputs[id] || {}
  let px = +i0.px || 0
  let pz = +i0.pz || 0
  let yaw = +i0.yaw || 0
  // agarra-se pelo ponto onde se clicou (a pessoa não salta para o cursor)
  const l0 = toLocal(ev) || new THREE.Vector3().copy(point).applyMatrix4(inv)
  const gx = l0.x - px
  const gz = l0.z - pz
  let lastSend = 0
  let timer = null
  const send = () => {
    timer = null
    lastSend = performance.now()
    setInput(id, { px: Math.round(px * 100) / 100, pz: Math.round(pz * 100) / 100, yaw: Math.round(yaw * 1000) / 1000 })
  }
  const move = (e) => {
    const l = toLocal(e)
    if (!l) return
    const nx = l.x - gx
    const nz = l.z - gz
    const dx = nx - px
    const dz = nz - pz
    if (Math.hypot(dx, dz) < 0.05) return
    // vira-se para onde anda (o +x da pessoa é a frente): rotação em y que leva +x a (dx, dz)
    if (Math.hypot(dx, dz) > 0.15) yaw = Math.atan2(-dz, dx)
    // com física: a pessoa vai para o alvo sem atravessar paredes, portas fechadas, móveis… e é
    // o PhysicsWorld que atualiza simRef.inputs e envia a posição real ao backend
    const phys = simRef.physicsWalk
    if (phys?.has(id)) {
      phys.walkTo(id, nx, nz)
      return
    }
    px = nx
    pz = nz
    // atualização local imediata (o modelo segue o rato sem esperar pelo backend)
    simRef.inputs[id] = { ...(simRef.inputs[id] || {}), px, pz, yaw }
    const wait = SEND_MS - (performance.now() - lastSend)
    if (wait <= 0) send()
    else if (!timer) timer = setTimeout(send, wait)
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', up)
    if (timer) clearTimeout(timer)
    if (simRef.physicsWalk?.has(id)) return void simRef.physicsWalk.release(id)
    send()
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', up)
  return true
}
