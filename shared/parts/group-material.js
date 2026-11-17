// Grupo Materiais e braços (peças de construção genéricas com material à escolha, e as peças
// típicas dos braços robóticos de 6 eixos / meArm / impressos e dos cães robô): um import por
// componente. Materiais em ./_materials.js.
import bloco from './bloco.js'
import cilindro from './cilindro.js'
import esfera from './esfera.js'
import tubo from './tubo.js'
import placa from './placa.js'
import elo from './elo.js'
import suporteServo from './suporteServo.js'
import uLongo from './uLongo.js'
import garraMetal from './garraMetal.js'
import molduraDentada from './molduraDentada.js'
import rodaImpressa from './rodaImpressa.js'
import carro from './carro.js'
import caneta from './caneta.js'

export const GROUP_MATERIAL = [bloco, cilindro, esfera, tubo, placa, elo, suporteServo, uLongo, garraMetal, molduraDentada, caneta, rodaImpressa, carro]
