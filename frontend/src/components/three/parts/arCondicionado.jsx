// Ar condicionado (split de parede): corpo boleado, grelha de aspiração em cima, alheta
// motorizada em baixo, visor LED com a temperatura da sala e jato de ar frio (partículas azuis)
// quando ligado. Referencial: x ao longo da parede, y para fora da parede, z para cima.
import { Box, RBox, Cyl, Halo, geo, mat, liveOf, useFrame, useMemo, useRef, THREE } from '../kit.jsx'
import { AC } from '@shared/parts/arCondicionado.js'

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
  return (
    <group>
      {/* placa de fixação e corpo */}
      <Box size={[L - 0.4, 0.12, H - 0.3]} pos={[0, 0.06, 0]} color="#d8dad6" />
      <RBox size={[L, D - 0.1, H]} r={0.35} pos={[0, 0.05 + (D - 0.1) / 2, 0]} color={body} rough={0.4} />
      {/* painel frontal liso, ligeiramente saliente */}
      <RBox size={[L - 0.3, 0.12, H - 0.75]} r={0.05} pos={[0, D - 0.02, 0.18]} color={body} rough={0.25} />
      {/* grelha de aspiração em cima */}
      {Array.from({ length: 14 }, (_, i) => (
        <Box key={i} size={[0.12, D - 0.7, 0.05]} pos={[-L / 2 + 0.75 + i * ((L - 1.5) / 13), 0.35 + (D - 0.7) / 2, H / 2 - 0.005]} color="#9ea4a6" />
      ))}
      {/* boca de saída em baixo (escura) */}
      <Box size={[L - 0.8, D - 0.6, 0.06]} pos={[0, 0.3 + (D - 0.6) / 2, -H / 2 - 0.005]} color="#2a2f33" />
      {/* alheta articulada no bordo da frente da boca */}
      <group ref={flap} position={[0, D - 0.15, -H / 2 + 0.02]}>
        <Box size={[L - 0.9, 0.75, 0.08]} pos={[0, -0.375, -0.04]} color={body} rough={0.35} />
      </group>
      {/* visor da temperatura e LED de funcionamento */}
      <mesh position={[L / 2 - 1.3, D + 0.055, -0.15]} rotation={[Math.PI / 2, Math.PI, 0]}>
        <planeGeometry args={[1.1, 0.55]} />
        <meshBasicMaterial ref={dispMat} map={disp.t} toneMapped={false} />
      </mesh>
      <mesh position={[L / 2 - 0.55, D + 0.06, -0.15]}>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshStandardMaterial ref={led} color="#2f7d32" emissive="#45ff6a" emissiveIntensity={0} toneMapped={false} />
      </mesh>
      <Halo pos={[L / 2 - 0.55, D + 0.15, -0.15]} size={0.5} color="#45ff6a" read={() => (liveOf(part.id)?.on ? 0.7 : 0)} />
      {/* tubo e cabo para a unidade exterior, a sair pelo lado −x */}
      <Cyl r={0.18} h={0.6} pos={[-L / 2 - 0.3, 0.6, -0.6]} rot={[0, 0, Math.PI / 2]} color="#e9e9e4" seg={12} />
      <Box size={[0.6, 0.4, 0.8]} pos={[-L / 2 - 0.3, 0.2, 0]} color="#e9e9e4" />
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
