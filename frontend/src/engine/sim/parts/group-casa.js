// Grupo Casa inteligente: paredes, portas, janelas, telhado, mobiliário e atuadores/sensores domésticos — comportamento no simulador (só as peças com eletrónica/lógica).
import lampadaCasa from './lampadaCasa.js'
import ventoinhaTeto from './ventoinhaTeto.js'
import interruptorParede from './interruptorParede.js'
import sensorMagnetico from './sensorMagnetico.js'
import arCondicionado from './arCondicionado.js'
import ventoinhaPe from './ventoinhaPe.js'
import televisao from './televisao.js'
import aquecedor from './aquecedor.js'
import campainha from './campainha.js'
import { estoreBehavior } from './_estore.js'

export const GROUP_CASA = [lampadaCasa, ventoinhaTeto, interruptorParede, sensorMagnetico, arCondicionado, ventoinhaPe, televisao, aquecedor, campainha, estoreBehavior('portaoGaragem', 'Portão de garagem'), estoreBehavior('estore', 'Estore')]
