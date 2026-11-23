// Iluminação e materiais "fotográficos" partilhados pela cena 3D, pelo estúdio de miniaturas e
// pelas pré-visualizações:
//  - mapa de ambiente procedural de estúdio fotográfico (sala creme com softboxes fortes e
//    cartões escuros, sem descarregar HDR): os metais têm algo para refletir e contrastar, os
//    vidros pretos ganham reflexos nítidos das softboxes;
//  - mapeamento de tons Neutral (mantém as cores reais das placas e plásticos; o AgX tirava-lhes
//    saturação e acinzentava os pretos);
//  - passagem de realismo nos materiais (uma vez por material, antes de desenhar): os plásticos
//    e as placas ficam mates/acetinados, os metais acetinados (alumínio, estanho, latão reais não
//    são cromados) e todas as superfícies ganham um grão fino (rugosidade + relevo) — acaba o
//    aspeto liso e perfeito de CG. Materiais emissivos (LEDs acesos) e transparentes (vidro,
//    epóxi, acrílico) mantêm o brilho, mas com menos reflexo.
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

const CACHE = new WeakMap() // renderizador -> textura PMREM

// estúdio de fotografia de produto: sala creme, softbox por cima, luz principal quente à frente
// e à esquerda, recorte frio à direita, faixa atrás e cartões escuros (sem eles os metais
// polidos só refletiriam claro e pareceriam plástico cinzento)
function studioScene() {
  const sc = new THREE.Scene()
  const basic = (c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), side: THREE.DoubleSide })
  const room = new THREE.Mesh(new THREE.BoxGeometry(40, 24, 40), basic([1.08, 1.04, 0.97]))
  room.material.side = THREE.BackSide
  room.position.y = 8
  sc.add(room)
  const plane = (w, h, x, y, z, c) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic(c))
    m.position.set(x, y, z)
    m.lookAt(0, 0, 0)
    sc.add(m)
  }
  const k = (t, s) => t.map((v) => v * s)
  plane(16, 12, 0, 19, 2, k([1, 0.97, 0.92], 4.2)) // softbox por cima
  plane(10, 12, -16, 9, -11, k([1, 0.95, 0.88], 6.5)) // principal (quente)
  plane(6, 14, 17, 6, 8, k([0.9, 0.95, 1], 3.5)) // recorte (frio)
  plane(12, 3, 0, 5, -19, [2.5, 2.5, 2.5]) // faixa de trás
  for (const [w, h, x, y, z] of [[3, 16, 19, 6, 14], [3, 16, -19, 6, 2], [14, 2.5, 4, 3, 19], [10, 2, -6, 12, -19]]) plane(w, h, x, y, z, [0.1, 0.1, 0.1])
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), basic([0.42, 0.4, 0.36]))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -3.9
  sc.add(floor)
  return sc
}

function envFor(gl) {
  let t = CACHE.get(gl)
  if (!t) {
    const pmrem = new THREE.PMREMGenerator(gl)
    const sc = studioScene()
    t = pmrem.fromScene(sc, 0.03).texture
    sc.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose()
        o.material.dispose()
      }
    })
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
  // vidro preto brilhante (ecrãs, lentes escuras, verniz): muito escuro e liso, não metálico.
  // Fica liso e com reflexos nítidos — tratado como plástico ficava mate e cinzento.
  const c = m.color
  const glossyBlack = m.metalness <= 0.3 && m.roughness <= 0.2 && !m.map && c && c.r + c.g + c.b < 0.06
  if (m.metalness > 0.5) {
    // metal acetinado: nada de cromado perfeito. O ambiente difuso é fraco, por isso a cor do
    // metal (a sua refletância) sobe para continuar a ler-se como metal claro, não cinzento
    m.roughness = Math.max(m.roughness, 0.3)
    m.envMapIntensity = 0.85
    if (c && !m.map) c.multiplyScalar(1.3)
  } else if (glossyBlack) {
    m.roughness = Math.max(m.roughness, 0.06)
    m.envMapIntensity = 0.6
    if (m.isMeshPhysicalMaterial) m.specularIntensity = Math.min(m.specularIntensity ?? 1, 0.5)
  } else if (clear) {
    m.roughness = Math.max(m.roughness, 0.06)
    m.envMapIntensity = 0.45
  } else {
    // plásticos, PCB, borracha, madeira: mates a acetinados
    m.metalness = Math.min(m.metalness, 0.15)
    m.roughness = Math.max(m.roughness, 0.5)
    m.envMapIntensity = 0.32
  }
  if (m.isMeshPhysicalMaterial && m.clearcoat > 0 && !glossyBlack) {
    m.clearcoat = Math.min(m.clearcoat, 0.25)
    m.clearcoatRoughness = Math.max(m.clearcoatRoughness, 0.45)
  }
  if (!clear && !glowing && !glossyBlack && !m.roughnessMap) {
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

export function StudioEnvironment({ intensity = 0.42 }) {
  const { gl, scene } = useThree()
  useEffect(() => {
    scene.environment = envFor(gl)
    scene.environmentIntensity = intensity
    gl.toneMapping = THREE.NeutralToneMapping
    gl.toneMappingExposure = 0.95
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
