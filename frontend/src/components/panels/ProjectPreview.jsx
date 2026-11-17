// Pré-visualizações 3D do modal "Projetos": a montagem de cada projeto/exemplo desenhada com os
// mesmos modelos 3D da cena (MODELS), na pose de construção (buildMatrices).
//
//  - Um "fotógrafo" escondido (um só <Canvas>, fora do ecrã) desenha cada projeto UMA vez e
//    guarda a imagem em memória (só no browser, nada no backend). Os cartões mostram essa
//    imagem: o scroll é o normal da página e nada fica por cima do modal.
//  - Os cartões pedem a fotografia quando aparecem no ecrã (os visíveis primeiro).
//  - Com o rato por cima, o fotógrafo tira 24 fotografias à volta da montagem (uma vez) e o
//    cartão anima-as: a montagem roda, sem criar outro contexto WebGL.
//  - O fotógrafo vive na app inteira (não só no modal): os shaders compilam-se uma vez.
import { startTransition, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { StudioEnvironment } from '../three/StudioEnvironment.jsx'
import { Parts, assemblyBox, onFloor } from '../three/AssemblyView.jsx'
import { Box, TriangleAlert } from 'lucide-react'
import { Spinner } from '@heroui/react'
import { THUMB_VERSION } from '../three/Studio.jsx'
import { api } from '../../services/api.js'
import { useStore } from '../../contexts/store.js'
import { useT } from '../../i18n/index.js'

// ---------------- cache das fotografias no browser (IndexedDB; nada no backend) ----------------
// chave = projeto (com a data de modificação) + versão dos modelos 3D: muda um, refaz-se
const DB = 'adjeltron-previews'
const idb = () =>
  new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore('shots')
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
let dbp = null
const db = () => (dbp ||= idb().catch(() => null))
const vkey = (key) => `${THUMB_VERSION}|${key}`
async function idbGet(key) {
  const d = await db()
  if (!d) return undefined
  return new Promise((res) => {
    const r = d.transaction('shots').objectStore('shots').get(vkey(key))
    r.onsuccess = () => res(r.result)
    r.onerror = () => res(undefined)
  })
}
async function idbPut(key, val) {
  const d = await db()
  if (d) d.transaction('shots', 'readwrite').objectStore('shots').put(val, vkey(key))
}

const W = 400
const H = 250

// ---------------- estado partilhado (fora do React) ----------------
// key → { parts } (dados carregados) e key → dataURL (fotografia); fila de pedidos
const data = new Map()
const shots = new Map()
const errors = new Set()
const queue = [] // chaves à espera de fotografia (as mais recentes = visíveis agora → primeiro)
const spins = new Map() // key → [dataURL × SPIN] (fotografias à volta, para a rotação no hover)
const spinQueue = []
const SPIN = 16 // vistas à volta (4 rondas do mosaico de 4)
export function requestSpin(key) {
  if (spins.has(key) || spinQueue.includes(key) || !data.get(key)?.parts.length) return
  spinQueue.push(key)
  emit()
}
const loading = new Map() // key → Promise
let version = 0
const subs = new Set()
const emit = () => {
  version++
  subs.forEach((f) => f())
}
const subscribe = (f) => (subs.add(f), () => subs.delete(f))
const useVersion = () => useSyncExternalStore(subscribe, () => version)

// carrega os dados de um projeto (no máximo 8 pedidos ao mesmo tempo)
let active = 0
const waiting = []
function loadData(key, load) {
  if (data.has(key)) return Promise.resolve(data.get(key))
  if (loading.has(key)) return loading.get(key)
  const p = new Promise((resolve) => {
    const run = () => {
      active++
      load()
        .then((d) => data.set(key, { parts: onFloor(d.parts || []) }))
        .catch(() => errors.add(key))
        .finally(() => {
          active--
          loading.delete(key)
          waiting.shift()?.()
          emit()
          resolve(data.get(key))
        })
    }
    active < 8 ? run() : waiting.push(run)
  })
  loading.set(key, p)
  return p
}

// prepara em segundo plano as fotografias de todos os projetos e exemplos (chamado uma vez,
// pouco depois de a app abrir): quando se abre o modal já estão prontas
export async function warmPreviews() {
  try {
    const [saved, exs] = await Promise.all([api.listProjects().catch(() => []), api.examples().catch(() => [])])
    for (const p of saved) request(`p-${p.id}-${p.updated}`, () => api.loadProject(p.id), true)
    for (const e of exs) request(`ex-${e.id}`, () => api.example(e.id), true)
  } catch {}
}
// o modal está aberto: fotografa sem esperar por tempo livre do browser
let urgent = false
export const setPreviewUrgent = (v) => {
  urgent = v
  emit()
}

// carrega já os dados (sem fotografar): ao abrir o modal, para os lotes saírem cheios
export function prefetchPreview(key, load) {
  if (!data.has(key) && !errors.has(key)) loadData(key, load)
}

const checked = new Set()
// bg = preparação em segundo plano (vai para o fim da fila); sem bg = cartão visível (à frente)
async function request(key, load, bg = false) {
  if (shots.has(key) || errors.has(key)) return
  // já fotografado numa visita anterior?
  if (!checked.has(key)) {
    checked.add(key)
    const blob = await idbGet(key)
    if (blob instanceof Blob) {
      shots.set(key, URL.createObjectURL(blob))
      emit()
      return
    }
  }
  loadData(key, load).then((d) => {
    if (!d || shots.has(key)) return
    if (!d.parts.length) {
      shots.set(key, null)
      emit()
      return
    }
    const i = queue.indexOf(key)
    if (bg) {
      if (i < 0) queue.push(key)
    } else {
      if (i >= 0) queue.splice(i, 1)
      queue.unshift(key) // os que acabaram de aparecer passam à frente
    }
    emit()
  })
}

// ---------------- cena ----------------
// posição da câmara: isométrica, à distância que mostra a montagem inteira (ângulo a);
// `off` = deslocamento da montagem em x (no fotógrafo há várias lado a lado)
function placeCamera(camera, parts, a = Math.atan2(1.1, -0.9), off = 0) {
  const box = assemblyBox(parts)
  if (box.isEmpty()) return null
  const s = box.getBoundingSphere(new THREE.Sphere())
  s.center.x += off
  const d = Math.max(4, s.radius / Math.sin((camera.fov * Math.PI) / 360)) * 0.92
  const h = 0.62
  camera.near = d / 100
  camera.far = d * 20
  camera.position.set(s.center.x + Math.sin(a) * d * Math.cos(h), s.center.y + Math.sin(h) * d, s.center.z + Math.cos(a) * d * Math.cos(h))
  camera.lookAt(s.center)
  camera.updateProjectionMatrix()
  return { c: s.center, d }
}

const Ground = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
    <circleGeometry args={[400, 48]} />
    <meshStandardMaterial color="#1c1e22" roughness={0.95} />
  </mesh>
)

function Lights({ ground = true }) {
  return (
    <>
      <color attach="background" args={['#141518']} />
      <StudioEnvironment />
      <hemisphereLight args={['#e8efff', '#3a3226', 0.35]} />
      <directionalLight position={[40, 80, 30]} intensity={2.6} />
      <directionalLight position={[-30, 20, -40]} intensity={0.5} />
      {ground && <Ground />}
    </>
  )
}

// ---------------- fotógrafo (um só canvas escondido) ----------------
// Fotografa em lotes de até 8 projetos: montados ao mesmo tempo, afastados em x, e desenhados
// num mosaico 4×2 numa só passagem (uma só compilação de shaders e uma só leitura da GPU,
// que é o que mais custa); depois o mosaico é cortado nas imagens de cada cartão.
const COLS = 4
const ROWS = 1 // lotes de 4 (uma fila de vistas)
const GAP = 4000 // cm entre montagens (não se veem umas às outras)
const cam = new THREE.PerspectiveCamera(35, W / H, 0.1, 1000)

// lê píxeis da GPU sem bloquear (WebGL2: buffer de leitura + fenceSync, verificado a cada frame)
function readAsync(g, x, y, w, h) {
  const buf = g.createBuffer()
  g.bindBuffer(g.PIXEL_PACK_BUFFER, buf)
  g.bufferData(g.PIXEL_PACK_BUFFER, w * h * 4, g.STREAM_READ)
  g.readPixels(x, y, w, h, g.RGBA, g.UNSIGNED_BYTE, 0)
  g.bindBuffer(g.PIXEL_PACK_BUFFER, null)
  const sync = g.fenceSync(g.SYNC_GPU_COMMANDS_COMPLETE, 0)
  g.flush()
  return new Promise((res) => {
    const poll = () => {
      const st = g.clientWaitSync(sync, 0, 0)
      if (st === g.TIMEOUT_EXPIRED) return void setTimeout(poll, 16)
      g.deleteSync(sync)
      if (st === g.WAIT_FAILED) {
        g.deleteBuffer(buf)
        return res(null)
      }
      const px = new Uint8Array(w * h * 4)
      g.bindBuffer(g.PIXEL_PACK_BUFFER, buf)
      g.getBufferSubData(g.PIXEL_PACK_BUFFER, 0, px)
      g.bindBuffer(g.PIXEL_PACK_BUFFER, null)
      g.deleteBuffer(buf)
      res(px)
    }
    poll()
  })
}
// uma vista do mosaico (píxeis de baixo para cima) → JPEG (comprimido fora da página: toBlob)
const tileCanvas = document.createElement('canvas')
tileCanvas.width = W
tileCanvas.height = H
const tileCtx = tileCanvas.getContext('2d')
function tileBlob(px, stride, x0) {
  const img = tileCtx.createImageData(W, H)
  for (let y = 0; y < H; y++) {
    const src = ((H - 1 - y) * stride + x0) * 4
    img.data.set(px.subarray(src, src + W * 4), y * W * 4)
  }
  tileCtx.putImageData(img, 0, 0)
  return new Promise((res) => tileCanvas.toBlob(res, 'image/jpeg', 0.86))
}

function Shooter() {
  const { gl, scene } = useThree()
  const [batch, setBatch] = useState(null)
  useVersion()
  const [, setTick] = useState(0)
  // junta o próximo lote quando está livre (se ainda há dados a chegar e o lote não está
  // cheio, espera um instante para juntar mais)
  useEffect(() => {
    // (um lote já pedido em transição ainda não chegou ao estado: não tirar mais trabalhos da
    // fila, senão o lote novo substituía o anterior e esses trabalhos perdiam-se)
    if (batch || Shooter.pending) return
    // rotação pedida pelo cartão com o rato por cima: passa à frente
    while (spinQueue.length) {
      const key = spinQueue.shift()
      if (spins.has(key) || !data.get(key)) continue
      Shooter.pending = true
      setBatch({ spin: true, jobs: [{ key, parts: data.get(key).parts, off: 0 }], t0: performance.now() })
      return
    }
    if (!queue.length) return
    // em segundo plano: só com a simulação parada e quando o browser tem tempo livre
    if (!urgent) {
      if (useStore.getState().mode === 'sim') {
        const t = setTimeout(() => setTick((n) => n + 1), 1500)
        return () => clearTimeout(t)
      }
      if (!Shooter.idle) {
        const ric = window.requestIdleCallback || ((f) => setTimeout(f, 200))
        const id = ric(() => {
          Shooter.idle = true
          setTick((n) => n + 1)
        }, { timeout: 2000 })
        return () => (window.cancelIdleCallback || clearTimeout)(id)
      }
      Shooter.idle = false
    }
    if (queue.length < COLS * ROWS && (active || waiting.length) && !Shooter.waited) {
      Shooter.waited = true
      const t = setTimeout(() => setTick((n) => n + 1), 90)
      return () => clearTimeout(t)
    }
    Shooter.waited = false
    const jobs = []
    while (queue.length && jobs.length < COLS * ROWS) {
      const key = queue.shift()
      if (!shots.has(key) && data.get(key)) jobs.push({ key, parts: data.get(key).parts, off: jobs.length * GAP })
    }
    // montar os modelos é o que pesa: em transição, o React fá-lo aos bocados sem bloquear o scroll
    if (jobs.length) {
      Shooter.pending = true
      startTransition(() => setBatch({ jobs, t0: performance.now() }))
    }
    else emit()
  })
  // depois de os modelos montarem (2 frames) e de os shaders compilarem em paralelo
  // (compileAsync), desenha o mosaico e lê-o da GPU SEM bloquear a página (readAsync):
  // ler o canvas com toDataURL obrigava a página a esperar pela GPU (segundos)
  useEffect(() => {
    if (!batch) return
    Shooter.pending = false
    let alive = true
    let raf
    const run = async () => {
      const g = gl.getContext()
      const tiles = async (renders) => {
        // desenha até COLS vistas lado a lado e lê-as de uma vez → [Blob] (uma por vista)
        gl.setScissorTest(true)
        renders.forEach((fn, i) => {
          gl.setViewport(i * W, 0, W, H)
          gl.setScissor(i * W, 0, W, H)
          fn()
          gl.render(scene, cam)
        })
        gl.setScissorTest(false)
        const px = await readAsync(g, 0, 0, renders.length * W, H)
        if (!px) throw new Error('leitura falhou')
        return Promise.all(renders.map((_, i) => tileBlob(px, renders.length * W, i * W)))
      }
      try {
        await gl.compileAsync(scene, cam)
        if (!alive) return
        if (batch.spin) {
          const j = batch.jobs[0]
          const a0 = Math.atan2(1.1, -0.9)
          const urls = []
          for (let r = 0; r < SPIN / COLS && alive; r++) {
            const blobs = await tiles(Array.from({ length: COLS }, (_, i) => () => placeCamera(cam, j.parts, a0 + ((r * COLS + i) / SPIN) * Math.PI * 2, j.off)))
            urls.push(...blobs.map((b) => URL.createObjectURL(b)))
          }
          if (alive) spins.set(j.key, urls)
        } else {
          const blobs = await tiles(batch.jobs.map((j) => () => placeCamera(cam, j.parts, undefined, j.off)))
          batch.jobs.forEach((j, i) => {
            shots.set(j.key, URL.createObjectURL(blobs[i]))
            idbPut(j.key, blobs[i])
          })
        }
        if (import.meta.env.DEV) (window.__shotTimes ||= []).push([batch.jobs.length, Math.round(performance.now() - batch.t0)])
      } catch {
        if (!batch.spin) batch.jobs.forEach((j) => errors.add(j.key))
      }
      if (!alive) return
      setBatch(null)
      emit()
    }
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        placeCamera(cam, batch.jobs[0].parts, undefined, batch.jobs[0].off)
        run()
      })
    })
    return () => {
      // cancelado antes de fotografar (ex.: o fotógrafo foi desmontado): os trabalhos voltam à fila
      if (alive && !batch.spin) for (const j of batch.jobs) if (!shots.has(j.key) && !errors.has(j.key) && !queue.includes(j.key)) queue.unshift(j.key)
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [batch, gl, scene])
  return batch
    ? batch.jobs.map((j) => (
        <group key={j.key} position={[j.off, 0, 0]}>
          <Ground />
          <Parts parts={j.parts} />
        </group>
      ))
    : null
}

export function PreviewShooter() {
  return (
    <div style={{ position: 'fixed', left: -10000, top: 0, width: W * COLS, height: H * ROWS, pointerEvents: 'none' }} aria-hidden>
      <Canvas
        frameloop="never"
        dpr={1}
        gl={{ antialias: true }}
        // sem verificação síncrona dos shaders (getProgramInfoLog bloqueava ~2 s por lote)
        onCreated={({ gl }) => (gl.debug.checkShaderErrors = false)}
        style={{ width: W * COLS, height: H * ROWS }}
      >
        <Lights ground={false} />
        <Shooter />
      </Canvas>
    </div>
  )
}

// ---------------- zona 3D de um cartão ----------------
export function ProjectPreview3D({ cacheKey, load, hover }) {
  const t = useT()
  const box = useRef()
  useVersion()
  useEffect(() => {
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && request(cacheKey, load), { rootMargin: '150px' })
    io.observe(el)
    return () => io.disconnect()
  }, [cacheKey, load])
  const img = shots.get(cacheKey)
  const d = data.get(cacheKey)
  const err = errors.has(cacheKey)
  // rato por cima: pede as 24 vistas à volta (uma vez) e anima-as
  const frames = spins.get(cacheKey)
  const [k, setK] = useState(0)
  useEffect(() => {
    if (!hover || !img) return setK(0)
    requestSpin(cacheKey)
    if (!frames) return
    const timer = setInterval(() => setK((n) => (n + 1) % frames.length), 70)
    return () => clearInterval(timer)
  }, [hover, img, frames, cacheKey])
  const empty = img === null || (d && !d.parts.length)
  return (
    <div ref={box} className="relative w-full h-full">
      {img ? (
        <img src={hover && frames ? frames[k] : img} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-neutral-600">
          {err ? <TriangleAlert size={22} /> : empty ? <Box size={26} /> : <Spinner size="sm" color="default" />}
          <span className="text-[10px]">{err ? t('tools.preview.error') : empty ? t('tools.preview.empty') : t('tools.preview.preparing')}</span>
        </div>
      )}
    </div>
  )
}
