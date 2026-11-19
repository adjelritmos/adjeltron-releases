// Potenciómetro rotativo WH148: tampa de aço niquelado de Ø 16 mm (aresta boleada, patilha
// anti-rotação e as 4 patilhas cravadas na placa de baquelite castanha), casquilho roscado M7,
// veio de 6 mm serrilhado (18 estrias) com a ranhura em cima e a ponta chanfrada — roda 300° com a
// posição — e os três terminais estanhados com o furo de solda, dobrados até à breadboard.
import { Box, Cyl, Leg, PITCH, inputOf, useFrame, useRef, geo, mat, mergedGeo, THREE } from '../kit.jsx'
import { pcbGeo } from './mq2.jsx'

const v2 = (pts) => pts.map(([r, y]) => new THREE.Vector2(r, y))
const unit = () => geo('sb:unitBox', () => new THREE.BoxGeometry(1, 1, 1))
const TIN = '#d3d6d9'

// tampa: cilindro com a aresta de cima boleada (de y = 0,48 a 1,12)
const canGeo = () => geo('pot:can', () => new THREE.LatheGeometry(v2([[0.8, 0.48], [0.8, 1.06], [0.79, 1.1], [0.76, 1.12], [0.36, 1.12]]), 40))
// patilhas cravadas (dobradas por baixo da baquelite) e patilha anti-rotação no topo
const tabsGeo = () =>
  mergedGeo('pot:tabs', () => [
    // (longe dos terminais, que saem do lado +z)
    ...[0, Math.PI, -Math.PI / 3, (-2 * Math.PI) / 3].map((a) => {
      return [unit(), [Math.cos(a) * 0.8, 0.42, Math.sin(a) * 0.8], [0, -a, 0], [0.03, 0.14, 0.2]]
    }),
    [unit(), [0.6, 1.17, 0], [0, 0, 0], [0.04, 0.12, 0.16]],
  ])
// rosca do casquilho
const threadGeo = () => mergedGeo('pot:thread', () => Array.from({ length: 11 }, (_, i) => [new THREE.TorusGeometry(0.355, 0.022, 4, 24).rotateX(Math.PI / 2), [0, 1.17 + i * 0.062, 0]]))
// estrias do veio (só na parte de cima, como no real)
const knurlGeo = () =>
  mergedGeo('pot:knurl', () =>
    Array.from({ length: 18 }, (_, i) => {
      const a = (i / 18) * Math.PI * 2
      return [unit(), [Math.cos(a) * 0.29, 0.95, Math.sin(a) * 0.29], [0, -a, 0], [0.06, 0.75, 0.05]]
    }),
  )

function Model({ part }) {
  const shaft = useRef()
  useFrame(() => {
    const v = inputOf(part.id).value ?? part.config?.value ?? 50
    if (shaft.current) shaft.current.rotation.y = -((Math.max(0, Math.min(100, v)) / 100 - 0.5) * 300 * Math.PI) / 180
  })
  const lug = pcbGeo('pot:lug', { w: 0.22, d: 0.55, t: 0.035, r: 0.04, holes: [[0, 0.1, 0.045]] })
  return (
    <group>
      {/* terminais: saem da baquelite e descem até à breadboard */}
      {[-2, 0, 2].map((k) => (
        <group key={k}>
          <mesh position={[k * PITCH, 0.4, 0.62]} geometry={lug} material={mat(TIN, 1, 0.3)} castShadow />
          <Leg from={[k * PITCH, 0.42, 0.86]} to={[k * PITCH, 0, 0.889]} r={0.035} color={TIN} />
        </group>
      ))}
      {/* placa de baquelite castanha e tampa metálica */}
      <Cyl r={0.8} h={0.12} pos={[0, 0.42, 0]} color="#7a4a24" rough={0.75} seg={40} />
      <mesh geometry={canGeo()} material={mat('#c9ccd1', 1, 0.3)} castShadow />
      <mesh geometry={tabsGeo()} material={mat('#c3c7cc', 1, 0.32)} />
      {/* casquilho roscado */}
      <Cyl r={0.34} h={0.75} pos={[0, 1.48, 0]} color="#c8ccd0" metal={1} rough={0.3} seg={24} />
      <mesh geometry={threadGeo()} material={mat('#b4babf', 1, 0.32)} />
      {/* veio serrilhado (roda): parte lisa, estrias, ranhura e chanfro */}
      <group ref={shaft} position={[0, 1.85, 0]}>
        <Cyl r={0.3} h={1.3} pos={[0, 0.65, 0]} color="#d5d9dd" metal={1} rough={0.28} seg={20} />
        <mesh geometry={knurlGeo()} material={mat('#c3c8cc', 1, 0.3)} />
        <Cyl r={0.25} r2={0.3} h={0.05} pos={[0, 1.325, 0]} color="#d5d9dd" metal={1} rough={0.28} seg={20} />
        <Box size={[0.08, 0.02, 0.52]} pos={[0, 1.346, 0]} color="#2b2b2b" />
      </group>
    </group>
  )
}

function Overlay2D({ live }) {
  if (live?.pos == null) return null
  return (
    <text textAnchor="middle" y={-38} fontSize={11} fontWeight="700" fill="#f5f5f5" pointerEvents="none">
      {Math.round(live.pos * 100)}%
    </text>
  )
}

export default { type: 'potRotativo', Model, Overlay2D }
