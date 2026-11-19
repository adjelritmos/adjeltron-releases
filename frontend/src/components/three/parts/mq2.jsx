// Sensor de gás MQ-2 no módulo comparador LM393 (placa azul de 32 × 22 mm): cápsula de
// baquelite preta com a rede dupla de aço inox cravada, trimpot 3296 azul, LM393 SOIC-8, LEDs
// PWR/DO e a serigrafia real dos pinos.
// Este ficheiro guarda também as peças comuns dos módulos de sensor reais (placa recortada com
// furos metalizados, serigrafia desenhada em canvas, passivos SMD numa só malha, SOT-23, LED
// SMD e o módulo LM393 completo), usadas pelos outros modelos de sensores.
import { Cyl, RBox, Chip, HeaderPins, Glow, liveOf, geo, mat, mergedGeo, pcbMat, METAL, THREE } from '../kit.jsx'
import { makeModuleUI } from './_analogModule.jsx'
import def from '@shared/parts/mq2.js'

export const SILK = '#f2f2ee'
export const TIN = '#c9cdd1'
const unit = () => geo('sb:unitBox', () => new THREE.BoxGeometry(1, 1, 1))
const plane = () => geo('plane1', () => new THREE.PlaneGeometry(1, 1))

// ---------- serigrafia / arte da placa ----------
// "pintor" em cm: (x, z) da placa → píxeis do canvas (topo do canvas = −z, esquerda = −x)
// `o` = origem: ponto (x, z) da peça que fica no centro da arte (desenha-se em coordenadas da peça)
function painter(ctx, w, d, k, [ox, oz] = [0, 0]) {
  const X = (x) => (x - ox + w / 2) * k
  const Y = (z) => (z - oz + d / 2) * k
  const style = (o, fill) => {
    ctx.lineWidth = Math.max(1, (o.lw ?? 0.014) * k)
    ctx.strokeStyle = o.stroke ?? SILK
    if (fill) ctx.fillStyle = fill
  }
  return {
    ctx,
    k,
    X,
    Y,
    text(s, x, z, size, o = {}) {
      ctx.save()
      ctx.translate(X(x), Y(z))
      ctx.rotate(o.rot || 0)
      ctx.fillStyle = o.color ?? SILK
      ctx.textAlign = o.align ?? 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `${o.weight ?? 'bold'} ${Math.max(5, size * k)}px ${o.font ?? 'Arial, Helvetica, sans-serif'}`
      ctx.fillText(s, 0, 0)
      ctx.restore()
    },
    rect(x, z, rw, rd, o = {}) {
      style(o, o.fill)
      ctx.beginPath()
      if (o.r) ctx.roundRect(X(x - rw / 2), Y(z - rd / 2), rw * k, rd * k, o.r * k)
      else ctx.rect(X(x - rw / 2), Y(z - rd / 2), rw * k, rd * k)
      if (o.fill) ctx.fill()
      if (o.stroke !== null) ctx.stroke()
    },
    circle(x, z, r, o = {}) {
      style(o, o.fill)
      ctx.beginPath()
      ctx.arc(X(x), Y(z), r * k, 0, Math.PI * 2)
      if (o.fill) ctx.fill()
      if (o.stroke !== null) ctx.stroke()
    },
    line(pts, o = {}) {
      style(o)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      pts.forEach(([x, z], i) => (i ? ctx.lineTo(X(x), Y(z)) : ctx.moveTo(X(x), Y(z))))
      ctx.stroke()
    },
    // anel metalizado de um furo (o furo é recortado na geometria da placa)
    ring(x, z, r0, r1, color = TIN) {
      ctx.lineWidth = (r1 - r0) * k
      ctx.strokeStyle = color
      ctx.beginPath()
      ctx.arc(X(x), Y(z), ((r0 + r1) / 2) * k, 0, Math.PI * 2)
      ctx.stroke()
    },
    // almofada de solda (retangular)
    pad(x, z, pw, pd, color = TIN) {
      ctx.fillStyle = color
      ctx.fillRect(X(x - pw / 2), Y(z - pd / 2), pw * k, pd * k)
    },
  }
}
// material (textura de canvas transparente) partilhado por chave entre todas as peças iguais
export function artMat(key, w, d, draw, ppc = 220, origin) {
  return geo(`art:${key}`, () => {
    const k = Math.min(ppc, 1024 / Math.max(w, d))
    const c = document.createElement('canvas')
    c.width = Math.max(8, Math.round(w * k))
    c.height = Math.max(8, Math.round(d * k))
    draw(painter(c.getContext('2d'), w, d, k, origin))
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
  })
}
// plano deitado com a arte (serigrafia, almofadas, pistas) sobre a face de cima de uma placa
// (`origin`: se dado, desenha-se em coordenadas da peça — o centro da arte é esse ponto (x, z))
export function Art({ id, w, d, pos, draw, ppc, origin }) {
  return <mesh position={pos} rotation={[-Math.PI / 2, 0, 0]} geometry={plane()} scale={[w, d, 1]} material={artMat(id, w, d, draw, ppc, origin)} raycast={() => null} />
}

// ---------- placa de circuito recortada ----------
// contorno de retângulo de cantos boleados (coordenadas da forma: (x, −z))
export function roundRectShape(w, d, r, cx = 0, cz = 0) {
  const s = new THREE.Shape()
  const x0 = cx - w / 2
  const x1 = cx + w / 2
  const y0 = -cz - d / 2
  const y1 = -cz + d / 2
  s.moveTo(x0 + r, y0)
  s.lineTo(x1 - r, y0)
  s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false)
  s.lineTo(x1, y1 - r)
  s.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false)
  s.lineTo(x0 + r, y1)
  s.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(x0, y0 + r)
  s.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false)
  return s
}
// contorno poligonal dado em (x, z) da placa
export function polyShape(pts) {
  const s = new THREE.Shape()
  pts.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)))
  s.closePath()
  return s
}
// geometria da placa (base em y = 0, espessura t) com os furos [x, z, r] recortados
export function pcbGeo(key, { w, d, t = 0.16, r = 0.06, holes = [], outline }) {
  return geo(`spcb:${key}`, () => {
    const s = outline ? outline() : roundRectShape(w, d, r)
    for (const [x, z, hr] of holes) {
      const h = new THREE.Path()
      h.absarc(x, -z, hr, 0, Math.PI * 2, true)
      s.holes.push(h)
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 10 })
    g.rotateX(-Math.PI / 2)
    g.computeVertexNormals()
    return g
  })
}
export function ShapedPcb({ id, pos = [0, 0, 0], color, ...o }) {
  return <mesh position={pos} castShadow receiveShadow geometry={pcbGeo(id, o)} material={pcbMat(color)} />
}

// ---------- componentes SMD ----------
// [comprimento, largura, altura, cor do corpo]: r/c = 0603, R/C = 0805, L = 1206
const SMD = { r: [0.16, 0.08, 0.045, '#141414'], c: [0.16, 0.08, 0.07, '#a98b5d'], R: [0.2, 0.125, 0.05, '#141414'], C: [0.2, 0.125, 0.085, '#ad8f60'], L: [0.32, 0.16, 0.055, '#141414'], T: [0.32, 0.16, 0.12, '#c99a2e'] }
// muitos passivos numa só malha por cor (+ uma para os terminais estanhados)
// items: [[x, z, rotY, tipo]] com a base em y
export function SmdField({ id, items, y }) {
  const cols = [...new Set(items.map((it) => SMD[it[3] || 'r'][3]))]
  const ends = mergedGeo(`smdF:${id}:e`, () =>
    items.flatMap(([x, z, ry = 0, kd = 'r']) => {
      const [l, w, h] = SMD[kd]
      return [-1, 1].map((s) => [unit(), [x + Math.cos(ry) * s * l * 0.425, h / 2, z - Math.sin(ry) * s * l * 0.425], [0, ry, 0], [l * 0.15, h * 1.02, w * 1.02]])
    }),
  )
  return (
    <group position={[0, y, 0]}>
      {cols.map((c) => (
        <mesh
          key={c}
          castShadow
          geometry={mergedGeo(`smdF:${id}:${c}`, () =>
            items.filter((it) => SMD[it[3] || 'r'][3] === c).map(([x, z, ry = 0, kd = 'r']) => {
              const [l, w, h] = SMD[kd]
              return [unit(), [x, h / 2, z], [0, ry, 0], [l * 0.7, h, w]]
            }),
          )}
          material={mat(c, 0, 0.55)}
        />
      ))}
      <mesh geometry={ends} material={mat(METAL.tin, 1, 0.3)} />
    </group>
  )
}
// transístor/regulador SOT-23 (n = 3, 5 ou 6 pernas), comprimento ao longo de x
export function Sot23({ pos, rotY = 0, n = 3 }) {
  const legs = mergedGeo(`sot23:${n}`, () => {
    const out = []
    const rows = n === 3 ? [[-0.095, 0.095], [0]] : n === 5 ? [[-0.095, 0, 0.095], [-0.095, 0.095]] : [[-0.095, 0, 0.095], [-0.095, 0, 0.095]]
    rows.forEach((xs, side) => {
      const s = side ? -1 : 1
      for (const x of xs) {
        out.push([unit(), [x, 0.06, s * 0.095], [0, 0, 0], [0.04, 0.015, 0.05]])
        out.push([unit(), [x, 0.035, s * 0.12], [0, 0, 0], [0.04, 0.05, 0.015]])
        out.push([unit(), [x, 0.008, s * 0.14], [0, 0, 0], [0.04, 0.015, 0.05]])
      }
    })
    return out
  })
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.065, 0]} castShadow geometry={unit()} scale={[0.29, 0.1, 0.16]} material={mat('#171717', 0, 0.45)} />
      <mesh geometry={legs} material={mat(METAL.tin, 1, 0.3)} />
    </group>
  )
}
// LED SMD (0805/0603): corpo leitoso que acende com a cor, terminais estanhados
export function SmdLed({ pos, rotY = 0, color, read, size = [0.2, 0.08, 0.125], halo = 0.7 }) {
  const [l, h, w] = size
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh
        geometry={mergedGeo(`smdLedEnds${l},${h},${w}`, () => [-1, 1].map((s) => [unit(), [s * l * 0.42, h * 0.45, 0], [0, 0, 0], [l * 0.16, h * 0.9, w]]))}
        material={mat(METAL.tin, 1, 0.3)}
      />
      <Glow pos={[0, h / 2, 0]} color={color} read={read} base="#e6e0c8" halo={halo}>
        <boxGeometry args={[l * 0.68, h, w * 0.96]} />
      </Glow>
    </group>
  )
}
// trimpot multivolta 3296 (azul, deitado) com o parafuso de latão e a marcação "103"
export function Trimpot3296({ pos, rotY = 0 }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <RBox size={[0.95, 0.48, 0.48]} r={0.03} pos={[0, 0.24, 0]} color="#2156d6" rough={0.45} />
      {/* parafuso de latão com a fenda */}
      <Cyl r={0.11} h={0.05} pos={[0.31, 0.5, 0]} color={METAL.brass} metal={1} rough={0.3} seg={16} />
      <mesh position={[0.31, 0.527, 0]} geometry={unit()} scale={[0.2, 0.012, 0.035]} material={mat('#3b2c10', 0, 0.8)} />
      <mesh position={[-0.12, 0.481, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={plane()} scale={[0.5, 0.2, 1]} material={artMat('tp3296:103', 0.5, 0.2, (p) => p.text('103', 0, 0, 0.15, { color: '#f4f4f4' }), 400)} />
      {/* patas de solda (visíveis nas pontas) */}
      <mesh geometry={mergedGeo('tp3296legs', () => [-0.254, 0, 0.254].map((x) => [unit(), [x, 0.03, 0.26], [0, 0, 0], [0.05, 0.06, 0.04]]))} material={mat(METAL.tin, 1, 0.3)} />
    </group>
  )
}

/**
 * Módulo comparador LM393 real (Flying Fish / HW-xxx): placa recortada com furos, serigrafia dos
 * pinos e dos LEDs, trimpot 3296, LM393 SOIC-8, LEDs PWR (vermelho) e DO (verde), passivos SMD.
 * Mesmo layout (e o mesmo Overlay2D) do makeModuleUI; o: { ...layout, holes: [[x, z]], smd, art, title }
 */
export function lm393Module({ type, def, board, pot, chip, leds, holes = [], smd = [], art, Extra, potRot = 0, chipRot = 0, ledLabel = [0.3, 0], pinLabelDx = 0.33 }) {
  const ui = makeModuleUI({ type, def, board, pot, chip, leds, Extra })
  const T = 0.16
  const w = board.x[1] - board.x[0]
  const d = board.z[1] - board.z[0]
  const cx = (board.x[0] + board.x[1]) / 2
  const cz = (board.z[0] + board.z[1]) / 2
  const hl = holes.map(([x, z]) => [x - cx, z - cz, 0.16])
  // desenho em coordenadas da peça (origem da arte no centro da placa)
  const draw = (p) => {
    for (const [x, z] of holes) p.ring(x, z, 0.16, 0.27)
    // nomes dos pinos ao lado da barra
    for (const pin of def.pins) p.text(pin.id, pin.pos[0] + pinLabelDx, pin.pos[2], 0.1)
    // LEDs: contorno e nome
    if (ledLabel) {
      p.text('PWR', leds.pwr[0] + ledLabel[0], leds.pwr[1] + ledLabel[1], 0.08)
      p.text('DO', leds.dout[0] + ledLabel[0], leds.dout[1] + ledLabel[1], 0.08)
    }
    p.rect(leds.pwr[0], leds.pwr[1], 0.3, 0.2, { lw: 0.01 })
    p.rect(leds.dout[0], leds.dout[1], 0.3, 0.2, { lw: 0.01 })
    // contorno do chip e marca do pino 1
    p.rect(chip[0], chip[1], 0.62, 0.7, { lw: 0.012 })
    p.circle(chip[0] - 0.22, chip[1] + 0.25, 0.025, { fill: SILK })
    art?.(p)
  }
  function Model({ part }) {
    const L = () => liveOf(part.id) || {}
    return (
      <group>
        <ShapedPcb id={`lm393:${type}`} pos={[cx, 0, cz]} w={w} d={d} t={T} r={0.08} holes={hl} color={board.color || '#1d4ed8'} />
        <Art id={`lm393:${type}`} w={w} d={d} pos={[cx, T + 0.0015, cz]} draw={draw} origin={[cx, cz]} />
        <HeaderPins pins={def.pins} base={0} up={0.45} />
        <Trimpot3296 pos={[pot[0], T, pot[1]]} rotY={potRot} />
        <Chip pos={[chip[0], T, chip[1]]} rotY={chipRot} size={[0.49, 0.15, 0.39]} n={4} label="LM393" />
        <SmdLed pos={[leds.pwr[0], T, leds.pwr[1]]} color="#ff3030" read={() => (L().powered ? 1 : 0)} />
        <SmdLed pos={[leds.dout[0], T, leds.dout[1]]} color="#30ff60" read={() => (L().led ? 1 : 0)} />
        {smd.length > 0 && <SmdField id={`lm393:${type}`} items={smd} y={T} />}
        {Extra && <Extra part={part} />}
      </group>
    )
  }
  return { ...ui, Model }
}

// ---------- o MQ-2 ----------
// rede de aço inox (malha tecida fina) repetida à volta da cápsula
function meshTex() {
  return geo('mq2:meshTex', () => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const x = c.getContext('2d')
    x.fillStyle = '#2a2b2d'
    x.fillRect(0, 0, 64, 64)
    x.strokeStyle = '#d4d7da'
    x.lineWidth = 3
    for (let i = 0; i < 64; i += 8) {
      x.beginPath()
      x.moveTo(i + 4, 0)
      x.lineTo(i + 4, 64)
      x.moveTo(0, i + 4)
      x.lineTo(64, i + 4)
      x.stroke()
    }
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  })
}
const meshSideMat = () =>
  geo('mq2:meshSide', () => {
    const t = meshTex().clone()
    t.repeat.set(26, 6)
    t.needsUpdate = true
    return new THREE.MeshStandardMaterial({ map: t, metalness: 0.75, roughness: 0.42 })
  })
const meshTopMat = () =>
  geo('mq2:meshTop', () => {
    const t = meshTex().clone()
    t.repeat.set(7, 7)
    t.needsUpdate = true
    return new THREE.MeshStandardMaterial({ map: t, metalness: 0.75, roughness: 0.42 })
  })

function Sensor() {
  // Ø 20 mm × 16 mm: base de baquelite, anel de aço cravado, rede dupla e tampo
  const sx = 0.55
  return (
    <group position={[sx, 0.16, 0]}>
      <Cyl r={0.98} h={0.08} pos={[0, 0.04, 0]} color="#1c1a19" rough={0.75} seg={40} />
      <Cyl r={0.95} h={0.3} pos={[0, 0.23, 0]} color="#24201d" rough={0.65} seg={40} />
      {/* anel cravado de aço inox */}
      <mesh position={[0, 0.44, 0]} geometry={geo('mq2:crimp', () => new THREE.LatheGeometry([[0.83, -0.06], [0.93, -0.06], [0.95, -0.02], [0.95, 0.04], [0.9, 0.08], [0.83, 0.08]].map(([r, y]) => new THREE.Vector2(r, y)), 40))} material={mat('#c3c7cb', 1, 0.32)} castShadow />
      {/* rede dupla (lateral e topo) */}
      <mesh position={[0, 1.02, 0]} geometry={geo('mq2:capSide', () => new THREE.CylinderGeometry(0.82, 0.82, 1.08, 40, 1, true))} material={meshSideMat()} castShadow />
      <mesh position={[0, 1.555, 0]} geometry={geo('mq2:capLip', () => new THREE.TorusGeometry(0.8, 0.028, 6, 40).rotateX(Math.PI / 2))} material={mat('#c3c7cb', 1, 0.32)} />
      <mesh position={[0, 1.56, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('mq2:capTop', () => new THREE.CircleGeometry(0.79, 40))} material={meshTopMat()} />
    </group>
  )
}

export default lm393Module({
  type: 'mq2',
  def,
  board: { x: [-1.6, 1.6], z: [-1.1, 1.1], color: '#1d4ed8' },
  pot: [-0.85, 0.75],
  chip: [-0.85, -0.7],
  leds: { pwr: [-0.75, 0.05], dout: [-0.75, -0.2] },
  ledLabel: null, // o real tem os LEDs no verso: aqui não cabe o nome ao lado da cápsula
  smd: [
    [-0.45, -0.85, Math.PI / 2],
    [-0.45, -0.55, Math.PI / 2],
    [-0.5, 0.25, 0],
    [-0.22, 0.9, Math.PI / 2, 'c'],
    [-1.47, 0.75, Math.PI / 2, 'c'],
  ],
  // contorno da cápsula na serigrafia
  art: (p) => p.circle(0.55, 0, 1.02, { lw: 0.016 }),
  Extra: Sensor,
})
