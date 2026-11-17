// "Estúdio fotográfico": renderiza cada modelo 3D numa vista isométrica (paleta)
// e numa vista ortográfica à escala (imagem do editor 2D, coerente com os pinos).
import { useEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { DEFS, S2D, view2dInfo, defaultConfig } from '@shared/components.js'
import { MODELS } from './models.jsx'
import { StudioEnvironment } from './StudioEnvironment.jsx'
import { useStore } from '../../contexts/store.js'
import { api } from '../../services/api.js'
import modelsSrc from './models.jsx?raw'
import catalogSrc from '@shared/components.js?raw'

const ALL = Object.keys(DEFS)
const DPR = 3 // nitidez das imagens 2D (também na exportação PNG a 3×)
const MAX_PX = 2400 // limite do lado maior de cada imagem

import kitSrc from './kit.jsx?raw'

// versão das miniaturas: muda sempre que os modelos (embutidos e em plugin), as peças
// de construção (kit.jsx) ou o catálogo (incluindo shared/parts) mudam
const PLUGIN_SRC = import.meta.glob(['./parts/*.{js,jsx}', '../../../../shared/parts/*.js'], { query: '?raw', import: 'default', eager: true })
let h = 5381
const allSrc = [`dpr${DPR}`, modelsSrc, catalogSrc, kitSrc, ...Object.keys(PLUGIN_SRC).sort().map((k) => k + PLUGIN_SRC[k])].join('\n')
for (let i = 0; i < allSrc.length; i++) h = ((h * 33) ^ allSrc.charCodeAt(i)) >>> 0
export const THUMB_VERSION = h.toString(36)

function Shot({ order }) {
  const { gl, scene } = useThree()
  const [i, setI] = useState(0)
  const group = useRef()
  const type = order[i]

  useEffect(() => {
    if (!type) return
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        const out = {}
        gl.setPixelRatio(1)
        gl.setClearColor(0x000000, 0)
        const obj = group.current
        obj.updateWorldMatrix(true, true)
        const box = new THREE.Box3().setFromObject(obj)
        const sphere = box.getBoundingSphere(new THREE.Sphere())

        // vista isométrica (paleta)
        const iso = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
        const r = sphere.radius * 1.02
        Object.assign(iso, { left: -r, right: r, top: r, bottom: -r })
        iso.position.copy(sphere.center).add(new THREE.Vector3(1, 0.95, 1.25).normalize().multiplyScalar(200))
        iso.lookAt(sphere.center)
        iso.updateProjectionMatrix()
        gl.setSize(256, 256, false)
        gl.render(scene, iso)
        out.iso = gl.domElement.toDataURL('image/png')

        // vista do editor 2D
        const info = view2dInfo(type)
        if (info) {
          const wcm = info.w / S2D
          const hcm = info.h / S2D
          const cam = new THREE.OrthographicCamera(-wcm / 2, wcm / 2, hcm / 2, -hcm / 2, 0.1, 1000)
          if (info.view === 'top') {
            cam.up.set(0, 0, -1)
            cam.position.set(info.center[0], 200, info.center[2])
            cam.lookAt(info.center[0], 0, info.center[2])
          } else {
            cam.up.set(0, 1, 0)
            cam.position.set(200, info.center[1], info.center[2])
            cam.lookAt(0, info.center[1], info.center[2])
          }
          cam.updateProjectionMatrix()
          const k = Math.min(DPR, MAX_PX / Math.max(info.w, info.h))
          gl.setSize(Math.round(info.w * k), Math.round(info.h * k), false)
          gl.render(scene, cam)
          out.plan = gl.domElement.toDataURL('image/png')
        }
        useStore.setState((s) => ({ thumbs: { ...s.thumbs, [type]: out } }))
        // terminou tudo: guarda no backend para as próximas visitas
        if (i + 1 === order.length) api.putThumbs(THUMB_VERSION, useStore.getState().thumbs).catch(() => {})
        setI((n) => n + 1)
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [type, gl, scene, i, order.length])

  if (!type) return null
  const Model = MODELS[type]
  const part = { id: `__studio_${type}`, type, config: defaultConfig(type), parent: null, pos: [0, 0, 0], rot: [0, 0, 0] }
  return (
    <>
      <StudioEnvironment />
      <ambientLight intensity={0.35} />
      <directionalLight position={[30, 80, 40]} intensity={2.7} />
      <directionalLight position={[-40, 30, -20]} intensity={0.6} />
      <group ref={group} key={type}>
        <Model part={part} />
      </group>
    </>
  )
}

export function Studio() {
  const done = useStore((s) => Object.keys(s.thumbs).length >= ALL.length)
  const [state, setState] = useState('loading') // loading | render
  const [order, setOrder] = useState(ALL)
  useEffect(() => {
    api
      .getThumbs(THUMB_VERSION)
      .then((t) => {
        if (Object.keys(t).length < ALL.length) throw new Error('incompleto')
        useStore.setState({ thumbs: t })
      })
      .catch(() => {
        // primeiro as peças do projeto aberto, para aparecerem logo no circuito
        const used = new Set(useStore.getState().parts.map((p) => p.type))
        setOrder([...ALL.filter((t) => used.has(t)), ...ALL.filter((t) => !used.has(t))])
        setState('render')
      })
  }, [])
  if (done || state !== 'render') return null
  return (
    <div style={{ position: 'fixed', left: -4000, top: 0, width: 256, height: 256, pointerEvents: 'none' }} aria-hidden>
      <Canvas frameloop="never" gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }} dpr={1}>
        <Shot order={order} />
      </Canvas>
    </div>
  )
}
