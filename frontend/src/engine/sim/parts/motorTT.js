// Motores DC sem encoder (ver _encMotor.js, ppr: 0): motor TT 1:48 sem roda, motor 12 V
// JGA25-370, motor 130 de carrinho e motor 12 V RS-775 (estes dois sem redutor: ratio 1).
import { makeEncMotor } from './_encMotor.js'

export const motorTT = makeEncMotor('motorTT')
// motor TT com encoder Hall (11 PPR × 1:48)
export const motorTTEnc = makeEncMotor('motorTTEnc')
export const motor12v = makeEncMotor('motor12v')
export const motor130 = makeEncMotor('motor130')
export const motor775 = makeEncMotor('motor775')
