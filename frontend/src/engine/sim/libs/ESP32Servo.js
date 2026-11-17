// ESP32Servo.h: a mesma API da Servo.h (classe implementada no motor; setPeriodHertz incluído)
// e ESP32PWM::allocateTimer (temporizadores do LEDC: sem efeito na simulação)
export default { header: 'ESP32Servo.h', classes: { Servo: null }, globals: { ESP32PWM: { allocateTimer() {} } } }
