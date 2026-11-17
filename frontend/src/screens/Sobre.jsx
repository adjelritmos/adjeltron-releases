// Sobre o projeto: o que é, para quem, como está feito e com que tecnologias.
import { Card, CardBody, Chip, Button, Link, Divider } from '@heroui/react'
import { Target, Users, Layers, Server, Monitor, Share2, Play } from 'lucide-react'
import { PageHeader } from '../components/site/PageHeader.jsx'
import { PART_COUNT } from '../functions/siteData.js'
import { useT } from '../i18n/index.js'

// textos em src/i18n/locales/site.js (site.about.*)
const PARA_QUEM = [
  { icon: Users, title: 'site.about.fw1t', text: 'site.about.fw1d' },
  { icon: Target, title: 'site.about.fw2t', text: 'site.about.fw2d' },
  { icon: Share2, title: 'site.about.fw3t', text: 'site.about.fw3d' },
]

const ARQ = [
  { icon: Server, title: 'site.about.arch1t', text: 'site.about.arch1d' },
  { icon: Layers, title: 'site.about.arch2t', text: 'site.about.arch2d' },
  { icon: Monitor, title: 'site.about.arch3t', text: 'site.about.arch3d' },
]

const PRINCIPIOS = [
  ['site.about.pr1t', 'site.about.pr1d'],
  ['site.about.pr2t', 'site.about.pr2d'],
  ['site.about.pr3t', 'site.about.pr3d'],
]

const TECH = ['React 19', 'Three.js', 'React Three Fiber', 'Rapier', 'HeroUI', 'Tailwind CSS', 'Zustand', 'CodeMirror', 'Bun', 'avr8js', 'arduino-cli', 'MQTT']

export default function Sobre() {
  const t = useT()
  return (
    <>
      <PageHeader eyebrow={t('site.about.eyebrow')} title={t('site.about.title')} text={t('site.about.text')} />

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[1.2fr_1fr] gap-12">
        <div className="flex flex-col gap-5 text-neutral-300 leading-relaxed">
          <p>
            {t('site.about.p1a')}
            <span className="text-white">{t('site.about.p1b')}</span>
            {t('site.about.p1c')}
          </p>
          <p>
            {t('site.about.p2')}
          </p>
          <p>
            {t('site.about.p3a')}
            <span className="text-white">{t('site.about.p3b')}</span>
            {t('site.about.p3c')}
          </p>
        </div>
        <Card shadow="none" className="bg-white/[0.03] border border-white/10 h-fit">
          <CardBody className="p-6 gap-4">
            <div className="panel-label">{t('site.about.principles')}</div>
            {PRINCIPIOS.map(([ti, d]) => (
              <div key={ti}>
                <div className="text-white text-sm font-medium">{t(ti)}</div>
                <div className="text-sm text-neutral-400 mt-1">{t(d)}</div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-20">
        <h2 className="text-2xl font-semibold text-white mb-6">{t('site.about.forWhom')}</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {PARA_QUEM.map(({ icon: Icon, title, text }) => (
            <Card key={title} shadow="none" className="bg-white/[0.03] border border-white/10">
              <CardBody className="p-6 gap-3">
                <Icon size={20} className="text-white" />
                <div className="text-white font-medium">{t(title)}</div>
                <p className="text-sm text-neutral-400 leading-relaxed">{t(text)}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-20">
        <h2 className="text-2xl font-semibold text-white mb-6">{t('site.about.howBuilt')}</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {ARQ.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-white" />
              </div>
              <div>
                <div className="text-white font-medium">{t(title)}</div>
                <p className="text-sm text-neutral-400 mt-1 leading-relaxed">{t(text, { n: PART_COUNT })}</p>
              </div>
            </div>
          ))}
        </div>
        <Divider className="bg-white/10 my-10" />
        <div className="panel-label mb-3">{t('site.about.tech')}</div>
        <div className="flex flex-wrap gap-2">
          {TECH.map((t) => (
            <Chip key={t} variant="bordered" className="border-white/15 text-neutral-300">
              {t}
            </Chip>
          ))}
        </div>
        <Button as={Link} href="/app" color="primary" radius="full" className="mt-12 font-medium" startContent={<Play size={16} />}>
          {t('site.about.openSimulator')}
        </Button>
      </div>
    </>
  )
}
