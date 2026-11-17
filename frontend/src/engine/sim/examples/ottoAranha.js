// Otto aranha (Otto Quad / MiniKame, código aberto): quadrúpede de 8 micro servos SG90, 2 por
// perna — a anca (de pé no canto do corpo, saída para cima) roda a coxa na horizontal e o joelho
// (na ponta da coxa, eixo na horizontal) levanta e baixa a perna. Montado só com peças de
// construção, como o Otto feito na app: blocos de PLA (corpo branco, cabeça preta), suportes em U
// para servo (coxas e pernas), blocos nos pés, a placa de expansão para Nano com um Keyestudio
// Nano, 4 pilhas AA NiMH dentro do corpo (8 servos pela USB passavam dos 500 mA) e o programa com a biblioteca OTTOKame.h incluída no simulador
// (srclibs/quad.js), que tem os pinos fixos do Otto Quad:
//   ancas  FR 2, FL 8, BR 4, BL 6     joelhos  FR 3, FL 9, BR 5, BL 7
//   HC-SR04 Trig 12 / Echo 11         boca (MAX7219) DIN A1, CS A2, CLK A3     buzzer 13
// A montagem 3D é feita com os 8 servos a 90° e o robô pousado (pés em y = 0).
//
// Convenção dos ângulos (a da biblioteca): com os servos a 90° as coxas fazem 25° com o lado,
// para a frente (pernas da frente) ou para trás (de trás); em descanso (ancas 90 ± 20°) ficam a
// 45°, em X. Ancas da frente: FR a subir / FL a descer = perna para a frente; de trás: BR a
// descer / BL a subir = perna para trás. Joelhos: FR e BL a descer, FL e BR a subir = pé para
// cima. Por isso as ancas têm a saída para cima e os joelhos da frente têm a saída virada para a
// frente, os de trás para trás.
import { H } from '../examples.js'
import { add } from './bracos.js'
import { placeInSocket } from '../../../../../shared/sockets.js'

const { part, w, RED, BLK, COR } = H
const r3 = (v) => Math.round(v * 1000) / 1000 + 0
const SIG = '#fb8c00' // cabo dos servos: laranja / vermelho / castanho
const CAST = '#6d4c41'
const HORN = [0.55, 2.75, 0] // saída do SG90 (referencial do servo)
const BRANCO = '#ffffff'
const PRETO = '#1a1a1a'
// medidas (cm). Corpo e cabeça em PLA impresso com enchimento (material 'pla'): maciços pesavam
// o dobro e os SG90 dos joelhos já não levantavam o corpo
const G = {
  corpo: { x: 6.5, y: 3.2, z: 6.5 },
  cabeca: { x: 6, y: 3.2, z: 6 },
  hip: 3.7, // eixos das ancas em (±hip, ±hip): nos cantos do corpo
  phi0: 25, // graus: direção das coxas com as ancas a 90° (a partir do lado)
  coxa: 3.0, // suporte em U da coxa: do eixo da anca à ponte
  perna: 4.8, // suporte em U da perna: do eixo do joelho à ponte
  beta: 64, // graus: inclinação da perna abaixo da horizontal (joelho a 90°)
  pe: { x: 2.2, y: 1.2, z: 3.6 }, // bloco do pé (largo como o U da perna)
}
// suporte em U para SG90 (shared/parts/uLongo.js): abas de 0,25 cm a 2,95 cm uma da outra
const U = { T: 0.25, yc: -1.475 }
const UCFG = (length, color) => ({ servo: 'sg90', length, material: 'plaSolido', color })

// pernas: [chave, sx (frente +1), sz (direita +1), pino da anca, pino do joelho, nome]
const PERNAS = [
  ['FR', 1, 1, 2, 3, 'frente direita'],
  ['FL', 1, -1, 8, 9, 'frente esquerda'],
  ['BR', -1, 1, 4, 5, 'trás direita'],
  ['BL', -1, -1, 6, 7, 'trás esquerda'],
]
const v3 = {
  add: (...vs) => [0, 1, 2].map((i) => r3(vs.reduce((s, v) => s + v[i], 0))),
  k: (k, v) => v.map((x) => k * x),
}

// ---------------- montagem ----------------
function buildOttoAranha() {
  const { corpo, cabeca } = G
  const parts = [{ ...part('corpo', 'bloco', { pos: [0, 0, 0], config: { ...corpo, material: 'pla', color: BRANCO } }), label: 'corpo', physics: 'dynamic' }]
  const top = corpo.y
  // editor 2D: a placa de expansão ao centro; por cima, os 8 servos numa fila (pinos para baixo,
  // pela ordem das colunas D9…D2); à esquerda, o buzzer (D13) e os olhos (D11, D12); a boca por
  // baixo (A1–A3)
  const SY = -430
  const sx = (d) => 60 + (9 - d) * 150
  const pes = []
  for (const [k, sX, sZ, dA, dJ, nome] of PERNAS) {
    const ph = (G.phi0 * Math.PI) / 180
    const r = [sX * Math.sin(ph), 0, sZ * Math.cos(ph)] // coxa com a anca a 90°
    const s = sX * sZ > 0 ? 1 : -1
    const a = [s * r[2], 0, -s * r[0]] // saída do joelho: y × r (FR, BL) ou r × y (FL, BR)
    const d = [sX * Math.SQRT1_2, 0, sZ * Math.SQRT1_2] // diagonal do canto
    const H0 = [sX * G.hip, top + 0.05, sZ * G.hip] // saída da anca
    // anca: SG90 de pé no canto do corpo, saída para cima, o corpo do servo para dentro
    add(parts, `anca${k}`, 'servo', 'corpo', 'top', d, [0, 1, 0], { local: HORN, alvoW: H0, sch: [sx(dA), SY, 270] }).label = `anca ${nome}`
    // coxa: suporte em U na saída da anca, a abraçar o servo (aba de cima na saída, a de baixo por
    // baixo do servo), virado para fora
    add(parts, `coxa${k}`, 'uLongo', `anca${k}`, 'horn', r, [0, 1, 0], { alvoW: H0, config: UCFG(G.coxa, BRANCO) }).label = `coxa ${nome}`
    // joelho: SG90 deitado encostado à ponte da coxa, eixo na horizontal (a), saída para fora da
    // ponte; centrado na coxa (a saída fica a 1,375 cm do eixo dela)
    const J = v3.add(H0, v3.k(G.coxa + U.T + 1.7, r), v3.k(1.375, a), [0, U.yc, 0])
    add(parts, `joelho${k}`, 'servo', `coxa${k}`, 'end', r, a, { local: HORN, alvoW: J, sch: [sx(dJ), SY, 270] }).label = `joelho ${nome}`
    // perna: suporte em U na saída do joelho, a abraçar o servo, inclinada para fora e para baixo
    const b = (G.beta * Math.PI) / 180
    const dir = [r[0] * Math.cos(b), -Math.sin(b), r[2] * Math.cos(b)]
    add(parts, `perna${k}`, 'uLongo', `joelho${k}`, 'horn', dir, a, { alvoW: J, config: UCFG(G.perna, BRANCO) }).label = `perna ${nome}`
    // pé: bloco preto, direito, por baixo da ponte da perna (a meio das duas abas)
    const P = v3.add(J, v3.k(G.perna + U.T + 0.4, dir), v3.k(U.yc, a), [0, -G.pe.y / 2, 0])
    pes.push(add(parts, `pe${k}`, 'bloco', `perna${k}`, 'end', r, [0, 1, 0], { alvoW: P, config: { ...G.pe, material: 'plaSolido', color: PRETO } }))
    pes.at(-1).label = `pé ${nome}`
    pes.at(-1).alvo = P
  }
  // pousar: os pés no chão (a montagem acima foi feita com o corpo em y = 0)
  parts[0].pos[1] = r3(-pes[0].alvo[1])
  for (const p of pes) delete p.alvo
  // cabeça preta em cima do corpo; placa de expansão metida na cabeça (o Nano espreita por cima),
  // HC-SR04 na frente da cabeça, boca de LEDs na frente do corpo (só a face dos LEDs à vista) e
  // buzzer por baixo
  parts.push(
    { ...part('cabeca', 'bloco', { parent: ['corpo', 'top'], config: { ...cabeca, material: 'pla', color: PRETO } }), label: 'cabeça' },
    part('shield', 'nanoShield', { parent: ['cabeca', 'top'], pos: [0, -2.25, 0], sch: [0, 0] }),
  )
  parts.push(placeInSocket(part('nano', 'nanoKeyestudio', { config: { usb: false } }), parts.at(-1), 'socket'))
  parts.push(
    // bateria (4 × AA NiMH, ~4,8–5,5 V, como no Otto DIY) dentro do corpo, ligada ao trilho de 5 V
    // pelo conector série (5V/GND) da placa
    part('bat', 'aaBox4', { parent: ['corpo', 'top'], pos: [-0.5, -3.25, 0], rot: [0, 90, 0], config: { charge: 90, pilhas: 'nimh' }, sch: [420, -38, 180] }),
    part('olhos', 'hcsr04', { parent: ['cabeca', 'front'], pos: [0.75, -1, 0], rot: [0, 0, 90], config: { pinosDir: 'tras' }, sch: [-380, -400] }),
    part('boca', 'max7219', { parent: ['corpo', 'front'], pos: [0, -1.25, 0], rot: [0, 90, 0], config: { color: 'red' }, sch: [-80, 330] }),
    part('buzzer', 'buzzerPassive', { parent: ['corpo', 'bottom'], pos: [0, -0.75, 0], sch: [-620, -380] }),
  )

  // fios dos conectores G/V/S digitais (por cima da placa): sobem até níveis diferentes e seguem
  // para a peça; os que vão para a esquerda e para a direita nunca se encontram
  const W = H.fios(parts)
  const lig = PERNAS.flatMap(([k, , , dA, dJ]) => [[dA, `anca${k}`], [dJ, `joelho${k}`]])
    .sort((p, q) => q[0] - p[0])
    .flatMap(([d, sid]) => [[`D${d}.S`, sid, 'SIG', SIG], [`D${d}.V`, sid, 'VCC', RED], [`D${d}.G`, sid, 'GND', CAST]])
  lig.push(
    ['D12.S', 'olhos', 'Trig', COR.amarelo], ['D11.S', 'olhos', 'Echo', COR.verde], ['D11.V', 'olhos', 'VCC', RED], ['D11.G', 'olhos', 'GND', BLK],
    ['D13.S', 'buzzer', '+', COR.laranja], ['D13.G', 'buzzer', '-', BLK],
  )
  const DX = { S: -4, V: 4, G: 0 }
  const rotas = lig.map(([sp, id, pin, color]) => {
    const P = W.at('shield', sp)
    const lane = P[0] + DX[sp.split('.')[1]]
    return { sp, id, pin, color, P, lane, t: W.at(id, pin) }
  })
  const topo = Math.min(...rotas.map((r) => r.P[1])) - 30
  const wires = []
  for (const grupo of [rotas.filter((r) => r.t[0] < r.lane).sort((a, b) => a.lane - b.lane), rotas.filter((r) => r.t[0] >= r.lane).sort((a, b) => b.lane - a.lane)])
    grupo.forEach((r, i) => {
      const y = topo - i * 8
      const pts = [...(r.lane !== r.P[0] ? [[r.lane, r.P[1]]] : []), [r.lane, y], [r.t[0], y]]
      wires.push(w('shield', r.sp, r.id, r.pin, r.color, pts))
    })
  // boca: dos conectores analógicos (por baixo da placa) desce até à matriz
  const ana = [['A1.S', 'DIN', COR.azul], ['A2.S', 'CS', COR.roxo], ['A3.S', 'CLK', COR.verde], ['A3.V', 'VCC', RED], ['A3.G', 'GND', BLK]]
  const fundo = Math.max(...ana.map(([sp]) => W.at('shield', sp)[1])) + 30
  ana.forEach(([sp, pin, color], i) => {
    const P = W.at('shield', sp)
    const T = W.at('boca', pin)
    const lane = P[0] + DX[sp.split('.')[1]]
    const y = fundo + i * 8
    wires.push(w('shield', sp, 'boca', pin, color, [...(lane !== P[0] ? [[lane, P[1]]] : []), [lane, y], [T[0], y]]))
  })
  // bateria (pinos à esquerda): + por baixo, − por cima, a direito até ao conector série
  const U5 = W.at('shield', 'U.5V')
  const UG = W.at('shield', 'U.GND')
  wires.push(
    w('bat', '+', 'shield', 'U.5V', RED, [[U5[0], W.at('bat', '+')[1]]]),
    w('bat', '-', 'shield', 'U.GND', BLK, [[UG[0], W.at('bat', '-')[1]]]),
  )
  return { parts, wires }
}

// ---------------- programa ----------------
export const CODE_OTTO_ARANHA = `// ==========================================
// Otto aranha (Otto Quad / MiniKame): anda, evita obstáculos e cumprimenta
// ==========================================
// 8 servos: as ancas rodam as pernas na horizontal (para a frente e para trás) e os joelhos
// levantam e baixam os pés. Os passos são osciladores: cada servo segue A·sin(2πt/T + fase) + O.
// A biblioteca já sabe os pinos do Otto Quad:
//   ancas FR 2, FL 8, BR 4, BL 6   joelhos FR 3, FL 9, BR 5, BL 7
//   HC-SR04 Trig 12 / Echo 11      boca (matriz MAX7219) DIN A1, CS A2, CLK A3
#include <OTTOKame.h>
MiniKame robot;

const int PERTO = 15;   // cm: mais perto do que isto, o Otto recua e vira
int passos = 0;

void setup() {
  Serial.begin(9600);
  robot.init(13);          // servos nos pinos do Otto Quad; buzzer no pino 13
  robot.putMouth(smile);
  robot.sing(S_connection);
  delay(1000);
  Serial.println("Ola! Sou o Otto aranha.");
}

void loop() {
  float d = robot.getDistance();
  Serial.print("Distancia: ");
  Serial.print(d);
  Serial.println(" cm");

  if (d > 0 && d < PERTO) {
    // obstáculo: susto, recua e roda para a esquerda
    Serial.println("Obstaculo! Recuar e virar");
    robot.putMouth(bigSurprise);
    robot.sing(S_surprise);
    robot.walk(0, 2, 550);     // para trás
    robot.turnL(4, 550);
    robot.home();
    robot.putMouth(smile);
  } else {
    Serial.println("Andar para a frente");
    robot.putMouth(happyOpen);
    robot.walk(1, 4, 550);     // 4 passos para a frente (período de 550 ms)
    passos++;
  }

  // de vez em quando, uma pausa para dançar
  if (passos == 6) {
    passos = 0;
    robot.home();
    Serial.println("Sobe e desce!");
    robot.playGesture(OttoHappy);
    delay(300);
  }
}
`

// ---------------- cenários de teste (bun scripts/check-examples.js) ----------------
export const PRESETS = {
  ottoAranha: {
    name: 'Otto aranha: quadrúpede de 8 servos que anda e evita obstáculos',
    cat: 'Robôs',
    track: 'mesa',
    build: () => buildOttoAranha(),
    code: CODE_OTTO_ARANHA,
    scenario: {
      check: (S) => {
        const ancas = Math.max(...['FR', 'FL', 'BR', 'BL'].map((k) => S.servoRange(`anca${k}`)))
        const joelhos = Math.max(...['FR', 'FL', 'BR', 'BL'].map((k) => S.servoRange(`joelho${k}`)))
        return ancas > 10 && joelhos > 10 && /Ola! Sou o Otto aranha/.test(S.serial) && /Distancia: [\d.]+/.test(S.serial) && S.samples.at(-1).live.boca
          ? `a andar: ancas ${ancas.toFixed(0)}°, joelhos ${joelhos.toFixed(0)}°; ${S.serial.match(/Distancia: [\d.]+/)?.[0]} cm`
          : null
      },
    },
  },
}

export const SNIPPETS = {
  'Otto aranha (Otto Quad): andar e evitar obstáculos': CODE_OTTO_ARANHA,
}
