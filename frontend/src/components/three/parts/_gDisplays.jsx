// Utilitários dos ecrãs do grupo G (não é um componente): um canvas por peça que segue o
// estado vivo (descodificação RLE / bits), usado como textura no 3D e como imagem no 2D.
// Mais abaixo: peças 3D comuns dos módulos (furos metalizados, soldas, passivos SMD, vidro,
// fita flexível, bornes, relé, díodo, transístor…) partilhadas pelos ecrãs, LEDs e relés.
import { useLayoutEffect, useMemo, useState } from 'react'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { SCREEN_TINT, useFrame, useRef, THREE, liveOf, geo, mat, mergedGeo, METAL, SilkText, PixelHalo, pixelLevel } from '../kit.jsx'

// screen({ key(e, L) -> texto (pode descodificar para e.raw…), draw(e, L) }) → { sync, useTex, url }
// e = { view (canvas mostrado), w, h, … }; draw() só é chamado quando a chave muda.
export function screen({ key, draw, init }) {
  const CACHE = new Map()
  const entry = (id, w, h) => {
    let e = CACHE.get(id)
    if (!e || e.w !== w || e.h !== h) {
      e = { w, h, view: Object.assign(document.createElement('canvas'), { width: w, height: h }), k: '\u0000', n: 0 }
      init?.(e)
      draw(e, null)
      CACHE.set(id, e)
    }
    return e
  }
  const sync = (id, w, h, L) => {
    const e = entry(id, w, h)
    const k = key(e, L)
    if (k !== e.k) {
      e.k = k
      draw(e, L)
      e.n++
    }
    return e
  }
  function useTex(id, w, h) {
    const e = entry(id, w, h)
    const tex = useMemo(() => {
      const t = new THREE.CanvasTexture(e.view)
      t.colorSpace = THREE.SRGBColorSpace
      t.magFilter = THREE.NearestFilter
      t.minFilter = THREE.LinearFilter
      t.anisotropy = 4
      return t
    }, [e])
    const last = useRef(-1)
    useFrame(() => {
      const s = sync(id, w, h, liveOf(id))
      if (s.n !== last.current) {
        last.current = s.n
        tex.needsUpdate = true
      }
    })
    return tex
  }
  // imagem (data URL) do canvas para o Overlay2D; muda quando o canvas muda
  function useUrl(id, w, h, live) {
    const e = sync(id, w, h, live)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => e.view.toDataURL(), [e, e.n])
  }
  return { sync, useTex, useUrl }
}

export const b64bytes = (s) => {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
// RLE de pares Uint16 [n, valor] → chama put(i, valor, n) por troço
export function rleRuns(fb, fn) {
  const bytes = b64bytes(fb)
  const u16 = new Uint16Array(bytes.buffer, 0, bytes.length >> 1)
  let p = 0
  for (let i = 0; i + 1 < u16.length; i += 2) {
    fn(p, u16[i + 1], u16[i])
    p += u16[i]
  }
}

export const hexRgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16))

// RGB565 → ImageData de w × h (RLE nativo de largura sw)
export function decode565(ctx, fb, w, h, sw = w) {
  const img = ctx.createImageData(w, h)
  const d = img.data
  for (let i = 3; i < d.length; i += 4) d[i] = 255
  rleRuns(fb, (p0, c, n) => {
    const r = (((c >> 11) & 31) * 255) / 31
    const g = (((c >> 5) & 63) * 255) / 63
    const b = ((c & 31) * 255) / 31
    for (let p = p0; p < p0 + n; p++) {
      const x = p % sw
      const y = (p / sw) | 0
      if (x >= w || y >= h) continue
      const o = (y * w + x) * 4
      d[o] = r
      d[o + 1] = g
      d[o + 2] = b
    }
  })
  ctx.putImageData(img, 0, 0)
}

// =====================================================================================
// Peças 3D comuns dos módulos (dimensões reais em cm; geometrias em cache e juntas numa
// só malha por material sempre que se repetem)
// =====================================================================================
const unit = () => geo('gull', () => new THREE.BoxGeometry(1, 1, 1))
const plane = () => geo('plane1', () => new THREE.PlaneGeometry(1, 1))
const ptsKey = (pts) => pts.map((p) => p.map((v) => +(+v).toFixed(3)).join(',')).join(';')

// furos de montagem metalizados (anel estanhado + furo escuro); y = face de cima da placa
export function MountHoles({ pts, y, r = 0.16, ring = 0.28, color = METAL.tin }) {
  const k = `${ptsKey(pts)}|${r}|${ring}`
  const rings = mergedGeo(`mhR${k}`, () => pts.map(([x, z]) => [geo(`mhRing${r},${ring}`, () => new THREE.RingGeometry(r, ring, 24).rotateX(-Math.PI / 2)), [x, 0, z]]))
  const holes = mergedGeo(`mhH${k}`, () => pts.map(([x, z]) => [geo(`mhDisc${r}`, () => new THREE.CircleGeometry(r, 24).rotateX(-Math.PI / 2)), [x, 0, z]]))
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, 0.003, 0]} geometry={rings} material={mat(color, 1, 0.32)} receiveShadow />
      <mesh position={[0, 0.002, 0]} geometry={holes} material={mat('#050505', 0, 0.95)} />
    </group>
  )
}

// almofadas estanhadas com a gota de solda de um pino atravessante (vistas por cima);
// square0: a primeira almofada é quadrada (marca do pino 1, como nas placas reais)
export function SolderPads({ pts, y, r = 0.09, blob = true, square0 = false }) {
  const k = `${ptsKey(pts)}|${r}|${square0}`
  const pads = mergedGeo(`spP${k}`, () =>
    pts.map(([x, z], i) => [
      i === 0 && square0 ? geo(`spSq${r}`, () => new THREE.PlaneGeometry(r * 2, r * 2).rotateX(-Math.PI / 2)) : geo(`spC${r}`, () => new THREE.CircleGeometry(r, 16).rotateX(-Math.PI / 2)),
      [x, 0, z],
    ]),
  )
  const blobs = mergedGeo(`spB${k}${blob}`, () =>
    blob ? pts.map(([x, z]) => [geo(`spDome${r}`, () => new THREE.SphereGeometry(r * 0.78, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2)), [x, 0, z], [0, 0, 0], [1, 0.55, 1]]) : [],
  )
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, 0.002, 0]} geometry={pads} material={mat(METAL.tin, 1, 0.3)} />
      {blob && <mesh geometry={blobs} material={mat('#e3e5e8', 1, 0.22)} castShadow />}
    </group>
  )
}

// passivos SMD de uma placa (uma malha por material): list = [[x, z, rotY, tipo], ...]
// tipo: 'r' resistência 0603 / 'R' 0805 (corpo preto), 'c' condensador 0603 / 'C' 0805 (castanho)
const SMD = { r: [0.16, 0.08, 0.045, 0], R: [0.2, 0.125, 0.05, 0], c: [0.16, 0.08, 0.07, 1], C: [0.2, 0.125, 0.08, 1] }
const SMD_COL = ['#161616', '#b38b5d']
export function SmdParts({ list, y }) {
  const k = JSON.stringify(list)
  const body = (kind) =>
    mergedGeo(`smdB${kind}${k}`, () =>
      list
        .filter((s) => SMD[s[3]][3] === kind)
        .map(([x, z, ry = 0, t]) => {
          const [l, w, h] = SMD[t]
          return [unit(), [x, h / 2, z], [0, ry, 0], [l * 0.7, h, w]]
        }),
    )
  const ends = mergedGeo(`smdE${k}`, () =>
    list.flatMap(([x, z, ry = 0, t]) => {
      const [l, w, h] = SMD[t]
      const c = Math.cos(ry)
      const s = Math.sin(ry)
      return [-1, 1].map((g) => [unit(), [x + g * l * 0.425 * c, h / 2, z - g * l * 0.425 * s], [0, ry, 0], [l * 0.15, h * 1.02, w * 1.02]])
    }),
  )
  const has = (kind) => list.some((s) => SMD[s[3]][3] === kind)
  return (
    <group position={[0, y, 0]}>
      {has(0) && <mesh geometry={body(0)} material={mat(SMD_COL[0], 0, 0.5)} castShadow />}
      {has(1) && <mesh geometry={body(1)} material={mat(SMD_COL[1], 0, 0.55)} castShadow />}
      {list.length > 0 && <mesh geometry={ends} material={mat(METAL.tin, 1, 0.3)} />}
    </group>
  )
}

// reflexo do vidro de um ecrã: plano preto em mistura aditiva — só acrescenta os brilhos do
// ambiente e das luzes, sem escurecer a imagem que está por baixo
let SHEEN
const sheenMat = () =>
  (SHEEN ||= new THREE.MeshPhysicalMaterial({ color: '#000000', roughness: 0.07, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.1, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))
export function GlassSheen({ w, d, pos }) {
  return <mesh position={pos} rotation={[-Math.PI / 2, 0, 0]} scale={[w, d, 1]} geometry={plane()} material={sheenMat()} renderOrder={2} />
}

// fita flexível (FPC) cor de âmbar: troço deitado ao longo de z (de z0 a z1) à altura y, que
// dobra para baixo à volta do bordo da placa em z1 (raio rb)
export function Flex({ x = 0, z0, z1, w, y, rb = 0.09, color = '#c58a2e' }) {
  const dir = z1 >= z0 ? 1 : -1
  const m = mat(color, 0.2, 0.35, { side: THREE.DoubleSide })
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, y, (z0 + z1) / 2]} scale={[w, 0.012, Math.abs(z1 - z0)]} geometry={unit()} material={m} />
      <mesh
        position={[0, y - rb, z1]}
        geometry={geo(`flexBend${w},${rb},${dir}`, () => new THREE.CylinderGeometry(rb, rb, w, 12, 1, true, dir > 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI).rotateZ(Math.PI / 2))}
        material={m}
      />
    </group>
  )
}

// borne de parafuso de 5 mm (KF301/DG301, azul, 10 mm de altura): pólos ao longo de x, bocas dos
// fios viradas para −z. Como no borne real, cada via é um bloco só: a boca na face da frente e o
// parafuso de fenda por cima da MESMA via, no eixo do bloco (z = 0), metido num poço aberto no
// topo. pos = centro na face da placa; a cabeça do parafuso fica a `head` acima de pos. É aí que
// os fios 3D ligam (pinos dos bornes em shared/parts/relay*.js a y = 1,0 com a placa de 0,16 →
// head = 0,84): de cima, no relé de 1 canal, ou de lado (dir = −z, placas de 2/4/8 relés), e
// nesse caso a ponta descarnada entra na boca, que fica logo abaixo da cabeça do parafuso.
export function ScrewBlock({ pos, rotY = 0, n = 3, pitch = 0.5, h = 1.0, d = 0.75, head = 0.84, color = '#1d5fbf' }) {
  const L = n * pitch
  const xs = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * pitch)
  const k = `${n},${pitch},${h},${d},${head}`
  const rw = 0.19 // raio do poço do parafuso
  const my = 0.38 // centro da boca, a 3,8 mm da placa como no KF301: é aí que o fio entra (pins: y = T + 0,38)
  const mh = 0.32 // altura da boca
  const slab = h - head + 0.04 // espessura da tampa furada (o poço desce até abaixo da cabeça)
  const body = mergedGeo(`sbBody${k}`, () => {
    // tampa: retângulo L × d com um furo por via, extrudido para baixo a partir do topo
    const sh = new THREE.Shape()
    sh.moveTo(-L / 2, -d / 2)
    sh.lineTo(L / 2, -d / 2)
    sh.lineTo(L / 2, d / 2)
    sh.lineTo(-L / 2, d / 2)
    sh.closePath()
    for (const x of xs) sh.holes.push(new THREE.Path().absarc(x, 0, rw, 0, Math.PI * 2, true))
    const top = geo(`sbTop${k}`, () => new THREE.ExtrudeGeometry(sh, { depth: slab, bevelEnabled: false, curveSegments: 20 }).rotateX(Math.PI / 2).translate(0, h, 0))
    return [
      [unit(), [0, (h - slab) / 2, 0], [0, 0, 0], [L, h - slab, d]],
      [top, [0, 0, 0]],
    ]
  })
  const dark = mergedGeo(`sbDark${k}`, () => [
    // bocas dos fios (face da frente, por baixo do parafuso da mesma via)
    ...xs.map((x) => [plane(), [x, my, -d / 2 - 0.002], [0, Math.PI, 0], [pitch * 0.62, mh, 1]]),
    // fundo dos poços
    ...xs.map((x) => [geo('sbWell', () => new THREE.CircleGeometry(rw, 20).rotateX(-Math.PI / 2)), [x, h - slab + 0.002, 0]]),
    // juntas entre as vias (os KF301 são blocos de 1 via encaixados): frente e topo
    ...xs.slice(1).flatMap((x) => [
      [plane(), [x - pitch / 2, h / 2, -d / 2 - 0.003], [0, Math.PI, 0], [0.012, h, 1]],
      [plane(), [x - pitch / 2, h + 0.002, 0], [-Math.PI / 2, 0, 0], [0.012, d, 1]],
    ]),
  ])
  const metal = mergedGeo(`sbMetal${k}`, () => [
    // gaiola de aperto vista pela boca e cabeça do parafuso (topo da cabeça = head)
    ...xs.map((x) => [plane(), [x, my - mh * 0.32, -d / 2 - 0.004], [0, Math.PI, 0], [pitch * 0.5, mh * 0.22, 1]]),
    ...xs.map((x) => [geo('sbScrew', () => new THREE.CylinderGeometry(0.155, 0.16, 0.06, 16)), [x, head - 0.03, 0]]),
  ])
  const slots = mergedGeo(`sbSlot${k}`, () => xs.map((x) => [unit(), [x, head + 0.001, 0], [0, Math.PI / 4, 0], [0.26, 0.012, 0.045]]))
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh geometry={body} material={mat(color, 0, 0.45)} castShadow receiveShadow />
      <mesh geometry={dark} material={mat('#07090c', 0, 0.9)} />
      <mesh geometry={metal} material={mat(METAL.nickel, 1, 0.3)} />
      <mesh geometry={slots} material={mat('#2b2f33', 1, 0.5)} />
    </group>
  )
}

// relé SRD-05VDC-SL-C (Songle) de 19 × 15,5 × 15 mm: caixa azul selada, rebordo da base e a
// marcação real no topo. Comprimento ao longo de x; pos = centro da base (na face da placa)
export function SongleRelay({ pos, rotY = 0, size = [1.9, 1.53, 1.55] }) {
  const [l, h, w] = size
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.04, 0]} geometry={geo(`srdBase${l},${w}`, () => new THREE.BoxGeometry(l + 0.03, 0.08, w + 0.03))} material={mat('#1a55b8', 0, 0.5)} castShadow />
      <mesh position={[0, 0.08 + (h - 0.08) / 2, 0]} geometry={geo(`srdBody${l},${h},${w}`, () => roundedBox(l, h - 0.08, w, 0.05))} material={mat('#2364d2', 0, 0.32)} castShadow receiveShadow />
      <SilkText
        lines={[
          { text: 'SONGLE', font: 'bold 54px Arial', y: 48 },
          { text: 'SRD-05VDC-SL-C', font: 'bold 44px Arial', y: 112 },
          { text: '10A 250VAC  10A 125VAC', font: '30px Arial', y: 172 },
          { text: '10A  30VDC  10A  28VDC', font: '30px Arial', y: 220 },
          { text: 'CQC   c(UL)us   CE', font: 'bold 28px Arial', y: 290 },
        ]}
        px={[512, 340]}
        pos={[0, h + 0.002, 0]}
        w={l * 0.86}
        d={w * 0.78}
        color="#eef3ff"
      />
      {/* moldura do logótipo SONGLE */}
      <mesh position={[0, h + 0.0025, -(0.5 - 48 / 340) * w * 0.78]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('srdLogo', () => new THREE.RingGeometry(0.2, 0.215, 4, 1, Math.PI / 4).scale(2.6, 0.75, 1))} material={mat('#eef3ff', 0, 0.6)} />
    </group>
  )
}
// caixa de cantos verticais boleados (raio r) e arestas de cima/baixo chanfradas, centrada na origem
export const roundedBox = (L, h, W, r) => {
  const b = r * 0.6
  const l = L - 2 * b
  const w = W - 2 * b
  const s = new THREE.Shape()
  s.moveTo(-l / 2 + r, -w / 2)
  s.lineTo(l / 2 - r, -w / 2)
  s.quadraticCurveTo(l / 2, -w / 2, l / 2, -w / 2 + r)
  s.lineTo(l / 2, w / 2 - r)
  s.quadraticCurveTo(l / 2, w / 2, l / 2 - r, w / 2)
  s.lineTo(-l / 2 + r, w / 2)
  s.quadraticCurveTo(-l / 2, w / 2, -l / 2, w / 2 - r)
  s.lineTo(-l / 2, -w / 2 + r)
  s.quadraticCurveTo(-l / 2, -w / 2, -l / 2 + r, -w / 2)
  const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * b, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 2, curveSegments: 4 })
  g.rotateX(-Math.PI / 2)
  g.translate(0, -(h - 2 * b) / 2, 0)
  return g
}

// díodo DO-41 (1N4007) deitado ao longo de x: corpo preto com o anel prateado do cátodo (+x) e
// pernas dobradas até à placa a ±pitch/2. pos = ponto na face da placa
export function Diode({ pos, rotY = 0, len = 0.52, r = 0.13, pitch = 1.0 }) {
  const y = r + 0.03
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]} geometry={geo(`do41${len},${r}`, () => new THREE.CylinderGeometry(r, r, len, 14))} material={mat('#141414', 0, 0.35)} castShadow />
      <mesh position={[len * 0.32, y, 0]} rotation={[0, 0, Math.PI / 2]} geometry={geo(`do41b${r}`, () => new THREE.CylinderGeometry(r + 0.004, r + 0.004, 0.07, 14, 1, true))} material={mat('#c9ccd0', 0.6, 0.4)} />
      <mesh
        geometry={mergedGeo(`do41L${len},${pitch},${y}`, () => [
          [unit(), [0, y, 0], [0, 0, 0], [pitch, 0.06, 0.06]],
          [unit(), [-pitch / 2, y / 2, 0], [0, 0, 0], [0.06, y, 0.06]],
          [unit(), [pitch / 2, y / 2, 0], [0, 0, 0], [0.06, y, 0.06]],
        ])}
        material={mat(METAL.tin, 1, 0.3)}
      />
    </group>
  )
}

// transístor TO-92 (S8050, 2N2222…): corpo em "D" com a face plana virada para +z e 3 pernas
let TO92
const to92Geo = () => {
  if (TO92) return TO92
  const r = 0.24
  const c = 0.12
  const x = Math.sqrt(r * r - c * c)
  const s = new THREE.Shape()
  s.moveTo(-x, -c)
  s.lineTo(x, -c)
  s.absarc(0, 0, r, -Math.atan2(c, x), Math.PI + Math.atan2(c, x), false)
  TO92 = new THREE.ExtrudeGeometry(s, { depth: 0.45, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1, curveSegments: 12 }).rotateX(-Math.PI / 2)
  return TO92
}
export function To92({ pos, rotY = 0, lift = 0.3, label = 'S8050' }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, lift, 0]} geometry={to92Geo()} material={mat('#121212', 0, 0.45)} castShadow />
      <mesh
        geometry={mergedGeo(`to92L${lift}`, () => [-0.127, 0, 0.127].map((x) => [unit(), [x, lift / 2, 0], [0, 0, 0], [0.045, lift + 0.02, 0.03]]))}
        material={mat(METAL.tin, 1, 0.3)}
      />
      {label && (
        <mesh position={[0, lift + 0.24, 0.128]} scale={[0.36, 0.12, 1]} geometry={plane()} material={silkFace(label)} />
      )}
    </group>
  )
}
// texto pequeno numa face vertical (marcação a laser dos transístores e CIs)
const FACE = new Map()
function silkFace(text, color = '#9a9a9a') {
  const k = `${text}|${color}`
  let m = FACE.get(k)
  if (!m) {
    const c = Object.assign(document.createElement('canvas'), { width: 192, height: 64 })
    const x = c.getContext('2d')
    x.fillStyle = color
    x.font = 'bold 40px Arial'
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    x.fillText(text, 96, 34)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    FACE.set(k, (m = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })))
  }
  return m
}

// texto numa face vertical virada para +z (rodada por rotY): marcação de lado dos displays
export function SideText({ text, pos, rotY = 0, w, color = '#555' }) {
  return <mesh position={pos} rotation={[0, rotY, 0]} scale={[w, w / 3, 1]} geometry={plane()} material={silkFace(text, color)} />
}

// CI DIP atravessante (PC817, NE555…): n pernas por lado ao longo de x (passo 2,54 mm), filas
// a 7,62 mm; corpo levantado ~0,5 mm da placa. pos = centro na face da placa
export function Dip({ pos, rotY = 0, n = 2, color = '#161616', label, labelColor = '#a9a9a9' }) {
  const L = n * 0.254 + 0.1
  const W = 0.64
  const H = 0.33
  const y0 = 0.05
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, y0 + H / 2, 0]} geometry={geo(`dipB${n}`, () => roundedBox(L, H, W, 0.03))} material={mat(color, 0, 0.45)} castShadow />
      <mesh
        geometry={mergedGeo(`dipL${n}`, () =>
          Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * 0.254).flatMap((x) =>
            [-1, 1].flatMap((s) => [
              [unit(), [x, y0 + H * 0.4, s * (W / 2 + 0.04)], [0, 0, 0], [0.13, 0.025, 0.08]],
              [unit(), [x, (y0 + H * 0.4) / 2, s * 0.381], [0, 0, 0], [0.05, y0 + H * 0.4, 0.025]],
            ]),
          ),
        )}
        material={mat(METAL.tin, 1, 0.3)}
      />
      <mesh position={[-L / 2 + 0.08, y0 + H + 0.001, W / 2 - 0.09]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('dipDot', () => new THREE.CircleGeometry(0.035, 12))} material={mat('#060606', 0, 0.9)} />
      {label && <SilkText text={label} pos={[0.04, y0 + H + 0.002, 0]} w={L * 0.8} d={0.16} color={labelColor} font="bold 44px Arial" />}
    </group>
  )
}

// jumper (ponte) de 2,54 mm sobre dois pinos ao longo de x; pos = centro na base
export function Jumper({ pos, rotY = 0, color = '#f2c500' }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.3, 0]} geometry={geo('jmpB', () => roundedBox(0.5, 0.6, 0.25, 0.03))} material={mat(color, 0, 0.45)} castShadow />
      <mesh position={[0, 0.602, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.3, 0.06, 1]} geometry={plane()} material={mat('#3a3000', 0, 0.8)} />
    </group>
  )
}

// ---------- painel de um ecrã gráfico (OLED / TFT) ----------
// saliência do vidro (lado da fita): CI do controlador colado no vidro (COG) e as pistas em leque
let LEDGE_TEX
function ledgeTex() {
  if (LEDGE_TEX) return LEDGE_TEX
  const c = Object.assign(document.createElement('canvas'), { width: 512, height: 96 })
  const x = c.getContext('2d')
  x.fillStyle = '#0c0d10'
  x.fillRect(0, 0, 512, 96)
  // pistas de ITO/metal: da área ativa (em cima) para o CI e do CI para a fita (em baixo)
  x.strokeStyle = 'rgba(150,140,110,0.55)'
  x.lineWidth = 1
  for (let i = 0; i < 64; i++) {
    const t = i / 63
    x.beginPath()
    x.moveTo(8 + t * 496, 0)
    x.lineTo(150 + t * 212, 34)
    x.stroke()
    x.beginPath()
    x.moveTo(190 + t * 132, 58)
    x.lineTo(150 + t * 212, 96)
    x.stroke()
  }
  // CI do controlador (tira comprida e preta, com reflexo)
  const g = x.createLinearGradient(0, 36, 0, 58)
  g.addColorStop(0, '#2a2c30')
  g.addColorStop(0.5, '#141518')
  g.addColorStop(1, '#050506')
  x.fillStyle = g
  x.fillRect(140, 36, 232, 20)
  LEDGE_TEX = new THREE.CanvasTexture(c)
  LEDGE_TEX.colorSpace = THREE.SRGBColorSpace
  LEDGE_TEX.anisotropy = 4
  return LEDGE_TEX
}
let LEDGE_MAT
export const ledgeMat = () => (LEDGE_MAT ||= new THREE.MeshStandardMaterial({ map: ledgeTex(), roughness: 0.18, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -1 }))

// Painel de vidro: corpo (laterais da retroiluminação nos TFT, vidro duplo nos OLED), vidro de cima
// preto brilhante, saliência com o CI e as pistas do lado da fita (ledge = +1 → +z, −1 → −z),
// imagem viva na área ativa (tex), reflexo e a fita flexível até ao bordo da placa (fpc).
// glass/act: { x: [x0, x1], z: [z0, z1] }; y0 = base do painel; h = espessura
// fpc: { w, edge (z do bordo da placa), y (topo da placa) } ou null
export function DisplayPanel({ glass, act, y0, h, tex, side = '#0b0b0d', sideMetal = 0, ledge = 1, fpc = null }) {
  const gx = (glass.x[0] + glass.x[1]) / 2
  const gz = (glass.z[0] + glass.z[1]) / 2
  const gw = glass.x[1] - glass.x[0]
  const gd = glass.z[1] - glass.z[0]
  const top = y0 + h
  const aw = act.x[1] - act.x[0]
  const ad = act.z[1] - act.z[0]
  // saliência: do fim da área ativa (+ 1 mm) até ao bordo do vidro, do lado da fita
  const lz0 = ledge > 0 ? act.z[1] + 0.1 : glass.z[0]
  const lz1 = ledge > 0 ? glass.z[1] : act.z[0] - 0.1
  const fpcZ = ledge > 0 ? glass.z[1] : glass.z[0]
  return (
    <group>
      <mesh position={[gx, y0 + h / 2, gz]} scale={[gw, h, gd]} geometry={unit()} material={mat(side, sideMetal, sideMetal ? 0.35 : 0.2)} castShadow receiveShadow />
      <mesh position={[gx, top + 0.001, gz]} rotation={[-Math.PI / 2, 0, 0]} scale={[gw - 0.02, gd - 0.02, 1]} geometry={plane()} material={mat('#07080a', 0, 0.12)} />
      {lz1 - lz0 > 0.05 && (
        <mesh position={[gx, top + 0.002, (lz0 + lz1) / 2]} rotation={[-Math.PI / 2, 0, ledge > 0 ? 0 : Math.PI]} scale={[gw - 0.06, lz1 - lz0, 1]} geometry={plane()} material={ledgeMat()} />
      )}
      <mesh position={[(act.x[0] + act.x[1]) / 2, top + 0.003, (act.z[0] + act.z[1]) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[aw, ad]} />
        <meshBasicMaterial map={tex} color={SCREEN_TINT} toneMapped={false} />
      </mesh>
      <GlassSheen w={gw - 0.02} d={gd - 0.02} pos={[gx, top + 0.006, gz]} />
      {fpc && Math.abs(fpc.edge - fpcZ) > 0.01 && <Flex x={gx} z0={fpcZ - ledge * 0.05} z1={fpc.edge} w={fpc.w} y={fpc.y + 0.007} rb={fpc.y / 2 + 0.006} />}
    </group>
  )
}

// serigrafia com o nome de cada pino de uma fila ao longo de x (texto centrado em cada pino)
export function PinLabels({ xs, names, z, y, h = 0.11, color = '#f2f2f2' }) {
  const x0 = Math.min(...xs) - 0.4
  const x1 = Math.max(...xs) + 0.4
  const W = x1 - x0
  const px = Math.round(Math.min(1024, W * 400))
  const k = px / W
  const ph = Math.max(24, Math.round(h * k))
  const lines = names.map((text, i) => ({ text, font: `bold ${Math.round(ph * 0.82)}px Arial`, x: (xs[i] - x0) * k, y: ph / 2 + 1 }))
  return <SilkText lines={lines} px={[px, ph]} pos={[(x0 + x1) / 2, y, z]} w={W} d={h} color={color} />
}

// serigrafia de uma fila de pinos ao longo de z: um nome por pino, à altura de cada um
export function PinColumn({ zs, names, x, y, w = 0.32, h = 0.1, color = '#f2f2f2' }) {
  const z0 = Math.min(...zs) - 0.2
  const z1 = Math.max(...zs) + 0.2
  const D = z1 - z0
  const k = 400
  const px = [Math.round(w * k), Math.round(D * k)]
  const lines = names.map((text, i) => ({ text, font: `bold ${Math.round(h * k * 0.82)}px Arial`, y: (zs[i] - z0) * k + 1 }))
  return <SilkText lines={lines} px={px} pos={[x, y, (z0 + z1) / 2]} w={w} d={D} color={color} />
}

// ---------- LED endereçável WS2812B (5050) ----------
// topo visto de perto: moldura branca, janela de resina com a armação dourada, o CI de controlo
// e os três chips (R, G, B) com os fios de ligação — desenho partilhado por todos os LEDs
export function drawWs2812(x, s, cx = s / 2, cy = s / 2) {
  const k = s / 64
  x.save()
  x.translate(cx - s / 2, cy - s / 2)
  x.fillStyle = '#f3f1ea'
  x.fillRect(0, 0, s, s)
  // canto chanfrado do pino 1
  x.fillStyle = '#d8d4c8'
  x.beginPath()
  x.moveTo(0, 0)
  x.lineTo(9 * k, 0)
  x.lineTo(0, 9 * k)
  x.fill()
  // janela de resina
  x.fillStyle = '#e8e1c9'
  x.beginPath()
  x.arc(32 * k, 32 * k, 25 * k, 0, Math.PI * 2)
  x.fill()
  // armação dourada (duas almofadas grandes)
  x.fillStyle = '#c9a54e'
  x.fillRect(14 * k, 20 * k, 17 * k, 24 * k)
  x.fillRect(34 * k, 20 * k, 16 * k, 24 * k)
  // CI de controlo e chips dos LEDs
  x.fillStyle = '#1b1b1b'
  x.fillRect(17 * k, 25 * k, 11 * k, 14 * k)
  x.fillStyle = '#7a2a22'
  x.fillRect(37 * k, 23 * k, 6 * k, 5 * k)
  x.fillStyle = '#2f6a3a'
  x.fillRect(37 * k, 30 * k, 6 * k, 5 * k)
  x.fillStyle = '#2a3f7a'
  x.fillRect(37 * k, 37 * k, 6 * k, 5 * k)
  // fios de ouro
  x.strokeStyle = 'rgba(230,200,110,0.9)'
  x.lineWidth = Math.max(0.6, 0.8 * k)
  for (const [a, b, c, d] of [[28, 28, 37, 25], [28, 32, 37, 32], [28, 36, 37, 39], [20, 25, 16, 18], [25, 39, 28, 46]]) {
    x.beginPath()
    x.moveTo(a * k, b * k)
    x.lineTo(c * k, d * k)
    x.stroke()
  }
  x.restore()
}
let WS_TEX
export function ws2812Tex() {
  if (!WS_TEX) {
    const c = Object.assign(document.createElement('canvas'), { width: 64, height: 64 })
    drawWs2812(c.getContext('2d'), 64)
    WS_TEX = new THREE.CanvasTexture(c)
    WS_TEX.colorSpace = THREE.SRGBColorSpace
    WS_TEX.anisotropy = 4
  }
  return WS_TEX
}
// máscara da luz: só a janela de resina acende (a moldura branca fica só iluminada)
let WS_GLOW
export function ws2812GlowTex() {
  if (!WS_GLOW) {
    const c = Object.assign(document.createElement('canvas'), { width: 64, height: 64 })
    const x = c.getContext('2d')
    x.fillStyle = '#000'
    x.fillRect(0, 0, 64, 64)
    const g = x.createRadialGradient(32, 32, 4, 32, 32, 27)
    g.addColorStop(0, '#fff')
    g.addColorStop(0.85, '#ddd')
    g.addColorStop(1, '#222')
    x.fillStyle = g
    x.beginPath()
    x.arc(32, 32, 27, 0, Math.PI * 2)
    x.fill()
    WS_GLOW = new THREE.CanvasTexture(c)
    WS_GLOW.colorSpace = THREE.SRGBColorSpace
  }
  return WS_GLOW
}
// WS2812B 5050 (5 × 5 × 1,6 mm) com as 4 pernas estanhadas e o topo que acende com a cor do LED i
// (live.c[i]); pos = centro da base, na face da placa
// (body = false: só o topo — os corpos e as pernas de vários LEDs vão juntos em Ws2812Bodies)
export function Ws2812({ id, i, pos, rotY = 0, halo = 1.2, body = true }) {
  const m = useRef()
  const col = useRef(new THREE.Color())
  useFrame(() => {
    const c = liveOf(id)?.c?.[i] ?? 0
    if (!m.current) return
    const v = pixelLevel(c, col.current)
    m.current.emissive.copy(col.current)
    m.current.emissiveIntensity = v ? 0.8 + 2.0 * v : 0
  })
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {body && <Ws2812Bodies at={[[0, 0, 0]]} y={0} />}
      <mesh position={[0, 0.151, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('ws2812Top', () => new THREE.PlaneGeometry(0.5, 0.5))}>
        <meshStandardMaterial ref={m} map={ws2812Tex()} emissiveMap={ws2812GlowTex()} color="#ffffff" emissive="#000" roughness={0.3} toneMapped={false} />
      </mesh>
      {halo > 0 && <PixelHalo id={id} i={i} pos={[0, 0.27, 0]} size={halo} />}
    </group>
  )
}

// ---------- conjunto repetido juntado numa só malha por material ----------
// Desenha os filhos (estáticos) uma vez, escondidos, junta as geometrias por material e repete-as
// em cada deslocamento de `at` ([x, z]); o resultado fica em cache pela chave `id`. Serve para as
// placas com muitos canais iguais (relés, bornes, optoacopladores…): dezenas de malhas → poucas.
const BATCH = new Map()
const _m = new THREE.Matrix4()
const _o = new THREE.Matrix4()
function plain(g, m) {
  const c = g.index ? g.toNonIndexed() : g.clone()
  const out = new THREE.BufferGeometry()
  const n = c.attributes.position.count
  out.setAttribute('position', c.attributes.position)
  out.setAttribute('normal', c.attributes.normal || new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3))
  out.setAttribute('uv', c.attributes.uv || new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2))
  out.applyMatrix4(m)
  return out
}
export function Batched({ id, at, children }) {
  const key = `${id}|${ptsKey(at)}`
  const [state, setState] = useState(() => ({ key, list: BATCH.get(key) }))
  const ready = state.key === key ? state.list || BATCH.get(key) : BATCH.get(key)
  const src = useRef()
  useLayoutEffect(() => {
    if (ready || !src.current) return
    const root = src.current
    root.updateWorldMatrix(true, true)
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert()
    const byMat = new Map()
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry?.attributes?.position || Array.isArray(o.material)) return
      if (!byMat.has(o.material)) byMat.set(o.material, [])
      byMat.get(o.material).push([o.geometry, new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld), o.castShadow])
    })
    const list = []
    for (const [material, items] of byMat) {
      const parts = at.flatMap(([x, z]) => items.map(([g, m]) => plain(g, _o.makeTranslation(x, 0, z).multiply(_m.copy(m)))))
      const geometry = mergeGeometries(parts, false)
      parts.forEach((p) => p.dispose())
      if (!geometry) continue
      geometry.computeBoundingBox()
      geometry.computeBoundingSphere()
      list.push({ geometry, material, shadow: items.some((i) => i[2]) })
    }
    BATCH.set(key, list)
    setState({ key, list })
  }, [key, at, ready])
  if (!ready)
    return (
      <group ref={src} visible={false}>
        {children}
      </group>
    )
  return (
    <group>
      {ready.map((b, i) => (
        <mesh key={i} geometry={b.geometry} material={b.material} castShadow={b.shadow} receiveShadow />
      ))}
    </group>
  )
}

// corpos brancos e pernas estanhadas de vários WS2812B numa malha por material: at = [[x, z, rotY]…]
export function Ws2812Bodies({ at, y }) {
  const k = ptsKey(at)
  const bodies = mergedGeo(`wsB${k}`, () => at.map(([x, z, r = 0]) => [geo('ws2812Body', () => new THREE.BoxGeometry(0.5, 0.15, 0.5)), [x, 0.075, z], [0, r, 0]]))
  const leads = mergedGeo(`wsL${k}`, () =>
    at.flatMap(([x, z, r = 0]) =>
      [-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => {
          const lx = sx * 0.255
          const lz = sz * 0.16
          return [unit(), [x + lx * Math.cos(r) + lz * Math.sin(r), 0.03, z - lx * Math.sin(r) + lz * Math.cos(r)], [0, r, 0], [0.04, 0.06, 0.1]]
        }),
      ),
    ),
  )
  return (
    <group position={[0, y, 0]}>
      <mesh geometry={bodies} material={mat('#f1efe8', 0, 0.45)} castShadow receiveShadow />
      <mesh geometry={leads} material={mat(METAL.tin, 1, 0.3)} />
    </group>
  )
}
