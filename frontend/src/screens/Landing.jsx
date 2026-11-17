// Página inicial: apresentação, montra 3D, números do catálogo, funcionalidades e chamada final.
import { Suspense, lazy, useEffect, useState } from 'react'
import { Button, Card, CardBody, Chip, Link } from '@heroui/react'
import { ArrowRight, Play, BookOpen, Download } from 'lucide-react'
import { FEATURES, STEPS } from '../components/site/features.jsx'
import { PART_COUNT, BOARD_COUNT, FAMILIES } from '../functions/siteData.js'
import { api } from '../services/api.js'
import { useT } from '../i18n/index.js'

const HeroGallery = lazy(() => import('../components/site/HeroGallery.jsx'))

function useExampleCount() {
  const [n, setN] = useState(null)
  useEffect(() => {
    api.examples().then((l) => setN(l.length)).catch(() => setN(null))
  }, [])
  return n
}

export function Section({ eyebrow, title, text, children, className = '' }) {
  return (
    <section className={`max-w-7xl mx-auto px-6 mt-28 ${className}`}>
      <div className="max-w-2xl mb-10">
        {eyebrow && <div className="panel-label mb-3">{eyebrow}</div>}
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">{title}</h2>
        {text && <p className="mt-4 text-neutral-400 leading-relaxed">{text}</p>}
      </div>
      {children}
    </section>
  )
}

export default function Landing() {
  const t = useT()
  const examples = useExampleCount()
  const stats = [
    { key: 'parts', value: PART_COUNT, label: t('site.landing.stat.parts') },
    { key: 'examples', value: examples ?? '90+', label: t('site.landing.stat.examples') },
    { key: 'boards', value: BOARD_COUNT, label: t('site.landing.stat.boards') },
    { key: 'families', value: FAMILIES.length, label: t('site.landing.stat.families') },
  ]
  return (
    <>
      {/* ---------- apresentação ---------- */}
      <section className="relative">
        <div className="absolute inset-0 -z-0 pointer-events-none bg-[radial-gradient(ellipse_at_70%_40%,rgba(255,255,255,0.08),transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-6 pt-16 lg:pt-24 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <Chip variant="bordered" size="sm" className="border-white/15 text-neutral-400 mb-6">
              {t('site.landing.badge')}
            </Chip>
            <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-white leading-[1.05]">
              {t('site.landing.title1')}
              <span className="block text-neutral-500">{t('site.landing.title2')}</span>
            </h1>
            <p className="mt-6 text-lg text-neutral-400 max-w-xl leading-relaxed">
              {t('site.landing.lead')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button as={Link} href="/app" color="primary" size="lg" radius="full" startContent={<Play size={18} />} className="font-medium">
                {t('site.landing.openSimulator')}
              </Button>
              <Button as={Link} href="/descarregar" variant="bordered" size="lg" radius="full" startContent={<Download size={18} />} className="border-white/20 text-white">
                {t('download.cta')}
              </Button>
              <Button as={Link} href="/exemplos" variant="light" size="lg" radius="full" endContent={<ArrowRight size={18} />} className="text-neutral-300">
                {t('site.landing.seeExamples')}
              </Button>
            </div>
          </div>
          <div className="h-[300px] sm:h-[420px] lg:h-[500px]">
            <Suspense fallback={null}>
              <HeroGallery />
            </Suspense>
          </div>
        </div>

        {/* números */}
        <div className="relative max-w-7xl mx-auto px-6 mt-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 rounded-xl overflow-hidden border border-white/10">
            {stats.map((s) => (
              <div key={s.key} className="bg-background p-6">
                <div className="text-3xl font-semibold text-white tabular-nums">{s.value}</div>
                <div className="text-sm text-neutral-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- funcionalidades ---------- */}
      <Section eyebrow={t('site.landing.features.eyebrow')} title={t('site.landing.features.title')} text={t('site.landing.features.text')}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ key, icon: Icon, title, text }) => (
            <Card key={key} shadow="none" className="bg-white/[0.03] border border-white/10">
              <CardBody className="p-6 gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  <Icon size={20} className="text-white" />
                </div>
                <h3 className="text-white font-medium">{t(title)}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{t(text)}</p>
              </CardBody>
            </Card>
          ))}
        </div>
        <div className="mt-6">
          <Link href="/funcionalidades" className="text-neutral-300 hover:text-white text-sm gap-1">
            {t('site.landing.features.all')} <ArrowRight size={14} />
          </Link>
        </div>
      </Section>

      {/* ---------- como funciona ---------- */}
      <Section eyebrow={t('site.landing.how.eyebrow')} title={t('site.landing.how.title')}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s) => (
            <div key={s.n} className="relative pl-12">
              <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-white text-black font-semibold flex items-center justify-center text-sm">{s.n}</div>
              <h3 className="text-white font-medium">{t(s.title)}</h3>
              <p className="text-sm text-neutral-400 mt-2 leading-relaxed">{t(s.text)}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- catálogo ---------- */}
      <Section eyebrow={t('site.landing.catalog.eyebrow')} title={t('site.landing.catalog.title', { n: PART_COUNT })} text={t('site.landing.catalog.text')}>
        <div className="flex flex-wrap gap-2">
          {FAMILIES.map((f) => (
            <Chip key={f.key} variant="bordered" className="border-white/15 text-neutral-300 h-9 px-2" endContent={<span className="text-neutral-500 text-xs ml-1 mr-1 tabular-nums">{f.count}</span>}>
              {f.label}
            </Chip>
          ))}
        </div>
        <div className="mt-6">
          <Link href="/componentes" className="text-neutral-300 hover:text-white text-sm gap-1">
            {t('site.landing.catalog.explore')} <ArrowRight size={14} />
          </Link>
        </div>
      </Section>

      {/* ---------- chamada final ---------- */}
      <section className="max-w-7xl mx-auto px-6 mt-28">
        <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.01))] p-10 sm:p-14 flex flex-col lg:flex-row gap-8 lg:items-center justify-between">
          <div className="max-w-xl">
            <h2 className="text-3xl font-semibold tracking-tight text-white">{t('site.landing.cta.title')}</h2>
            <p className="mt-3 text-neutral-400">{t('site.landing.cta.text')}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button as={Link} href="/app" color="primary" size="lg" radius="full" startContent={<Play size={18} />} className="font-medium">
              {t('site.landing.openSimulator')}
            </Button>
            <Button as={Link} href="/sobre" variant="bordered" size="lg" radius="full" startContent={<BookOpen size={18} />} className="border-white/20 text-white">
              {t('site.landing.cta.about')}
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
