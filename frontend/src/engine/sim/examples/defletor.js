// Plano defletor (pêndulo de ar): uma placa de alumínio pendurada num eixo horizontal, com um
// sensor de ângulo (AS5600) na ponta do eixo, e um motor DC com hélice que sopra contra ela.
// O vento levanta a placa; o Arduino lê o ângulo θ e controla a velocidade do motor com um
// PID para manter a placa no ângulo pedido — uma bancada clássica de controlo.
// O vento e a placa só se mexem na física 3D do browser (o backend dá o impulso da hélice).
import { H } from '../examples.js'
import { add, pointW } from './bracos.js'

const { part, w, RED, BLK, COR } = H
const ALU = { material: 'alu' }

function buildDefletor() {
  const parts = [part('base', 'bloco', { pos: [0, 0, 0], config: { x: 34, y: 1.8, z: 26, material: 'madeira' } })]
  // estrutura: dois postes de alumínio e a travessa de cima
  for (const [id, z] of [['posteE', -9], ['posteD', 9]]) parts.push(part(id, 'bloco', { parent: ['base', 'top'], pos: [8, 0, z], config: { x: 2, y: 22, z: 2, ...ALU } }))
  parts.push(part('travessa', 'bloco', { parent: ['base', 'top'], pos: [8, 22, 0], config: { x: 2, y: 2, z: 20, ...ALU } }))
  // sensor de ângulo na face de dentro do poste direito, com o eixo virado para o outro poste
  add(parts, 'sensor', 'sensorAngulo', 'posteD', 'left', [1, 0, 0], [0, 0, -1], { alvoW: [8, 19, 8], sch: [380, -60] })
  // eixo de aço até ao outro poste e a placa (plano defletor) pendurada nele
  add(parts, 'eixo', 'axle', 'sensor', 'eixo', [1, 0, 0], [0, 0, -1], { config: { length: 12, scale: [1, 1.2, 1] } })
  const meio = pointW(parts, 'eixo', 'mid')
  add(parts, 'placa', 'placa', 'eixo', 'mid', [0, 0, 1], [1, 0, 0], { alvoW: [meio[0] - 0.08, meio[1] - 6.6, meio[2]], config: { l: 13, w: 12, t: 0.04, ...ALU } }) // chapa de 0,4 mm (~17 g)
  // motor com hélice de ventoinha num suporte, a soprar para a placa (+x)
  parts.push(part('suporte', 'bloco', { parent: ['base', 'top'], pos: [-10, 0, 0], config: { x: 4, y: 7, z: 3, ...ALU } }))
  // (motor 0,85 cm mais à frente no suporte: as pás da hélice rodam 2 mm à frente da face do bloco — mais
  // para dentro batiam nele e a hélice não rodava)
  add(parts, 'motor', 'motor130', 'suporte', 'center', [1, 0, 0], [0, 1, 0], { local: [-1.45, 0, 0], sch: [-640, -170] })
  parts.push(part('helice', 'heliceMesa', { parent: ['motor', 'shaft'], config: { blades: 4, diameter: 12, pitch: 28 } }))
  // eletrónica na base
  parts.push(
    part('uno', 'arduino', { parent: ['base', 'top'], pos: [-4, 0, 8.6], config: { usb: true }, sch: [0, 0] }),
    part('drv', 'l298n', { parent: ['base', 'top'], pos: [-5, 0, -8.5], sch: [-330, -20] }),
    part('bat', 'battery', { parent: ['base', 'top'], pos: [-13.5, 0, -8], rot: [0, 90, 0], sch: [-300, 290] }),
  )
  const wires = [
    w('bat', '+', 'drv', '12V', RED),
    w('bat', '-', 'drv', 'GND', BLK),
    w('drv', 'GND', 'uno', 'GND.2', BLK),
    w('drv', 'OUT1', 'motor', 'M+', '#fb8c00'),
    w('drv', 'OUT2', 'motor', 'M-', '#8e24aa'),
    w('uno', 'D5', 'drv', 'ENA', '#fdd835'),
    w('uno', 'D7', 'drv', 'IN1', '#43a047'),
    w('uno', 'D8', 'drv', 'IN2', '#1e88e5'),
    w('sensor', 'VCC', 'uno', '5V', RED),
    w('sensor', 'GND', 'uno', 'GND.1', BLK),
    w('sensor', 'OUT', 'uno', 'A0', COR.amarelo),
  ]
  return { parts, wires }
}

const CODE_DEFLETOR = `// ==========================================
//  Plano defletor: controlo PID do ângulo de uma placa com o vento de uma hélice
//  Sensor de ângulo AS5600 (OUT) em A0; motor 130 com hélice no L298N (ENA D5,
//  IN1 D7, IN2 D8). O vento levanta a placa; o PID muda a velocidade do motor para a
//  placa ficar no ângulo pedido. Veja "angulo" e "alvo" no Serial Plotter.
//  (o vento e a placa mexem-se na vista 3D — física do browser)
// ==========================================
const int ENA = 5, IN1 = 7, IN2 = 8;

// ganhos do PID (PWM por grau, por grau·s e por grau/s)
float Kp = 1.5, Ki = 1.4, Kd = 0.35;
const int PWM_BASE = 170;     // PWM que já quase segura a placa a ~25° (antecipação)

float alvo = 22;              // graus
float integral = 0, erroAnt = 0, deriv = 0;
unsigned long tAnt = 0;

float lerAngulo() {
  // AS5600: VCC/2 = 0°; 0 V = -180°; VCC = +180°
  return analogRead(A0) * 360.0 / 1023.0 - 180.0;
}

void motor(int pwm) {
  digitalWrite(IN1, HIGH);    // sopra para a frente (para a placa)
  digitalWrite(IN2, LOW);
  analogWrite(ENA, constrain(pwm, 0, 255));
}

void setup() {
  Serial.begin(115200);
  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  motor(0);
  delay(500);
  tAnt = millis();
}

void loop() {
  // muda o ângulo pedido de 10 em 10 s: 22° → 28° → 15° → 22°… (com o motor no máximo
  // esta hélice levanta a placa até ~30°)
  unsigned long t = millis();
  int fase = (int)(t / 10000) % 3;
  alvo = fase == 0 ? 22 : fase == 1 ? 28 : 15;

  float dt = (t - tAnt) / 1000.0;
  if (dt < 0.02) return;      // controlo a 50 Hz
  tAnt = t;

  // a placa sobe para o lado da travessa: o ângulo medido é negativo, usamos o módulo
  float angulo = abs(lerAngulo());
  float erro = alvo - angulo;
  integral = constrain(integral + erro * dt, -40, 40);
  // derivada filtrada (o sensor e o vento têm ruído)
  deriv = 0.7 * deriv + 0.3 * (erro - erroAnt) / dt;
  erroAnt = erro;
  int pwm = PWM_BASE + Kp * erro + Ki * integral + Kd * deriv;
  motor(pwm);

  Serial.print("alvo:");
  Serial.print(alvo, 1);
  Serial.print(",angulo:");
  Serial.print(angulo, 1);
  Serial.print(",pwm:");
  Serial.println(constrain(pwm, 0, 255) / 4.0, 1);
}
`

export const PRESETS = {
  defletor: {
    name: 'Plano defletor: PID do ângulo com o vento de uma hélice',
    cat: 'Mecânica',
    track: 'mesa',
    build: buildDefletor,
    code: CODE_DEFLETOR,
    scenario: {
      // sem a física do browser a placa não sobe: verifica o motor a soprar e a leitura do sensor
      check: (S) => {
        const rpm = Math.max(...S.samples.map((s) => Math.abs(s.live.motor?.rpm ?? 0)))
        const jet = S.samples.at(-1).live.helice?.jetDir
        return rpm > 1000 && jet === 1 && /angulo:/.test(S.serial) ? `hélice a ${rpm.toFixed(0)} rpm a soprar para a placa; sensor lido (${S.serial.match(/angulo:[\d.]+/)?.[0]})` : null
      },
    },
  },
}

export const SNIPPETS = { 'Plano defletor (PID do ângulo)': CODE_DEFLETOR }
