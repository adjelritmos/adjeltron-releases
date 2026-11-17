// Grupo Mecânica de comportamentos: os motores com encoder. As peças mecânicas (barras,
// engrenagens, polias, fusos, lagartas…) não têm eletrónica: a transmissão entre elas é
// calculada em ../mech.js e a física corre no browser.
import motorEnc from './motorEnc.js'
import n20Enc from './n20Enc.js'
import { makeEncMotor } from './_encMotor.js'
import { motorTT, motorTTEnc, motor12v, motor130, motor775 } from './motorTT.js'
import sensorAngulo from './sensorAngulo.js'
import correiaGt2 from './correiaGt2.js'

const motorRedondoEnc = makeEncMotor('motorRedondoEnc')
export const GROUP_MECH = [motorEnc, n20Enc, motorRedondoEnc, motorTT, motorTTEnc, motor12v, motor130, motor775, sensorAngulo, correiaGt2]
