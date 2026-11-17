// Cabeçalho das páginas interiores do site.
export function PageHeader({ eyebrow, title, text, children }) {
  return (
    <header className="relative">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_30%_0%,rgba(255,255,255,0.07),transparent_60%)]" />
      <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-12">
        {eyebrow && <div className="panel-label mb-3">{eyebrow}</div>}
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white max-w-3xl">{title}</h1>
        {text && <p className="mt-5 text-lg text-neutral-400 max-w-2xl leading-relaxed">{text}</p>}
        {children}
      </div>
    </header>
  )
}
