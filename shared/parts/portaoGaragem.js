// Portão de garagem de enrolar motorizado (ver ./_estore.js).
import { estoreDef } from './_estore.js'

export default estoreDef({
  type: 'portaoGaragem',
  name: 'Portão de garagem motorizado',
  short: 'Portão',
  cat: 'casa',
  description:
    'Portão de enrolar de lâminas de alumínio com motor tubular DC e fins de curso, para o vão de uma "Parede com porta" (prenda-o no ponto "vão por fora": a caixa fica por cima do vão, do lado de fora). M+ positivo em relação a M− sobe o portão; ao contrário desce — comande-o com um L298N ou dois relés. A velocidade segue a tensão (curso completo no "tempo a abrir" à tensão nominal). Os fins de curso ligam COM ao ABERTO (em cima) e ao FECHADO (em baixo): COM ao GND e cada um a um pino com INPUT_PULLUP (LOW = chegou). Nos fins de curso o motor fica bloqueado (desligue-o).',
  w: 7.6,
  h: 15,
  box: 1.6,
  slat: 0.6,
  tempo: 8,
  cor: '#d7dbde',
})
