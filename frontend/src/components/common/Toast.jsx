// Aviso temporário no fundo do ecrã (store.toast)
import { Chip } from '@heroui/react'
import { useStore } from '../../contexts/store.js'

export function Toast() {
  const t = useStore((s) => s.toast)
  if (!t) return null
  return (
    <Chip size="lg" variant="solid" color="primary" radius="md" className="absolute top-3 left-1/2 -translate-x-1/2 z-30 shadow-2xl h-auto py-1.5 max-w-[80%]" classNames={{ closeButton: 'cursor-pointer', content: 'text-xs font-medium whitespace-normal' }}>
      {t.msg}
    </Chip>
  )
}
