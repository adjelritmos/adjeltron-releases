// Condensador cerâmico: até 1 µF é o disco clássico (5 mm, revestimento de epóxi cor de
// laranja-acastanhado, irregular, que escorre um pouco pelas pernas) com o código (104…)
// impresso nas duas faces; a partir de 1 µF é o multicamada "monolítico" azul em gota retangular.
// Face com o código virada para a frente (+x), pernas de 0,5 mm a 5 mm para baixo.
import { THREE, geo, mat, PITCH } from '../kit.jsx'
import { Mark, Wires } from './_dip.jsx'
import { cerCode } from '@shared/parts/ceramicCap.js'
import { Badge, Boom, fmt } from './group-c-ui.jsx'

// disco: perfil de revolução com as faces abauladas (eixo ao longo de x)
const discGeo = (r) =>
  geo(`cerDisc${r}`, () => {
    const t = 0.075 // meia espessura
    const p = [[0.001, -t], [r * 0.6, -t + 0.006], [r * 0.88, -t + 0.02], [r, -0.02], [r * 1.01, 0], [r, 0.02], [r * 0.88, t - 0.02], [r * 0.6, t - 0.006], [0.001, t]]
    const g = new THREE.LatheGeometry(p.map(([a, b]) => new THREE.Vector2(a, b)), 28)
    g.rotateZ(-Math.PI / 2)
    g.computeVertexNormals()
    return g
  })
// gota do revestimento onde as pernas entram no disco
const dripGeo = () => geo('cerDrip', () => new THREE.SphereGeometry(1, 12, 8))
// multicamada: bloco de epóxi boleado
const blobGeo = () =>
  geo('cerBlob', () => {
    const g = new THREE.SphereGeometry(1, 20, 14)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      // super-elipsoide: mais quadrado do que uma esfera
      const v = new THREE.Vector3().fromBufferAttribute(p, i)
      const f = (a) => Math.sign(a) * Math.pow(Math.abs(a), 0.6)
      p.setXYZ(i, f(v.x) * 0.075, f(v.y) * 0.21, f(v.z) * 0.21)
    }
    g.computeVertexNormals()
    return g
  })

function Model({ part }) {
  const pF = part.config?.pF ?? 100000
  const code = cerCode(pF)
  const big = pF >= 1000000
  const r = big ? 0.21 : 0.25
  const yc = 0.3 + r
  const legTop = yc - r * 0.75
  const lines = big ? [{ text: code, font: 'bold 96px Arial', y: 64 }] : [{ text: code, font: 'bold 96px Arial', y: 58 }, { text: 'K  50V', font: 'bold 36px Arial', y: 112 }]
  return (
    <group>
      {/* pernas com a dobra ("kink") típica que segura o condensador acima da placa */}
      <Wires
        id={`cer${big}`}
        r={0.025}
        lines={[PITCH, -PITCH].map((z) => [[0, 0, z], [0, 0.18, z], [0, 0.24, z * 0.8], [0, 0.3, z * 0.8], [0, legTop, z * 0.55]])}
      />
      {big ? (
        <mesh position={[0, yc, 0]} geometry={blobGeo()} material={mat('#2a62b8', 0, 0.35)} castShadow />
      ) : (
        <>
          <mesh position={[0, yc, 0]} geometry={discGeo(r)} material={mat('#c8762c', 0, 0.48)} castShadow />
          {[1, -1].map((s) => (
            <mesh key={s} position={[0, yc - r * 0.86, s * PITCH * 0.5]} scale={[0.05, 0.08, 0.045]} geometry={dripGeo()} material={mat('#c8762c', 0, 0.48)} />
          ))}
        </>
      )}
      {[1, -1].map((s) => (
        <Mark key={s} lines={lines} px={[256, 160]} pos={[s * (big ? 0.077 : 0.076), yc + 0.02, 0]} rot={[0, (s * Math.PI) / 2, 0]} w={r * 1.25} h={r * 0.78} color="#1e1a16" />
      ))}
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  if (live.burst) return <Boom info={info} />
  return Math.abs(live.v) > 0.01 ? <Badge info={info} text={`${fmt(live.v, 2)} V`} /> : null
}

export default { type: 'ceramicCap', Model, Overlay2D }
