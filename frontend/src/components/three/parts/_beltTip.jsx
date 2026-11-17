// Etiqueta no 3D de uma correia/elástico selecionado: comprimento calculado, ou o que falta
// fazer (escolher as polias no painel, alinhá-las). info = o que o BeltMesh devolve em onInfo.
import { Html } from '@react-three/drei'
import { useStore } from '../../../contexts/store.js'
import { useT } from '../../../i18n/index.js'

export function BeltTip({ part, info, count, toothed = true }) {
  const t = useT()
  const selected = useStore((s) => s.mode === 'build' && s.selected?.kind === 'part' && s.selected.id === part.id)
  if (!selected) return null
  const mm = info?.ok ? info.length * 10 : 0
  const len = mm.toFixed(1).replace('.', t('tools.belt.decimal'))
  const title = mm ? (toothed ? t('tools.belt.teeth', { mm: len, z: Math.round(mm / 2) }) : t('tools.belt.length', { mm: len })) : count >= 2 ? t('tools.belt.misaligned') : t('tools.belt.noPulleys')
  const sub = mm ? t('tools.belt.around', { n: count }) : count >= 2 ? t('tools.belt.misalignedHint') : t('tools.belt.noPulleysHint')
  return (
    <Html distanceFactor={18} zIndexRange={[5, 0]} position={info?.center ? [info.center[0], info.center[1] + 1.5, info.center[2]] : [0, 1.2, 0]} center style={{ pointerEvents: 'none' }}>
      <div className="pin-tip">
        <b>{title}</b>
        <span>{sub}</span>
      </div>
    </Html>
  )
}
