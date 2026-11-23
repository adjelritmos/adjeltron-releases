// Medidas dos servos (iguais aos modelos 3D em frontend/src/components/three/models.jsx): corpo L × H × W
// com centro em x = 0 e base em y = 0; abas de fixação em tabY; eixo do braço em x = hornX,
// com o ponto de fixação "horn" a hornY. Usado pelos suportes de servo.
export const SERVO_DIMS = {
  mg996: { name: 'MG996R / MG995 (standard)', type: 'servoMG', L: 4.07, H: 3.75, W: 1.98, hornX: 1.0, hornY: 4.25, tabY: 2.75 },
  sg90: { name: 'SG90 / MG90S (micro)', type: 'servo', L: 2.3, H: 2.27, W: 1.22, hornX: 0.55, hornY: 2.75, tabY: 1.6 },
  // Dynamixel XL330 (sem abas: aparafusa pelos furos da caixa; tabY = meia altura)
  xl330: { name: 'Dynamixel XL330 (Microban)', type: 'servoXL330', L: 3.4, H: 2.5, W: 2.0, hornX: 0.7, hornY: 2.6, tabY: 1.25 },
}
export const SERVO_OPTS = Object.entries(SERVO_DIMS).map(([k, d]) => [k, d.name])
export const servoDims = (c) => SERVO_DIMS[c?.servo] || SERVO_DIMS.mg996
