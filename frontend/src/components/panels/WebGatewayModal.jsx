// Botão "Abrir página do ESP32": mostra num Modal (iframe) o WebServer do sketch, servido
// em /api/gw/<sessão>/… pelo service worker /gw-sw.js (ver services/gateway.js).
import { useState } from 'react'
import { Button, Input, Modal, ModalBody, ModalContent, ModalHeader, Tooltip } from '@heroui/react'
import { ExternalLink, Globe, RotateCw } from 'lucide-react'
import { useStore } from '../../contexts/store.js'
import { useNet } from '../../contexts/netStore.js'
import { DEFS, boardProfile } from '@shared/components.js'
import { apiUrl } from '../../services/apiBase.js'
import { useT } from '../../i18n/index.js'

export function WebGatewayButton() {
  const t = useT()
  // placas com Wi-Fi: ESP32, Pico W, Pico 2 W (perfil com wifi: true)
  const isEsp = useStore((s) => s.parts.some((p) => boardProfile(p.type)?.wifi && DEFS[p.type]?.board))
  const running = useStore((s) => s.mode === 'sim')
  const session = useNet((s) => s.session)
  const [open, setOpen] = useState(false)
  const [path, setPath] = useState('/')
  const [nonce, setNonce] = useState(0)
  // só aparece com um ESP32 no projeto e a simulação a correr
  if (!isEsp || !running) return null
  const p = path.startsWith('/') ? path : `/${path}`
  const url = session ? apiUrl(`/api/gw/${session}${p}`) : null
  return (
    <>
      <Tooltip content={t('tools.web.openTip')} size="sm" delay={300} closeDelay={0}>
        <span>
          <Button size="sm" variant="light" isIconOnly aria-label={t('tools.web.open')} className="h-7 w-7 min-w-7 text-neutral-400 data-[hover=true]:text-white" isDisabled={!session} onPress={() => setOpen(true)}>
            <Globe size={14} />
          </Button>
        </span>
      </Tooltip>
      <Modal isOpen={open} onOpenChange={setOpen} size="4xl" backdrop="blur" classNames={{ closeButton: 'cursor-pointer', base: 'bg-[#0d0d0d] border border-white/10' }}>
        <ModalContent>
          <ModalHeader className="flex items-center gap-2 text-sm pr-10">
            <Globe size={15} className="text-neutral-400" />
            <span className="shrink-0">{t('tools.web.title')}</span>
            <form
              className="flex-1 flex items-center gap-1.5"
              onSubmit={(e) => {
                e.preventDefault()
                setNonce((n) => n + 1)
              }}
            >
              <Input size="sm" variant="bordered" aria-label={t('tools.web.path')} value={path} onValueChange={setPath} classNames={{ closeButton: 'cursor-pointer', input: 'font-mono text-xs', inputWrapper: 'h-7 min-h-7' }} />
              <Tooltip content={t('tools.web.reload')} size="sm" delay={300} closeDelay={0}>
                <Button size="sm" type="submit" variant="flat" isIconOnly aria-label={t('tools.web.reload')} className="h-7 w-7 min-w-7">
                  <RotateCw size={13} />
                </Button>
              </Tooltip>
              <Tooltip content={t('tools.web.newTab')} size="sm" delay={300} closeDelay={0}>
                <Button size="sm" as="a" href={url || '#'} target="_blank" rel="noreferrer" variant="flat" isIconOnly aria-label={t('tools.web.newTab')} className="h-7 w-7 min-w-7">
                  <ExternalLink size={13} />
                </Button>
              </Tooltip>
            </form>
          </ModalHeader>
          <ModalBody className="p-0 pb-3 px-3">
            {url ? <iframe key={`${url}#${nonce}`} title={t('tools.web.iframe')} src={url} className="w-full h-[65vh] rounded-md bg-white border border-white/10" /> : <div className="text-neutral-500 text-sm p-6">{t('tools.web.notStarted')}</div>}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}
