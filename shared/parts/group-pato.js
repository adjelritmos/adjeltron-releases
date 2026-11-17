// Grupo Pato robô bípede (tipo XGO-Duck): corpo, cabeça, bico, pés, peças das pernas e do pescoço
// e o servo Feetech (um import por componente).
import corpoPato from './corpoPato.js'
import cabecaPato from './cabecaPato.js'
import bicoPato from './bicoPato.js'
import pePato from './pePato.js'
import suportePato from './suportePato.js'
import servoFeetech from './servoFeetech.js'

export const GROUP_PATO = [corpoPato, cabecaPato, bicoPato, pePato, suportePato, servoFeetech]
