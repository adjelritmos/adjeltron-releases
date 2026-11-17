// Ficheiros de projeto .adjel: exportar o projeto (atual ou guardado) e importar de um ficheiro.
// O ficheiro é JSON: { format: 'adjeltron', version, exported, projectName, parts, wires, code, track, nvm, libs }
// (libs: bibliotecas do utilizador incluídas no projeto — [{ name, files: { 'X.h': texto } }])
import { fileBase } from './exportImage.js'
import { saveFile } from './saveFile.js'
import { t } from '../i18n/index.js'

export const EXT = '.adjel'
const FORMAT = 'adjeltron'
const VERSION = 1

const slugName = (name) =>
  String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

// projeto → ficheiro .adjel ("Guardar como"); true se gravou, false se cancelado
export function exportProjectFile({ projectName, parts, wires, code, track, nvm, libs, lang }) {
  const data = { format: FORMAT, version: VERSION, exported: new Date().toISOString(), projectName, parts, wires, code, track, nvm: nvm ?? null, libs: libs || [], lang: lang || 'cpp' }
  const base = slugName(projectName) || fileBase()
  return saveFile(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `${base}${EXT}`, { description: t('wb.file.projectType'), ext: EXT, mime: 'application/json' })
}

// ficheiro → projeto (lança Error com a mensagem a mostrar se o ficheiro não servir)
export async function readProjectFile(file) {
  let d
  try {
    d = JSON.parse(await file.text())
  } catch {
    throw new Error(t('wb.file.invalidProject'))
  }
  if (!d || typeof d !== 'object' || (d.format && d.format !== FORMAT) || !Array.isArray(d.parts) || !Array.isArray(d.wires)) {
    throw new Error(t('wb.file.invalidProject'))
  }
  if (d.version > VERSION) throw new Error(t('wb.file.newerVersion'))
  const name = String(d.projectName || file.name.replace(/\.[^.]+$/, '') || t({ pt: 'Projeto importado', en: 'Imported project' })).slice(0, 80)
  return { projectName: name, parts: d.parts, wires: d.wires, code: typeof d.code === 'string' ? d.code : '', track: d.track || 'mesa', nvm: d.nvm ?? null, libs: validLibs(d.libs), lang: d.lang === 'fogu' ? 'fogu' : 'cpp' }
}

// bibliotecas vindas de um ficheiro: só nomes e textos
export function validLibs(libs) {
  if (!Array.isArray(libs)) return []
  return libs
    .filter((l) => l && typeof l.name === 'string' && l.files && typeof l.files === 'object')
    .map((l) => ({ name: l.name.slice(0, 80), files: Object.fromEntries(Object.entries(l.files).filter(([k, v]) => typeof v === 'string' && /^[\w.\-/]+$/.test(k))) }))
}

// abre o seletor de ficheiros (.adjel) e devolve o File escolhido (ou null)
export function pickProjectFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = `${EXT},application/json`
    input.onchange = () => resolve(input.files?.[0] || null)
    input.oncancel = () => resolve(null)
    input.click()
  })
}
