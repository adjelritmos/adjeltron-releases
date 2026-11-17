// Projetos de exemplo (vêm do backend), agrupados por categoria; cada um abre no simulador.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Card, CardBody, CardFooter, Button, Input, Spinner } from '@heroui/react'
import { Search, Play, ServerOff } from 'lucide-react'

// imagens .webp leves das montagens (nada de 3D nesta página)
import { ExampleImage } from '../components/site/ExampleImage.jsx'

function ExampleCard({ e }) {
  const navigate = useNavigate()
  const open = () => navigate(`/app?exemplo=${encodeURIComponent(e.id)}`)
  return (
    <Card
      isPressable
      onPress={open}
      shadow="none"
      className="group bg-white/[0.03] border border-white/10 hover:border-white/30"
    >
      <CardBody className="p-0 overflow-hidden">
        <div className="aspect-[16/10] w-full bg-[radial-gradient(ellipse_at_50%_40%,#2a2a2e,#141416)]">
          <ExampleImage id={e.id} alt={e.name} size="sm" className="w-full h-full transition-transform duration-300 group-hover:scale-105" />
        </div>
      </CardBody>
      <CardFooter className="flex items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="text-sm text-white font-medium leading-snug">{e.name}</span>
        <span className="shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <Play size={14} />
        </span>
      </CardFooter>
    </Card>
  )
}
import { PageHeader } from '../components/site/PageHeader.jsx'
import { api } from '../services/api.js'
import { useT, useLang } from '../i18n/index.js'

// categorias especiais (as outras vêm do motor, com o nome do grupo)
const ALL = '__all'
const OTHER = '__other'

export default function Exemplos() {
  const t = useT()
  const [list, setList] = useState(null) // null = a carregar; false = erro
  const [q, setQ] = useState('')
  const [cat, setCat] = useState(ALL)
  // nomes e grupos dos exemplos vêm traduzidos do catálogo: voltam a ser pedidos ao mudar de idioma
  const ver = useLang((st) => st.ver)
  useEffect(() => {
    api.examples().then(setList).catch(() => setList(false))
    setCat(ALL)
  }, [ver])
  const cats = useMemo(() => [ALL, ...new Set((list || []).map((e) => e.cat || OTHER))], [list])
  const shown = (list || []).filter((e) => (cat === ALL || (e.cat || OTHER) === cat) && (!q || e.name.toLowerCase().includes(q.toLowerCase())))
  const byCat = shown.reduce((m, e) => ((m[e.cat || OTHER] ||= []).push(e), m), {})
  const catLabel = (c) => (c === ALL ? t('site.examples.all') : c === OTHER ? t('site.examples.other') : c)
  return (
    <>
      <PageHeader eyebrow={t('site.examples.eyebrow')} title={t('site.examples.title')} text={t('site.examples.text')}>
        {Array.isArray(list) && (
          <div className="mt-8 flex flex-col gap-4">
            <Input
              variant="bordered"
              placeholder={t('site.examples.search')}
              value={q}
              onValueChange={setQ}
              isClearable
              onClear={() => setQ('')}
              startContent={<Search size={16} className="text-neutral-500" />}
              className="max-w-md"
              classNames={{ clearButton: 'cursor-pointer' }}
            />
            <div className="flex flex-wrap gap-2">
              {cats.map((c) => (
                <Button
                  key={c}
                  size="sm"
                  radius="full"
                  variant={c === cat ? 'solid' : 'bordered'}
                  color={c === cat ? 'primary' : 'default'}
                  className={c === cat ? 'font-medium' : 'border-white/15 text-neutral-400'}
                  onPress={() => setCat(c)}
                >
                  {catLabel(c)}
                </Button>
              ))}
            </div>
          </div>
        )}
      </PageHeader>
      <div className="max-w-7xl mx-auto px-6">
        {list === null && <Spinner color="white" label={t('site.examples.loading')} />}
        {list === false && (
          <Card shadow="none" className="bg-white/[0.03] border border-white/10 max-w-xl">
            <CardBody className="p-6 flex-row gap-4 items-start">
              <ServerOff className="text-warning shrink-0" />
              <div>
                <div className="text-white font-medium">{t('site.examples.errorTitle')}</div>
                <p className="text-sm text-neutral-400 mt-1">
                  {t('site.examples.errorText')}
                </p>
              </div>
            </CardBody>
          </Card>
        )}
        {Object.entries(byCat).map(([c, items]) => (
          <section key={c} className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold text-white">{catLabel(c)}</h2>
              <span className="text-neutral-500 text-sm tabular-nums">{items.length}</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((e) => (
                <ExampleCard key={e.id} e={e} />
              ))}
            </div>
          </section>
        ))}
        {Array.isArray(list) && shown.length === 0 && <p className="text-neutral-500">{t('site.examples.none')}</p>}
      </div>
    </>
  )
}
