import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../../contexts/store.js'
import { DEFS, mountsOf, partScale, partSize, pinPos3d, pins3d, vehicleLift, chosenMaterial, genericMaterial } from '@shared/components.js'
import { applyMaterial } from '../../functions/materialSwap.js'
import { servoHornRotation, rootOf } from '@shared/assembly.js'
import { ARENA } from '@shared/tracks.js'
import { simRef } from '../../contexts/simRef.js'
import { getTrack } from '../../functions/trackTexture.js'
import { MODELS } from './models.jsx'
import { PartCtx } from './kit.jsx'
import { pressButton, releaseButtons, setInput } from '../../services/simControl.js'
import { startJoystickDrag } from '../../functions/joystickDrag.js'
import { startWalkDrag } from '../../functions/walkDrag.js'
import { Wires3D } from './Wires3D.jsx'
import { PhysicsLayer } from './physics/PhysicsWorld.jsx'
import { wireContainerOf, gizmoBusy } from './Wires3D.jsx'
import { InkTraces } from './InkTraces.jsx'
import { StudioEnvironment } from './StudioEnvironment.jsx'
import { socketDrop } from '../../functions/socketDrop.js'
import { beginMove } from '../../functions/buildCollision.js'
import { movesOnBreadboard } from '@shared/placement.js'
import { PITCH } from '@shared/geometry.js'
import { mountAngleNow, slideInfo } from '../../functions/mechLive.js'

const D2R = Math.PI / 180
const objects = simRef.objects
const mountObjects = simRef.mountObjects

// ---------- Mesa / pista ----------
function Arena() {
  const trackId = useStore((s) => s.track)
  const track = getTrack(trackId)
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(track.canvas)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [track])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow name="floor">
        <planeGeometry args={[ARENA.w, ARENA.h]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
      <mesh position={[0, -2.6, 0]} receiveShadow>
        <boxGeometry args={[ARENA.w + 30, 5, ARENA.h + 30]} />
        <meshStandardMaterial color="#6b4f3a" roughness={0.8} />
      </mesh>
      {/* chão à volta da mesa, à mesma altura do chão da física (que se estende para lá da mesa):
          o que sair da arena (um drone, uma peça atirada) fica pousado e visível. São 4 faixas
          à VOLTA da mesa — nunca por baixo dela: um plano inteiro a 0,3 mm do tampo cintilava
          (z-fighting) entre o tampo e o chão */}
      {(() => {
        const W = (ARENA.w + 30) / 2
        const D = (ARENA.h + 30) / 2
        const F = 2500
        return [
          [0, -(D + F) / 2, 2 * F, F - D],
          [0, (D + F) / 2, 2 * F, F - D],
          [-(W + F) / 2, 0, F - W, 2 * D],
          [(W + F) / 2, 0, F - W, 2 * D],
        ].map(([x, z, w, d], i) => (
          <mesh key={`chao${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.03, z]} receiveShadow>
            <planeGeometry args={[w, d]} />
            <meshStandardMaterial color="#3b3d40" roughness={0.95} />
          </mesh>
        ))
      })()}
      {[
        [0, ARENA.h / 2 + 0.5, ARENA.w + 2, 1],
        [0, -ARENA.h / 2 - 0.5, ARENA.w + 2, 1],
        [ARENA.w / 2 + 0.5, 0, 1, ARENA.h],
        [-ARENA.w / 2 - 0.5, 0, 1, ARENA.h],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 3, z]} castShadow receiveShadow>
          <boxGeometry args={[w, 6, d]} />
          <meshStandardMaterial color="#e9e4da" />
        </mesh>
      ))}
      {track.obstacles.map((o, i) => (
        <mesh key={i} position={[o.x, o.h / 2, o.z]} castShadow receiveShadow>
          <boxGeometry args={[o.w, o.h, o.d]} />
          <meshStandardMaterial color={o.color} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

// material escolhido no painel (peças mecânicas): aplicado depois de o modelo montar e outra
// vez um pouco depois (alguns modelos só ficam completos uns frames mais tarde)
function MaterialSwap({ part, children }) {
  const g = useRef()
  const key = chosenMaterial(part)
  const color = key ? part.config?.matColor : null
  const base = genericMaterial(part.type)
  useEffect(() => {
    applyMaterial(g.current, key, color, base)
    const t = setTimeout(() => applyMaterial(g.current, key, color, base), 300)
    return () => clearTimeout(t)
  }, [key, color, part.config])
  return <group ref={g}>{children}</group>
}

// tecla de um teclado (4×4, 3×4) debaixo do ponto clicado na vista 3D
const _kp = new THREE.Vector3()
function keyAt(part, ia, point) {
  const o = objects.get(part.id)
  if (!o) return null
  o.updateWorldMatrix(true, false)
  _kp.copy(point).applyMatrix4(o.matrixWorld.clone().invert())
  const sc = partScale(part) || [1, 1, 1]
  const x = _kp.x / sc[0]
  const z = _kp.z / sc[2]
  const G = ia.geom
  // teclas soltas (redondas ou retangulares): a mais próxima que contém o ponto
  if (G.points) {
    let best = null
    let bd = Infinity
    for (const p of G.points) {
      const dx = x - p.x
      const dz = z - p.z
      const inside = p.r != null ? Math.hypot(dx, dz) <= p.r + 0.12 : Math.abs(dx) <= p.w / 2 + 0.06 && Math.abs(dz) <= p.d / 2 + 0.06
      const d = Math.hypot(dx, dz)
      if (inside && d < bd) (best = p.key), (bd = d)
    }
    return best
  }
  const c = G.colX.findIndex((cx) => Math.abs(x - cx) <= G.w / 2 + 0.12)
  const r = G.rowZ.findIndex((rz) => Math.abs(z - rz) <= G.d / 2 + 0.12)
  return c >= 0 && r >= 0 ? ia.keys[r]?.[c] ?? null : null
}

const _carT = new THREE.Vector3()
const _carP = new THREE.Vector3()

// ---------- Pino 3D ----------
function Pin({ part, pin }) {
  const pending = useStore((s) => s.pendingPin)
  const clickPin = useStore((s) => s.clickPin)
  const connected = useStore((s) => s.wires.some((w) => (w.a.part === part.id && w.a.pin === pin.id) || (w.b.part === part.id && w.b.pin === pin.id)))
  const [hover, setHover] = useState(false)
  const isPending = pending && pending.part === part.id && pending.pin === pin.id
  const color = isPending ? '#ffffff' : hover ? '#ffffff' : connected ? '#7CFC00' : '#e8b84a'
  return (
    <mesh
      position={pinPos3d(part, pin)}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHover(true)
        document.body.style.cursor = 'crosshair'
      }}
      onPointerOut={() => {
        setHover(false)
        document.body.style.cursor = ''
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        clickPin(part.id, pin.id)
      }}
      scale={hover || isPending ? 1.8 : 1}
    >
      <sphereGeometry args={[0.09, 10, 8]} />
      <meshBasicMaterial color={color} />
      {(hover || isPending) && (
        <Html distanceFactor={18} position={[0, 0.5, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="pin-tip">
            <b>{pin.label || pin.id}</b>
            <span>{DEFS[part.type].name}</span>
          </div>
        </Html>
      )}
    </mesh>
  )
}

// ---------- Ponto de fixação (o braço dos servos roda) ----------
function MountGroup({ part, mountId, mount, children }) {
  const inner = useRef()
  useFrame(() => {
    if ((!mount.servo && !mount.slide) || !inner.current) return
    // num robô com física dinâmica é o corpo rígido do Rapier que move este grupo
    if (simRef.physicsOwned.has(`${part.id}:${mountId}`)) return
    // carros de fusos, cremalheiras… (live.slide, ver src/engine/sim/mech.js)
    const sl = mount.slide && slideInfo(part, mountId)
    const d = sl ? +simRef.engine?.live?.[part.id]?.slide?.[mountId] || 0 : 0
    inner.current.position.set(sl ? sl.axis[0] * d : 0, sl ? sl.axis[1] * d : 0, sl ? sl.axis[2] * d : 0)
    if (!mount.servo) return
    // servos, ou peças com veio contínuo (motor de passo, motor com encoder, engrenagens
    // movidas) via live.mountAngle, extrapolado entre fotografias (mechLive.js)
    // (mount.rev: outra ponta do mesmo veio, com o +y ao contrário → ângulo simétrico)
    const a = mountAngleNow(part.id)
    inner.current.rotation.set(0, servoHornRotation(mount.rev ? 180 - a : a)[1] * D2R, 0)
  })
  return (
    <group position={mount.pos} rotation={(mount.rot || [0, 0, 0]).map((r) => r * D2R)}>
      <group
        ref={(g) => {
          inner.current = g
          if (g) mountObjects.set(`${part.id}:${mountId}`, g)
        }}
      >
        {children}
      </group>
    </group>
  )
}

// ---------- Peça (recursiva) ----------
function PartNode({ part, all }) {
  const def = DEFS[part.type]
  const Model = MODELS[part.type]
  const mode = useStore((s) => s.mode)
  const selected = useStore((s) => s.selected?.kind === 'part' && s.selected.id === part.id)
  const showPins = useStore((s) => s.mode === 'build' && (s.selected?.id === part.id || !!s.pendingPin))
  const set = useStore((s) => s.set)
  const g = useRef()
  const isVehicleRoot = !!def?.vehicle && !part.parent
  useFrame((_, dt) => {
    const o = g.current
    if (!o) return
    if (simRef.physicsOwned.has(part.id)) return // pose dada pela física (three/physics)
    const e = simRef.engine
    if (e && isVehicleRoot) {
      const v = e.vehicles.find((x) => x.part.id === part.id)
      if (v) {
        // o estado chega a ~30 Hz: interpola suavemente até à pose recebida
        const k = 1 - Math.exp(-dt * 25)
        o.position.x += (v.pose.x - o.position.x) * k
        o.position.z += (v.pose.z - o.position.z) * k
        o.position.y = part.pos[1] + vehicleLift(part, useStore.getState().parts)
        let da = v.pose.theta - o.rotation.y
        da = Math.atan2(Math.sin(da), Math.cos(da))
        o.rotation.set(0, o.rotation.y + da * k, 0)
        return
      }
    }
    if (e && part.type === 'cube') {
      const c = e.cubes.find((x) => x.part.id === part.id)
      if (c && o.parent) {
        o.parent.updateWorldMatrix(true, false)
        o.parent.matrixWorld.clone().invert().multiply(c.matrix).decompose(o.position, o.quaternion, o.scale)
        return
      }
    }
    // carro que anda (peça "carro"): distância percorrida ao longo do seu +x, vinda do backend
    if (e && !part.parent && def.car) {
      o.rotation.set(...part.rot.map((r) => r * D2R))
      const d = +e.live?.[part.id]?.d || 0
      _carT.set(d, 0, 0).applyEuler(o.rotation).add(_carP.set(part.pos[0], part.pos[1], part.pos[2]))
      // volta ao início (salto grande): sem deslizar para trás
      if (o.position.distanceTo(_carT) > 6) o.position.copy(_carT)
      else o.position.lerp(_carT, 1 - Math.exp(-dt * 20))
      return
    }
    o.position.set(part.pos[0], part.pos[1] + (part.parent ? 0 : vehicleLift(part, all)), part.pos[2])
    o.rotation.set(...part.rot.map((r) => r * D2R))
  })
  const mounts = mountsOf(part)
  const kids = all.filter((p) => p.parent?.id === part.id)
  return (
    <group
      ref={(o) => {
        g.current = o
        if (o) {
          objects.set(part.id, o)
          o.userData.partId = part.id
        }
      }}
    >
      <group
        onPointerDown={(e) => {
          if (e.button !== 0 || gizmoBusy()) return
          const st = useStore.getState()
          if (st.mode === 'sim') {
            // peças interativas: como no circuito 2D (botões, interruptores, teclados…)
            const ia = DEFS[part.type].interactive
            if (part.type === 'button' || ia?.kind === 'press' || ia?.press) {
              e.stopPropagation()
              pressButton(part.id)
            } else if (ia?.kind === 'toggle') {
              e.stopPropagation()
              setInput(part.id, { on: !simRef.inputs[part.id]?.on })
            } else if (ia?.kind === 'joystick') {
              // manípulo: arrasta-se para inclinar; premir sem arrastar = SW
              e.stopPropagation()
              const obj = objects.get(part.id)
              const three = simRef.three
              if (!obj || !three) return
              obj.updateWorldMatrix(true, false)
              const inv = obj.matrixWorld.clone().invert()
              const n = new THREE.Vector3(0, 1, 0).transformDirection(obj.matrixWorld)
              const pl = new THREE.Plane().setFromNormalAndCoplanarPoint(n, e.point)
              const l0 = e.point.clone().applyMatrix4(inv)
              const rc = new THREE.Raycaster()
              const hitP = new THREE.Vector3()
              const R = 1.2 // cm de arrasto até ao fim de curso
              set({ dragging3d: part.id }) // a câmara não roda enquanto se mexe o manípulo
              startJoystickDrag(part.id, e.nativeEvent, (ev) => {
                const r = three.gl.domElement.getBoundingClientRect()
                rc.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), three.camera)
                if (!rc.ray.intersectPlane(pl, hitP)) return null
                const l = hitP.applyMatrix4(inv)
                return { dx: (l.x - l0.x) / R, dy: (l.z - l0.z) / R }
              })
            } else if (DEFS[part.type].walker) {
              // pessoa: arrasta-se pelo chão e anda (o PIR vê-a a mexer-se) — functions/walkDrag.js
              e.stopPropagation()
              if (startWalkDrag(part.id, e.nativeEvent, objects.get(part.id), e.point)) set({ dragging3d: part.id })
            } else if (ia?.kind === 'keypad' && ia.geom) {
              const key = keyAt(part, ia, e.point)
              if (key) {
                e.stopPropagation()
                setInput(part.id, { key })
                // marcador rotativo: um clique marca o algarismo (o disco roda sozinho)
                if (ia.geom.tap) setTimeout(() => releaseButtons(), 120)
              }
            } else if (simRef.physicsGrab?.start(part.id, e.point)) {
              // peça solta (cubo, bloco, esfera, robô livre): arrasta-se com o rato pela física
              e.stopPropagation()
              simGrab.y = e.point.y
              set({ dragging3d: part.id })
            }
            return
          }
          e.stopPropagation()
          const pm = part.parent ? mountsOf(st.parts.find((x) => x.id === part.parent.id))?.[part.parent.mount] : null
          // peças num soquete (Pico na Pico4Drive) também se arrastam: para fora tiram-se (socketDrop.js)
          const draggable = !part.parent || pm?.plane || pm?.socket
          // só começa a arrastar depois de o rato se mexer (um clique apenas seleciona)
          drag3d.id = draggable ? part.id : null
          drag3d.sx = e.nativeEvent.clientX
          drag3d.sy = e.nativeEvent.clientY
          drag3d.moved = false
          drag3d.start = null
          set({ selected: { kind: 'part', id: part.id }, leftTab: 'props', dragging3d: draggable ? part.id : null })
        }}
      >
        {/* dimensões editadas (config.scale): só o modelo desta peça é escalado; os filhos
            mudam de sítio pelos pontos de fixação (mountsOf), sem deformar */}
        <group scale={partScale(part) || [1, 1, 1]}>
          <MaterialSwap part={part}>
            <PartCtx.Provider value={part}>
              <Model part={part} />
            </PartCtx.Provider>
          </MaterialSwap>
        </group>
      </group>
      {selected && mode === 'build' && (
        <mesh position={[part.type === 'armLink' ? (part.config.length ?? 10) / 2 : 0, (def.size[1] * (partSize(part)?.[1] ?? 1)) / 2, 0]}>
          <boxGeometry args={[(part.type === 'armLink' ? (part.config.length ?? 10) + 1.6 : def.size[0] * (partSize(part)?.[0] ?? 1)) + 0.4, def.size[1] * (partSize(part)?.[1] ?? 1) + 0.4, def.size[2] * (partSize(part)?.[2] ?? 1) + 0.4]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.5} />
        </mesh>
      )}
      {showPins && !def.breadboard && pins3d(part).map((pin) => <Pin key={pin.id} part={part} pin={pin} />)}
      {Object.entries(mounts).map(([mid, m]) => (
        <MountGroup key={mid} part={part} mountId={mid} mount={m}>
          {kids
            .filter((k) => k.parent.mount === mid && DEFS[k.type])
            .map((k) => (
              <PartNode key={k.id} part={k} all={all} />
            ))}
        </MountGroup>
      ))}
      {!part.parent && wireContainerOf(part, all) && <Wires3D container={part.id} />}
    </group>
  )
}

// estado do arrasto 3D (fora do React: muda a cada movimento do rato)
const drag3d = { id: null, sx: 0, sy: 0, moved: false, start: null }
// arrasto de uma peça solta durante a simulação (altura do plano horizontal onde se arrasta)
const simGrab = { y: 0 }
const DRAG_PX = 5 // limiar em píxeis para distinguir clique de arrasto

// ---------- Mundo ----------
function World() {
  const parts = useStore((s) => s.parts)
  const { camera, pointer, raycaster, controls, scene, gl } = useThree()
  const plane = useMemo(() => new THREE.Plane(), [])
  const hit = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const up = () => {
      // largou uma peça arrastada: encaixa num soquete próximo / sai do soquete (socketDrop.js)
      if (drag3d.id && drag3d.moved && useStore.getState().mode === 'build') {
        // peça da breadboard largada: assente nos furos onde ficou (ou volta à mesa se saiu dela)
        if (drag3d.start?.bb) useStore.getState().dropOnBreadboard(drag3d.id, drag3d.start.seat0)
        socketDrop(drag3d.id)
      }
      drag3d.id = null
      drag3d.start = null
      if (useStore.getState().dragging3d) useStore.getState().set({ dragging3d: null })
      simRef.physicsGrab?.end()
      releaseButtons()
    }
    const move = (ev) => {
      if (drag3d.id && !drag3d.moved && Math.hypot(ev.clientX - drag3d.sx, ev.clientY - drag3d.sy) > DRAG_PX) drag3d.moved = true
    }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointermove', move)
    // simulação: a roda do rato sobre uma peça com interactive.wheel (encoder KY-040) roda-a
    // em vez de aproximar a câmara (fase de captura: antes dos OrbitControls)
    const el = gl.domElement
    const wheel = (ev) => {
      const st = useStore.getState()
      if (st.mode !== 'sim' || !simRef.pick3D) return
      const r = el.getBoundingClientRect()
      const hit = simRef.pick3D(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1)
      const part = hit?.partId && st.parts.find((q) => q.id === hit.partId)
      const ia = part && DEFS[part.type].interactive
      if (!ia?.wheel) return
      ev.preventDefault()
      ev.stopImmediatePropagation()
      const cur = +(simRef.inputs[part.id]?.value ?? ia.default ?? 0)
      const step = ia.step ?? 1
      setInput(part.id, { value: Math.max(ia.min, Math.min(ia.max, cur + (ev.deltaY < 0 ? step : -step))) })
    }
    el.addEventListener('wheel', wheel, { capture: true, passive: false })
    simRef.pick3D = (ndcX, ndcY) => {
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
      for (const h of raycaster.intersectObjects(scene.children, true)) {
        let o = h.object
        while (o && !o.userData.partId) o = o.parent
        if (o) return { partId: o.userData.partId, point: h.point.clone() }
        if (h.object.name === 'floor') return { partId: null, point: h.point.clone() }
      }
      return null
    }
    return () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointermove', move)
      el.removeEventListener('wheel', wheel, { capture: true })
    }
  }, [camera, raycaster, scene, gl])

  useFrame(() => {
    const st = useStore.getState()
    if (controls) controls.enabled = !st.dragging3d
    // simulação: a peça agarrada segue o cursor num plano horizontal, 1,5 cm acima de onde se
    // agarrou (levanta-a da mesa para não a arrastar pelo chão)
    if (st.mode === 'sim' && st.dragging3d && simRef.physicsGrab?.active()) {
      plane.set(new THREE.Vector3(0, 1, 0), -(simGrab.y + 1.5))
      raycaster.setFromCamera(pointer, camera)
      if (raycaster.ray.intersectPlane(plane, hit)) simRef.physicsGrab.move(hit)
      return
    }
    if (st.mode !== 'build' || !st.dragging3d) return
    const part = st.parts.find((p) => p.id === st.dragging3d)
    if (!part) return
    const frame = part.parent ? mountObjects.get(`${part.parent.id}:${part.parent.mount}`) : null
    if (frame) frame.updateWorldMatrix(true, false)
    const m = frame ? frame.matrixWorld : new THREE.Matrix4()
    const normal = new THREE.Vector3(0, 1, 0).transformDirection(m)
    // plano à altura do início do arrasto (ao subir para cima de outra peça o plano não muda,
    // senão o ponto debaixo do cursor saltava e a peça oscilava entre subir e descer)
    const origin = new THREE.Vector3(0, drag3d.start?.id === part.id ? drag3d.start.py : part.pos[1], 0).applyMatrix4(m)
    plane.setFromNormalAndCoplanarPoint(normal, origin)
    raycaster.setFromCamera(pointer, camera)
    if (!raycaster.ray.intersectPlane(plane, hit)) return
    const local = hit.clone().applyMatrix4(m.clone().invert())
    if (!drag3d.moved) return // ainda é só um clique
    // move pelo deslocamento desde o ponto agarrado (a peça não salta para o cursor)
    if (!drag3d.start || drag3d.start.id !== part.id) {
      // colisão na construção (functions/buildCollision.js): não entra noutras peças, pousa em
      // cima delas e cai para a mesa quando sai
      const bb = movesOnBreadboard(st.parts, part)
      drag3d.start = { id: part.id, x: local.x, z: local.z, px: part.pos[0], py: part.pos[1], pz: part.pos[2], col: bb ? null : beginMove(st.parts, part.id, { track: st.track }), cx: 0, cz: 0, bb, seat0: bb ? st.seatStatusOf(part.id) : null }
    }
    const S = drag3d.start
    if (S.bb) {
      // na breadboard: de furo em furo (passo 0,1"), à mesma altura; o 2D acompanha
      const tx = Math.round((local.x - S.x) / PITCH) * PITCH
      const tz = Math.round((local.z - S.z) / PITCH) * PITCH
      const pos = [S.px + tx, part.pos[1], S.pz + tz]
      if (Math.abs(pos[0] - part.pos[0]) > 0.005 || Math.abs(pos[2] - part.pos[2]) > 0.005) st.dragOnBreadboard(part.id, pos)
      return
    }
    const snap = (v) => Math.round(v * 4) / 4
    const tx = snap(local.x - S.x)
    const tz = snap(local.z - S.z)
    let pos = [S.px + tx, part.pos[1], S.pz + tz]
    if (S.col) {
      const r = S.col.sweep(S.cx, S.cz, tx, tz)
      S.cx = r.x
      S.cz = r.z
      S.col.accept(r.x, r.dy, r.z)
      const r3 = (v) => Math.round(v * 1000) / 1000
      pos = [r3(S.px + r.x), part.parent ? part.pos[1] : r3(S.py + r.dy), r3(S.pz + r.z)]
    }
    if (pos.some((v, i) => Math.abs(v - part.pos[i]) > 0.005)) st.update3d(part.id, { pos })
  })

  return (
    <group name="robolab-world">
      {parts
        // (peças de tipos que já não existem no catálogo não se desenham — ver withoutUnknownParts)
        .filter((p) => DEFS[p.type] && (!p.parent || !parts.some((q) => q.id === p.parent.id)))
        .map((p) => (
          <PartNode key={p.id} part={p} all={parts} />
        ))}
      <Wires3D container={null} />
    </group>
  )
}

// ---------- Rasto ----------
function Trail() {
  const show = useStore((s) => s.showTrail)
  const mode = useStore((s) => s.mode)
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(1500 * 3), 3))
    g.setDrawRange(0, 0)
    return g
  }, [])
  useFrame(() => {
    const tr = simRef.engine?.trail
    if (!tr?.length) return geom.setDrawRange(0, 0)
    const a = geom.attributes.position.array
    for (let i = 0; i < tr.length; i++) {
      a[i * 3] = tr[i][0]
      a[i * 3 + 1] = 0.05
      a[i * 3 + 2] = tr[i][1]
    }
    geom.attributes.position.needsUpdate = true
    geom.setDrawRange(0, tr.length)
  })
  if (!show || mode !== 'sim') return null
  return (
    <line geometry={geom}>
      <lineBasicMaterial color="#ff5722" transparent opacity={0.7} />
    </line>
  )
}

// ---------- Ciclo da simulação ----------
function SimDriver() {
  const { controls, camera } = useThree()
  const prev = useRef(null)
  const framedFor = useRef(null)
  const projectName = useStore((s) => s.projectName)
  // a simulação corre no backend; aqui só se move a câmara
  useFrame(() => {
    const st = useStore.getState()
    const e = simRef.engine

    // enquadra a câmara quando o projeto muda (ou a pedido: simRef.frame3D)
    if (controls && ((framedFor.current !== projectName && st.parts.length) || simRef.wantFrame)) {
      framedFor.current = projectName
      simRef.wantFrame = false
      // posições reais (inclui o robô em movimento)
      const pts = st.parts
        .filter((p) => !p.parent)
        .map((p) => {
          const o = simRef.objects.get(p.id)
          return o ? [o.position.x, o.position.z] : [p.pos[0], p.pos[2]]
        })
      if (pts.length) {
        const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length
        const cz = pts.reduce((s, p) => s + p[1], 0) / pts.length
        const spread = Math.max(28, ...pts.map((p) => Math.hypot(p[0] - cx, p[1] - cz) * 1.8))
        controls.target.set(cx, 3, cz)
        camera.position.set(cx - spread * 0.9, spread * 0.95, cz + spread)
      }
    }
    const veh = e?.vehicles[0]
    // sem veículo: segue o primeiro robô com física dinâmica (o grupo 3D é movido pelo Rapier)
    const dyn = !veh && st.parts.find((q) => !q.parent && q.type !== 'cube' && simRef.physicsOwned.has(q.id))
    const dynObj = dyn && simRef.objects.get(dyn.id)
    if (controls && st.followCam && (veh || dynObj)) {
      const p = veh ? new THREE.Vector3(veh.pose.x, 4, veh.pose.z) : new THREE.Vector3(dynObj.position.x, 4, dynObj.position.z)
      if (prev.current) {
        const d = p.clone().sub(prev.current)
        camera.position.add(d)
        controls.target.add(d)
      }
      prev.current = p
    } else prev.current = null

  })
  return null
}

// regista o renderizador para exportar a imagem/modelo (ui/exportImage.js)
function ExportHandle() {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    simRef.three = { gl, scene, camera }
    return () => {
      if (simRef.three?.gl === gl) simRef.three = null
    }
  }, [gl, scene, camera])
  return null
}

export function Scene3D() {
  const set = useStore((s) => s.set)
  const paused = useStore((s) => s.scenePaused) // modal "Projetos" aberto
  return (
    <Canvas
      frameloop={paused ? 'never' : 'always'}
      shadows
      camera={{ position: [-30, 32, 34], fov: 45, near: 0.3, far: 3000 }}
      onPointerMissed={(e) => {
        const st = useStore.getState()
        if (st.mode === 'build' && !st.pendingPin && e.button === 0 && !gizmoBusy()) set({ selected: null })
      }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#111111']} />
      <fog attach="fog" args={['#111111', 400, 900]} />
      <StudioEnvironment />
      <hemisphereLight args={['#dfe9ff', '#3a3226', 0.3]} />
      <directionalLight
        position={[60, 120, 40]}
        intensity={2.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
        shadow-camera-far={400}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      {/* luz de recorte: separa as silhuetas do fundo escuro */}
      <directionalLight position={[-70, 50, -60]} intensity={0.45} color="#cfe0ff" />
      <Arena />
      <World />
      <Trail />
      <PhysicsLayer />
      <InkTraces />
      <SimDriver />
      <ExportHandle />
      <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.05} minDistance={3} maxDistance={500} />
    </Canvas>
  )
}
