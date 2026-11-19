// LEDs WS2812B do grupo G: LED de 5 mm (cúpula difusa, 4 pernas), módulo de 1 LED e
// matrizes 8×8 / 16×16 (textura com um quadrado 5050 por LED). Cores em live.c (0xRRGGBB).
import { PixelHalo, pixelLevel, Box, Leg, Pcb, HeaderPins, SilkText, geo, useFrame, useRef, THREE, liveOf } from '../kit.jsx'
import { Ws2812, SmdParts, MountHoles, drawWs2812 } from './_gDisplays.jsx'
import { useLiveTexture, FacePlane } from './_groupA.jsx'
import { neopixelLed as ledDef, neopixelModule as modDef } from '@shared/parts/neopixelSingle.js'
import { neopixelMatrix8 as m8Def, neopixelMatrix16 as m16Def, MATRIX_GEOM, matrixXY } from '@shared/parts/neopixelMatrix.js'

const css = (c) => `#${(c >>> 0).toString(16).padStart(6, '0')}`
// cor mostrada: um LED a PWM baixo ainda parece aceso (normaliza até 1/4 do máximo)
function shown(c) {
  const r = (c >> 16) & 255
  const g = (c >> 8) & 255
  const b = c & 255
  const m = Math.max(r, g, b)
  if (!m) return null
  const k = 255 / Math.max(m, 64)
  return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`
}

// material emissivo que segue a cor do LED i
function useLedMat(id, i, offColor) {
  const mat = useRef()
  const col = useRef(new THREE.Color())
  useFrame(() => {
    const c = liveOf(id)?.c?.[i] ?? 0
    if (!mat.current) return
    const v = pixelLevel(c, col.current)
    mat.current.emissive.copy(col.current)
    mat.current.emissiveIntensity = v ? 0.6 + 1.6 * v : 0
    mat.current.color.set(v ? '#ffffff' : offColor)
  })
  return mat
}

function GlowLight({ id, pos, i = null }) {
  const l = useRef()
  useFrame(() => {
    const cs = liveOf(id)?.c || []
    const list = i == null ? cs : [cs[i] ?? 0]
    let r = 0
    let g = 0
    let b = 0
    for (const c of list) {
      r += (c >> 16) & 255
      g += (c >> 8) & 255
      b += c & 255
    }
    const n = Math.max(1, list.length) * 255
    if (l.current) {
      l.current.color.setRGB(r / n, g / n, b / n)
      l.current.intensity = Math.min(6, ((r + g + b) / n) * (i == null ? 10 : 3))
    }
  })
  return <pointLight ref={l} position={pos} intensity={0} distance={i == null ? 14 : 4} />
}

// ---------- LED de 5 mm ----------
// PL9823-F5: corpo de resina difusa (rebordo Ø 5,8 mm com o lado plano, cilindro Ø 5 mm e cúpula),
// o CI e a armação vistos lá dentro e as 4 pernas
const ledLathe = () =>
  geo('pl9823Body', () => {
    const pts = [[0, 0], [0.29, 0], [0.29, 0.1], [0.25, 0.1], [0.25, 0.58]] // rebordo, cilindro
    for (let k = 1; k <= 8; k++) {
      const a = (k / 8) * (Math.PI / 2)
      pts.push([0.25 * Math.cos(a), 0.58 + 0.25 * Math.sin(a)])
    }
    return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(Math.max(x, 0.0001), y)), 28)
  })
function LedModel({ part }) {
  const mat = useLedMat(part.id, 0, '#eeeeea')
  return (
    <group>
      {ledDef.pins.map((p, k) => (
        <Leg key={p.id} from={p.pos} to={[(k - 1.5) * 0.1, 0.25, 0]} r={0.022} />
      ))}
      {/* armação e CI dentro da resina */}
      <Box size={[0.24, 0.05, 0.04]} pos={[0, 0.42, 0]} color="#b9a15a" metal={0.8} rough={0.35} />
      <Box size={[0.08, 0.03, 0.08]} pos={[0, 0.46, 0]} color="#1a1a1a" />
      <mesh position={[0, 0.15, 0]} geometry={ledLathe()}>
        <meshStandardMaterial ref={mat} color="#eeeeea" transparent opacity={0.88} roughness={0.42} toneMapped={false} />
      </mesh>
      <GlowLight id={part.id} i={0} pos={[0, 1.1, 0]} />
      <PixelHalo id={part.id} i={0} pos={[0, 0.7, 0]} size={2} />
    </group>
  )
}

// ---------- módulo de 1 LED ----------
// placa preta de 16 × 12 mm: WS2812B 5050, condensador de 100 nF, entrada GND/VCC/DIN e saída
function ModuleModel({ part }) {
  return (
    <group>
      <Pcb size={[1.6, 0.16, 1.2]} color="#151515" holes={false} />
      <Ws2812 id={part.id} i={0} pos={[0, 0.16, 0]} halo={1.4} />
      <SmdParts list={[[0.1, 0.42, 0, 'c']]} y={0.16} />
      <SilkText text="DIN" pos={[-0.4, 0.162, 0.48]} w={0.22} d={0.08} font="bold 40px Arial" px={[96, 36]} />
      <SilkText text="DOUT" pos={[0.4, 0.162, -0.48]} w={0.26} d={0.08} font="bold 40px Arial" px={[112, 36]} />
      <HeaderPins pins={modDef.pins} base={0} up={0.45} />
      <GlowLight id={part.id} i={0} pos={[0, 0.9, 0]} />
    </group>
  )
}

// ---------- matrizes ----------
function ledXZ(type, i, layout) {
  const g = MATRIX_GEOM[type]
  const [x, y] = matrixXY(i, g.n, layout)
  return [(x - (g.n - 1) / 2) * g.pitch, (y - (g.n - 1) / 2) * g.pitch]
}

function makeMatrix(def) {
  const type = def.type
  const g = MATRIX_GEOM[type]
  const N = g.n
  const half = g.board / 2
  const PX = N === 8 ? 48 : 32 // pixels de textura por LED
  // placa com os WS2812B 5050 (moldura branca, janela, armação e chips) e o condensador de 100 nF
  // de cada um (todos iguais: não depende da ordem da cadeia)
  let ART = null
  const boardArt = (w) => {
    if (ART?.width === w) return ART
    ART = Object.assign(document.createElement('canvas'), { width: w, height: w })
    const x = ART.getContext('2d')
    x.fillStyle = N === 8 ? '#111' : '#0b0b0b'
    x.fillRect(0, 0, w, w)
    const cell = w / N
    const sq = cell * (N === 8 ? 0.62 : 0.5)
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        const cx = c * cell + cell / 2
        const cy = r * cell + cell / 2
        drawWs2812(x, sq, cx, cy)
        x.fillStyle = '#b38b5d'
        x.fillRect(cx + sq / 2 + cell * 0.06, cy - cell * 0.05, cell * 0.08, cell * 0.1)
      }
    return ART
  }
  const draw = (layout) => (ctx, w, h, L) => {
    const cell = w / N
    const cs = L?.c || []
    const sq = cell * (N === 8 ? 0.62 : 0.5)
    // a placa com os LEDs apagados desenha-se uma vez (os acesos vão por cima)
    ctx.drawImage(boardArt(w), 0, 0)
    for (let i = 0; i < N * N; i++) {
      const [x, y] = matrixXY(i, N, layout)
      const cx = x * cell + cell / 2
      const cy = y * cell + cell / 2
      const col = shown(cs[i] ?? 0)
      if (col) {
        ctx.shadowColor = col
        ctx.shadowBlur = cell * 0.45
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.arc(cx, cy, sq * 0.42, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }
  }
  function Model({ part }) {
    const layout = part.config?.layout || g.layout
    const tex = useLiveTexture(part.id, N * PX, N * PX, draw(layout), { key: (L) => (L?.c ? L.c.join(',') : '') + layout })
    const area = N * g.pitch
    return (
      <group>
        <Pcb size={[g.board, N === 8 ? 0.16 : 0.08, g.board + 0.9]} pos={[0, 0, 0.45]} color={N === 8 ? '#141414' : '#0d0d0d'} holes={false} />
        {N === 8 && <MountHoles pts={[[-half + 0.3, half + 0.6], [half - 0.3, half + 0.6]]} y={0.16} r={0.15} ring={0.24} />}
        <FacePlane tex={tex} w={area} d={area} pos={[0, (N === 8 ? 0.16 : 0.08) + 0.012, 0]} />
        {/* seta de dados (DIN → DOUT) e barra de pinos */}
        <Box size={[g.board - 0.6, 0.02, 0.06]} pos={[0, N === 8 ? 0.17 : 0.09, half + 0.12]} color="#6b6b6b" />
        <HeaderPins pins={def.pins} base={0} up={0.45} />
        {N === 16 &&
          def.pins.map((p, k) => <Leg key={p.id} from={[p.pos[0], 0.3, p.pos[2]]} to={[p.pos[0], 0.1, half - 0.1]} r={0.03} color={['#1a1a1a', '#e53935', '#43a047', '#f5f5f5'][k]} />)}
        <GlowLight id={part.id} pos={[0, 2.5, 0]} />
      </group>
    )
  }
  function Overlay2D({ part, info, live }) {
    if (!live?.c?.some((c) => c)) return null
    const layout = part.config?.layout || g.layout
    const r = g.pitch * 40 * 0.42
    return (
      <g pointerEvents="none" filter="url(#glow)">
        {live.c.map((c, i) => {
          const col = shown(c)
          if (!col) return null
          const [x, z] = ledXZ(type, i, layout)
          const [px, py] = info.project([x, 0, z])
          return <circle key={i} cx={px} cy={py} r={r} fill={col} opacity={0.9} />
        })}
      </g>
    )
  }
  return { type, Model, Overlay2D }
}

const single = (type, pos) => ({
  type,
  Model: type === 'neopixelLed' ? LedModel : ModuleModel,
  Overlay2D({ info, live }) {
    const col = shown(live?.c?.[0] ?? 0)
    if (!col) return null
    const [x, y] = info.project(pos)
    return <circle cx={x} cy={y} r={type === 'neopixelLed' ? 9 : 8} fill={col} opacity={0.9} filter="url(#glow)" pointerEvents="none" />
  },
})

export default [single('neopixelLed', [0, 0, 0]), single('neopixelModule', [0, 0, 0]), makeMatrix(m8Def), makeMatrix(m16Def)]
export { css }
