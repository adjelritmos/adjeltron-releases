// Moldura das páginas públicas (início, funcionalidades, componentes, exemplos, sobre):
// barra de navegação fixa no topo, conteúdo com scroll e rodapé.
import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, NavbarMenu, NavbarMenuItem, NavbarMenuToggle, Link, Button, Divider } from '@heroui/react'
import { Play, Download } from 'lucide-react'
import { useT } from '../../i18n/index.js'
import { LanguageSwitch } from '../common/LanguageSwitch.jsx'

// label = chave de tradução (src/i18n/locales/site.js e download.js)
export const NAV = [
  { href: '/', label: 'site.nav.home' },
  { href: '/funcionalidades', label: 'site.nav.features' },
  { href: '/componentes', label: 'site.nav.components' },
  { href: '/exemplos', label: 'site.nav.examples' },
  { href: '/descarregar', label: 'download.nav' },
  { href: '/sobre', label: 'site.nav.about' },
]

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-white">
      <img src="/logo.webp" alt="" draggable={false} className="h-8 w-auto object-contain" />
      <span className="font-semibold tracking-tight">adjeltron</span>
    </Link>
  )
}

export function SiteLayout() {
  const t = useT()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const scroller = useRef(null)
  // nova página: volta ao topo e fecha o menu do telemóvel
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
    setMenuOpen(false)
  }, [pathname])
  return (
    <div ref={scroller} className="h-full overflow-y-auto overflow-x-hidden bg-background">
      <Navbar
        maxWidth="xl"
        isBordered
        isMenuOpen={menuOpen}
        onMenuOpenChange={setMenuOpen}
        parentRef={scroller}
        classNames={{ base: 'bg-black/70 border-white/10', item: 'data-[active=true]:text-white' }}
      >
        <NavbarContent justify="start">
          <NavbarMenuToggle aria-label={menuOpen ? t('site.nav.closeMenu') : t('site.nav.openMenu')} className="md:hidden cursor-pointer" />
          <NavbarBrand>
            <Brand />
          </NavbarBrand>
        </NavbarContent>
        <NavbarContent justify="center" className="hidden md:flex gap-6">
          {NAV.slice(1).map((n) => (
            <NavbarItem key={n.href} isActive={pathname === n.href}>
              <Link href={n.href} size="sm" className={pathname === n.href ? 'text-white font-medium' : 'text-neutral-400 hover:text-white'}>
                {t(n.label)}
              </Link>
            </NavbarItem>
          ))}
        </NavbarContent>
        <NavbarContent justify="end">
          <NavbarItem>
            <LanguageSwitch />
          </NavbarItem>
          <NavbarItem>
            <Button as={Link} href="/app" color="primary" size="sm" radius="full" startContent={<Play size={14} />} className="font-medium">
              <span className="hidden sm:inline">{t('common.openSimulator')}</span>
              <span className="sm:hidden">{t('common.open')}</span>
            </Button>
          </NavbarItem>
        </NavbarContent>
        <NavbarMenu className="bg-black/90 pt-6">
          {NAV.map((n) => (
            <NavbarMenuItem key={n.href} isActive={pathname === n.href}>
              <Link href={n.href} size="lg" className={pathname === n.href ? 'text-white' : 'text-neutral-400'}>
                {t(n.label)}
              </Link>
            </NavbarMenuItem>
          ))}
          <NavbarMenuItem className="pt-4">
            <LanguageSwitch size="md" />
          </NavbarMenuItem>
        </NavbarMenu>
      </Navbar>

      <Outlet />

      <footer className="border-t border-white/10 mt-24">
        <div className="max-w-7xl mx-auto px-6 py-12 grid gap-10 sm:grid-cols-3">
          <div className="flex flex-col gap-3">
            <Brand />
            <p className="text-sm text-neutral-500 max-w-xs">{t('site.footer.tagline')}</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="panel-label mb-1">{t('site.footer.explore')}</span>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} size="sm" className="text-neutral-400 hover:text-white w-fit">
                {t(n.label)}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <span className="panel-label mb-1">{t('site.footer.start')}</span>
            <Link href="/app" size="sm" className="text-neutral-400 hover:text-white w-fit">
              {t('site.footer.openSimulator')}
            </Link>
            <Link href="/exemplos" size="sm" className="text-neutral-400 hover:text-white w-fit">
              {t('site.footer.seeExamples')}
            </Link>
            <Link href="/descarregar" size="sm" className="text-neutral-400 hover:text-white w-fit gap-1.5">
              <Download size={13} /> {t('site.footer.downloadDesktop')}
            </Link>
          </div>
        </div>
        <Divider className="bg-white/10" />
        <div className="max-w-7xl mx-auto px-6 py-6 text-xs text-neutral-600 flex flex-wrap gap-2 justify-between">
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <span>© {new Date().getFullYear()} adjeltron</span>
            <Link href="/licencas" size="sm" className="text-xs text-neutral-500 hover:text-white">
              {t('common.thirdPartyLicenses')}
            </Link>
          </span>
          <span>{t('site.footer.stack')}</span>
        </div>
      </footer>
    </div>
  )
}
