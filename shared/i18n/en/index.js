// Inglês do catálogo partilhado (peças, famílias, pistas, materiais…): cada ficheiro regista os
// seus overlays (shared/i18n.js → registerOverlay). Carregado só quando o inglês é escolhido.
const files = import.meta.glob('./*.js', { eager: true })
export default files
