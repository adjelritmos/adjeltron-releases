// 404
import { Button, Link } from '@heroui/react'
import { Home } from 'lucide-react'
import { useT } from '../i18n/index.js'

export default function NaoEncontrada() {
  const t = useT()
  return (
    <div className="max-w-7xl mx-auto px-6 py-32 text-center">
      <div className="text-7xl font-semibold text-white tabular-nums">404</div>
      <p className="mt-4 text-neutral-400">{t('site.notFound.text')}</p>
      <Button as={Link} href="/" color="primary" radius="full" className="mt-8 font-medium" startContent={<Home size={16} />}>
        {t('site.notFound.back')}
      </Button>
    </div>
  )
}
