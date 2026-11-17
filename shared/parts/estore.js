// Estore elétrico de lâminas (ver ./_estore.js).
import { estoreDef } from './_estore.js'

export default estoreDef({
  type: 'estore',
  name: 'Estore elétrico',
  short: 'Estore',
  cat: 'casa',
  description:
    'Estore exterior de lâminas com motor tubular DC e fins de curso, para o vão de uma "Parede com janela" (prenda-o no ponto "vão por fora": a caixa fica por cima da janela). M+ positivo em relação a M− sobe o estore; ao contrário desce — comande-o com um L298N ou dois relés (ex.: fecha sozinho quando o LDR vê que anoiteceu). Os fins de curso ligam COM ao ABERTO (em cima) e ao FECHADO (em baixo): COM ao GND e cada um a um pino com INPUT_PULLUP.',
  w: 8.6,
  h: 7,
  box: 1.2,
  slat: 0.35,
  tempo: 6,
  cor: '#efefea',
})
