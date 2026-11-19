// Peças de construção dos modelos do grupo F (não é um componente): TO-92 com marcação,
// TO-220 genérico, módulo lógico abstrato com símbolo impresso, textura de canvas viva.
import { RBox, PITCH, THREE, useFrame, useMemo, useRef, liveOf, geo, mat, mergedGeo, METAL } from '../kit.jsx'
import { Mark, Wires } from './_dip.jsx'
import { To220 } from './_to220.jsx'

// ---------- TO-92: corpo em "D" (círculo de 4,8 mm cortado pela face plana), 4,5 mm de
// altura, arestas boleadas; marcação em 2 linhas na face plana virada para +x; pernas que saem
// do corpo a 1,27 mm e abrem para o passo de 2,54 mm ----------
const T92 = { y0: 0.36, h: 0.5, r: 0.24, c: 0.12 }
const to92Geo = () =>
  geo('to92Body', () => {
    const b = 0.015
    const r = T92.r - b
    const a0 = Math.acos((T92.c - b) / r)
    const s = new THREE.Shape()
    // face plana em u = −b (com o boleado fica em 0), arco para trás (−x)
    s.moveTo(-b, -r * Math.sin(a0))
    s.lineTo(-b, r * Math.sin(a0))
    for (let i = 1; i < 20; i++) {
      const t = a0 + ((2 * Math.PI - 2 * a0) * i) / 20
      s.lineTo(-T92.c + r * Math.cos(t), r * Math.sin(t))
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: T92.h - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 6 })
    g.rotateX(-Math.PI / 2)
    g.translate(0, T92.y0 + b, 0)
    g.computeVertexNormals()
    return g
  })
const P3 = [[0, 0, PITCH], [0, 0, 0], [0, 0, -PITCH]]
// x = posição da face plana; pins = posições dos 3 pinos (por omissão a 0,1" ao longo de z)
export function To92F({ line1, line2, color = '#1b1b1b', x = 0.11, pins = P3 }) {
  const key = `${x}|${pins.map((p) => p.join(',')).join(';')}`
  const lines = [{ text: line1, font: `bold ${line1.length > 6 ? 50 : 60}px Arial`, y: 50 }]
  if (line2) lines.push({ text: line2, font: 'bold 44px Arial', y: 112 })
  return (
    <group>
      <Wires
        id={`to92${key}`}
        r={0.022}
        lines={pins.map((p) => {
          const zb = Math.sign(p[2]) * 0.127
          const xb = x - T92.c
          return [p, [p[0], 0.16, p[2]], [xb, 0.27, zb], [xb, T92.y0 + 0.03, zb]]
        })}
      />
      <group position={[x, 0, 0]}>
        <mesh geometry={to92Geo()} material={mat(color, 0, 0.55)} castShadow receiveShadow />
        <Mark lines={lines} px={[256, 160]} pos={[0.002, T92.y0 + T92.h * 0.56, 0]} rot={[0, Math.PI / 2, 0]} w={0.38} h={0.24} color="#d4d4d4" />
      </group>
    </group>
  )
}

// ---------- TO-220 genérico (MOSFET de potência): o mesmo encapsulamento dos reguladores ----------
export function To220F({ line1, line2, heatsink }) {
  return <To220 text={line1} sub={line2} heatsink={heatsink} />
}

// ---------- borne de 4 mm (painel de instrumentos): base sextavada, capa serrilhada da cor do
// polo, casquilho de latão; a boca do furo fica em `pos` virada para +x ----------
const postGeo = () =>
  geo('bindPost', () => {
    // perfil (raio, comprimento ao longo de +x) da capa serrilhada, com o furo de 4 mm
    const pts = [[0.1, -0.2], [0.27, -0.2], [0.27, -0.06], [0.24, -0.02], [0.2, 0], [0.11, 0], [0.1, -0.02]].map(([r, y]) => new THREE.Vector2(r, y))
    const g = new THREE.LatheGeometry(pts, 18)
    g.rotateZ(-Math.PI / 2)
    g.computeVertexNormals()
    return g
  })
export function BindingPost({ pos, color, panel }) {
  const [x, y, z] = pos
  const xp = panel ?? x - 0.05 // face do painel
  const k = Math.max(0.04, x - xp) / 0.2
  return (
    <group>
      {/* anilha sextavada encostada ao painel */}
      <mesh position={[xp + 0.01, y, z]} rotation={[0, 0, Math.PI / 2]} geometry={geo('bindHex', () => new THREE.CylinderGeometry(0.31, 0.31, 0.02, 6))} material={mat(METAL.nickel, 1, 0.32)} />
      <mesh position={[x, y, z]} scale={[k, 1, 1]} geometry={postGeo()} material={mat(color, 0, 0.42)} castShadow />
      <mesh position={[x - 0.004, y, z]} rotation={[0, 0, Math.PI / 2]} geometry={geo('bindSleeve', () => new THREE.CylinderGeometry(0.1, 0.1, 0.008, 14, 1, true))} material={mat(METAL.brass, 1, 0.3)} />
      <mesh position={[x - 0.006, y, z]} rotation={[0, Math.PI / 2, 0]} geometry={geo('bindBore', () => new THREE.CircleGeometry(0.1, 14))} material={mat('#0a0a0a', 0, 0.9)} />
      <mesh position={[x - 0.004, y, z]} rotation={[0, Math.PI / 2, 0]} geometry={geo('bindPin', () => new THREE.RingGeometry(0.035, 0.06, 12))} material={mat(METAL.brass, 1, 0.3)} />
    </group>
  )
}

// ---------- botão rotativo de instrumento: saia lisa, corpo serrilhado e topo boleado ----------
export const knobGeo = (r = 0.32, h = 0.22) =>
  geo(`instrKnob${r},${h}`, () => {
    const p = [[0.001, h], [r * 0.82, h], [r * 0.93, h - 0.02], [r * 0.95, h - 0.05], [r * 0.95, 0.06], [r * 1.12, 0.05], [r * 1.12, 0], [0.001, 0]]
    const g = new THREE.LatheGeometry(p.map(([a, b]) => new THREE.Vector2(a, b)).reverse(), 48)
    // serrilhado: estrias ao longo do corpo (só nos vértices da parede lateral)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      if (Math.abs(Math.hypot(x, z) - r * 0.95) > 1e-4) continue
      const k = 1 + 0.035 * Math.cos(Math.atan2(z, x) * 24)
      pos.setX(i, x * k)
      pos.setZ(i, z * k)
    }
    g.computeVertexNormals()
    return g
  })

// ---------- textura de canvas redesenhada quando os dados mudam (lidos a cada frame) ----------
export function useLiveCanvas(w, h, draw, read) {
  const canvas = useMemo(() => Object.assign(document.createElement('canvas'), { width: w, height: h }), [w, h])
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  }, [canvas])
  const last = useRef(null)
  const paint = (data) => {
    const k = JSON.stringify(data)
    if (k === last.current) return
    last.current = k
    draw(canvas.getContext('2d'), w, h, data)
    tex.needsUpdate = true
  }
  // primeira pintura imediata (miniaturas 2D renderizadas fora da simulação)
  useMemo(() => paint(read()), []) // eslint-disable-line react-hooks/exhaustive-deps
  const acc = useRef(0)
  useFrame((_, dt) => {
    acc.current += dt
    if (acc.current < 0.1) return
    acc.current = 0
    paint(read())
  })
  return tex
}

// ---------- símbolos lógicos (desenhados num canvas 2D) ----------
const INK = '#111'
function gateBody(ctx, fn, x0, y0, w, h) {
  const neg = ['nand', 'nor', 'xnor', 'not'].includes(fn)
  const bw = neg ? w - h * 0.22 : w
  ctx.beginPath()
  if (fn === 'and' || fn === 'nand') {
    ctx.moveTo(x0, y0)
    ctx.lineTo(x0 + bw - h / 2, y0)
    ctx.arc(x0 + bw - h / 2, y0 + h / 2, h / 2, -Math.PI / 2, Math.PI / 2)
    ctx.lineTo(x0, y0 + h)
    ctx.closePath()
  } else if (fn === 'not') {
    ctx.moveTo(x0, y0)
    ctx.lineTo(x0 + bw, y0 + h / 2)
    ctx.lineTo(x0, y0 + h)
    ctx.closePath()
  } else {
    // OR / NOR / XOR / XNOR
    ctx.moveTo(x0, y0)
    ctx.quadraticCurveTo(x0 + bw * 0.6, y0, x0 + bw, y0 + h / 2)
    ctx.quadraticCurveTo(x0 + bw * 0.6, y0 + h, x0, y0 + h)
    ctx.quadraticCurveTo(x0 + bw * 0.28, y0 + h / 2, x0, y0)
    ctx.closePath()
  }
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.stroke()
  if (fn === 'xor' || fn === 'xnor') {
    ctx.beginPath()
    ctx.moveTo(x0 - h * 0.12, y0)
    ctx.quadraticCurveTo(x0 + bw * 0.28 - h * 0.12, y0 + h / 2, x0 - h * 0.12, y0 + h)
    ctx.stroke()
  }
  if (neg) {
    ctx.beginPath()
    ctx.arc(x0 + bw + h * 0.1, y0 + h / 2, h * 0.1, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.stroke()
  }
  return { outX: x0 + w, outY: y0 + h / 2, inX: (y) => (fn === 'and' || fn === 'nand' || fn === 'not' ? x0 : x0 + (h * 0.28 * (1 - Math.pow((2 * (y - y0)) / h - 1, 2))) * 0.9) }
}

// desenha o módulo: símbolo em cima, rótulos dos pinos em baixo com linhas até ao símbolo.
// `pins` = pinos do catálogo (x em cm), `W` = largura do módulo (cm); a textura cobre o topo.
export function drawModule(ctx, w, h, { kind, fn, pins, W, D, z0, title, live }) {
  const S = w / W
  const X = (x) => (x + W / 2) * S
  const Z = (z) => (z - z0 + D / 2) * S
  ctx.fillStyle = '#f4f4f2'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = '#c8c8c4'
  ctx.lineWidth = 3
  ctx.strokeRect(2, 2, w - 4, h - 4)
  ctx.strokeStyle = INK
  ctx.fillStyle = INK
  ctx.lineWidth = Math.max(2, S * 0.035)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const rowY = Z(0.38)
  const labY = rowY - 0.2 * S
  const ins = pins.filter((p) => p.kind === 'in')
  const outs = pins.filter((p) => p.kind === 'out')
  // área do símbolo
  const top = Z(z0 - D / 2) + 0.14 * S
  const bot = labY - 0.2 * S
  const sh = bot - top
  ctx.font = `bold ${Math.round(0.15 * S)}px Arial`
  const lab = (p) => (p.id === 'QN' ? 'Q̄' : p.id === 'IN-' ? '−' : p.id === 'IN+' ? '+' : p.id === 'CLK' ? 'CLK' : p.id)
  for (const p of pins) {
    const on = live?.[p.id]
    ctx.fillStyle = on ? '#c62828' : INK
    ctx.fillText(lab(p), X(p.pos[0]), labY)
  }
  ctx.fillStyle = INK
  if (kind === 'gate' || kind === 'opamp') {
    const gw = Math.min(W * 0.5, 1.0) * S
    const gh = Math.min(sh, gw * 0.85)
    const gx = (w - gw) / 2
    const gy = top + (sh - gh) / 2
    let body
    if (kind === 'opamp') {
      ctx.beginPath()
      ctx.moveTo(gx, gy)
      ctx.lineTo(gx + gw, gy + gh / 2)
      ctx.lineTo(gx, gy + gh)
      ctx.closePath()
      ctx.fillStyle = '#fff'
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = INK
      ctx.font = `bold ${Math.round(gh * 0.28)}px Arial`
      ctx.fillText('−', gx + gh * 0.2, gy + gh * 0.28)
      ctx.fillText('+', gx + gh * 0.2, gy + gh * 0.72)
      body = { outX: gx + gw, outY: gy + gh / 2, inX: () => gx }
    } else body = gateBody(ctx, fn, gx, gy, gw, gh)
    // fios: entradas distribuídas no lado esquerdo do símbolo, saída à direita
    ctx.lineWidth = Math.max(2, S * 0.025)
    ins.forEach((p, i) => {
      const yy = kind === 'opamp' ? gy + gh * (p.id === 'IN-' ? 0.28 : 0.72) : gy + (gh * (i + 1)) / (ins.length + 1)
      const xi = body.inX(yy)
      ctx.beginPath()
      ctx.moveTo(X(p.pos[0]), labY - 0.12 * S)
      ctx.lineTo(X(p.pos[0]), yy)
      ctx.lineTo(xi, yy)
      ctx.stroke()
    })
    outs.forEach((p) => {
      ctx.beginPath()
      ctx.moveTo(body.outX, body.outY)
      ctx.lineTo(X(p.pos[0]), body.outY)
      ctx.lineTo(X(p.pos[0]), labY - 0.12 * S)
      ctx.stroke()
    })
  } else {
    // flip-flop: caixa com o nome e as entradas/saídas
    const bx = X(pins[0].pos[0]) + 0.05 * S
    const bx2 = X(pins.at(-1).pos[0]) - 0.05 * S
    ctx.fillStyle = '#fff'
    ctx.fillRect(bx, top, bx2 - bx, sh)
    ctx.strokeRect(bx, top, bx2 - bx, sh)
    ctx.fillStyle = INK
    ctx.font = `bold ${Math.round(0.22 * S)}px Arial`
    ctx.fillText(title, (bx + bx2) / 2, top + sh * 0.42)
    // triângulo do relógio na base da caixa, por cima do CLK
    const clk = pins.find((p) => p.id === 'CLK')
    if (clk) {
      const cx = X(clk.pos[0])
      ctx.beginPath()
      ctx.moveTo(cx - 0.08 * S, top + sh)
      ctx.lineTo(cx, top + sh - 0.12 * S)
      ctx.lineTo(cx + 0.08 * S, top + sh)
      ctx.stroke()
    }
    ctx.lineWidth = Math.max(2, S * 0.025)
    for (const p of pins) {
      ctx.beginPath()
      ctx.moveTo(X(p.pos[0]), top + sh)
      ctx.lineTo(X(p.pos[0]), labY - 0.12 * S)
      ctx.stroke()
    }
  }
}

const hdrBlk = () => geo('gull', () => new THREE.BoxGeometry(1, 1, 1))

// módulo lógico: corpo branco, pernas em fila à frente, símbolo impresso por cima e um LED
// vermelho que acende com a saída a HIGH
export function LogicModule({ part, def, kind, fn, title }) {
  const [W, H, D] = def.size
  const z0 = (def.view2d.z[0] + def.view2d.z[1]) / 2
  const y0 = 0.25
  const tex = useLiveCanvas(
    Math.round(W * 220),
    Math.round(D * 220),
    (ctx, w, h, live) => drawModule(ctx, w, h, { kind, fn, pins: def.pins, W, D, z0, title, live }),
    () => {
      const l = liveOf(part.id)
      if (!l) return null
      const o = {}
      if (l.ins) Object.assign(o, l.ins)
      const outs = def.pins.filter((p) => p.kind === 'out')
      outs.forEach((p, k) => (o[p.id] = (l.outs ?? 0) & (1 << k) ? 1 : 0))
      return o
    },
  )
  const led = useRef()
  useFrame(() => {
    const l = liveOf(part.id)
    const on = l ? (kind === 'opamp' ? (l.out?.[0] ?? 0) > 2.5 : (l.outs ?? 0) & 1) : 0
    if (led.current) {
      led.current.emissiveIntensity = on ? 3 : 0
      led.current.color.set(on ? '#ff3b30' : '#5a1a1a')
    }
  })
  return (
    <group>
      {/* barra de pinos macho por baixo: espaçador de plástico preto e pinos dourados quadrados */}
      <mesh geometry={mergedGeo(`lmHdrB${def.type}`, () => def.pins.map((p) => [hdrBlk(), [p.pos[0], y0 - 0.05, p.pos[2]], [0, 0, 0], [0.254, 0.1, 0.25]]))} material={mat('#151515', 0, 0.5)} castShadow />
      <mesh geometry={mergedGeo(`lmHdrP${def.type}`, () => def.pins.map((p) => [hdrBlk(), [p.pos[0], (p.pos[1] + y0 + 0.02) / 2, p.pos[2]], [0, 0, 0], [0.064, y0 + 0.02 - p.pos[1], 0.064]]))} material={mat(METAL.gold, 1, 0.25)} />
      <RBox size={[W, H - y0, D]} r={0.04} pos={[0, y0 + (H - y0) / 2, z0]} color="#efefec" rough={0.5} />
      <mesh position={[0, H + 0.002, z0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W - 0.02, D - 0.02]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
      {/* LED SMD 0805 vermelho: almofadas estanhadas e lente difusa */}
      <mesh position={[W / 2 - 0.14, H + 0.008, z0 - D / 2 + 0.14]} geometry={mergedGeo('lmLedPads', () => [-1, 1].map((k) => [hdrBlk(), [k * 0.07, 0, 0], [0, 0, 0], [0.05, 0.016, 0.12]]))} material={mat(METAL.tin, 1, 0.3)} />
      <mesh position={[W / 2 - 0.14, H + 0.03, z0 - D / 2 + 0.14]} geometry={geo('lmLed', () => new THREE.BoxGeometry(0.12, 0.05, 0.1))}>
        <meshStandardMaterial ref={led} color="#5a1a1a" emissive="#ff3b30" emissiveIntensity={0} roughness={0.25} toneMapped={false} />
      </mesh>
    </group>
  )
}
