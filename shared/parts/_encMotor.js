// Motores DC com redutor e encoder de efeito Hall em quadratura (JGA25-370, N20).
// Deitados: veio de saída segundo +x, encoder (disco magnético + placa) atrás (−x).
// Ficha de 6 vias atrás: M+ · GND · C1 (A) · C2 (B) · VCC · M−.
// Parâmetros elétricos/mecânicos em MOTOR_MODELS (usados por backend/sim/parts/_encMotor.js).
export const MOTOR_MODELS = {
  motorEnc: {
    vnom: 12, // V
    rpm0: 6500, // rpm do rotor (antes do redutor) sem carga à tensão nominal
    i0: 0.08, // A sem carga (atrito)
    istall: 1.5, // A com o veio bloqueado
    tauM: 0.018, // s: constante de tempo mecânica do rotor
    eta: 0.7, // rendimento do redutor
    ppr: 11, // impulsos por volta do rotor (por canal)
    maxV: 15,
  },
  // motor TT 1:48 com encoder Hall no veio de trás do motor: 11 impulsos por volta do rotor
  // → 11 × 48 = 528 por volta do veio de saída em cada canal (2112 contagens com a Encoder.h)
  motorTTEnc: {
    vnom: 6,
    rpm0: 9600,
    i0: 0.15,
    istall: 1.5,
    tauM: 0.02,
    eta: 0.55,
    ppr: 11,
    maxV: 9,
  },
  // motores sem encoder (ppr: 0): só os terminais M+ / M−
  motorTT: {
    vnom: 6,
    rpm0: 9600, // 1:48 → ~200 rpm no veio a 6 V
    i0: 0.15,
    istall: 1.5,
    tauM: 0.02,
    eta: 0.55, // redutor de plástico
    ppr: 0,
    maxV: 9,
  },
  motor12v: {
    vnom: 12,
    rpm0: 6500,
    i0: 0.08,
    istall: 1.5,
    tauM: 0.018,
    eta: 0.7,
    ppr: 0,
    maxV: 15,
  },
  // motores sem redutor (veio direto, redução 1:1)
  motor130: {
    vnom: 3,
    rpm0: 9000, // ~9000 rpm sem carga a 3 V (motor de carrinho / ventoinha)
    i0: 0.15,
    istall: 1.2,
    tauM: 0.03,
    eta: 1,
    ppr: 0,
    maxV: 6.5,
  },
  motor775: {
    vnom: 12,
    rpm0: 12000, // RS-775: ~12 000 rpm sem carga a 12 V
    i0: 0.6,
    istall: 18, // ~18 A com o veio bloqueado (precisa de um driver forte: BTS7960, MOSFET)
    tauM: 0.06,
    eta: 1,
    ppr: 0,
    maxV: 18,
  },
  // motor redondo de carrinho (Ø24 mm, sem redutor) com encoder magnético de 12 impulsos
  motorRedondoEnc: {
    vnom: 6,
    rpm0: 8000, // ~8000 rpm sem carga a 6 V
    i0: 0.12,
    istall: 1.4,
    tauM: 0.03,
    eta: 1,
    ppr: 12, // impulsos por volta (por canal): 48 contagens/volta com a Encoder.h
    maxV: 9,
  },
  n20Enc: {
    vnom: 6,
    rpm0: 30000,
    i0: 0.04,
    istall: 0.7,
    tauM: 0.012,
    eta: 0.6,
    ppr: 7,
    maxV: 9,
  },
}

const PIN_IDS = ['M+', 'GND', 'A', 'B', 'VCC', 'M-']
const PIN_LABELS = { 'M+': 'M+ (motor, vermelho)', 'M-': 'M− (motor, branco)', GND: 'GND (encoder)', VCC: 'VCC 3,3–5 V (encoder)', A: 'C1 / A (encoder)', B: 'C2 / B (encoder)' }
const PIN_KINDS = { 'M+': 'motor', 'M-': 'motor', GND: 'gnd', VCC: 'pwr', A: 'out', B: 'out' }

export function encMotorPins(x, y, pitch) {
  return PIN_IDS.map((id, i) => ({ id, label: PIN_LABELS[id], pos: [x, y, (i - 2.5) * pitch], kind: PIN_KINDS[id], conn: 'female', dir: [-1, 0, 0] }))
}

// sentido positivo (M+ > M−): o veio roda no sentido direto (anti-horário visto da ponta
// do veio) e o canal B vai à frente de A — a Encoder.h conta para cima com Encoder(A, B).
export const ENC_SIGN_NOTE =
  'Com M+ mais positivo que M− o veio roda no sentido anti-horário (visto da ponta do veio) e o canal B adianta-se 90° ao A: Encoder enc(A, B) conta para cima; numa ISR em RISING de A, digitalRead(B) == HIGH quer dizer "para a frente".'
