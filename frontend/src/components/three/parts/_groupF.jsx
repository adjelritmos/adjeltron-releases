// Peças de construção dos modelos do grupo F (não é um componente): TO-92 com marcação,
// TO-220 genérico, módulo lógico abstrato com símbolo impresso, textura de canvas viva.
import { Box, RBox, Cyl, Leg, useLabel, PITCH, THREE, useFrame, useMemo, useRef, liveOf } from '../kit.jsx'

// ---------- TO-92: meio cilindro preto, face plana com a marcação virada para +x ----------
const T92 = { y0: 0.36, h: 0.5, r: 0.24 }
export function To92F({ line1, line2, color = '#1b1b1b' }) {
  const label = useLabel([{ text: line1, font: `bold ${line1.length > 6 ? 54 : 64}px Arial`, y: 80 }, { text: line2, font: 'bold 44px Arial', y: 170 }], 256, 256)
  return (
    <group>
      {[PITCH, 0, -PITCH].map((z) => (
        <Leg key={z} from={[0, 0, z]} to={[-0.05, T92.y0 + 0.02, z * 0.55]} r={0.022} />
      ))}
      <mesh position={[0, T92.y0 + T92.h / 2, 0]} castShadow>
        <cylinderGeometry args={[T92.r, T92.r, T92.h, 24, 1, false, Math.PI, Math.PI]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0.001, T92.y0 + T92.h / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2 * T92.r, T92.h]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0.003, T92.y0 + T92.h / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2 * T92.r * 0.92, T92.h * 0.9]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
    </group>
  )
}

// ---------- TO-220 genérico (MOSFET de potência): marcação à frente, aba metálica atrás ----------
export function To220F({ line1, line2, heatsink }) {
  const label = useLabel([{ text: line1, font: `bold ${line1.length > 7 ? 46 : 56}px Arial`, y: 90 }, { text: line2, font: 'bold 38px Arial', y: 170 }], 256, 256)
  return (
    <group>
      {[PITCH, 0, -PITCH].map((z) => (
        <group key={z}>
          <Leg from={[0, 0, z]} to={[0, 0.3, z]} r={0.03} />
          <Box size={[0.05, 0.16, 0.08]} pos={[0, 0.38, z]} color="#cfcfcf" metal={0.85} rough={0.3} />
        </group>
      ))}
      <Box size={[0.45, 0.9, 1.0]} pos={[0, 0.9, 0]} color="#161616" rough={0.55} />
      <mesh position={[0.227, 0.9, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.92, 0.82]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
      <Box size={[0.13, 1.55, 1.0]} pos={[-0.16, 1.225, 0]} color="#c9ccd1" metal={0.9} rough={0.3} />
      <Cyl r={0.18} h={0.15} pos={[-0.16, 1.65, 0]} rot={[0, 0, Math.PI / 2]} color="#1a1a1a" />
      {heatsink && (
        <group position={[-0.32, 1.25, 0]}>
          <Box size={[0.12, 1.9, 1.5]} color="#2a2a2e" metal={0.5} rough={0.5} />
          {[-0.6, -0.3, 0, 0.3, 0.6].map((z) => (
            <Box key={z} size={[0.7, 1.9, 0.07]} pos={[-0.38, 0, z]} color="#2a2a2e" metal={0.5} rough={0.5} />
          ))}
        </group>
      )}
    </group>
  )
}

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
      {def.pins.map((p) => (
        <group key={p.id}>
          <Leg from={p.pos} to={[p.pos[0], y0 + 0.02, p.pos[2]]} r={0.025} />
          <Box size={[0.2, 0.06, 0.2]} pos={[p.pos[0], y0 - 0.03, p.pos[2]]} color="#111" />
        </group>
      ))}
      <RBox size={[W, H - y0, D]} r={0.04} pos={[0, y0 + (H - y0) / 2, z0]} color="#efefec" rough={0.5} />
      <mesh position={[0, H + 0.002, z0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W - 0.02, D - 0.02]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
      <mesh position={[W / 2 - 0.14, H + 0.03, z0 - D / 2 + 0.14]}>
        <cylinderGeometry args={[0.06, 0.06, 0.06, 16]} />
        <meshStandardMaterial ref={led} color="#5a1a1a" emissive="#ff3b30" emissiveIntensity={0} toneMapped={false} />
      </mesh>
    </group>
  )
}
