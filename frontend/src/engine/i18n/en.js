// Inglês dos dados do motor (nomes e descrições dos exemplos…): overlays registados por cada
// ficheiro desta pasta (shared/i18n.js → registerOverlay). Carregado só quando o inglês é escolhido.
const files = import.meta.glob('./en-*.js', { eager: true })
export default files
