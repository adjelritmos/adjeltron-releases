// Bibliotecas do utilizador: carregar um .zip (como os do GitHub / Arduino) ou ficheiros .h/.cpp
// soltos. Ficam no projeto (vão no .adjel) e entram na compilação: o tradutor inclui-as no
// sítio do #include e a compilação real (arduino-cli, app desktop) recebe-as como bibliotecas.
import { useRef, useState } from 'react'
import { Button, Chip, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Tooltip } from '@heroui/react'
import { BookPlus, FileCode2, FolderArchive, Library, Trash2, Upload } from 'lucide-react'
import { unzipSync, strFromU8 } from 'fflate'
import { useStore } from '../../contexts/store.js'
import { confirmDialog } from '../common/ConfirmDialog.jsx'
import { useT } from '../../i18n/index.js'

const SRC = /\.(h|hh|hpp|c|cc|cpp|ino)$/i
const MAX_BYTES = 4_000_000

// .zip → [{ name, files }] (uma biblioteca por library.properties / pasta de topo)
function libsFromZip(buf, zipName) {
  const all = unzipSync(new Uint8Array(buf))
  const groups = {}
  for (const [path, data] of Object.entries(all)) {
    if (path.endsWith('/') || /(^|\/)(examples?|extras|test|tests|docs?)\//i.test(path) || /(^|\/)\./.test(path)) continue
    const parts = path.split('/')
    const root = parts.length > 1 ? parts[0] : ''
    const g = (groups[root] ||= { name: '', files: {} })
    const base = parts.at(-1)
    if (base === 'library.properties') {
      const m = strFromU8(data).match(/^\s*name\s*=\s*(.+)$/m)
      if (m) g.name = m[1].trim()
    } else if (SRC.test(base) && !/\.ino$/i.test(base)) g.files[base] = strFromU8(data)
  }
  return Object.entries(groups)
    .filter(([, g]) => Object.keys(g.files).length)
    .map(([root, g]) => ({ name: g.name || root.replace(/-(main|master)$/i, '') || zipName.replace(/\.zip$/i, ''), files: g.files }))
}

export function LibrariesButton() {
  const t = useT()
  const libs = useStore((s) => s.libs) || []
  const set = useStore((s) => s.set)
  const notify = useStore((s) => s.notify)
  const [open, setOpen] = useState(false)
  const input = useRef(null)

  const addLibs = (list) => {
    const cur = useStore.getState().libs || []
    const merged = [...cur.filter((l) => !list.some((n) => n.name === l.name)), ...list]
    const size = JSON.stringify(merged).length
    if (size > MAX_BYTES) return notify(t('wb.libs.tooBig', { mb: (size / 1e6).toFixed(1) }))
    set({ libs: merged })
    notify(list.length === 1 ? t('wb.libs.loadedOne', { name: list[0].name }) : t('wb.libs.loadedMany', { n: list.length }))
  }

  const onFiles = async (files) => {
    const out = []
    const loose = {}
    try {
      for (const f of files) {
        if (/\.zip$/i.test(f.name)) out.push(...libsFromZip(await f.arrayBuffer(), f.name))
        else if (SRC.test(f.name)) loose[f.name] = await f.text()
      }
    } catch (e) {
      return notify(t('wb.libs.readFailed', { msg: e.message }))
    }
    // ficheiros soltos: uma biblioteca com o nome do primeiro .h
    const names = Object.keys(loose)
    if (names.length) out.push({ name: (names.find((n) => /\.h(h|pp)?$/i.test(n)) || names[0]).replace(/\.\w+$/, ''), files: loose })
    if (!out.length) return notify(t('wb.libs.noneFound'))
    addLibs(out)
  }

  const remove = async (lib) => {
    if (!(await confirmDialog({ title: t('wb.libs.removeTitle'), message: t('wb.libs.removeMsg', { name: lib.name }), confirmLabel: t('wb.libs.remove'), danger: true }))) return
    set({ libs: (useStore.getState().libs || []).filter((l) => l !== lib) })
  }

  const headers = (l) => Object.keys(l.files).filter((f) => /\.h(h|pp)?$/i.test(f))
  const kb = (l) => Math.max(1, Math.round(Object.values(l.files).reduce((a, t) => a + t.length, 0) / 1024))

  return (
    <>
      <Tooltip placement="bottom" content={t('wb.libs.tip')} size="sm" delay={300} closeDelay={0}>
        <Button size="sm" variant="light" isIconOnly aria-label={t('wb.libs.aria')} className="relative text-neutral-400 data-[hover=true]:text-white" onPress={() => setOpen(true)}>
          <Library size={15} />
          {libs.length > 0 && <span className="absolute top-0.5 right-0.5 text-[9px] leading-none bg-primary text-white rounded-full px-1">{libs.length}</span>}
        </Button>
      </Tooltip>
      <input
        ref={input}
        type="file"
        multiple
        accept=".zip,.h,.hh,.hpp,.c,.cc,.cpp"
        className="hidden"
        onChange={(e) => {
          onFiles([...(e.target.files || [])])
          e.target.value = ''
        }}
      />
      <Modal isOpen={open} onOpenChange={setOpen} size="2xl" backdrop="blur" scrollBehavior="inside" classNames={{ closeButton: 'cursor-pointer', base: 'bg-[#0d0d0d] border border-white/10' }}>
        <ModalContent>
          <ModalHeader className="flex items-center gap-2 text-base">
            <Library size={18} /> {t('wb.libs.title')}
          </ModalHeader>
          <ModalBody>
            <p className="text-xs text-neutral-400">
              {t({
                pt: (
                  <>
                    Carregue uma biblioteca sua ou de terceiros: o <b>.zip</b> (como o do GitHub ou do Arduino) ou os ficheiros <b>.h</b> e <b>.cpp</b>. Fica guardada no projeto (também no ficheiro .adjel) e usa-se com <code className="text-primary">#include &lt;Nome.h&gt;</code>.
                    No simulador rápido o código da biblioteca é traduzido com o resto do sketch; na app desktop, nas placas Uno/Nano/Mega, a compilação real (avr-gcc) usa-a tal como está.
                  </>
                ),
                en: (
                  <>
                    Upload your own or a third-party library: the <b>.zip</b> (like the one from GitHub or Arduino) or the <b>.h</b> and <b>.cpp</b> files. It is saved in the project (also in the .adjel file) and used with <code className="text-primary">#include &lt;Name.h&gt;</code>.
                    In the fast simulator the library code is translated together with the rest of the sketch; in the desktop app, on Uno/Nano/Mega boards, the real compilation (avr-gcc) uses it as is.
                  </>
                ),
              })}
            </p>
            {libs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-neutral-500 border border-dashed border-white/10 rounded-lg">
                <BookPlus size={28} />
                <span className="text-sm">{t('wb.libs.empty')}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {libs.map((l) => (
                  <div key={l.name} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                    <FolderArchive size={18} className="mt-0.5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{l.name}</span>
                        <Chip size="sm" variant="flat">
                          {t('wb.libs.files', { n: Object.keys(l.files).length, kb: kb(l) })}
                        </Chip>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {headers(l).map((h) => (
                          <Chip key={h} size="sm" variant="bordered" startContent={<FileCode2 size={11} />} className="font-mono text-[11px]">
                            #include &lt;{h}&gt;
                          </Chip>
                        ))}
                      </div>
                    </div>
                    <Tooltip content={t('wb.libs.remove')} size="sm">
                      <Button size="sm" isIconOnly variant="light" color="danger" aria-label={t('wb.libs.removeAria', { name: l.name })} onPress={() => remove(l)}>
                        <Trash2 size={14} />
                      </Button>
                    </Tooltip>
                  </div>
                ))}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setOpen(false)}>
              {t('common.close')}
            </Button>
            <Button color="primary" startContent={<Upload size={15} />} onPress={() => input.current?.click()}>
              {t('wb.libs.upload')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
