// Polia GT2 com flanges; a polia de menor id de cada correia "por letra" (config.belt) desenha a
// correia fechada (envolvente das circunferências primitivas dessa correia, _belt.jsx). As polias
// escolhidas numa peça "Correia GT2" (correiaGt2) não entram nas correias por letra.
// Modelo: polia de alumínio torneado como as das impressoras 3D — cubo com 2 parafusos sem
// cabeça M3 a 90°, dentes 2GT (gola semicircular) entre duas flanges chanfradas, furo de 5 mm.
import { useMemo, mat, geo, THREE } from '../kit.jsx'
import { useStore } from '../../../contexts/store.js'
import { DEFS } from '@shared/components.js'
import { gt2Geo, brushedMat } from './_mechKit.jsx'
import { BeltMesh } from './_belt.jsx'
import { pulleyR } from '@shared/parts/_mech.js'

const TOOTH_Y = [0.8, 1.4]
const ALU_P = '#d3d9dd'

// peça torneada: perfil (raio, y) fechado à volta do furo de 5 mm
function turnedGeo(key, pts) {
  return geo(`gt2t:${key}`, () => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), 40))
}
const hubGeo = (R) => turnedGeo(`hub${R}`, [[0.25, 0], [R - 0.04, 0], [R, 0.04], [R, 0.75], [0.25, 0.75], [0.25, 0]])
// flange: disco fino com o rebordo chanfrado para fora (guia a correia)
const flangeGeo = (R, up) =>
  turnedGeo(`fl${R},${up}`, up ? [[0.25, 0], [R - 0.06, 0], [R, 0.03], [R, 0.05], [0.25, 0.05], [0.25, 0]] : [[0.25, 0], [R, 0], [R, 0.02], [R - 0.06, 0.05], [0.25, 0.05], [0.25, 0]])

function Model({ part }) {
  const z = part.config?.teeth ?? 20
  const belt = part.config?.belt ?? 'A'
  const r = pulleyR(z)
  const hubR = Math.max(0.55, r * 0.75)
  // chave estável (string) com as polias da mesma correia: "id:dentes|…"
  const gkey = useStore((s) => {
    if (belt === '-') return ''
    // polias que já estão numa correia explícita (peça Correia GT2)
    const claimed = new Set(s.parts.filter((p) => DEFS[p.type]?.belt).flatMap((p) => p.config?.pulleys || []))
    if (claimed.has(part.id)) return ''
    return s.parts.filter((p) => p.type === 'gt2Pulley' && !claimed.has(p.id) && (p.config?.belt ?? 'A') === belt).map((p) => `${p.id}:${p.config?.teeth ?? 20}`).join('|')
  })
  const group = useMemo(() => (gkey ? gkey.split('|').map((t) => ({ id: t.split(':')[0], teeth: +t.split(':')[1] })) : null), [gkey])
  const isOwner = !!group && group.length > 1 && group.every((p) => p.id >= part.id)
  return (
    <group>
      <mesh geometry={hubGeo(hubR)} material={brushedMat(ALU_P, 0.85, 0.3)} castShadow receiveShadow />
      {/* parafusos sem cabeça M3 a 90° (sextavado interior) */}
      {[0, Math.PI / 2].map((a) => (
        <group key={a} rotation={[0, a, 0]}>
          <mesh position={[hubR + 0.003, 0.375, 0]} rotation={[0, 0, Math.PI / 2]} geometry={geo('gt2Set', () => new THREE.CylinderGeometry(0.15, 0.15, 0.01, 14))} material={mat('#2a2c2f', 0.7, 0.4)} />
          <mesh position={[hubR + 0.009, 0.375, 0]} rotation={[0, 0, Math.PI / 2]} geometry={geo('gt2SetHex', () => new THREE.CylinderGeometry(0.075, 0.075, 0.004, 6))} material={mat('#050505', 0, 0.9)} />
        </group>
      ))}
      <mesh geometry={flangeGeo(r + 0.2, false)} position={[0, 0.75, 0]} material={mat(ALU_P, 0.85, 0.28)} castShadow receiveShadow />
      <mesh position={[0, TOOTH_Y[0], 0]} geometry={gt2Geo(z, TOOTH_Y[1] - TOOTH_Y[0])} material={mat('#c8d0d5', 0.85, 0.3)} castShadow />
      <mesh geometry={flangeGeo(r + 0.2, true)} position={[0, 1.4, 0]} material={mat(ALU_P, 0.85, 0.28)} castShadow receiveShadow />
      {isOwner && <BeltMesh pulleys={group} parentId={part.id} />}
    </group>
  )
}

export default { type: 'gt2Pulley', Model }
