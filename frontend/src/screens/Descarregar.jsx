// Descarregar a app desktop (Windows / macOS): instaladores da última Release do GitHub.
// Links externos com <a> normal: o Link do HeroUI passa o href pelo router (ficaria /descarregar/https:/…).
import { useEffect, useState } from 'react'
import { Button, Card, CardBody, Chip, Link, Divider, Skeleton } from '@heroui/react'
import { Download, Monitor, Apple, ExternalLink, Cpu, Wifi, HardDrive, Globe } from 'lucide-react'
import { PageHeader } from '../components/site/PageHeader.jsx'
import { useT, locale } from '../i18n/index.js'
import { RELEASES_URL, detectOS, latestRelease, sizeMB } from '../functions/downloads.js'

function Platform({ icon: Icon, name, req, primary, files, note, highlight, loading }) {
  const t = useT()
  return (
    <Card shadow="none" className={`border ${highlight ? 'border-white/40 bg-white/[0.06]' : 'border-white/10 bg-white/[0.03]'}`}>
      <CardBody className="p-6 gap-4">
        <div className="flex items-center gap-3">
          <Icon size={22} className="text-white" />
          <div>
            <div className="text-white font-medium">{name}</div>
            <div className="text-xs text-neutral-500">{req}</div>
          </div>
          {highlight && (
            <Chip size="sm" variant="flat" className="ml-auto">
              {t('download.yourSystem')}
            </Chip>
          )}
        </div>
        {loading ? (
          <Skeleton className="h-10 rounded-full" />
        ) : (
          <Button as="a" href={primary?.url || RELEASES_URL} {...(primary ? {} : { target: '_blank', rel: 'noreferrer' })} color={highlight ? 'primary' : 'default'} variant={highlight ? 'solid' : 'flat'} radius="full" startContent={<Download size={16} />} className="font-medium">
            {primary ? `${t('common.download')} ${primary.label}${primary.size ? ` · ${sizeMB(primary.size)}` : ''}` : t('download.seeReleases')}
          </Button>
        )}
        {files?.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {files.map((f) => (
              <Button key={f.url} as="a" href={f.url} size="sm" variant="light" className="text-neutral-400 hover:text-white px-2 -mx-2 h-7 min-w-0">
                {f.label}
              </Button>
            ))}
          </div>
        )}
        <p className="text-xs text-neutral-500 leading-relaxed">{note}</p>
      </CardBody>
    </Card>
  )
}

export default function Descarregar() {
  const t = useT()
  const [rel, setRel] = useState(undefined) // undefined = a carregar, null = sem Release
  const os = detectOS()
  useEffect(() => {
    latestRelease().then(setRel)
  }, [])
  const loading = rel === undefined
  const win = rel?.windows
  const mac = rel?.mac

  return (
    <>
      <PageHeader eyebrow={t('download.eyebrow')} title={t('download.title')} text={t('download.text')}>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
          {rel?.version && (
            <Chip variant="bordered" className="border-white/15 text-neutral-300">
              {t('download.version', { v: rel.version })}
            </Chip>
          )}
          {rel?.date && <span>{t('download.published', { date: new Date(rel.date).toLocaleDateString(locale()) })}</span>}
          {rel === null && <span>{t('download.noRelease')}</span>}
        </div>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-4">
        <Platform
          icon={Monitor}
          name="Windows"
          req={t('download.winReq')}
          highlight={os === 'windows'}
          loading={loading}
          primary={win?.exe && { url: win.exe.url, label: '.exe', size: win.exe.size }}
          files={win?.msi ? [{ url: win.msi.url, label: t('download.msiAlt') }] : []}
          note={t('download.winNote')}
        />
        <Platform
          icon={Apple}
          name="macOS"
          req={t('download.macReq')}
          highlight={os === 'mac'}
          loading={loading}
          primary={mac?.dmg && { url: mac.dmg.url, label: '.dmg', size: mac.dmg.size }}
          note={t('download.macNote')}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-16">
        <h2 className="text-2xl font-semibold text-white mb-6">{t('download.whyTitle')}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            [HardDrive, 'download.why1Title', 'download.why1Text'],
            [Cpu, 'download.why2Title', 'download.why2Text'],
            [Wifi, 'download.why3Title', 'download.why3Text'],
          ].map(([Icon, ti, tx]) => (
            <div key={ti} className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-white" />
              </div>
              <div>
                <div className="text-white font-medium">{t(ti)}</div>
                <p className="text-sm text-neutral-400 mt-1 leading-relaxed">{t(tx)}</p>
              </div>
            </div>
          ))}
        </div>
        <Divider className="bg-white/10 my-10" />
        <div className="flex flex-wrap gap-3">
          <Button as={Link} href="/app" variant="bordered" radius="full" startContent={<Globe size={16} />} className="border-white/20">
            {t('download.useWeb')}
          </Button>
          <Button as="a" href={RELEASES_URL} target="_blank" rel="noreferrer" variant="light" radius="full" endContent={<ExternalLink size={14} />} className="text-neutral-400">
            {t('download.allVersions')}
          </Button>
        </div>
      </div>
    </>
  )
}
