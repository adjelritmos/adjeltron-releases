// Iluminação e materiais "fotográficos" partilhados pela cena 3D, pelo estúdio de miniaturas e
// pelas pré-visualizações:
//  - mapa de ambiente procedural (sala de estúdio da three.js, sem descarregar HDR), fraco: dá
//    reflexos aos metais sem os transformar em espelhos;
//  - mapeamento de tons AgX (como uma câmara: realces suaves, cores menos "de desenho animado");
//  - passagem de realismo nos materiais (uma vez por material, antes de desenhar): os plásticos
//    e as placas ficam mates/acetinados, os metais acetinados (alumínio, estanho, latão reais não
//    são cromados) e todas as superfícies ganham um grão fino (rugosidade + relevo) — acaba o
//    aspeto liso e perfeito de CG. Materiais emissivos (LEDs acesos) e transparentes (vidro,
//    epóxi, acrílico) mantêm o brilho, mas com menos reflexo.
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

const CACHE = new WeakMap() // renderizador -> textura PMREM

function envFor(gl) {
  let t = CACHE.get(gl)
  if (!t) {
    const pmrem = new THREE.PMREMGenerator(gl)
    const room = new RoomEnvironment()
    t = pmrem.fromScene(room, 0.04).texture
    room.traverse((o) => o.geometry?.dispose?.())
    pmrem.dispose()
    CACHE.set(gl, t)
  }
  return t
}

// grão: ruído de valor suave em várias escalas (256 px, repete-se)
let GRAIN = null
function grain() {
  if (GRAIN) return GRAIN
  const N = 256
  const data = new Uint8Array(N * N * 4)
  const rnd = (x, y, s) => {
    const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453
    return h - Math.floor(h)
  }
  const smooth = (x, y, cell, s) => {
    const gx = x / cell
    const gy = y / cell
    const x0 = Math.floor(gx)
    const y0 = Math.floor(gy)
    const fx = gx - x0
    const fy = gy - y0
    const w = N / cell
    const v = (i, j) => rnd(((x0 + i) % w + w) % w, ((y0 + j) % w + w) % w, s)
    const ux = fx * fx * (3 - 2 * fx)
    const uy = fy * fy * (3 - 2 * fy)
    return (v(0, 0) * (1 - ux) + v(1, 0) * ux) * (1 - uy) + (v(0, 1) * (1 - ux) + v(1, 1) * ux) * uy
  }
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const n = 0.45 * smooth(x, y, 32, 1) + 0.3 * smooth(x, y, 8, 2) + 0.25 * rnd(x, y, 3)
      const v = Math.round(205 + n * 50) // 0,8 … 1,0 da rugosidade
      const i = (y * N + x) * 4
      data[i] = data[i + 1] = data[i + 2] = v
      data[i + 3] = 255
    }
  GRAIN = new THREE.DataTexture(data, N, N, THREE.RGBAFormat)
  GRAIN.wrapS = GRAIN.wrapT = THREE.RepeatWrapping
  GRAIN.repeat.set(3, 3)
  GRAIN.magFilter = THREE.LinearFilter
  GRAIN.minFilter = THREE.LinearMipmapLinearFilter
  GRAIN.generateMipmaps = true
  GRAIN.needsUpdate = true
  return GRAIN
}

// ajusta um material uma só vez (os materiais são partilhados pelas peças)
export function realify(m) {
  if (!m || m.userData.__real || !(m.isMeshStandardMaterial || m.isMeshPhysicalMaterial)) return
  m.userData.__real = true
  // emissores (LEDs, displays): toneMapped=false marca-os mesmo quando ainda estão apagados
  const glowing = m.toneMapped === false || (m.emissive && m.emissiveIntensity > 0 && (m.emissive.r + m.emissive.g + m.emissive.b > 0.05 || m.emissiveMap))
  const clear = m.transparent && m.opacity < 0.95
  if (m.metalness > 0.5) {
    // metal acetinado: nada de cromado perfeito
    m.roughness = Math.max(m.roughness, 0.34)
    m.envMapIntensity = 0.75
  } else if (clear) {
    m.roughness = Math.max(m.roughness, 0.06)
    m.envMapIntensity = 0.45
  } else {
    // plásticos, PCB, borracha, madeira: mates a acetinados
    m.metalness = Math.min(m.metalness, 0.15)
    m.roughness = Math.max(m.roughness, 0.5)
    m.envMapIntensity = 0.32
  }
  if (m.isMeshPhysicalMaterial && m.clearcoat > 0) {
    m.clearcoat = Math.min(m.clearcoat, 0.25)
    m.clearcoatRoughness = Math.max(m.clearcoatRoughness, 0.45)
  }
  if (!clear && !glowing && !m.roughnessMap) {
    m.roughnessMap = grain()
    if (!m.bumpMap) {
      m.bumpMap = grain()
      m.bumpScale = 0.15
    }
  }
  m.needsUpdate = true
}

const fix = (o) => {
  const mm = o.material
  if (!mm) return
  if (Array.isArray(mm)) mm.forEach(realify)
  else realify(mm)
}

export function StudioEnvironment({ intensity = 0.3 }) {
  const { gl, scene } = useThree()
  useEffect(() => {
    scene.environment = envFor(gl)
    scene.environmentIntensity = intensity
    gl.toneMapping = THREE.AgXToneMapping
    gl.toneMappingExposure = 1.15
    // antes de cada desenho: materiais novos passam pela passagem de realismo
    if (!gl.__realPatched) {
      gl.__realPatched = true
      const render = gl.render.bind(gl)
      gl.render = (sc, cam) => {
        if (sc.environment) sc.traverse(fix)
        return render(sc, cam)
      }
      // também antes de compilar os shaders (pré-visualizações: compileAsync): senão o material
      // mudava depois de compilado e voltava a compilar, síncrono, no primeiro desenho
      const compile = gl.compile.bind(gl)
      gl.compile = (sc, ...rest) => {
        if (sc?.environment) sc.traverse(fix)
        return compile(sc, ...rest)
      }
      const compileAsync = gl.compileAsync.bind(gl)
      gl.compileAsync = (sc, ...rest) => {
        if (sc?.environment) sc.traverse(fix)
        return compileAsync(sc, ...rest)
      }
    }
    return () => {
      if (scene.environment === CACHE.get(gl)) scene.environment = null
    }
  }, [gl, scene, intensity])
  return null
}
