// Elástico: desenhado à volta das polias escolhidas no painel (config.pulleys), na gola delas.
// Sem polias suficientes aparece solto (anel) onde a peça foi posta. Selecionado, mostra o
// comprimento (ou o que falta fazer).
import { useState } from 'react'
import { useStore } from '../../../contexts/store.js'
import { useMemo } from '../kit.jsx'
import { BeltMesh } from './_belt.jsx'
import { BeltTip } from './_beltTip.jsx'
import { poliaDims, POLIA } from '@shared/parts/poliaElastico.js'

function Model({ part }) {
  const ids = part.config?.pulleys || []
  const pkey = useStore((s) => ids.map((id) => s.parts.find((p) => p.id === id && p.type === 'poliaElastico')).filter(Boolean).map((p) => `${p.id}:${poliaDims(p.config || {}).r}`).join('|'))
  const pulleys = useMemo(() => (pkey ? pkey.split('|').map((t) => ({ id: t.split(':')[0], r: +t.split(':')[1] })) : []), [pkey])
  const [info, setInfo] = useState(null)
  return (
    <group>
      <BeltMesh pulleys={pulleys} parentId={part.id} loose={{ r: 1.6 }} y={POLIA.W / 2} w={0.22} color={part.config?.color || '#f2c94c'} toothed={false} onInfo={setInfo} />
      <BeltTip part={part} info={info} count={pulleys.length} toothed={false} />
    </group>
  )
}

export default { type: 'elastico', Model }
