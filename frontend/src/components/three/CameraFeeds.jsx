// Vista ao vivo dos módulos de câmara (peça cameraModule). Dentro do <Canvas> do Scene3D:
// renderiza a MESMA cena (sem duplicar física nem modelos) a partir da objetiva de cada câmara
// para um render target pequeno (320×240), a ~12 fps, e lê os píxeis (readPixels) para:
//   - a janela "Câmara" (panels/CameraPanel.jsx), através de camFeed;
//   - o programa (esp_camera.h, engine/sim/libs/esp_camera.js), a ~8 fps, só enquanto o motor o
//     pede (live[id].cam.on, depois de esp_camera_init) — mensagem 'camFrame' para o worker.
// Sem janela aberta e sem programa a usar a câmara não renderiza nada.
// Referencial da peça (shared/parts/cameraModule.js): objetiva para +y local, centro do vidro em
// (0.35, 0.6, 0); o "cima" da imagem é −x local, o lado da fita (assim a câmara na cabeça do cão
// robô, com a fita para cima, vê direito).
import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../contexts/store.js'
import { simRef } from '../../contexts/simRef.js'
import { sendCamFrame } from '../../services/simControl.js'

export const CAM_W = 320
export const CAM_H = 240
const PANEL_MS = 1000 / 12 // janela: ~12 fps
const ENGINE_MS = 1000 / 8 // programa: ~8 fps (o ESP32-CAM real dá 10–25 fps em QQVGA/QVGA)
// fundo da vista da câmara: paredes claras de uma sala, com nevoeiro da mesma cor ao longe
const ROOM = new THREE.Color('#b9bec5')
const ROOM_FOG = new THREE.Fog('#b9bec5', 250, 900)

// imagens mais recentes por câmara (para a janela): { w, h, rgba (linha 0 em cima), t, n }
export const camFeed = {
  frames: new Map(),
  listeners: new Set(),
  subscribe(fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  },
  emit(id) {
    for (const fn of this.listeners) fn(id)
  },
}

// tone mapping da vista principal → função GLSL do three.js (2.º passo do render)
const TONE = {
  [THREE.AgXToneMapping]: 'AgXToneMapping',
  [THREE.ACESFilmicToneMapping]: 'ACESFilmicToneMapping',
  [THREE.NeutralToneMapping]: 'NeutralToneMapping',
  [THREE.ReinhardToneMapping]: 'ReinhardToneMapping',
  [THREE.CineonToneMapping]: 'CineonToneMapping',
  [THREE.LinearToneMapping]: 'LinearToneMapping',
}
// objetiva → câmara do three.js (que olha para −z local, com +y para cima):
// direita = +z, cima = −x, trás = −y da peça; no centro do vidro, um pouco acima
const LENS = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, -1, 0)).setPosition(0.35, 0.72, 0)

export function CameraFeeds() {
  const parts = useStore((s) => s.parts)
  const camIds = useMemo(() => parts.filter((p) => p.type === 'cameraModule').map((p) => p.id), [parts])
  return camIds.length ? <FeedRenderer camIds={camIds} /> : null
}

function FeedRenderer({ camIds }) {
  const { gl, scene } = useThree()
  const res = useMemo(() => {
    // 1.º passo: a cena em HDR linear (meio-float); 2.º passo: o mesmo tone mapping (AgX…) e a
    // conversão para sRGB que a vista principal faz no ecrã — o three.js não os aplica quando se
    // renderiza para um render target, e sem eles o chão claro saturava a 255
    const hdr = new THREE.WebGLRenderTarget(CAM_W, CAM_H, { type: THREE.HalfFloatType, depthBuffer: true })
    const out = new THREE.WebGLRenderTarget(CAM_W, CAM_H, { depthBuffer: false })
    const post = new THREE.ShaderMaterial({
      uniforms: { tMap: { value: hdr.texture } },
      defines: { CAM_TONE: 'AgXToneMapping' },
      vertexShader: 'varying vec2 vUv;\nvoid main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `${THREE.ShaderChunk.tonemapping_pars_fragment}
uniform sampler2D tMap;
varying vec2 vUv;
vec3 camOETF(vec3 c) { return mix(pow(c, vec3(0.41666)) * 1.055 - vec3(0.055), c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308)))); }
void main() { gl_FragColor = vec4(camOETF(clamp(CAM_TONE(texture2D(tMap, vUv).rgb), 0.0, 1.0)), 1.0); }`,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    })
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post)
    quad.frustumCulled = false
    const postScene = new THREE.Scene()
    postScene.add(quad)
    // campo de visão vertical ~48° (OV2640 / Pi Camera v2: ~62° na horizontal), 4:3
    const cam = new THREE.PerspectiveCamera(48, CAM_W / CAM_H, 0.15, 900)
    return { hdr, out, post, quad, postScene, postCam: new THREE.OrthographicCamera(), cam, tone: null, px: new Uint8Array(CAM_W * CAM_H * 4), m: new THREE.Matrix4(), s: new THREE.Vector3(), last: new Map(), sent: new Map() }
  }, [])
  useEffect(
    () => () => {
      res.hdr.dispose()
      res.out.dispose()
      res.post.dispose()
      res.quad.geometry.dispose()
    },
    [res],
  )

  useFrame(() => {
    const now = performance.now()
    const st = useStore.getState()
    const panelId = st.camOpen ? (camIds.includes(st.camSel) ? st.camSel : camIds[0]) : null
    const live = simRef.engine?.live || {}
    for (const id of camIds) {
      const forEngine = !!live[id]?.cam?.on
      // o programa ligou a câmara (esp_camera_init): abre a janela uma vez por simulação
      if (forEngine && res.autoFor !== simRef.engine) {
        res.autoFor = simRef.engine
        if (!st.camOpen) useStore.setState({ camOpen: true, camSel: id })
      }
      const forPanel = id === panelId
      if (!forEngine && !forPanel) continue
      if (now - (res.last.get(id) || 0) < (forPanel ? PANEL_MS : ENGINE_MS)) continue
      const obj = simRef.objects.get(id)
      if (!obj) continue
      res.last.set(id, now)
      render(obj)
      const rgba = flip(res.px)
      const prev = camFeed.frames.get(id)
      camFeed.frames.set(id, { w: CAM_W, h: CAM_H, rgba, t: now, n: (prev?.n || 0) + 1 })
      camFeed.emit(id)
      if (forEngine && now - (res.sent.get(id) || 0) >= ENGINE_MS - 5) {
        res.sent.set(id, now)
        sendCamFrame(id, CAM_W, CAM_H, toRgb(rgba))
      }
    }
  })

  // cena vista da objetiva → res.px (RGBA, linha 0 em baixo, como o readPixels do WebGL)
  function render(obj) {
    const { hdr, out, post, cam, m, s } = res
    // o mesmo tone mapping da vista principal (StudioEnvironment usa AgX)
    const tone = TONE[gl.toneMapping] || 'saturate'
    if (tone !== res.tone) {
      res.tone = tone
      post.defines.CAM_TONE = tone
      post.needsUpdate = true
    }
    obj.updateWorldMatrix(true, false)
    m.multiplyMatrices(obj.matrixWorld, LENS).decompose(cam.position, cam.quaternion, s)
    cam.updateMatrixWorld(true)
    const prevRt = gl.getRenderTarget()
    const prevShadow = gl.shadowMap.autoUpdate
    // as sombras são as do último frame da vista principal (não se recalcula o mapa por câmara)
    gl.shadowMap.autoUpdate = false
    // o fundo da vista principal é o "vazio" escuro do estúdio; uma câmara real numa sala vê
    // paredes claras: durante este render o fundo e o nevoeiro passam a cor de parede
    const prevBg = scene.background
    const prevFog = scene.fog
    scene.background = ROOM
    scene.fog = ROOM_FOG
    gl.setRenderTarget(hdr)
    gl.clear()
    gl.render(scene, cam)
    scene.background = prevBg
    scene.fog = prevFog
    gl.setRenderTarget(out)
    gl.render(res.postScene, res.postCam)
    gl.readRenderTargetPixels(out, 0, 0, CAM_W, CAM_H, res.px)
    gl.setRenderTarget(prevRt)
    gl.shadowMap.autoUpdate = prevShadow
  }
  return null
}

// readPixels vem de baixo para cima: vira as linhas (a imagem da câmara começa em cima)
function flip(px) {
  const out = new Uint8ClampedArray(px.length)
  const row = CAM_W * 4
  for (let y = 0; y < CAM_H; y++) out.set(px.subarray((CAM_H - 1 - y) * row, (CAM_H - y) * row), y * row)
  return out
}
function toRgb(rgba) {
  const n = rgba.length / 4
  const out = new Uint8Array(n * 3)
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    out[i * 3] = rgba[j]
    out[i * 3 + 1] = rgba[j + 1]
    out[i * 3 + 2] = rgba[j + 2]
  }
  return out
}
