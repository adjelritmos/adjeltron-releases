// Funcionalidades em detalhe.
import { Card, CardBody, Button, Link } from '@heroui/react'
import { Check, Play } from 'lucide-react'
import { FEATURES, EXTRAS } from '../components/site/features.jsx'
import { PageHeader } from '../components/site/PageHeader.jsx'
import { useT } from '../i18n/index.js'

export default function Funcionalidades() {
  const t = useT()
  return (
    <>
      <PageHeader eyebrow={t('site.features.eyebrow')} title={t('site.features.title')} text={t('site.features.text')} />
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-4">
        {FEATURES.map(({ key, icon: Icon, title, text, details }) => (
          <Card key={key} shadow="none" className="bg-white/[0.03] border border-white/10">
            <CardBody className="p-7 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  <Icon size={20} className="text-white" />
                </div>
                <h2 className="text-lg text-white font-medium">{t(title)}</h2>
              </div>
              <p className="text-neutral-400 leading-relaxed">{t(text)}</p>
              <ul className="flex flex-col gap-2">
                {details.map((d) => (
                  <li key={d.pt} className="flex gap-2 text-sm text-neutral-300">
                    <Check size={16} className="text-success shrink-0 mt-0.5" />
                    {t(d)}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-16">
        <div className="panel-label mb-4">{t('site.features.more')}</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {EXTRAS.map(({ key, icon: Icon, title, text }) => (
            <div key={key} className="flex gap-3">
              <Icon size={18} className="text-neutral-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-white text-sm font-medium">{t(title)}</div>
                <div className="text-sm text-neutral-500 mt-1">{t(text)}</div>
              </div>
            </div>
          ))}
        </div>
        <Button as={Link} href="/app" color="primary" radius="full" className="mt-12 font-medium" startContent={<Play size={16} />}>
          {t('site.features.tryNow')}
        </Button>
      </div>
    </>
  )
}
