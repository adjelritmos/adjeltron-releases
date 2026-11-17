// Dados das páginas públicas, tirados do catálogo real (as contagens acompanham as peças novas).
import { DEFS } from '@shared/components.js'
import { CATALOG } from '@shared/catalog.js'


export const PART_COUNT = Object.keys(DEFS).length
export const BOARD_TYPES = Object.keys(DEFS).filter((t) => DEFS[t].board)
export const BOARD_COUNT = BOARD_TYPES.length

// label é lido do catálogo a cada acesso: segue o idioma escolhido (shared/i18n/en/catalog.js)
export const FAMILIES = CATALOG.map((f) => ({
  key: f.key,
  get label() {
    return f.label
  },
  count: f.groups.reduce((s, g) => s + g.types.length, 0),
  groups: f.groups,
}))
export const partName = (t) => DEFS[t]?.name || t
export const partDesc = (t) => DEFS[t]?.description || ''
