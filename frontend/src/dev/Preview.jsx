// Pré-visualização de componentes 3D (só desenvolvimento, não faz parte da app):
//   /preview.html?type=arduino&view=iso|top|front|back|side|low&zoom=1   um componente
//   /preview.html?sheet=sensores&cols=6                                   folha de uma família
//   /preview.html?types=hcsr04,dht11,pir&cols=3                            folha com estes tipos
// Usado para comparar os modelos com os componentes reais (capturas com o Chrome headless:
// frontend/scripts/preview-shot.sh).
import { createRoot } from 'react-dom/client'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { MODELS } from '../components/three/models.jsx'
import { StudioEnvironment } from '../components/three/StudioEnvironment.jsx'
import { defaultConfig, DEFS } from '@shared/components.js'
import { CATALOG_SPEC } from '@shared/catalog.js'
import { Parts, onFloor } from '../components/three/AssemblyView.jsx'
import { example as loadExample } from '../sim/localData.js'

const q = new URLSearchParams(location.search)
const view = q.get('view') || 'iso'
const zoom = +(q.get('zoom') || 1)
const DIRS = { iso: [1, 0.95, 1.25], top: [0, 1, 0.0001], front: [1, 0.25, 0], back: [-1, 0.35, 0.3], side: [0.15, 0.3, 1], low: [1, 0.35, 0.8] }
const sheet = q.get('sheet')
const TYPES = q.get('types')
  ? q.get('types').split(',')
  : sheet
    ? (CATALOG_SPEC.find((f) => f.key === sheet)?.groups || []).flatMap((g) => g[1]).filter((t) => MODELS[t])
    : [q.get('type') || 'arduino']
// &example=casaInteligente: a montagem inteira de um exemplo (peças, sem fios)
//   &bg=none   fundo transparente (imagens .webp do site: scripts/example-shots.mjs)
//   &dpr=1     resolução (por omissão 2)
// Quando a imagem está pronta, document.title passa a 'pronto'.
const EXAMPLE = q.get('example')
const TRANSPARENT = q.get('bg') === 'none'
const DPR = +(q.get('dpr') || 2)
if (TRANSPARENT) for (const el of [document.documentElement, document.body, document.getElementById('root')]) el.style.background = 'transparent'
const COLS = +(q.get('cols') || Math.ceil(Math.sqrt(TYPES.length)))
const ROWS = Math.ceil(TYPES.length / COLS)
// &cfg={"claw":"mdf"} ou &cfg=garraMetal:{...};rubberWheel:{...} (configuração por tipo)
const CFG = (() => {
  const raw = q.get('cfg')
  if (!raw) return {}
  if (raw.trim().startsWith('{')) return { '*': JSON.parse(raw) }
  return Object.fromEntries(raw.split(';').map((x) => [x.slice(0, x.indexOf(':')), JSON.parse(x.slice(x.indexOf(':') + 1))]))
})()
const partOf = (type) => ({ id: `__preview_${type}`, type, config: { ...defaultConfig(type), ...(CFG['*'] || {}), ...(CFG[type] || {}) }, parent: null, pos: [0, 0, 0], rot: [0, 0, 0] })
const dir = new THREE.Vector3(...(DIRS[view] || DIRS.iso)).normalize()

// cada componente normalizado (esfera envolvente de raio 1) e centrado na sua célula
function Cell({ type, x, y, onReady }) {
  const inner = useRef()
  const outer = useRef()
  useLayoutEffect(() => {
    const box = new THREE.Box3().setFromObject(inner.current)
    const s = box.getBoundingSphere(new THREE.Sphere())
    const k = 1 / Math.max(1e-6, s.radius)
    inner.current.position.copy(s.center).multiplyScalar(-k)
    inner.current.scale.setScalar(k)
    outer.current.position.set(x, y, 0)
    onReady?.()
  }, [])
  const Model = MODELS[type]
  return (
    <group ref={outer}>
      <group quaternion={new THREE.Quaternion().setFromUnitVectors(dir, new THREE.Vector3(0, 0, 1))}>
        <group ref={inner}>
          <Model part={partOf(type)} />
        </group>
      </group>
    </group>
  )
}

function Scene() {
  const { camera, size } = useThree()
  const [, setN] = useState(0)
  const single = TYPES.length === 1
  useLayoutEffect(() => {
    const a = size.width / size.height
    if (single) {
      Object.assign(camera, { left: -1.05 * a / zoom, right: 1.05 * a / zoom, top: 1.05 / zoom, bottom: -1.05 / zoom })
    } else {
      const w = COLS * 2.2
      const h = ROWS * 2.5
      const s = Math.max(w / a, h) / 2
      Object.assign(camera, { left: -s * a, right: s * a, top: s, bottom: -s })
    }
    Object.assign(camera, { near: 0.1, far: 100 })
    camera.position.set(0, 0, 20)
    camera.up.set(0, 1, 0)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    document.title = 'pronto'
  })
  const cell = (i) => [(i % COLS - (COLS - 1) / 2) * 2.2, -(Math.floor(i / COLS) - (ROWS - 1) / 2) * 2.5 - 0.15]
  return (
    <>
      <StudioEnvironment />
      <ambientLight intensity={0.35} />
      {/* luzes no referencial da câmara (os modelos é que estão rodados para a vista) */}
      <directionalLight position={[20, 40, 30]} intensity={2.7} />
      <directionalLight position={[-30, 10, 10]} intensity={0.6} />
      {TYPES.map((t, i) => (
        <Cell key={t} type={t} x={cell(i)[0]} y={cell(i)[1]} onReady={() => setN((n) => n + 1)} />
      ))}
    </>
  )
}

// caixa só das malhas visíveis (sem ajudantes invisíveis, halos nem sprites)
function visibleBox(root) {
  const box = new THREE.Box3()
  const tmp = new THREE.Box3()
  root.updateWorldMatrix(true, true)
  const walk = (o) => {
    if (!o.visible) return
    if (o.isMesh && !o.isSprite && o.geometry && !(o.material?.transparent && o.material.opacity < 0.2)) {
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox()
      box.union(tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld))
    }
    for (const c of o.children) walk(c)
  }
  walk(root)
  return box
}

function ExampleScene() {
  const g = useRef()
  const { camera, size } = useThree()
  const parts = useMemo(() => onFloor(loadExample(EXAMPLE).parts), [])
  // enquadra a cada frame até ficar pronto (os modelos podem acabar de montar depois do 1.º render)
  const fit = () => {
    window.__group = g.current // depuração (scripts de captura)
    const box = visibleBox(g.current)
    if (box.isEmpty()) return
    const s = box.getBoundingSphere(new THREE.Sphere())
    camera.position.copy(s.center).addScaledVector(dir, 1500)
    if (view === 'top') camera.up.set(0, 0, -1)
    camera.lookAt(s.center)
    camera.updateMatrixWorld()
    // enquadramento justo: os 8 cantos da caixa na vista da câmara (a esfera deixava muita margem)
    const inv = camera.matrixWorldInverse
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(inv)
      x0 = Math.min(x0, p.x), x1 = Math.max(x1, p.x), y0 = Math.min(y0, p.y), y1 = Math.max(y1, p.y)
    }
    const a = size.width / size.height
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
    const h = (Math.max((x1 - x0) / a, y1 - y0) / 2) * 1.08 / zoom // 8% de margem
    Object.assign(camera, { left: cx - h * a, right: cx + h * a, top: cy + h, bottom: cy - h, near: 0.1, far: 5000 })
    camera.updateProjectionMatrix()
  }
  useLayoutEffect(fit)
  // pronto depois de alguns frames (modelos montados, texturas e shaders prontos)
  const frames = useRef(0)
  useFrame(() => {
    const n = ++frames.current
    if (n <= 18) fit()
    if (n === 24) document.title = 'pronto'
  })
  return (
    <>
      <StudioEnvironment />
      <ambientLight intensity={0.35} />
      <directionalLight position={[300, 800, 400]} intensity={2.7} />
      <directionalLight position={[-400, 300, -200]} intensity={0.6} />
      <group ref={g}>
        <Parts parts={parts} />
      </group>
    </>
  )
}

function Labels() {
  if (TYPES.length === 1 || EXAMPLE) return null
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)`, pointerEvents: 'none', font: '13px Arial', color: '#333' }}>
      {TYPES.map((t) => (
        <div key={t} style={{ padding: 4 }}>
          <b>{t}</b> · {DEFS[t]?.name}
        </div>
      ))}
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <Canvas orthographic gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }} dpr={DPR}>
      {EXAMPLE ? <ExampleScene /> : <Scene />}
    </Canvas>
    <Labels />
  </div>,
)
