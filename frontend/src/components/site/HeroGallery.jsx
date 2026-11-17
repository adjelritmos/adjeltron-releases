// Montra da página inicial: os exemplos em imagens .webp leves (sem 3D no browser), a trocar
// sozinhos com um esbatido; o rato por cima pára a troca. "Abrir" leva o exemplo ao simulador.
import { useEffect, useMemo, useState } from 'react'
import { Button, Chip, Link } from '@heroui/react'
import { Play, Shuffle } from 'lucide-react'
import { api } from '../../services/api.js'
import { useLang, useT } from '../../i18n/index.js'
import { ExampleImage, exampleImageUrl } from './ExampleImage.jsx'

const TROCA = 6000 // ms em cada exemplo

const baralha = (l) => {
  const a = [...l]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function HeroGallery() {
  const t = useT()
  const ver = useLang((s) => s.ver) // nomes no idioma atual
  const [list, setList] = useState(null)
  const [names, setNames] = useState({})
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    api
      .examples()
      .then((l) => setList((cur) => cur || baralha(l)))
      .catch(() => setList([]))
  }, [])
  useEffect(() => {
    api
      .examples()
      .then((l) => setNames(Object.fromEntries(l.map((e) => [e.id, e.name]))))
      .catch(() => {})
  }, [ver])

  // troca ao fim de TROCA ms; pré-carrega a imagem seguinte
  useEffect(() => {
    if (!list?.length) return
    const next = list[(i + 1) % list.length]
    const img = new Image()
    img.src = exampleImageUrl(next.id)
    if (paused) return
    const tm = setTimeout(() => setI((n) => n + 1), TROCA)
    return () => clearTimeout(tm)
  }, [list, i, paused])

  // só as duas imagens em jogo (a atual e a anterior, para o esbatido)
  const shown = useMemo(() => (list?.length ? [list[(i - 1 + list.length) % list.length], list[i % list.length]] : []), [list, i])
  if (!list?.length) return <div className="h-full" />
  const cur = list[i % list.length]

  return (
    <div className="relative h-full" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(255,255,255,0.06),transparent_65%)]" />
      {shown.map((e, k) => (
        <ExampleImage
          key={e.id} // a mesma chave entre trocas: a anterior esbate-se, a nova entra com heroIn
          id={e.id}
          alt={k === 1 ? names[e.id] || e.name : ''}
          size="lg"
          eager={k === 1}
          className={`absolute inset-0 w-full h-full transition-opacity duration-700 ${k === 1 ? 'opacity-100 animate-[heroIn_700ms_ease-out]' : 'opacity-0'}`}
        />
      ))}
      <div className="absolute left-0 right-0 bottom-2 flex items-center justify-center gap-2 px-4 pointer-events-none">
        <Chip variant="flat" size="md" className="bg-black/50 backdrop-blur text-neutral-200 border border-white/10 max-w-[60%]">
          <span className="truncate block">{names[cur.id] || cur.name}</span>
        </Chip>
        <Button as={Link} href={`/app?exemplo=${encodeURIComponent(cur.id)}`} size="sm" radius="full" variant="flat" startContent={<Play size={14} />} className="pointer-events-auto bg-white/10 text-white">
          {t('common.open')}
        </Button>
        <Button isIconOnly size="sm" radius="full" variant="flat" aria-label={t({ pt: 'Outro exemplo', en: 'Another example' })} onPress={() => setI((n) => n + 1)} className="pointer-events-auto bg-white/10 text-white">
          <Shuffle size={14} />
        </Button>
      </div>
    </div>
  )
}
