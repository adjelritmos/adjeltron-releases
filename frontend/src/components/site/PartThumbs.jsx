// Miniaturas 3D das peças no site: as mesmas do catálogo do simulador (estúdio Studio.jsx; vêm
// da cache do servidor ou são renderizadas uma vez e guardadas). Carregado só em /componentes.
import { Studio } from '../three/Studio.jsx'
import { useStore } from '../../contexts/store.js'

export function ThumbHost() {
  return <Studio />
}

export function PartThumb({ type }) {
  const t = useStore((s) => s.thumbs[type])
  return t?.iso ? (
    <img src={t.iso} alt="" draggable={false} className="w-full h-full object-contain p-3" />
  ) : (
    <div className="w-full h-full grid place-items-center">
      <div className="w-3 h-3 rounded-full bg-neutral-600 animate-pulse" />
    </div>
  )
}
