// Polia GT2 com flanges; a polia de menor id de cada correia "por letra" (config.belt) desenha a
// correia fechada (envolvente das circunferências primitivas dessa correia, _belt.jsx). As polias
// escolhidas numa peça "Correia GT2" (correiaGt2) não entram nas correias por letra.
import { Cyl, useMemo, mat } from '../kit.jsx'
import { useStore } from '../../../contexts/store.js'
import { DEFS } from '@shared/components.js'
import { gt2Geo } from './_mechKit.jsx'
import { BeltMesh } from './_belt.jsx'
import { pulleyR } from '@shared/parts/_mech.js'

const TOOTH_Y = [0.8, 1.4]

function Model({ part }) {
  const z = part.config?.teeth ?? 20
  const belt = part.config?.belt ?? 'A'
  const r = pulleyR(z)
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
      <Cyl r={Math.max(0.55, r * 0.75)} h={0.75} pos={[0, 0.375, 0]} color="#cfd8dc" metal={0.85} rough={0.3} seg={24} />
      {[0.25, 0.5].map((y) => (
        <Cyl key={y} r={0.08} h={0.12} pos={[Math.max(0.55, r * 0.75), 0.375, 0]} rot={[0, 0, Math.PI / 2]} color="#222" seg={8} />
      ))}
      <Cyl r={r + 0.2} h={0.05} pos={[0, 0.775, 0]} color="#cfd8dc" metal={0.85} rough={0.3} seg={32} />
      <mesh position={[0, TOOTH_Y[0], 0]} geometry={gt2Geo(z, TOOTH_Y[1] - TOOTH_Y[0])} material={mat('#c3ccd2', 0.8, 0.32)} castShadow />
      <Cyl r={r + 0.2} h={0.05} pos={[0, 1.425, 0]} color="#cfd8dc" metal={0.85} rough={0.3} seg={32} />
      <Cyl r={0.25} h={1.47} pos={[0, 0.735, 0]} color="#111" seg={12} />
      {isOwner && <BeltMesh pulleys={group} parentId={part.id} />}
    </group>
  )
}

export default { type: 'gt2Pulley', Model }
