// Exemplo do motor TT com encoder: mede as rpm com attachInterrupt e mostra o veio duplo —
// roda de um lado, polia GT2 de 20 dentes do outro, ligada por uma Correia GT2 (peça própria)
// a uma polia de 40 dentes num mancal (que roda a metade da velocidade, no mesmo sentido).
import { H } from '../examples.js'

const { part, w, mesa, RED, BLK, COR } = H

const CODE = `// ==========================================
//  Rotações do motor TT com encoder
//  Motor TT 1:48 + encoder Hall de 11 impulsos
//  por volta do rotor: 11 x 48 = 528 impulsos
//  por volta da roda (RISING no canal A).
//  L298N: ENA -> D5 (PWM), IN1 -> D7, IN2 -> D8
//  Encoder: A -> D2 (interrupcao), B -> D3
//  Veio duplo: roda de um lado; do outro uma
//  polia GT2 de 20 dentes e uma correia ate a
//  polia de 40 dentes no mancal (metade das rpm).
// ==========================================
const int ENA = 5, IN1 = 7, IN2 = 8;
const int ENC_A = 2, ENC_B = 3;
const float IMPULSOS_VOLTA = 11.0 * 48;   // RISING em A

volatile long impulsos = 0;
unsigned long tMedida = 0;
long anterior = 0;
int pwm = 255;

void isrA() {
  // A subiu: com B em HIGH o motor roda para a frente
  if (digitalRead(ENC_B) == HIGH) impulsos++;
  else impulsos--;
}

void setup() {
  Serial.begin(115200);
  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(ENC_A, INPUT_PULLUP);
  pinMode(ENC_B, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(ENC_A), isrA, RISING);
  digitalWrite(IN1, HIGH);              // para a frente
  digitalWrite(IN2, LOW);
  analogWrite(ENA, pwm);
  Serial.println("Motor TT com encoder: rpm da roda e da polia grande");
}

void loop() {
  unsigned long agora = millis();
  if (agora - tMedida < 500) return;    // mede de 0,5 em 0,5 s
  float dt = (agora - tMedida) / 1000.0;
  tMedida = agora;
  noInterrupts();
  long n = impulsos;
  interrupts();
  float rpm = (n - anterior) / IMPULSOS_VOLTA / dt * 60.0;
  anterior = n;
  Serial.print("PWM ");
  Serial.print(pwm);
  Serial.print(" | roda: ");
  Serial.print(rpm, 1);
  Serial.print(" rpm | polia 40T: ");
  Serial.print(rpm * 20.0 / 40.0, 1);
  Serial.println(" rpm");
  // a meio, abranda
  if (agora > 3000 && pwm == 255) {
    pwm = 150;
    analogWrite(ENA, pwm);
  }
}
`

function build() {
  const parts = [
    mesa(part('uno', 'arduino'), 0, 0),
    mesa(part('drv', 'l298n'), -330, -20),
    mesa(part('bat', 'battery', { config: { charge: 95 } }), -330, 250),
    // base de madeira com o motor, a roda (lado −z) e a transmissão por correia (lado +z)
    part('base', 'bloco', { pos: [12, 0, -14], config: { x: 20, y: 3, z: 2, material: 'madeira' } }),
    part('m', 'motorTTEnc', { parent: ['base', 'top'], pos: [-3, 0, 0], sch: [330, -40] }),
    part('roda', 'rubberWheel', { parent: ['m', 'shaft'], config: { diameter: 6.5, color: '#fdd835' } }),
    part('polia1', 'gt2Pulley', { parent: ['m', 'shaft2'], config: { teeth: 20, belt: '-' } }),
    part('mancal', 'pillowBlock', { parent: ['base', 'top'], pos: [6, 0, 0.5] }),
    part('polia2', 'gt2Pulley', { parent: ['mancal', 'shaft'], config: { teeth: 40, belt: '-' } }),
    part('correia', 'correiaGt2', { pos: [12, 0, -9], config: { pulleys: ['polia1', 'polia2'] } }),
  ]
  const wires = [
    w('bat', '+', 'drv', '12V', RED),
    w('bat', '-', 'drv', 'GND', BLK),
    w('drv', '5V', 'uno', '5V', RED),
    w('drv', 'GND', 'uno', 'GND.2', BLK),
    w('uno', 'D5', 'drv', 'ENA', COR.laranja),
    w('uno', 'D7', 'drv', 'IN1', COR.verde),
    w('uno', 'D8', 'drv', 'IN2', COR.azul),
    w('drv', 'OUT1', 'm', 'M+', RED),
    w('drv', 'OUT2', 'm', 'M-', COR.branco),
    w('uno', '5V', 'm', 'VCC', '#e53935'),
    w('uno', 'GND.3', 'm', 'GND', '#212121'),
    w('uno', 'D2', 'm', 'A', '#fdd835'),
    w('uno', 'D3', 'm', 'B', '#1e88e5'),
  ]
  return { parts, wires }
}

const avg = (v) => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length)

export const PRESETS = {
  rpmMotorTT: {
    name: 'Motor TT com encoder: rpm e correia GT2',
    cat: 'Motores',
    track: 'mesa',
    build,
    code: CODE,
    scenario: {
      check: (S) => {
        const lines = [...S.serial.matchAll(/PWM (\d+) \| roda: (-?[\d.]+) rpm \| polia 40T: (-?[\d.]+)/g)].map((m) => [+m[1], +m[2], +m[3]])
        // rpm medidas pelo código vs. rpm reais do veio (live) e da polia grande no mancal
        const live = S.samples.filter((s) => s.t > 1.5 && s.t <= 2.9)
        const rpmM = avg(live.map((s) => s.live.m?.rpm ?? 0))
        const rpmP = avg(live.map((s) => ((s.live.mancal?.mountVel ?? 0) / 360) * 60))
        const fast = lines.filter((l) => l[0] === 255).slice(1)
        const slow = lines.filter((l) => l[0] === 150).slice(1)
        const code = avg(fast.map((l) => l[1]))
        const ok = fast.length >= 2 && slow.length >= 1 && Math.abs(code - rpmM) < 0.05 * Math.abs(rpmM) && rpmM > 100 && Math.abs(Math.abs(rpmP) - rpmM / 2) < 0.05 * rpmM && avg(slow.map((l) => l[1])) < code - 10
        return ok ? `encoder: ${code.toFixed(1)} rpm (veio ${rpmM.toFixed(1)}); polia 40T pela correia ${Math.abs(rpmP).toFixed(1)} rpm; PWM 150 → ${avg(slow.map((l) => l[1])).toFixed(1)} rpm` : null
      },
    },
  },
}
