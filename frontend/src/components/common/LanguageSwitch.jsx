// Seletor de idioma (PT / EN): usado na barra do site e no cabeçalho da bancada.
import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from '@heroui/react'
import { Check, Languages } from 'lucide-react'
import { LANGS, useLang, useT } from '../../i18n/index.js'

export function LanguageSwitch({ size = 'sm', className = '' }) {
  const t = useT()
  const lang = useLang((s) => s.lang)
  const setLang = useLang((s) => s.setLang)
  const cur = LANGS.find((l) => l.code === lang) || LANGS[0]
  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Button size={size} variant="light" aria-label={t('common.language')} startContent={<Languages size={15} />} className={`text-neutral-400 min-w-0 px-2 ${className}`}>
          {cur.short}
        </Button>
      </DropdownTrigger>
      <DropdownMenu aria-label={t('common.language')} selectionMode="single" selectedKeys={[lang]} onAction={(k) => setLang(String(k))} hideSelectedIcon>
        {LANGS.map((l) => (
          <DropdownItem key={l.code} endContent={l.code === lang ? <Check size={14} /> : null}>
            {l.label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  )
}
