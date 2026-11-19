// Peças comuns dos módulos de sensor (grupo B): placa com contorno e furos reais, trimpot,
// chip, LEDs e passivos SMD, serigrafia e a fábrica de interfaces dos módulos analógicos com
// comparador LM393 (AO + DO). Também usado pelos breakouts I2C (GY-xxx) e por outros módulos.
import { THREE, geo, mergedGeo, mat, pcbMat, METAL, SilkText, HeaderPins, GlowLed, liveOf, Chip as KitChip, Smd as KitSmd } from '../kit.jsx'

const unit = () => geo('gull', () => new THREE.BoxGeometry(1, 1, 1))

// ---------- placa de circuito impresso ----------
// contorno retangular de cantos boleados (raio r) com furos de montagem que atravessam a placa
// (parede e anel metalizados por cima e por baixo). holes: [[x, z, raio?], ...] relativos ao centro.
function boardGeo(w, d, t, r, holes) {
  return geo(`modBoard${w},${d},${t},${r},${JSON.stringify(holes)}`, () => {
    const s = new THREE.Shape()
    const x0 = -w / 2
    const z0 = -d / 2
    const rr = Math.max(0.001, Math.min(r, w / 2 - 0.001, d / 2 - 0.001))
    s.moveTo(x0 + rr, z0)
    s.lineTo(x0 + w - rr, z0)
    s.quadraticCurveTo(x0 + w, z0, x0 + w, z0 + rr)
    s.lineTo(x0 + w, z0 + d - rr)
    s.quadraticCurveTo(x0 + w, z0 + d, x0 + w - rr, z0 + d)
    s.lineTo(x0 + rr, z0 + d)
    s.quadraticCurveTo(x0, z0 + d, x0, z0 + d - rr)
    s.lineTo(x0, z0 + rr)
    s.quadraticCurveTo(x0, z0, x0 + rr, z0)
    for (const [hx, hz, hr = 0.16] of holes) {
      const p = new THREE.Path()
      p.absarc(hx, hz, hr, 0, Math.PI * 2, true)
      s.holes.push(p)
    }
    // forma no plano xy → rodada para xz (y da forma = +z), espessura para baixo, topo em y = t
    return new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 6 }).rotateX(Math.PI / 2).translate(0, t, 0)
  })
}
// anéis metalizados e parede dos furos (uma só malha)
function platingGeo(t, holes) {
  return mergedGeo(`modPlating${t},${JSON.stringify(holes)}`, () =>
    holes.flatMap(([x, z, r = 0.16]) => {
      const ring = geo(`modRing${r}`, () => new THREE.RingGeometry(r, r + 0.07, 18).rotateX(-Math.PI / 2))
      const ringDn = geo(`modRingDn${r}`, () => new THREE.RingGeometry(r, r + 0.07, 18).rotateX(Math.PI / 2))
      const wall = geo(`modWall${r},${t}`, () => new THREE.CylinderGeometry(r, r, t, 18, 1, true))
      return [
        [ring, [x, t + 0.001, z]],
        [ringDn, [x, -0.001, z]],
        [wall, [x, t / 2, z]],
      ]
    }),
  )
}
export function Board({ x, z, t = 0.16, color = '#1d4ed8', r = 0.08, holes = [], plating = METAL.tin }) {
  const cx = (x[0] + x[1]) / 2
  const cz = (z[0] + z[1]) / 2
  const rel = holes.map(([hx, hz, hr]) => (hr ? [hx - cx, hz - cz, hr] : [hx - cx, hz - cz]))
  return (
    <group position={[cx, 0, cz]}>
      <mesh castShadow receiveShadow geometry={boardGeo(x[1] - x[0], z[1] - z[0], t, r, rel)} material={pcbMat(color)} />
      {rel.length > 0 && <mesh geometry={platingGeo(t, rel)} material={mat(plating, 1, 0.3)} />}
    </group>
  )
}

// ---------- serigrafia ----------
// texto branco deitado na placa; a letra ajusta-se ao retângulo w × d
export function Silk({ text, pos, w, d, rotY = 0, color = '#f2f2f2', bold = true }) {
  const ph = Math.max(16, Math.min(128, Math.round(256 * (d / w))))
  const size = Math.max(10, Math.min(Math.round(ph * 0.8), Math.floor((256 / Math.max(1, text.length)) * 1.65)))
  return <SilkText text={text} pos={pos} w={w} d={d} rotY={rotY} color={color} font={`${bold ? 'bold ' : ''}${size}px Arial`} px={[256, ph]} />
}
// rótulos dos pinos de uma fila (ao lado de cada pino, deslocados de off = [dx, dz])
export function PinLabels({ pins, names, y, off = [0.28, 0], w = 0.3, d = 0.13, rotY = 0 }) {
  return (
    <group>
      {pins.map((p, i) => (
        <Silk key={p.id} text={names?.[i] ?? p.id} pos={[p.pos[0] + off[0], y + 0.002, p.pos[2] + off[1]]} w={w} d={d} rotY={rotY} />
      ))}
    </group>
  )
}

// ---------- trimpot ----------
// 3296W multivolta (azul, 9,5 × 4,8 mm, parafuso de latão com fenda numa ponta) ou, com
// kind="square", o 3362P de uma volta (quadrado de 6,6 mm, rotor branco com fenda em cruz).
export const Trimpot = ({ pos, rot = 0, kind = '3296' }) =>
  kind === 'square' ? (
    <group position={pos} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.2, 0]} castShadow geometry={geo('tp3362', () => new THREE.CylinderGeometry(0.33, 0.33, 0.4, 4, 1).rotateY(Math.PI / 4))} material={mat('#1f5fe0', 0, 0.45)} />
      <mesh position={[0, 0.41, 0]} geometry={geo('tp3362rot', () => new THREE.CylinderGeometry(0.2, 0.21, 0.06, 20))} material={mat('#efefea', 0, 0.45)} />
      <mesh position={[0, 0.445, 0]} geometry={mergedGeo('tp3362x', () => [[unit(), [0, 0, 0], [0, 0, 0], [0.3, 0.02, 0.05]], [unit(), [0, 0, 0], [0, 0, 0], [0.05, 0.02, 0.3]]])} material={mat('#8f8f8a', 0, 0.7)} />
      <mesh geometry={mergedGeo('tp3362legs', () => [-0.2, 0, 0.2].map((x, i) => [unit(), [x, 0.02, i === 1 ? -0.3 : 0.3], [0, 0, 0], [0.06, 0.04, 0.06]]))} material={mat(METAL.tin, 1, 0.3)} />
    </group>
  ) : (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* corpo com o degrau do encaixe e a face de cima ligeiramente mais estreita */}
      <mesh position={[0, 0.2, 0]} castShadow geometry={geo('tp3296a', () => new THREE.BoxGeometry(0.95, 0.4, 0.48))} material={mat('#1f5fe0', 0, 0.45)} />
      <mesh position={[0, 0.44, 0]} castShadow geometry={geo('tp3296b', () => new THREE.BoxGeometry(0.91, 0.08, 0.44))} material={mat('#1f5fe0', 0, 0.45)} />
      <mesh position={[-0.05, 0.481, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('plane1', () => new THREE.PlaneGeometry(1, 1))} scale={[0.5, 0.2, 1]} material={silkLike('103')} />
      {/* parafuso de latão com fenda e cabeça serrilhada */}
      <mesh position={[0.33, 0.5, 0]} geometry={geo('tp3296s', () => new THREE.CylinderGeometry(0.1, 0.1, 0.07, 12))} material={mat(METAL.brass, 1, 0.3)} />
      <mesh position={[0.33, 0.536, 0]} geometry={unit()} scale={[0.17, 0.012, 0.035]} material={mat('#5a4a20', 0.5, 0.6)} />
      {/* pernas (3) por baixo do corpo */}
      <mesh geometry={mergedGeo('tp3296legs', () => [-0.254, 0, 0.254].map((x) => [unit(), [x, 0.015, 0], [0, 0, 0], [0.05, 0.03, 0.05]]))} material={mat(METAL.tin, 1, 0.3)} />
    </group>
  )
// marcação gravada no corpo do trimpot (cinzento claro)
function silkLike(text) {
  return geo(`tpMark${text}`, () => {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 48
    const x = c.getContext('2d')
    x.fillStyle = '#e8eefc'
    x.font = 'bold 36px Arial'
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    x.fillText(text, 64, 26)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
  })
}

// circuito integrado SOIC-8 (LM393 e afins): epóxi preto, pernas em asa de gaivota e marcação
export const Chip = ({ pos, size = [0.49, 0.15, 0.39], label, rotY = 0 }) => <KitChip pos={pos} size={size} pkg="soic" n={4} rotY={rotY} label={label} labelColor="#9a9a9a" />

// resistência (r) ou condensador (c) SMD 0603/0805 ao longo de x (rotY roda-a)
export const Passive = ({ pos, kind = 'r', rotY = 0, big = false }) => (
  <KitSmd pos={pos} rotY={rotY} len={big ? 0.2 : 0.16} wid={big ? 0.125 : 0.08} h={big ? 0.06 : 0.045} color={kind === 'c' ? '#b39064' : '#1c1c1c'} />
)
// regulador / transístor SOT-23 (3 pernas) e SOT-23-5 (5 pernas)
export function Sot23({ pos, rotY = 0, n = 3 }) {
  const legs = mergedGeo(`sot23legs${n}`, () => {
    const xs = n === 5 ? [[-0.095, -1], [0, -1], [0.095, -1], [-0.095, 1], [0.095, 1]] : [[-0.095, 1], [0.095, 1], [0, -1]]
    return xs.flatMap(([x, s]) => [
      [unit(), [x, 0.035, s * 0.09], [0, 0, 0], [0.04, 0.015, 0.05]],
      [unit(), [x, 0.012, s * 0.12], [0, 0, 0], [0.04, 0.015, 0.05]],
    ])
  })
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.05, 0]} castShadow geometry={geo('sot23b', () => new THREE.BoxGeometry(0.29, 0.08, 0.16))} material={mat('#171717', 0, 0.45)} />
      <mesh geometry={legs} material={mat(METAL.tin, 1, 0.3)} />
    </group>
  )
}

// LED SMD 0805 (terminais estanhados + lente que brilha, lida a cada frame)
export const SmdLed = ({ pos, color, read }) => (
  <group>
    <mesh position={[pos[0], pos[1] + 0.03, pos[2]]} geometry={mergedGeo('smdLedEnds', () => [-1, 1].map((s) => [unit(), [s * 0.085, 0, 0], [0, 0, 0], [0.04, 0.06, 0.125]]))} material={mat(METAL.tin, 1, 0.3)} />
    <GlowLed pos={[pos[0], pos[1] + 0.04, pos[2]]} size={[0.14, 0.08, 0.12]} color={color} read={read} halo={0.6} />
  </group>
)

// LED / fototransístor de 5 mm deitado, a apontar para +x (perfil de revolução: base com
// rebordo de 5,8 mm, corpo de 5 mm e cúpula). pos = centro da base; len = comprimento total.
const LED5 = (len) =>
  geo(`led5lathe${len}`, () => {
    const pts = [[0, 0], [0.29, 0], [0.29, 0.1], [0.25, 0.1], [0.25, Math.max(0.12, len - 0.25)]]
    for (let i = 1; i <= 8; i++) {
      const a = (i / 8) * (Math.PI / 2)
      pts.push([0.25 * Math.cos(a), Math.max(0.12, len - 0.25) + 0.25 * Math.sin(a)])
    }
    return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(Math.max(x, 0.0001), y)), 20).rotateZ(-Math.PI / 2)
  })
export function Led5mm({ pos, len = 0.87, color = '#0b0b0b', clear = false }) {
  return <mesh position={pos} castShadow geometry={LED5(len)} material={clear ? mat(color, 0, 0.08, { transparent: true, opacity: 0.78 }) : mat(color, 0, 0.18)} />
}

// microfone de eletreto: cápsula de alumínio com rebordo cravado e feltro preto no topo
export function ElectretMic({ pos, r, h }) {
  return (
    <group position={pos}>
      <mesh position={[0, h / 2, 0]} castShadow geometry={geo(`mic${r},${h}`, () => new THREE.CylinderGeometry(r, r, h, 28))} material={mat('#c9ccd0', 1, 0.32)} />
      <mesh position={[0, h - 0.01, 0]} geometry={geo(`micLip${r}`, () => new THREE.TorusGeometry(r - 0.025, 0.028, 6, 28).rotateX(Math.PI / 2))} material={mat('#b9bcc0', 1, 0.3)} />
      <mesh position={[0, h + 0.003, 0]} geometry={geo(`micFelt${r}`, () => new THREE.CircleGeometry(r - 0.055, 28).rotateX(-Math.PI / 2))} material={mat('#121212', 0, 0.98)} />
      {/* ponto de cola da tela (centro) */}
      <mesh position={[0, h + 0.005, 0]} geometry={geo('micDot', () => new THREE.CircleGeometry(0.04, 12).rotateX(-Math.PI / 2))} material={mat('#262626', 0, 0.9)} />
    </group>
  )
}

/**
 * Interface (3D + 2D) de um módulo com comparador. layout (cm, referencial local):
 *   board: { x: [x0, x1], z: [z0, z1], color, r? }, pot: [x, z], chip: [x, z],
 *   leds: { pwr: [x, z], dout: [x, z] }, Extra: componente do sensor propriamente dito
 * opcionais (aspeto): potRot, potKind ('3296' | 'square'), holes: [[x, z, r?]],
 *   passives: [[x, z, 'r' | 'c', rotY?]], silk: [{ text, pos: [x, z], w, d, rotY? }],
 *   pinLabels: [nomes] (serigrafia ao lado dos pinos), chipLabel
 */
export function makeModuleUI({ type, def, board, pot, chip, leds, Extra, potRot = 0, potKind, holes = [], passives = [], silk = [], pinLabels, chipLabel = 'LM393' }) {
  const T = 0.16
  function Model({ part }) {
    const L = () => liveOf(part.id) || {}
    return (
      <group>
        <Board x={board.x} z={board.z} t={T} color={board.color || '#1d4ed8'} r={board.r ?? 0.08} holes={holes} />
        <HeaderPins pins={def.pins} base={0} up={0.45} />
        <Trimpot pos={[pot[0], T, pot[1]]} rot={potRot} kind={potKind} />
        <Chip pos={[chip[0], T, chip[1]]} label={chipLabel} />
        <SmdLed pos={[leds.pwr[0], T, leds.pwr[1]]} color="#ff3030" read={() => (L().powered ? 1 : 0)} />
        <SmdLed pos={[leds.dout[0], T, leds.dout[1]]} color="#30ff60" read={() => (L().led ? 1 : 0)} />
        {passives.map(([x, z, k, ry = 0], i) => (
          <Passive key={i} pos={[x, T, z]} kind={k} rotY={ry} />
        ))}
        {silk.map((s, i) => (
          <Silk key={i} text={s.text} pos={[s.pos[0], T + 0.002, s.pos[1]]} w={s.w} d={s.d} rotY={s.rotY || 0} />
        ))}
        {pinLabels && <PinLabels pins={def.pins} names={pinLabels} y={T} />}
        {Extra && <Extra part={part} />}
      </group>
    )
  }
  function Overlay2D({ info, live }) {
    if (!live?.powered) return null
    const dot = ([x, z], c, k) => {
      const [px, py] = info.project([x, 0, z])
      return <circle key={k} cx={px} cy={py} r={5} fill={c} opacity={0.85} filter="url(#glow)" />
    }
    return (
      <g pointerEvents="none">
        {dot(leds.pwr, '#ff3030', 'p')}
        {live.led && dot(leds.dout, '#30ff60', 'd')}
      </g>
    )
  }
  return { type, Model, Overlay2D }
}

/**
 * Breakout I2C pequeno (GY-xxx): placa com furos metalizados, regulador SOT-23 opcional,
 * passivos, LED de alimentação e barra de pinos. O sensor vem em `children`.
 */
export function Breakout({ part, def, board, holes = [], plating = METAL.gold, led, reg, passives = [], silk = [], pinLabels, labelOff = -0.3, T = 0.12, children }) {
  return (
    <group>
      <Board x={board.x} z={board.z} t={T} color={board.color} r={board.r ?? 0.06} holes={holes} plating={plating} />
      {reg && <Sot23 pos={[reg[0], T, reg[1]]} rotY={reg[2] || 0} />}
      {passives.map(([x, z, k, ry = 0], i) => (
        <Passive key={i} pos={[x, T, z]} kind={k} rotY={ry} />
      ))}
      {led && <SmdLed pos={[led[0], T, led[1]]} color="#ff3030" read={() => (liveOf(part.id)?.powered ? 1 : 0)} />}
      {silk.map((s, i) => (
        <Silk key={i} text={s.text} pos={[s.pos[0], T + 0.002, s.pos[1]]} w={s.w} d={s.d} rotY={s.rotY || 0} />
      ))}
      {/* nomes dos pinos rodados 90° (como nas placas reais), do lado de dentro da fila */}
      {pinLabels && <PinLabels pins={def.pins} names={pinLabels} y={T} off={[0, labelOff]} w={0.3} d={0.12} rotY={Math.PI / 2} />}
      {children}
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

/**
 * Grelha de caixas de sensores (DHT11/DHT22): fundo escuro (a cavidade) e treliça saliente
 * da cor do corpo, numa só malha. Face virada para +x em x = fx.
 * cols: centros em z das aberturas, rows: centros em y, cw × ch: tamanho de cada abertura.
 */
export function Grille({ fx, cols, rows, cw, ch, depth = 0.03, color, cavity = '#1b1d20', id }) {
  const z0 = Math.min(...cols) - cw / 2
  const z1 = Math.max(...cols) + cw / 2
  const y0 = Math.min(...rows) - ch / 2
  const y1 = Math.max(...rows) + ch / 2
  const cs = [...cols].sort((a, b) => a - b)
  const rs = [...rows].sort((a, b) => a - b)
  const lattice = mergedGeo(`grille${id}${depth}`, () => {
    const out = []
    const zc = (z0 + z1) / 2
    const yc = (y0 + y1) / 2
    const bz = cs.length > 1 ? cs[1] - cs[0] - cw : 0.06
    const by = rs.length > 1 ? rs[1] - rs[0] - ch : 0.06
    // barras verticais (entre colunas e nas bordas) e horizontais (entre filas e nas bordas)
    const zs = [z0 - bz / 2, ...cs.slice(1).map((z, i) => (z + cs[i]) / 2), z1 + bz / 2]
    const ys = [y0 - by / 2, ...rs.slice(1).map((y, i) => (y + rs[i]) / 2), y1 + by / 2]
    for (const z of zs) out.push([unit(), [depth / 2, yc, z], [0, 0, 0], [depth, y1 - y0 + 2 * by, bz]])
    for (const y of ys) out.push([unit(), [depth / 2, y, zc], [0, 0, 0], [depth, by, z1 - z0 + 2 * bz]])
    return out
  })
  return (
    <group position={[fx, 0, 0]}>
      <mesh position={[0.002, (y0 + y1) / 2, (z0 + z1) / 2]} rotation={[0, Math.PI / 2, 0]} geometry={geo('plane1', () => new THREE.PlaneGeometry(1, 1))} scale={[z1 - z0, y1 - y0, 1]} material={mat(cavity, 0, 0.9)} />
      <mesh castShadow geometry={lattice} material={mat(color, 0, 0.6)} />
    </group>
  )
}
