// Correia GT2 fechada / tapete (peça própria, largura e face na config): desenhada à volta das polias escolhidas no painel
// (config.pulleys). Sem polias suficientes aparece enrolada (anel) onde a peça foi posta.
// Selecionada, mostra o comprimento calculado e o nº de dentes (ou o que falta fazer).
import { useState } from 'react'
import { useMemo } from '../kit.jsx'
import { useStore } from '../../../contexts/store.js'
import { BeltMesh } from './_belt.jsx'
import { BeltTip } from './_beltTip.jsx'
import { beltDims } from '@shared/parts/correiaGt2.js'
import { GT2P } from '@shared/parts/gt2Pulley.js'

function Model({ part }) {
  const ids = part.config?.pulleys || []
  const pkey = useStore((s) => ids.map((id) => s.parts.find((p) => p.id === id && p.type === 'gt2Pulley')).filter(Boolean).map((p) => `${p.id}:${p.config?.teeth ?? 20}`).join('|'))
  const pulleys = useMemo(() => (pkey ? pkey.split('|').map((t) => ({ id: t.split(':')[0], teeth: +t.split(':')[1] })) : []), [pkey])
  const [info, setInfo] = useState(null)
  // largura, face (dentada/lisa) e deslocamento ao longo do eixo (config)
  const { w, dy, toothed } = beltDims(part.config)
  return (
    <group>
      <BeltMesh pulleys={pulleys} parentId={part.id} loose={{ r: 1.4 }} y={GT2P.BELT_Y + dy} w={w} toothed={toothed} color={toothed ? '#1d1d1d' : '#2a2a2a'} onInfo={setInfo} />
      <BeltTip part={part} info={info} count={pulleys.length} toothed={toothed} />
    </group>
  )
}

export default { type: 'correiaGt2', Model }
