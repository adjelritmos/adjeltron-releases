// Imagem leve (fundo transparente) da montagem de um exemplo, para o site: a página inicial,
// /exemplos e o menu Projetos não desenham modelos 3D no browser de quem visita. As imagens são
// geradas por scripts/example-shots.mjs em public/previews/examples/:
//   <id>.webp       1200×750 (página inicial)
//   <id>-sm.webp     480×300 (cartões)
import { useState } from 'react'
import { Box } from 'lucide-react'

const base = (id, size) => `/previews/examples/${encodeURIComponent(id)}${size === 'sm' ? '-sm' : ''}`

export const exampleImageUrl = (id, size = 'lg') => `${base(id, size)}.webp`

export function ExampleImage({ id, alt = '', size = 'sm', eager = false, className = '' }) {
  const [failed, setFailed] = useState(false)
  if (failed)
    return (
      <div className={`flex items-center justify-center text-neutral-600 ${className}`}>
        <Box size={28} />
      </div>
    )
  return (
    <img
      src={exampleImageUrl(id, size)}
      alt={alt}
      width={size === 'sm' ? 480 : 1200}
      height={size === 'sm' ? 300 : 750}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      className={`object-contain select-none ${className}`}
    />
  )
}
