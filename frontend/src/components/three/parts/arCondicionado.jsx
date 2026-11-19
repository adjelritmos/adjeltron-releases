// Ar condicionado (unidade interior "split" de parede, como as de 9000 BTU): corpo de ABS com o
// perfil real (costas planas na placa de fixação, topo plano com a grelha de aspiração em
// rasgos finos, frente lisa e brilhante, canto de baixo boleado), boca de saída em baixo com as
// lâminas verticais e a alheta motorizada de perfil curvo, visor fumado com a temperatura da
// sala, LEDs de funcionamento/temporizador e o jato de ar frio (partículas azuis) quando
// ligado. Referencial: x ao longo da parede, y para fora da parede, z para cima.
import { Box, RBox, Cyl, Halo, SilkText, geo, mat, mergedGeo, liveOf, useFrame, useMemo, useRef, THREE } from '../kit.jsx'
import { AC } from '@shared/parts/arCondicionado.js'
import { Bornes, extrudeXGeo, roundShape } from './_casaKit.jsx'

const N_AIR = 18

function useDisplay() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 64
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return { c, t, last: null }
  }, [])
}

function Model({ part }) {
  const c = part.config || {}
  const body = c.cor || '#f4f5f2'
  const { L, H, D } = AC
  const flap = useRef()
  const air = useRef()
  const led = useRef()
  const dispMat = useRef()
  const disp = useDisplay()
  const seeds = useMemo(() => Array.from({ length: N_AIR }, (_, i) => ({ x: ((i * 37) % 17) / 16 - 0.5, o: (i * 0.618) % 1, s: 0.8 + ((i * 13) % 7) / 14 })), [])
  const state = useRef({ t: 0 })
  useFrame((_, dt) => {
    const Lv = liveOf(part.id)
    const on = !!Lv?.on
    const f = Lv?.flap ?? 0
    // alheta: fechada rente à face de baixo; abre até ~65° para fora e para baixo
    if (flap.current) flap.current.rotation.x = f * 1.15
    if (led.current) led.current.emissiveIntensity = on ? 2.2 : 0
    // visor: temperatura da sala (redesenhado só quando muda)
    const txt = on ? `${(Lv?.temp ?? 0).toFixed(0)}°` : ''
    if (txt !== disp.last) {
      disp.last = txt
      const g = disp.c.getContext('2d')
      g.fillStyle = '#0b1418'
      g.fillRect(0, 0, 128, 64)
      if (txt) {
        g.fillStyle = '#5fe3ff'
        g.font = 'bold 46px "Courier New", monospace'
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        g.fillText(txt, 64, 34)
      }
      disp.t.needsUpdate = true
    }
    if (dispMat.current) dispMat.current.color.setScalar(on ? 1 : 0.25)
    // jato de ar frio: partículas a sair da boca, para fora e para baixo
    const a = air.current
    if (!a) return
    a.visible = on && f > 0.3
    if (!a.visible) return
    state.current.t += Math.min(dt, 0.1)
    const t = state.current.t
    a.children.forEach((m, i) => {
      const sd = seeds[i]
      const u = (t * 0.55 * sd.s + sd.o) % 1
      m.position.set(sd.x * (L - 1.2), D - 0.4 + u * 4.6, -H / 2 - 0.15 - u * u * 3.4)
      const k = 0.4 + u * 1.3
      m.scale.set(k, k, k)
      m.material.opacity = 0.55 * (1 - u) * Math.min(1, f * 1.5)
    })
  })
  const airMats = useMemo(() => Array.from({ length: N_AIR }, () => new THREE.MeshBasicMaterial({ color: '#9fdcff', transparent: true, opacity: 0, depthWrite: false })), [])
  const puff = geo('acPuff', () => new THREE.SphereGeometry(0.18, 10, 8))
  // perfil do corpo (forma: x = z para cima, y = para fora da parede), extrudido ao longo de x
  const shell = extrudeXGeo(
    `acShell${L},${H},${D}`,
    () => roundShape([[H / 2, 0.02, 0.12], [H / 2, D, 0.42], [-H / 2 + 0.55, D, 0.3], [-H / 2, D - 0.3, 0.3], [-H / 2, 0.02, 0.12]]),
    L - 0.02,
    0,
    10,
  )
  // grelha de aspiração no topo: rasgos finos ao longo de y
  const intake = mergedGeo(`acIntake${L},${H},${D}`, () => {
    const b = geo('acUnit', () => new THREE.BoxGeometry(1, 1, 1))
    const out = []
    const n = Math.floor((L - 1.0) / 0.13)
    for (let i = 0; i < n; i++) out.push([b, [-L / 2 + 0.5 + (i + 0.5) * ((L - 1.0) / n), 0.3 + (D - 0.85) / 2, H / 2 + 0.002], [0, 0, 0], [0.06, D - 0.85, 0.008]])
    return out
  })
  // lâminas verticais (direção do ar para os lados) dentro da boca de saída
  const vanes = mergedGeo(`acVanes${L},${H},${D}`, () => {
    const b = geo('acUnit', () => new THREE.BoxGeometry(1, 1, 1))
    const out = []
    const n = 22
    for (let i = 0; i < n; i++) out.push([b, [-L / 2 + 0.6 + (i + 0.5) * ((L - 1.2) / n), 1.05, -H / 2 - 0.035], [0, 0, 0.25], [0.03, 1.3, 0.06]])
    return out
  })
  const flapGeo = extrudeXGeo(
    `acFlap${L}`,
    () => roundShape([[-0.01, 0.0], [-0.09, -0.2], [-0.12, -0.45], [-0.08, -0.75], [-0.02, -0.74], [-0.05, -0.45], [-0.03, -0.22], [0.02, -0.02]], 0.03),
    L - 0.9,
  )
  return (
    <group>
      {/* placa de fixação (chapa) e corpo */}
      <Box size={[L - 0.4, 0.06, H - 0.3]} pos={[0, 0.03, 0]} color="#c9ccc8" metal={0.4} rough={0.5} />
      <mesh geometry={shell} material={mat(body, 0, 0.32)} castShadow receiveShadow />
      {/* painel frontal liso e brilhante, ligeiramente saliente, com a junta à volta */}
      <RBox size={[L - 0.3, 0.07, H - 1.0]} r={0.03} pos={[0, D + 0.03, 0.12]} color={body} rough={0.12} />
      <Box size={[L - 0.26, 0.02, H - 0.96]} pos={[0, D + 0.005, 0.12]} color="#bfc2be" rough={0.6} />
      <SilkText text="INVERTER" pos={[0, D + 0.068, -0.45]} w={1.3} d={0.2} rotY={Math.PI} color="#9aa0a4" font="bold 44px Arial" px={[320, 64]} />
      {/* grelha de aspiração em cima (por baixo, o filtro escuro) */}
      <Box size={[L - 0.9, D - 0.8, 0.01]} pos={[0, 0.3 + (D - 0.85) / 2, H / 2 - 0.002]} color="#5b6164" rough={0.8} />
      <mesh geometry={intake} material={mat('#2b2f33', 0, 0.85)} />
      {/* boca de saída em baixo (escura) com as lâminas verticais */}
      <Box size={[L - 0.8, D - 0.6, 0.06]} pos={[0, 0.3 + (D - 0.6) / 2, -H / 2 - 0.005]} color="#22272b" rough={0.8} />
      <mesh geometry={vanes} material={mat('#3a4045', 0, 0.6)} />
      {/* alheta articulada no bordo da frente da boca (perfil curvo) */}
      <group ref={flap} position={[0, D - 0.15, -H / 2 + 0.02]}>
        <mesh geometry={flapGeo} material={mat(body, 0, 0.3)} castShadow />
      </group>
      {/* visor fumado da temperatura e LEDs (funcionamento, temporizador, sleep) */}
      <RBox size={[1.4, 0.03, 0.75]} r={0.012} pos={[L / 2 - 1.15, D + 0.06, -0.15]} color="#0c1215" rough={0.1} />
      <mesh position={[L / 2 - 1.3, D + 0.077, -0.15]} rotation={[Math.PI / 2, Math.PI, 0]}>
        <planeGeometry args={[1.1, 0.55]} />
        <meshBasicMaterial ref={dispMat} map={disp.t} toneMapped={false} />
      </mesh>
      <mesh position={[L / 2 - 0.55, D + 0.075, -0.05]}>
        <sphereGeometry args={[0.05, 10, 6]} />
        <meshStandardMaterial ref={led} color="#2f7d32" emissive="#45ff6a" emissiveIntensity={0} toneMapped={false} />
      </mesh>
      {[-0.2, -0.33].map((z) => (
        <Cyl key={z} r={0.035} h={0.02} pos={[L / 2 - 0.55, D + 0.08, z]} color="#3a2a12" rough={0.3} seg={8} />
      ))}
      <Halo pos={[L / 2 - 0.55, D + 0.15, -0.05]} size={0.5} color="#45ff6a" read={() => (liveOf(part.id)?.on ? 0.7 : 0)} />
      {/* tubos de cobre isolados (fita branca) e mangueira de condensados, a sair pelo lado −x */}
      <Cyl r={0.18} h={0.6} pos={[-L / 2 - 0.3, 0.6, -0.6]} rot={[0, 0, Math.PI / 2]} color="#e9e9e4" rough={0.7} seg={12} />
      <Cyl r={0.07} h={0.62} pos={[-L / 2 - 0.3, 0.3, -0.9]} rot={[0, 0, Math.PI / 2]} color="#9aa3a8" rough={0.6} seg={10} />
      {/* régua de bornes da alimentação */}
      <Bornes pos={[-L / 2 - 0.3, 0.2, 0]} size={[0.6, 0.4, 0.92]} />
      {/* ar frio */}
      <group ref={air} visible={false}>
        {airMats.map((m, i) => (
          <mesh key={i} geometry={puff} material={m} raycast={() => null} />
        ))}
      </group>
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.on) return null
  const [x, y] = info.project([0, 0, 0])
  return (
    <g pointerEvents="none">
      <rect x={x - 46} y={y - 12} width={92} height={22} rx={5} fill="#0b1418" opacity={0.85} />
      <text x={x} y={y + 4} textAnchor="middle" fontSize={12} fill="#5fe3ff" fontFamily="monospace">
        ❄ {Number(live.temp ?? 0).toFixed(1).replace('.', ',')} °C
      </text>
    </g>
  )
}

export default { type: 'arCondicionado', Model, Overlay2D }
