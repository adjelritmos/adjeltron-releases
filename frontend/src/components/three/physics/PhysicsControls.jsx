// Controlos da física na barra da vista 3D (só durante a simulação): mostrar colisores (debug do Rapier) e reiniciar a física
// (robôs e peças soltas voltam à pose de construção).
import { Button, Switch, Tooltip } from '@heroui/react'
import { RotateCcw } from 'lucide-react'
import { useStore } from '../../../contexts/store.js'
import { physicsModeOf } from '@shared/physics.js'
import { useT } from '../../../i18n/index.js'

export function PhysicsControls() {
  const mode = useStore((s) => s.mode)
  const debug = useStore((s) => !!s.physicsDebug)
  const hasPhysics = useStore((s) => s.parts.some((p) => !p.parent && physicsModeOf(p, s.parts) !== 'static'))
  const set = useStore((s) => s.set)
  const t = useT()
  if (mode !== 'sim') return null
  return (
    <>
      <Tooltip content={t({ pt: 'Mostra os colisores da física (Rapier)', en: 'Show the physics colliders (Rapier)' })}>
        <div className="flex items-center h-8 px-2 rounded-small bg-black/70 border border-white/10">
          <Switch size="sm" isSelected={debug} onValueChange={(v) => set({ physicsDebug: v })} aria-label={t({ pt: 'Mostrar colisores', en: 'Show colliders' })}>
            <span className="text-xs">{t({ pt: 'Colisores', en: 'Colliders' })}</span>
          </Switch>
        </div>
      </Tooltip>
      {hasPhysics && (
        <Tooltip content={t({ pt: 'As peças com física voltam à pose de construção e caem de novo', en: 'Parts with physics go back to their build pose and fall again' })}>
          <Button size="sm" variant="flat" className="bg-black/70 border border-white/10" onPress={() => set({ physicsEpoch: (useStore.getState().physicsEpoch || 0) + 1 })} startContent={<RotateCcw size={14} />}>
            {t({ pt: 'Reiniciar física', en: 'Reset physics' })}
          </Button>
        </Tooltip>
      )}
    </>
  )
}
