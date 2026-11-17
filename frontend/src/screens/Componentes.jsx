// Catálogo público de componentes: famílias em separadores, grupos e pesquisa.
import { Suspense, lazy, useState } from 'react'
import { Tabs, Tab, Input, Card, CardBody, Chip } from '@heroui/react'
import { Search } from 'lucide-react'
import { PageHeader } from '../components/site/PageHeader.jsx'
import { FAMILIES, PART_COUNT, partName, partDesc } from '../functions/siteData.js'
import { useT } from '../i18n/index.js'

// miniaturas 3D (modelos pesados) carregadas à parte
const ThumbHost = lazy(() => import('../components/site/PartThumbs.jsx').then((m) => ({ default: m.ThumbHost })))
const PartThumb = lazy(() => import('../components/site/PartThumbs.jsx').then((m) => ({ default: m.PartThumb })))

export default function Componentes() {
  const tr = useT()
  const [fam, setFam] = useState('all')
  const [q, setQ] = useState('')
  const match = (t) => !q || `${partName(t)} ${partDesc(t)}`.toLowerCase().includes(q.toLowerCase())
  const shown = FAMILIES.filter((f) => fam === 'all' || f.key === fam)
    .map((f) => ({ ...f, groups: f.groups.map((g) => ({ ...g, types: g.types.filter(match) })).filter((g) => g.types.length) }))
    .filter((f) => f.groups.length)
  return (
    <>
      <PageHeader eyebrow={tr('site.parts.eyebrow')} title={tr('site.parts.title', { n: PART_COUNT })} text={tr('site.parts.text')} />
      <div className="max-w-7xl mx-auto px-6">
        <Suspense fallback={null}>
          <ThumbHost />
        </Suspense>
        <div className="flex flex-col gap-4 mb-8">
          <Input
            size="md"
            variant="bordered"
            placeholder={tr('site.parts.search')}
            value={q}
            onValueChange={setQ}
            isClearable
            onClear={() => setQ('')}
            startContent={<Search size={16} className="text-neutral-500" />}
            className="max-w-md"
            classNames={{ clearButton: 'cursor-pointer' }}
          />
          <Tabs
            aria-label={tr('site.parts.families')}
            variant="bordered"
            size="sm"
            selectedKey={fam}
            onSelectionChange={(k) => setFam(String(k))}
            classNames={{ base: 'max-w-full', tabList: 'border-1 border-white/10 flex-wrap', tab: 'px-3 w-auto', cursor: '!bg-white', tabContent: 'group-data-[selected=true]:!text-black text-neutral-400 text-xs font-medium' }}
          >
            {[{ key: 'all', label: tr('site.parts.all') }, ...FAMILIES].map((f) => (
              <Tab key={f.key} title={f.label} />
            ))}
          </Tabs>
        </div>

        {shown.length === 0 && <p className="text-neutral-500">{tr('site.parts.none')}</p>}
        {shown.map((f) => (
          <section key={f.key} className="mb-14">
            <h2 className="text-2xl font-semibold text-white mb-6">{f.label}</h2>
            {f.groups.map((g) => (
              <div key={g.label} className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="panel-label">{g.label}</span>
                  <Chip size="sm" variant="flat" classNames={{ base: 'h-5', content: 'text-[10px] px-1' }}>
                    {g.types.length}
                  </Chip>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {g.types.map((t) => (
                    <Card key={t} shadow="none" className="bg-white/[0.03] border border-white/10">
                      <div className="aspect-[4/3] bg-gradient-to-br from-neutral-800/60 to-neutral-950">
                        <Suspense fallback={null}>
                          <PartThumb type={t} />
                        </Suspense>
                      </div>
                      <CardBody className="p-4 gap-1.5">
                        <div className="text-sm text-white font-medium">{partName(t)}</div>
                        <div className="text-xs text-neutral-500 line-clamp-3 leading-relaxed">{partDesc(t)}</div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </>
  )
}
