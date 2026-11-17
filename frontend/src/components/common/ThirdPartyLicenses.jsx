// Licenças de software de terceiros: lista pesquisável dos pacotes incluídos no adjeltron
// (npm, crates Rust da app desktop e bibliotecas incluídas) com o texto de cada licença.
// Os dados vêm de /licenses/third-party-licenses.json, gerado por scripts/gen-licenses.mjs
// em cada build. Usado na página /licencas e no diálogo das Definições da bancada.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Chip, Input, Listbox, ListboxItem, Modal, ModalBody, ModalContent, ModalHeader, ScrollShadow, Spinner, Tab, Tabs } from '@heroui/react'
import { Download, ExternalLink, Scale, Search } from 'lucide-react'
import { useT } from '../../i18n/index.js'

const JSON_URL = '/licenses/third-party-licenses.json'
export const LICENSES_TXT_URL = '/licenses/THIRD_PARTY_LICENSES.txt'
// rótulos: texto fixo ou chave de tradução (src/i18n/locales/licenses.js)
const SOURCES = [
  { key: 'all', label: 'licenses.all' },
  { key: 'npm', label: 'npm' },
  { key: 'cargo', label: 'Rust' },
  { key: 'bundled', label: 'licenses.bundled' },
]
const SOURCE_LABEL = { npm: 'npm', cargo: 'Rust', bundled: 'licenses.bundledLong' }
const lbl = (t, s) => (s.startsWith('licenses.') ? t(s) : s)

let cache = null
function loadLicenses() {
  cache ??= fetch(JSON_URL).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  })
  cache.catch(() => (cache = null))
  return cache
}

export function ThirdPartyLicenses({ height = '60vh' }) {
  const t = useT()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('all')
  const [selected, setSelected] = useState(null)
  // a lista virtualizada precisa da altura exata da caixa para ter o seu próprio scroll
  const listBox = useRef(null)
  const [listHeight, setListHeight] = useState(400)
  useEffect(() => {
    const el = listBox.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setListHeight(Math.max(120, Math.floor(e.contentRect.height))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [data])

  useEffect(() => {
    loadLicenses().then(setData, (e) => setError(e.message))
  }, [])

  const items = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    return data.packages
      .map((p, i) => ({ ...p, key: String(i) }))
      .filter((p) => (source === 'all' || p.source === source) && (!q || p.name.toLowerCase().includes(q) || p.license.toLowerCase().includes(q)))
  }, [data, query, source])

  if (error) return <p className="text-sm text-danger">{t('licenses.loadError', { error })}</p>
  if (!data) return <Spinner size="sm" color="white" label={t('licenses.loading')} className="py-10 w-full" />

  const pkg = selected != null ? data.packages[selected] : null
  const count = (k) => (k === 'all' ? data.packages.length : data.packages.filter((p) => p.source === k).length)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          size="sm"
          variant="bordered"
          isClearable
          aria-label={t('licenses.searchLabel')}
          placeholder={t('licenses.search')}
          startContent={<Search size={14} className="text-neutral-500" />}
          value={query}
          onValueChange={setQuery}
          className="sm:max-w-xs"
        />
        <Tabs size="sm" variant="bordered" aria-label={t('licenses.source')} selectedKey={source} onSelectionChange={(k) => setSource(String(k))} classNames={{ base: 'max-w-full', tabList: 'max-w-full overflow-x-auto' }}>
          {SOURCES.map((s) => (
            <Tab key={s.key} title={`${lbl(t, s.label)} (${count(s.key)})`} />
          ))}
        </Tabs>
        <Button as="a" href={LICENSES_TXT_URL} download size="sm" variant="flat" startContent={<Download size={14} />} className="sm:ml-auto">
          {t('licenses.downloadTxt')}
        </Button>
      </div>

      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 md:h-[var(--lic-h)]" style={{ '--lic-h': height }}>
        <div ref={listBox} className="border border-white/10 rounded-lg overflow-hidden min-h-0 max-md:h-[40vh]">
          {items.length ? (
            <Listbox
              aria-label={t('licenses.packages')}
              items={items}
              isVirtualized
              virtualization={{ maxListboxHeight: listHeight - 8, itemHeight: 44 }}
              selectionMode="single"
              selectedKeys={selected != null ? [String(selected)] : []}
              onSelectionChange={(keys) => {
                const k = [...keys][0]
                if (k != null) setSelected(Number(k))
              }}
              hideSelectedIcon
              classNames={{ base: 'p-1' }}
            >
              {(p) => (
                <ListboxItem key={p.key} textValue={p.name} description={`${p.version ? p.version + ' · ' : ''}${p.license}`} className="data-[selected=true]:bg-white/10">
                  {p.name}
                </ListboxItem>
              )}
            </Listbox>
          ) : (
            <p className="p-4 text-sm text-neutral-500">{t('licenses.none')}</p>
          )}
        </div>

        <div className="border border-white/10 rounded-lg min-h-0 flex flex-col max-md:h-[50vh]">
          {pkg ? (
            <>
              <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-white/10">
                <span className="text-white font-medium">{pkg.name}</span>
                {pkg.version && <span className="text-xs text-neutral-500">{pkg.version}</span>}
                <Chip size="sm" variant="flat">
                  {pkg.license}
                </Chip>
                <Chip size="sm" variant="bordered" className="border-white/15 text-neutral-400">
                  {lbl(t, SOURCE_LABEL[pkg.source])}
                </Chip>
                {pkg.repository && (
                  <Button as="a" href={pkg.repository} target="_blank" rel="noreferrer" size="sm" variant="light" isIconOnly aria-label={t('licenses.sourceCode')} className="ml-auto text-neutral-400">
                    <ExternalLink size={14} />
                  </Button>
                )}
              </div>
              <ScrollShadow className="flex-1 min-h-0 p-4">
                {pkg.texts.length ? (
                  pkg.texts.map((id) => (
                    <pre key={id} className="whitespace-pre-wrap break-words text-xs leading-relaxed text-neutral-300 font-mono mb-6 last:mb-0">
                      {data.texts[id]}
                    </pre>
                  ))
                ) : (
                  <p className="text-sm text-neutral-500">{t('licenses.spdx', { id: pkg.license })}</p>
                )}
              </ScrollShadow>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-neutral-500 p-6 text-center">
              <Scale size={22} />
              <p className="text-sm">{t('licenses.pick')}</p>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-neutral-500 leading-relaxed">
        {t('licenses.note')}
      </p>
    </div>
  )
}

export function ThirdPartyLicensesModal({ isOpen, onOpenChange }) {
  const t = useT()
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="5xl" backdrop="opaque" scrollBehavior="inside" classNames={{ base: 'bg-neutral-950 border border-white/10' }}>
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <Scale size={16} /> {t('licenses.title')}
        </ModalHeader>
        <ModalBody className="pb-6">
          <ThirdPartyLicenses height="58vh" />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
