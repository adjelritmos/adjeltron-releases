// Peças de placa partilhadas pelas placas de microcontrolador e pelos módulos de interface
// (não é um componente). Tudo em cm, com geometrias em cache e o mínimo de malhas:
//  - PcbPlate: PCB recortada (cantos boleados ou contorno qualquer) com os furos a sério
//  - PlatedHoles: anéis metalizados, soldas e pontas de pino de muitos furos numa só malha
//  - Smds: resistências/condensadores/díodos SMD agrupados por cor (3–4 malhas no total)
//  - Sot23, Sot223, SmdCrystal, Inductor: encapsulamentos comuns
//  - DipIc: CI DIP com o molde em dois planos, entalhe, ponto do pino 1 e pernas com ombro
//  - ScrewTerminal: borne de parafuso de 5 mm (KF301 / DG301) com bocas, grampos e parafusos
//  - PinField: pinos dourados soltos (só os pinos, com ponta piramidal), numa só malha
//  - MarkText: marcação gravada a laser no topo dos chips
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { geo, mat, mergedGeo, pcbMat, silkMat, METAL, PITCH, THREE } from '../kit.jsx'

const unit = () => geo('gull', () => new THREE.BoxGeometry(1, 1, 1))
const plane = () => geo('plane1', () => new THREE.PlaneGeometry(1, 1))
const rbox = (w, h, d, r) => geo(`bk-rb${w},${h},${d},${r}`, () => roundedBox(w, h, d, r))

// caixa de arestas boleadas (corpos moldados de chips e conectores)
function roundedBox(w, h, d, r) {
  return new RoundedBoxGeometry(w, h, d, 2, Math.max(0.001, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4)))
}

// ---------- PCB ----------
// contorno: retângulo w × d com cantos de raio r, ou `outline` ([[x, z], …]); holes: [[x, z, raio]]
export function pcbGeo(key, { w, d, t = 0.16, r = 0.05, holes = [], outline }) {
  return geo(`bk-pcb:${key}`, () => {
    const bv = Math.min(0.01, t * 0.08)
    const s = new THREE.Shape()
    if (outline) {
      outline.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)))
    } else {
      const x0 = -w / 2 + bv
      const x1 = w / 2 - bv
      const y0 = -d / 2 + bv
      const y1 = d / 2 - bv
      const rr = Math.max(0.002, r - bv)
      s.moveTo(x0 + rr, y0)
      s.lineTo(x1 - rr, y0)
      s.absarc(x1 - rr, y0 + rr, rr, -Math.PI / 2, 0)
      s.lineTo(x1, y1 - rr)
      s.absarc(x1 - rr, y1 - rr, rr, 0, Math.PI / 2)
      s.lineTo(x0 + rr, y1)
      s.absarc(x0 + rr, y1 - rr, rr, Math.PI / 2, Math.PI)
      s.lineTo(x0, y0 + rr)
      s.absarc(x0 + rr, y0 + rr, rr, Math.PI, Math.PI * 1.5)
    }
    for (const [x, z, hr] of holes) {
      const h = new THREE.Path()
      h.absarc(x, -z, hr + bv, 0, Math.PI * 2, true)
      s.holes.push(h)
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: t - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: 1, curveSegments: 10 })
    g.rotateX(-Math.PI / 2)
    g.translate(0, bv, 0)
    g.computeVertexNormals()
    return g
  })
}
// PCB com a face de baixo em y; furos de montagem com anel metalizado (opcional: `rings`)
export function PcbPlate({ id, w, d, t = 0.16, y = 0, r = 0.05, holes = [], outline, color = '#1d4ed8', rings = true, ringColor = METAL.tin }) {
  const g = pcbGeo(id, { w, d, t, r, holes, outline })
  const ring = rings && holes.length > 0
    ? mergedGeo(`bk-pcbRing:${id}`, () =>
        holes.flatMap(([x, z, hr]) => {
          const rg = geo(`bk-ring${hr}`, () => new THREE.RingGeometry(hr, hr * 1.75, 20).rotateX(-Math.PI / 2))
          return [[rg, [x, t + 0.002, z]], [rg, [x, -0.002, z], [Math.PI, 0, 0]]]
        }),
      )
    : null
  return (
    <group position={[0, y, 0]}>
      <mesh castShadow receiveShadow geometry={g} material={pcbMat(color)} />
      {ring && <mesh geometry={ring} material={mat(ringColor, 1, 0.3)} />}
    </group>
  )
}

// ---------- furos metalizados (pinos soldados) ----------
// pts: [[x, z]]; y = face de cima da placa. solder: monte de solda com a ponta do pino a sair
// (pinos soldados por baixo, como no Nano/ESP32); senão só o anel e o furo escuro.
// dark = false: só o anel (o furo é real, recortado na PcbPlate).
export function PlatedHoles({ id, pts, y, r = 0.085, hole = 0.045, color = METAL.gold, solder = true, square = 0, dark = true }) {
  const ring = mergedGeo(`bk-ph:${id}`, () => {
    const rg = geo(`bk-phr${r},${hole}`, () => new THREE.RingGeometry(hole, r, 16).rotateX(-Math.PI / 2))
    const sq = geo(`bk-phs${r},${hole}`, () => {
      // pino 1: almofada quadrada
      const s = new THREE.Shape()
      s.moveTo(-r, -r)
      s.lineTo(r, -r)
      s.lineTo(r, r)
      s.lineTo(-r, r)
      const h = new THREE.Path()
      h.absarc(0, 0, hole, 0, Math.PI * 2, true)
      s.holes.push(h)
      return new THREE.ShapeGeometry(s, 8).rotateX(-Math.PI / 2)
    })
    return pts.map(([x, z], i) => [i < square ? sq : rg, [x, y + 0.002, z]])
  })
  const blob = !solder && !dark
    ? null
    : solder
    ? mergedGeo(`bk-phb:${id}`, () => {
        const cone = geo(`bk-phc${r}`, () => new THREE.CylinderGeometry(0.036, r * 0.8, 0.045, 10, 1))
        const tip = geo('bk-phTip', () => new THREE.CylinderGeometry(0.03, 0.034, 0.05, 6))
        return pts.flatMap(([x, z]) => [[cone, [x, y + 0.0225, z]], [tip, [x, y + 0.07, z]]])
      })
    : mergedGeo(`bk-phd:${id}`, () => {
        const disc = geo(`bk-phd${hole}`, () => new THREE.CircleGeometry(hole, 12).rotateX(-Math.PI / 2))
        return pts.map(([x, z]) => [disc, [x, y + 0.0015, z]])
      })
  return (
    <group>
      <mesh geometry={ring} material={mat(color, 1, 0.28)} />
      {blob && <mesh geometry={blob} material={solder ? mat(METAL.tin, 1, 0.22) : mat('#070707', 0, 0.9)} castShadow={solder} />}
    </group>
  )
}

// ---------- passivos SMD agrupados ----------
// items: [[x, z, rot, tipo]] (rot: 0 = ao longo de x, 1 = ao longo de z, ou ângulo em rad)
//   'r' resistência 0603 (preta com marcação), 'R' 0805, 'c' condensador 0603 (castanho claro),
//   'C' 0805, 'K' 1206 grande, 'd' díodo SOD-123 (preto com faixa), 't' tântalo (amarelo),
//   'l' LED 0603 apagado (corpo branco leitoso), 'f' polifusível 1206 (verde),
//   'n' rede de 4 resistências 1206 (preta)
const SMD = {
  r: { l: 0.16, w: 0.08, h: 0.045, c: '#141414' },
  R: { l: 0.2, w: 0.125, h: 0.05, c: '#141414' },
  c: { l: 0.16, w: 0.08, h: 0.07, c: '#a8875a' },
  C: { l: 0.2, w: 0.125, h: 0.1, c: '#9c7b4f' },
  K: { l: 0.32, w: 0.16, h: 0.11, c: '#93734a' },
  d: { l: 0.36, w: 0.16, h: 0.11, c: '#1b1b1b', band: '#9a9a9a' },
  t: { l: 0.35, w: 0.28, h: 0.16, c: '#d8a021', band: '#6b4a12' },
  l: { l: 0.16, w: 0.08, h: 0.05, c: '#ece8dc' },
  f: { l: 0.32, w: 0.16, h: 0.08, c: '#2f7d3a' },
  n: { l: 0.32, w: 0.16, h: 0.05, c: '#151515' },
}
const rotOf = (r) => (r === 1 ? Math.PI / 2 : r || 0)
export function Smds({ id, y, items }) {
  const byColor = {}
  for (const it of items) {
    const k = SMD[it[3] || 'r']
    ;(byColor[k.c] ||= []).push(it)
  }
  const ends = mergedGeo(`bk-smdE:${id}`, () =>
    items.flatMap(([x, z, r, t = 'r']) => {
      const k = SMD[t]
      if (t === 'd' || t === 't') {
        // díodo/tântalo: terminais dobrados por baixo do corpo (só se veem as pontas)
        return [-1, 1].map((s) => {
          const [px, pz] = rotPt(x, z, r, s * (k.l / 2 + 0.01), 0)
          return [unit(), [px, y + 0.015, pz], [0, rotOf(r), 0], [0.05, 0.03, k.w * 0.6]]
        })
      }
      return [-1, 1].map((s) => {
        const [px, pz] = rotPt(x, z, r, s * k.l * 0.42, 0)
        return [unit(), [px, y + k.h / 2, pz], [0, rotOf(r), 0], [k.l * 0.16, k.h * 1.02, k.w * 1.02]]
      })
    }),
  )
  const bands = items.filter((it) => SMD[it[3]]?.band)
  const bandGeo = bands.length
    ? mergedGeo(`bk-smdBand:${id}`, () =>
        bands.map(([x, z, r, t]) => {
          const k = SMD[t]
          const [px, pz] = rotPt(x, z, r, -k.l * 0.3, 0)
          return [unit(), [px, y + k.h + 0.002, pz], [0, rotOf(r), 0], [k.l * 0.14, 0.004, k.w * 0.9]]
        }),
      )
    : null
  return (
    <group>
      {Object.entries(byColor).map(([c, list]) => (
        <mesh
          key={c}
          castShadow
          geometry={mergedGeo(`bk-smdB:${id}:${c}`, () =>
            list.map(([x, z, r, t = 'r']) => {
              const k = SMD[t]
              const lb = t === 'd' || t === 't' ? k.l : k.l * 0.7
              return [unit(), [x, y + k.h / 2, z], [0, rotOf(r), 0], [lb, k.h, k.w]]
            }),
          )}
          material={mat(c, 0, 0.5)}
        />
      ))}
      <mesh geometry={ends} material={mat(METAL.tin, 1, 0.3)} />
      {bandGeo && <mesh geometry={bandGeo} material={mat('#8f8f8f', 0, 0.5)} />}
    </group>
  )
}
// ponto (dx, dz) no referencial de um passivo rodado `r`, centrado em (x, z)
function rotPt(x, z, r, dx, dz) {
  const a = rotOf(r)
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [x + dx * c + dz * s, z - dx * s + dz * c]
}

// ---------- marcação gravada a laser no topo de um chip ----------
export function MarkText({ lines, pos, w, d, rotY = 0, color = '#a9a9a9', px = [256, 128] }) {
  return <mesh position={pos} rotation={[-Math.PI / 2, 0, rotY]} geometry={plane()} scale={[w, d, 1]} material={silkMat(lines, px[0], px[1], color)} />
}

// ---------- SOT-23 (transístores, reguladores pequenos, díodos duplos) ----------
export function Sot23({ pos, rotY = 0, n = 3, label }) {
  const legs = mergedGeo(`bk-sot23-${n}`, () => {
    const out = []
    const top = n === 3 ? [0] : n === 5 ? [-0.095, 0, 0.095] : [-0.095, 0.095]
    const bot = n === 3 ? [-0.095, 0.095] : [-0.095, 0.095]
    for (const x of top) out.push([unit(), [x, 0.03, -0.11], [0, 0, 0], [0.04, 0.02, 0.09]])
    for (const x of bot) out.push([unit(), [x, 0.03, 0.11], [0, 0, 0], [0.04, 0.02, 0.09]])
    if (n === 5) out.push([unit(), [0, 0.03, 0.11], [0, 0, 0], [0.04, 0.02, 0.09]])
    return out
  })
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.065, 0]} castShadow geometry={rbox(0.29, 0.1, 0.16, 0.01)} material={mat('#171717', 0, 0.45)} />
      <mesh geometry={legs} material={mat(METAL.tin, 1, 0.3)} />
      {label && <MarkText lines={[{ text: label, font: 'bold 70px Arial' }]} px={[256, 96]} pos={[0, 0.117, 0]} w={0.22} d={0.08} />}
    </group>
  )
}
// ---------- SOT-223 (regulador AMS1117 / LM1117): 3 pernas de um lado, patilha larga do outro ----------
export function Sot223({ pos, rotY = 0, label = 'AMS1117', sub = '3.3' }) {
  const legs = mergedGeo('bk-sot223', () => [
    ...[-0.23, 0, 0.23].map((x) => [unit(), [x, 0.03, 0.27], [0, 0, 0], [0.075, 0.025, 0.2]]),
    [unit(), [0, 0.03, -0.27], [0, 0, 0], [0.3, 0.025, 0.2]],
  ])
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.09, 0]} castShadow geometry={rbox(0.65, 0.16, 0.35, 0.012)} material={mat('#171717', 0, 0.45)} />
      <mesh geometry={legs} material={mat(METAL.tin, 1, 0.3)} />
      <MarkText lines={[{ text: label, font: 'bold 54px Arial', y: 44 }, { text: sub, font: 'bold 46px Arial', y: 98 }]} px={[256, 128]} pos={[0, 0.172, 0]} w={0.55} d={0.27} />
    </group>
  )
}
// cristal SMD 3225/5032 (tampa metálica sobre base cerâmica)
export function SmdCrystal({ pos, rotY = 0, l = 0.32, w = 0.25, label }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.02, 0]} geometry={rbox(l, 0.04, w, 0.01)} material={mat('#d9cfb8', 0, 0.6)} />
      <mesh position={[0, 0.055, 0]} castShadow geometry={rbox(l * 0.92, 0.035, w * 0.88, 0.02)} material={mat(METAL.nickel, 1, 0.28)} />
      {label && <MarkText lines={[{ text: label, font: 'bold 60px Arial' }]} px={[256, 96]} pos={[0, 0.0735, 0]} w={l * 0.8} d={w * 0.45} color="#6a6d72" />}
    </group>
  )
}
// bobina SMD blindada (CD54 / 4×4 mm): corpo de ferrite cinzento-escuro com o valor impresso
export function Inductor({ pos, size = 0.4, h = 0.2, label = '4R7' }) {
  return (
    <group position={pos}>
      <mesh position={[0, h / 2, 0]} castShadow geometry={rbox(size, h, size, size * 0.18)} material={mat('#2b2b2d', 0.2, 0.55)} />
      <MarkText lines={[{ text: label, font: 'bold 80px Arial' }]} px={[256, 128]} pos={[0, h + 0.002, 0]} w={size * 0.7} d={size * 0.35} color="#bdbdbd" />
    </group>
  )
}

// ---------- CI DIP (passo 2,54 mm, filas a 7,62 mm) ----------
// Molde em dois planos (linha de partição a meio, com o topo ligeiramente mais estreito), entalhe
// semicircular e ponto do pino 1 à esquerda (−x), marcas dos extratores e pernas com ombro largo
// que descem até `legY` (por omissão até à posição de cada pino, ex.: na breadboard).
// pins: [{ pos }] (do catálogo) ou n (gera as posições padrão centradas, para CIs numa PCB).
export function DipIc({ pins, n, len, w = 0.65, y0 = 0.12, h = 0.33, rows = 0.381, legY, lines, ink = '#bcbcbc', color = '#191919' }) {
  const pts = pins ? pins.map((p) => p.pos) : Array.from({ length: n }, (_, k) => {
    const half = n / 2
    const bottom = k < half
    const i = bottom ? k : n - 1 - k
    return [(i - (half - 1) / 2) * PITCH, legY ?? 0, bottom ? rows : -rows]
  })
  const L = len ?? (pts.length / 2) * PITCH - 0.03
  const key = `${L},${w},${y0},${h},${pts.map((p) => `${+p[0].toFixed(3)},${+p[1].toFixed(3)},${+p[2].toFixed(3)}`).join(';')}`
  const legs = mergedGeo(`bk-dipLeg:${key}`, () => {
    const out = []
    const ys = y0 + h * 0.42 // saída das pernas (linha de partição)
    for (const [x, py, z] of pts) {
      const s = Math.sign(z) || 1
      const az = Math.abs(z)
      // troço horizontal que sai do corpo até à linha dos furos
      out.push([unit(), [x, ys, s * (w / 2 + (az - w / 2) / 2 + 0.006)], [0, 0, 0], [0.05, 0.026, az - w / 2 + 0.024]])
      // ombro largo (1,5 mm) e perna fina (0,5 mm) até ao pino
      const yb = Math.max(py, ys - 0.13)
      out.push([unit(), [x, (ys + yb) / 2, s * az], [0, 0, 0], [0.13, ys - yb + 0.013, 0.026]])
      if (yb > py) out.push([unit(), [x, (yb + py) / 2, s * az], [0, 0, 0], [0.048, yb - py, 0.026]])
    }
    return out
  })
  const top = y0 + h
  const lo = h * 0.42
  return (
    <group>
      <mesh geometry={legs} material={mat(METAL.tin, 1, 0.3)} castShadow />
      {/* metade de baixo e metade de cima do molde (a de cima com a saída de molde) */}
      <mesh position={[0, y0 + lo / 2, 0]} castShadow geometry={rbox(L, lo, w, 0.02)} material={mat(color, 0, 0.62)} />
      <mesh position={[0, y0 + lo + (h - lo) / 2, 0]} castShadow geometry={rbox(L - 0.03, h - lo, w - 0.04, 0.025)} material={mat(color, 0, 0.62)} />
      {/* entalhe semicircular na ponta do pino 1 e ponto do pino 1 */}
      <mesh position={[-L / 2 + 0.015, top + 0.0015, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('bk-dipNotch', () => new THREE.CircleGeometry(0.075, 16, -Math.PI / 2, Math.PI))} material={mat('#050505', 0, 0.9)} />
      <mesh position={[-L / 2 + 0.16, top + 0.0015, w / 2 - 0.15]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('bk-dipDot', () => new THREE.CircleGeometry(0.045, 14))} material={mat('#0b0b0b', 0, 0.35)} />
      {/* marcas redondas dos extratores do molde (mate) */}
      {L > 1.5 && <mesh position={[L / 2 - 0.2, top + 0.0012, -w / 2 + 0.17]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('bk-dipEj', () => new THREE.CircleGeometry(0.06, 14))} material={mat('#232323', 0, 0.85)} />}
      {lines && <MarkText lines={lines} px={[512, 160]} pos={[0.05, top + 0.002, -0.01]} w={Math.min(L * 0.8, 1.5)} d={Math.min(L * 0.8, 1.5) * 0.31} color={ink} />}
    </group>
  )
}

// ---------- borne de parafuso de 5 mm (KF301 / DG301) ----------
// n vias ao longo de x local, bocas dos fios viradas para −z local (roda-se com rotY).
// pos = centro da base (assente na placa).
export function ScrewTerminal({ n = 2, pitch = 0.5, pos, rotY = 0, color = '#1f7fd1', h = 1.0, d = 0.75, screwY }) {
  const len = n * pitch
  const sy = screwY ?? h - 0.03
  const key = `${n},${pitch},${h},${d},${sy}`
  const xs = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * pitch)
  // corpo: bloco de baixo + bloco de cima recuado (perfil em degrau das peças reais) + nervuras
  const body = mergedGeo(`bk-stB:${key}`, () => {
    const out = [
      [unit(), [0, h * 0.33, 0], [0, 0, 0], [len - 0.01, h * 0.66, d]],
      [unit(), [0, h * 0.83, 0.06], [0, 0, 0], [len - 0.01, h * 0.34, d - 0.12]],
    ]
    // divisórias entre vias (as abas de plástico que se veem por cima)
    for (let i = 0; i <= n; i++) out.push([unit(), [(i - n / 2) * pitch, h * 0.83 + 0.005, 0.06], [0, 0, 0], [0.04, h * 0.34 + 0.01, d - 0.1]])
    return out
  })
  const dark = mergedGeo(`bk-stD:${key}`, () =>
    xs.flatMap((x) => [
      // boca quadrada do fio e poço do parafuso
      [unit(), [x, h * 0.33, -d / 2 - 0.001], [0, 0, 0], [pitch * 0.62, h * 0.34, 0.004]],
      [geo('bk-stWell', () => new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2)), [x, h + 0.001, 0.06], [0, 0, 0], [pitch * 0.36, 1, pitch * 0.36]],
    ]),
  )
  const metal = mergedGeo(`bk-stM:${key}`, () =>
    xs.flatMap((x) => [
      // grampo (gaiola) visto pela boca e cabeça do parafuso
      [unit(), [x, h * 0.24, -d / 2 + 0.01], [0, 0, 0], [pitch * 0.55, 0.05, 0.02]],
      [unit(), [x, h * 0.46, -d / 2 + 0.01], [0, 0, 0], [pitch * 0.55, 0.04, 0.02]],
      [geo('bk-stScrew', () => new THREE.CylinderGeometry(1, 1, 1, 16)), [x, sy - 0.02, 0.06], [0, 0, 0], [pitch * 0.3, 0.06, pitch * 0.3]],
    ]),
  )
  const slots = mergedGeo(`bk-stS:${key}`, () => xs.map((x) => [unit(), [x, sy + 0.012, 0.06], [0, Math.PI / 4, 0], [pitch * 0.5, 0.012, 0.035]]))
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh castShadow receiveShadow geometry={body} material={mat(color, 0, 0.5)} />
      <mesh geometry={dark} material={mat('#060606', 0, 0.9)} />
      <mesh geometry={metal} material={mat('#c8ccd1', 1, 0.3)} castShadow />
      <mesh geometry={slots} material={mat('#3a3d40', 0.5, 0.6)} />
    </group>
  )
}

// ---------- pinos soltos (só o metal): de y0 até à ponta em `pts[i].y` ----------
// pts: [[x, yTopo, z]]; a ponta piramidal acaba exatamente em yTopo.
export function PinField({ id, pts, y0, color = METAL.gold }) {
  const g = mergedGeo(`bk-pins:${id}`, () => {
    const shaft = geo('bk-pinShaft', () => new THREE.BoxGeometry(0.064, 1, 0.064))
    const tip = geo('bk-pinTip', () => new THREE.CylinderGeometry(0.006, 0.045, 0.05, 4, 1).rotateY(Math.PI / 4))
    return pts.flatMap(([x, yt, z]) => {
      const L = yt - 0.05 - y0
      return [[shaft, [x, y0 + L / 2, z], [0, 0, 0], [1, L, 1]], [tip, [x, yt - 0.025, z]]]
    })
  })
  return <mesh geometry={g} material={mat(color, 1, 0.25)} castShadow />
}

// blocos de plástico de barras de pinos (um por pino, numa só malha); pts: [[x, z]]
export function PinBlocks({ id, pts, y, h = 0.25, color = '#111' }) {
  const g = mergedGeo(`bk-pblk:${id}`, () => {
    const b = geo(`bk-pblk${h}`, () => roundedBox(0.25, h, 0.25, 0.03))
    return pts.map(([x, z]) => [b, [x, y + h / 2, z]])
  })
  return <mesh geometry={g} material={mat(color, 0, 0.5)} castShadow receiveShadow />
}

// ---------- plano de textura parcial ----------
// faixa [z0, z1] de um plano deitado W × D cuja textura cobre o plano inteiro (ex.: as duas
// metades do topo de uma breadboard separadas pelo canal central)
export function texStripGeo(key, W, D, z0, z1) {
  return geo(`bk-strip:${key}`, () => {
    const h = z1 - z0
    const zc = (z0 + z1) / 2
    const g = new THREE.PlaneGeometry(W, h)
    const pos = g.attributes.position
    const uv = g.attributes.uv
    for (let i = 0; i < pos.count; i++) uv.setY(i, 1 - (zc - pos.getY(i) + D / 2) / D)
    uv.needsUpdate = true
    g.rotateX(-Math.PI / 2)
    g.translate(0, 0, zc)
    return g
  })
}
