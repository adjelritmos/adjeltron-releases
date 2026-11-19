// Campainha ding-dong (carrilhão de 2 tons, como as de casa): base de ABS com a moldura, duas
// lâminas de som de alumínio escovado presas em pernes com anilhas de borracha, solenoide com
// o carreto de plástico, o enrolamento de cobre esmaltado e o estribo de chapa, e o êmbolo de
// aço com as pontas de feltro que bate numa lâmina ao ligar ("ding", em cima) e na outra ao
// desligar ("dong", em baixo), atrás de uma tampa translúcida. Toca o som com WebAudio.
// Referencial: x ao longo da parede, y para fora da parede, z para cima.
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { Box, RBox, Cyl, Halo, geo, mat, liveOf, useFrame, useMemo, useRef, THREE } from '../kit.jsx'
import { CAMP } from '@shared/parts/campainha.js'
import { chime } from '../../../functions/audio.js'
import { useStore } from '../../../contexts/store.js'
import { Bornes, latheGeo, helixGeo } from './_casaKit.jsx'

// enrolamento: camadas de fio (perfil ondulado) entre as abas do carreto
const WIND = Array.from({ length: 19 }, (_, i) => [0.36 + 0.012 * Math.cos(i * Math.PI), -0.36 + (i * 0.72) / 18])

function Model({ part }) {
  const c = part.config || {}
  const { W, H, D } = CAMP
  const plunger = useRef()
  const st = useRef({ ding: null, dong: null, hit: 0, dir: 0 })
  const cover = useMemo(() => new THREE.MeshPhysicalMaterial({ color: c.cor || '#f3f1ea', roughness: 0.25, transparent: true, opacity: 0.3, depthWrite: false, clearcoat: 0.6 }), [c.cor])
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
  const coverGeo = geo(`campCover${W},${H},${D}`, () => new RoundedBoxGeometry(W - 0.1, D - 0.15, H - 0.1, 3, 0.25))
  const spring = helixGeo('campSpring', 0.17, 0.02, -0.35, 0.05, 6, 10)
  return (
    <group>
      {/* base com moldura */}
      <RBox size={[W, 0.2, H]} r={0.08} pos={[0, 0.1, 0]} color={c.cor || '#f3f1ea'} rough={0.45} />
      <RBox size={[W - 0.3, 0.06, H - 0.3]} r={0.03} pos={[0, 0.22, 0]} color="#e4e1d8" rough={0.6} />
      {/* lâminas de som (a de cima mais curta: "ding" mais agudo) em pernes com borrachas */}
      {[1, -1].map((s) => {
        const bl = s > 0 ? W - 0.6 : W - 0.4
        return (
          <group key={s}>
            <RBox size={[bl, 0.08, 0.3]} r={0.02} pos={[0, 0.52, s * 1.05]} color="#dde1e4" metal={1} rough={0.28} />
            {[-1, 1].map((x) => (
              <group key={x} position={[x * (bl / 2 - 0.22), 0, s * 1.05]}>
                <Cyl r={0.05} h={0.5} pos={[0, 0.48, 0]} color="#a7adb3" metal={0.9} rough={0.3} seg={8} />
                <Cyl r={0.11} h={0.1} pos={[0, 0.43, 0]} color="#1b1b1b" rough={0.85} seg={12} />
                <Cyl r={0.11} h={0.06} pos={[0, 0.59, 0]} color="#1b1b1b" rough={0.85} seg={12} />
                <Cyl r={0.08} h={0.05} pos={[0, 0.645, 0]} color="#c7ccd1" metal={0.9} rough={0.3} seg={6} />
              </group>
            ))}
          </group>
        )
      })}
      {/* solenoide (eixo segundo z): estribo de chapa, carreto e enrolamento de cobre */}
      <Box size={[1.05, 0.06, 1.0]} pos={[0, 0.26, 0]} color="#8e959b" metal={0.85} rough={0.4} />
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.06, 0.55, 1.0]} pos={[s * 0.5, 0.52, 0]} color="#8e959b" metal={0.85} rough={0.4} />
      ))}
      <group position={[0, 0.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh geometry={latheGeo('campWind', WIND, 28)} material={mat('#b4642e', 0.75, 0.32)} castShadow />
        {[-1, 1].map((s) => (
          <Cyl key={s} r={0.45} h={0.06} pos={[0, s * 0.4, 0]} color="#1e1e1e" rough={0.5} seg={24} />
        ))}
        <Cyl r={0.17} h={0.9} color="#1e1e1e" rough={0.5} seg={16} />
        <mesh geometry={spring} material={mat('#c9ced2', 1, 0.3)} position={[0, -0.45, 0]} />
      </group>
      {/* êmbolo de aço com as pontas de feltro */}
      <group ref={plunger}>
        <Cyl r={0.12} h={1.3} pos={[0, 0.65, 0]} rot={[Math.PI / 2, 0, 0]} color="#c4cbd0" metal={0.95} rough={0.22} seg={12} />
        {[1, -1].map((s) => (
          <group key={s}>
            <Cyl r={0.16} h={0.06} pos={[0, 0.65, s * 0.6]} rot={[Math.PI / 2, 0, 0]} color="#c4cbd0" metal={0.95} rough={0.22} seg={12} />
            <Cyl r={0.15} r2={0.17} h={0.12} pos={[0, 0.65, s * 0.69]} rot={[Math.PI / 2, 0, 0]} color="#5b4a3a" rough={0.95} seg={12} />
          </group>
        ))}
      </group>
      {/* tampa translúcida boleada */}
      <mesh position={[0, D / 2 + 0.06, 0]} geometry={coverGeo} material={cover} renderOrder={3} />
      {/* régua de bornes da bobina */}
      <Bornes pos={[-W / 2 - 0.25, 0.2, 0]} size={[0.4, 0.3, 1.0]} />
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
