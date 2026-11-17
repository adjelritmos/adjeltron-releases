// Confirmação global (substitui window.confirm): await confirmDialog({ message, danger })
import { create } from 'zustand'
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react'
import { t } from '../../i18n/index.js'

// ---------------- confirmação global (substitui window.confirm) ----------------
const useConfirmStore = create((set) => ({
  open: false,
  title: 'Confirmar',
  message: '',
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  danger: false,
  resolver: null,
  request: (opts) =>
    new Promise((resolve) => {
      set({
        open: true,
        title: opts.title ?? t('common.confirm'),
        message: opts.message ?? '',
        confirmLabel: opts.confirmLabel ?? t('common.confirm'),
        cancelLabel: opts.cancelLabel ?? t('common.cancel'),
        danger: !!opts.danger,
        resolver: resolve,
      })
    }),
  close: (result) =>
    set((s) => {
      s.resolver?.(result)
      return { open: false, resolver: null }
    }),
}))

// API pública: await confirmDialog({ message: 'Substituir?', danger: true })
// aceita string simples por conveniência: await confirmDialog('Substituir?')
export function confirmDialog(opts) {
  const o = typeof opts === 'string' ? { message: opts } : opts || {}
  return useConfirmStore.getState().request(o)
}

export function ConfirmHost() {
  const { open, title, message, confirmLabel, cancelLabel, danger, close } = useConfirmStore()
  return (
    <Modal classNames={{ closeButton: 'cursor-pointer' }} isOpen={open} onOpenChange={(v) => !v && close(false)} size="sm" backdrop="blur">
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="text-sm">{title}</ModalHeader>
            <ModalBody>
              <p className="text-xs text-neutral-300 whitespace-pre-wrap">{message}</p>
            </ModalBody>
            <ModalFooter>
              <Button size="sm" variant="light" onPress={() => close(false)}>
                {cancelLabel}
              </Button>
              <Button size="sm" color={danger ? 'danger' : 'primary'} onPress={() => close(true)}>
                {confirmLabel}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}
