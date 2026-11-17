// Campainha ding-dong: base de parede, duas lâminas de som cromadas, bobina de cobre e o
// martelo (êmbolo) que bate numa lâmina ao ligar ("ding", em cima) e na outra ao desligar
// ("dong", em baixo), atrás de uma tampa translúcida. Toca o som com WebAudio.
// Referencial: x ao longo da parede, y para fora da parede, z para cima.
import { Box, RBox, Cyl, Halo, liveOf, useFrame, useMemo, useRef, THREE } from '../kit.jsx'
import { CAMP } from '@shared/parts/campainha.js'
import { chime } from '../../../functions/audio.js'
import { useStore } from '../../../contexts/store.js'

function Model({ part }) {
  const c = part.config || {}
  const { W, H, D } = CAMP
  const plunger = useRef()
  const st = useRef({ ding: null, dong: null, hit: 0, dir: 0 })
  const cover = useMemo(() => new THREE.MeshStandardMaterial({ color: c.cor || '#f3f1ea', roughness: 0.3, transparent: true, opacity: 0.35, depthWrite: false }), [c.cor])
  useFrame((_, dt) => {
    const L = liveOf(part.id)
    const s = st.current
    const ding = L?.ding ?? 0
    const dong = L?.dong ?? 0
    const playing = useStore.getState().mode === 'sim' && !useStore.getState().paused
    if (s.ding != null && ding > s.ding) {
      s.hit = 1
      s.dir = 1
      if (playing) chime(659)
    }
    if (s.dong != null && dong > s.dong) {
      s.hit = 1
      s.dir = -1
      if (playing) chime(523)
    }
    s.ding = ding
    s.dong = dong
    s.hit = Math.max(0, s.hit - Math.min(dt, 0.1) * 6)
    // em repouso ao meio; ligado fica puxado para cima; a pancada vai até à lâmina
    const rest = L?.on ? 0.35 : 0
    const z = s.dir > 0 ? rest + (0.75 - rest) * s.hit : s.dir < 0 ? rest - (0.75 + rest) * s.hit : rest
    if (plunger.current) plunger.current.position.z += (z - plunger.current.position.z) * Math.min(1, dt * 30)
  })
  return (
    <group>
      <RBox size={[W, 0.25, H]} r={0.08} pos={[0, 0.125, 0]} color={c.cor || '#f3f1ea'} rough={0.5} />
      {/* lâminas de som (em cima e em baixo) */}
      {[1, -1].map((s) => (
        <group key={s}>
          <Box size={[W - 0.5, 0.12, 0.28]} pos={[0, 0.5, s * 1.05]} color="#dfe3e6" metal={0.95} rough={0.15} />
          {[-1, 1].map((x) => (
            <Cyl key={x} r={0.08} h={0.25} pos={[x * (W / 2 - 0.45), 0.32, s * 1.05]} color="#8a8f96" metal={0.8} rough={0.3} seg={8} />
          ))}
        </group>
      ))}
      {/* bobina (eixo vertical, z) e martelo */}
      <Cyl r={0.42} h={0.9} pos={[0, 0.65, 0]} rot={[Math.PI / 2, 0, 0]} color="#b87333" metal={0.7} rough={0.35} seg={20} />
      <group ref={plunger}>
        <Cyl r={0.14} h={1.3} pos={[0, 0.65, 0]} rot={[Math.PI / 2, 0, 0]} color="#c4cbd0" metal={0.9} rough={0.25} seg={12} />
        <Cyl r={0.2} h={0.12} pos={[0, 0.65, 0.66]} rot={[Math.PI / 2, 0, 0]} color="#3a3d41" seg={12} />
        <Cyl r={0.2} h={0.12} pos={[0, 0.65, -0.66]} rot={[Math.PI / 2, 0, 0]} color="#3a3d41" seg={12} />
      </group>
      {/* tampa translúcida */}
      <mesh position={[0, D / 2 + 0.05, 0]} material={cover}>
        <boxGeometry args={[W - 0.1, D - 0.1, H - 0.1]} />
      </mesh>
      <Box size={[0.4, 0.3, 1.0]} pos={[-W / 2 - 0.25, 0.2, 0]} color="#e9e9e4" />
      <Halo pos={[0, D + 0.3, 0]} size={2.4} color="#fde68a" read={() => st.current.hit * 0.9} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.on) return null
  const [x, y] = info.project([0, 0, 0])
  return (
    <text x={x} y={y + 4} textAnchor="middle" fontSize={12} fill="#fde68a" fontFamily="monospace" pointerEvents="none">
      ♪ ding
    </text>
  )
}

export default { type: 'campainha', Model, Overlay2D }
