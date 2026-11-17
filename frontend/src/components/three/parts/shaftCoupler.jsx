// Acoplador flexível: cilindro de alumínio com ranhura helicoidal e 2 parafusos de aperto.
import { Cyl, geo, mat, THREE } from '../kit.jsx'
import { COUPLER } from '@shared/parts/shaftCoupler.js'

function helixGeo() {
  return geo('couplerHelix', () => {
    const pts = []
    for (let i = 0; i <= 120; i++) {
      const t = i / 120
      const a = t * Math.PI * 2 * 3
      pts.push(new THREE.Vector3(Math.cos(a) * COUPLER.R, 0.8 + t * 0.9, Math.sin(a) * COUPLER.R))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.05, 6, false)
  })
}

function Model() {
  return (
    <group>
      <Cyl r={COUPLER.R} h={COUPLER.H} pos={[0, COUPLER.H / 2, 0]} color="#c7d0d6" metal={0.85} rough={0.3} seg={32} />
      <mesh geometry={helixGeo()} material={mat('#263238', 0.3, 0.6)} />
      {[0.35, COUPLER.H - 0.35].map((y) => (
        <Cyl key={y} r={0.14} h={0.1} pos={[COUPLER.R, y, 0]} rot={[0, 0, Math.PI / 2]} color="#222" seg={10} />
      ))}
      <Cyl r={0.26} h={0.02} pos={[0, COUPLER.H + 0.005, 0]} color="#111" seg={14} />
    </group>
  )
}

export default { type: 'shaftCoupler', Model }
