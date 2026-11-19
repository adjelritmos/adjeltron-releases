// Instaladores da app desktop: vêm da última Release do GitHub (repositório público adjeltron-releases, criada pelo workflow
// .github/workflows/release.yml a cada tag v*). Lidos da API pública, com cache na sessão.
export const REPO = 'adjelritmos/adjeltron-releases'
export const RELEASES_URL = `https://github.com/${REPO}/releases/latest`
const API = `https://api.github.com/repos/${REPO}/releases/latest`

// sistema de quem visita: 'windows' | 'mac' | 'linux' | 'other'
export function detectOS() {
  const p = `${navigator.userAgentData?.platform || ''} ${navigator.platform || ''} ${navigator.userAgent || ''}`.toLowerCase()
  if (/iphone|ipad|android/.test(p)) return 'other'
  if (/win/.test(p)) return 'windows'
  if (/mac/.test(p)) return 'mac'
  if (/linux|x11/.test(p)) return 'linux'
  return 'other'
}

const pick = (assets, re) => assets.find((a) => re.test(a.name)) || null

// Versão publicada conhecida: a deste build (frontend/package.json, igual à da app desktop), usada
// quando a API do GitHub não responde (sem rede, limite de pedidos, ou repositório privado).
import { version as APP_VERSION } from '../../package.json'
const DL = `https://github.com/${REPO}/releases/download/v${APP_VERSION}`
export const KNOWN_RELEASE = {
  version: APP_VERSION,
  date: null,
  url: `https://github.com/${REPO}/releases/tag/v${APP_VERSION}`,
  windows: { exe: { name: `adjeltron_${APP_VERSION}_x64-setup.exe`, url: `${DL}/adjeltron_${APP_VERSION}_x64-setup.exe` }, msi: { name: `adjeltron_${APP_VERSION}_x64_en-US.msi`, url: `${DL}/adjeltron_${APP_VERSION}_x64_en-US.msi` } },
  mac: { dmg: { name: `adjeltron_${APP_VERSION}_universal.dmg`, url: `${DL}/adjeltron_${APP_VERSION}_universal.dmg` } },
}

let cache = null
// → { version, date, url, windows: {exe, msi}, mac: {dmg} } — a última Release pela API, ou KNOWN_RELEASE
export function latestRelease() {
  cache ??= fetch(API, { headers: { accept: 'application/vnd.github+json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d?.assets?.length) return KNOWN_RELEASE
      const a = d.assets.map((x) => ({ name: x.name, url: x.browser_download_url, size: x.size }))
      return {
        version: String(d.tag_name || '').replace(/^v/, ''),
        date: d.published_at,
        url: d.html_url || RELEASES_URL,
        windows: { exe: pick(a, /setup\.exe$/i) || pick(a, /\.exe$/i), msi: pick(a, /\.msi$/i) },
        mac: { dmg: pick(a, /universal\.dmg$/i) || pick(a, /\.dmg$/i) },
      }
    })
    .catch(() => KNOWN_RELEASE)
  return cache
}

export const sizeMB = (bytes) => (bytes ? `${(bytes / 1048576).toFixed(0)} MB` : '')
