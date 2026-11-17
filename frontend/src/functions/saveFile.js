// "Guardar como": o utilizador escolhe a pasta e o nome do ficheiro.
//  - app desktop (Tauri): janela nativa do sistema (comando save_file em src-tauri/src/lib.rs);
//  - Chrome / Edge: showSaveFilePicker;
//  - outros browsers (Safari, Firefox): download normal (vai para a pasta de transferências,
//    ou o browser pergunta onde, conforme as definições dele).
// Devolve true se gravou, false se o utilizador cancelou.

import { t as tr } from '../i18n/index.js'

const tauri = () => globalThis.__TAURI_INTERNALS__

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).slice(String(r.result).indexOf(',') + 1))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

function downloadLink(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// type: { description: 'Projeto adjeltron', ext: '.adjel', mime: 'application/json' }
export async function saveFile(blob, name, type = {}) {
  const ext = type.ext || (name.includes('.') ? name.slice(name.lastIndexOf('.')) : '')
  const description = type.description || tr('wb.file.generic')
  const t = tauri()
  if (t) {
    const path = await t.invoke('save_file', { name, data: await toBase64(blob), filterName: description, extensions: ext ? [ext.replace(/^\./, '')] : [] })
    return !!path
  }
  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const h = await window.showSaveFilePicker({ suggestedName: name, types: ext ? [{ description, accept: { [type.mime || blob.type || 'application/octet-stream']: [ext] } }] : undefined })
      const w = await h.createWritable()
      await w.write(blob)
      await w.close()
      return true
    } catch (e) {
      if (e?.name === 'AbortError') return false // cancelado
      // sem gesto do utilizador recente (ex.: depois de renderizar uma imagem grande): download normal
    }
  }
  downloadLink(blob, name)
  return true
}
