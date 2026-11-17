// Licenças de software de terceiros incluído no adjeltron (avisos exigidos pelas licenças MIT, Apache, BSD, MPL…).
import { PageHeader } from '../components/site/PageHeader.jsx'
import { ThirdPartyLicenses } from '../components/common/ThirdPartyLicenses.jsx'
import { useT } from '../i18n/index.js'

export default function Licencas() {
  const t = useT()
  return (
    <>
      <PageHeader eyebrow={t('site.licenses.eyebrow')} title={t('site.licenses.title')} text={t('site.licenses.text')} />
      <div className="max-w-7xl mx-auto px-6">
        <ThirdPartyLicenses height="65vh" />
      </div>
    </>
  )
}
