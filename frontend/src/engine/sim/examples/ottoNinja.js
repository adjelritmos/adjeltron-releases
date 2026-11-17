// Robô Otto Ninja (Otto DIY, github.com/OttoDIY/OttoNinja): anda e transforma-se num carro de 2 rodas.
// 4 servos, como o Ninja original: 2 tornozelos (SG90, posição) que inclinam os pés para os lados e
// 2 pés (servos de rotação contínua) que rodam os discos dos pés.
//   modo andar  discos deitados no chão: inclina-se sobre um pé e roda esse pé (o corpo gira à volta
//               dele e o outro pé avança); depois o mesmo do outro lado
//   modo rodar  os tornozelos rodam os pés 90° para fora: os discos ficam de pé (rodas) e a cabeça
//               desce entre elas
// O Ninja original usa uma placa ESP8266 (NodeMCU / Wemos D1 mini); o simulador não tem ESP8266, por
// isso aqui é um Nano numa placa de expansão (os pinos mudam, o programa é o mesmo). A bateria são
// 4 pilhas AA NiMH (~4,8–5,5 V) no conector série (5V/GND) da placa, como no Otto bípede.
//   tornozelos  esquerdo D2, direito D3      pés  esquerdo D4, direito D5      HC-SR04  Trig 8 / Echo 9
// A montagem 3D é feita com os servos a 90° e os pés deitados (modo andar). No original a calibração
// do modo andar é 60 / 120 (o braço do servo fica noutra posição); aqui é 90 / 90.
// Montado só com peças genéricas (blocos de PLA, cilindro, esferas, rodas livres de esfera, servos).
// Simplificação: cada tornozelo tem 2 patins (rodas livres de esfera, à frente e atrás do disco), ver G.spur.
import { H } from "../examples.js";
import { add } from "./bracos.js";
import { placeInSocket } from "../../../../../shared/sockets.js";

const { part, w, RED, BLK, COR } = H;
const r3 = (v) => Math.round(v * 1000) / 1000 + 0;
const SIG = "#fb8c00"; // cabo dos servos: laranja / vermelho / castanho
const CAST = "#6d4c41";
const HORN = [0.55, 2.75, 0]; // saída do SG90 / FS90R (referencial do servo)
const PRETO = "#1d1d1f";
const X = [1, 0, 0];
const Y = [0, 1, 0];
const DOWN = [0, -1, 0];

// Geometria (cm, referencial do mundo no modo andar: discos deitados no chão, y = 0; x para a
// frente, z para a direita; s = −1 esquerda, s = 1 direita). Tudo com peças genéricas: blocos de PLA,
// cilindros, esferas, rodas livres de esfera e os servos.
const G = {
  S: 8, // cabeça: cubo oco de 8 cm (paredes de PLA de 3 mm)
  t: 0.3,
  headY: 5.4, // face de baixo da cabeça
  // tornozelo: saída do SG90 (eixo para a frente), 1 cm por dentro do centro do disco. Virar o pé
  // para fora quase não levanta o robô (o bordo de dentro do disco passa por baixo do eixo) e
  // inclinar o robô pede pouco binário ao SG90; de pé, o disco é uma roda e a cabeça desce ~2,2 cm
  ankle: [1.4, 4.45, 2.6],
  zc: 3.6, // centro do disco do pé
  disc: { r: 2.85, h: 0.6 }, // pé: cilindro de PLA de 5,7 cm
  // anel de 12 esferas de borracha no bordo do disco: o motor de física só tem caixas e bolas (o
  // cilindro colide como uma caixa); deitado o anel assenta no chão, de pé rola como uma roda
  ring: { n: 12, R: 2.9, r: 0.3 },
  // patins: 2 rodas livres de esfera (à frente e atrás do disco, no bordo de dentro) numa barra do
  // tornozelo. Rodam com o tornozelo pelo caminho do bordo de dentro do disco, que é o ponto do disco
  // que toca no chão a transformar e no modo rodar: o pé apoia-se sempre numa linha (frente-trás) e o
  // Ninja não tomba para a frente nem para trás (simplificação: no original não há patins)
  // (as esferas dos patins ficam 1–2 mm acima do chão: o peso vai para os pés e as rodas agarram)
  spur: { sx: 3.0, face: 1.6, rail: 0.3, folga: 0.2 },
};
const WHEEL = G.ring.R + G.ring.r; // raio da roda (modo rodar)

const bloco = (cfg) => ({ material: "pla", color: PRETO, ...cfg });

// ---------------- montagem ----------------
function buildNinja() {
  const { S, t, headY, zc, disc, ring, spur } = G;
  const top = headY + t;
  const raiz = part("cabeca", "bloco", {
    pos: [0, headY, 0],
    config: bloco({ x: S, y: t, z: S }),
  });
  raiz.physics = "dynamic";
  raiz.label = "cabeça (fundo)";
  const parts = [raiz];
  const blc = (id, cfg, at, o = {}) =>
    add(
      parts,
      id,
      "bloco",
      o.parent || "cabeca",
      o.mount || "top",
      o.xw || X,
      o.yw || Y,
      { alvoW: at, config: bloco(cfg) },
    );
  // cabeça: cubo oco preto (paredes), janela da cara cor de pele, fita vermelha na testa
  const hp = S - 2 * t;
  blc("paredeFrente", { x: t, y: hp, z: S }, [S / 2 - t / 2, top, 0]);
  blc("paredeTras", { x: t, y: hp, z: S }, [-S / 2 + t / 2, top, 0]);
  blc("paredeEsq", { x: S - 2 * t, y: hp, z: t }, [0, top, -S / 2 + t / 2]);
  blc("paredeDir", { x: S - 2 * t, y: hp, z: t }, [0, top, S / 2 - t / 2]);
  blc("tampa", { x: S, y: t, z: S }, [0, top + hp, 0]);
  blc("prateleira", { x: S - 2 * t, y: 0.2, z: S - 2 * t }, [0, top + 4.9, 0]);
  blc("cara", { x: 0.06, y: 3.0, z: S - 1.6, color: "#f1c9a5" }, [
    S / 2 + 0.03,
    top + 2.4,
    0,
  ]);
  blc("fitaFrente", { x: 0.25, y: 1.35, z: S + 0.4, color: "#d32f2f" }, [
    S / 2 + 0.13,
    headY + S - 1.23,
    0,
  ]);
  blc("fitaCima", { x: 1.5, y: 0.22, z: S + 0.4, color: "#d32f2f" }, [
    S / 2 - 0.62,
    headY + S,
    0,
  ]);

  // editor 2D: a placa de expansão ao centro; os 4 servos numa fila por cima, à direita (pela
  // ordem das colunas D5…D2), o HC-SR04 à esquerda e a bateria à direita
  const SY = -430;
  const sx = (d) => 120 + (5 - d) * 170;
  for (const [k, s, dT, dP] of [
    ["E", -1, 2, 4],
    ["D", 1, 3, 5],
  ]) {
    const [ax, ay, az] = G.ankle;
    const P = [ax, ay, s * az]; // eixo do tornozelo
    const zS = s * (az - 0.55); // centro do SG90 do tornozelo (o corpo do servo fica para dentro)
    // perna: calço por baixo da cabeça que segura o SG90 e uma escora de fora, inclinada para fora
    blc(
      `perna${k}`,
      { x: 2.9, y: headY - (ay + 0.61), z: 2.7 },
      [0.05, ay + 0.61, zS],
      { mount: "bottom", yw: Y },
    );
    const ang = (18 * Math.PI) / 180;
    const yw = [0, Math.cos(ang), -s * Math.sin(ang)];
    const Ls = 1.9;
    const cE = [0.05, headY - (Ls / 2) * Math.cos(ang) - 0.05, s * (az + 1.05)];
    blc(
      `escora${k}`,
      { x: 2.6, y: Ls, z: 0.35 },
      cE.map((v, i) => r3(v - (yw[i] * Ls) / 2)),
      { mount: "bottom", yw },
    );
    // tornozelo: SG90 deitado na perna, saída para a frente
    add(
      parts,
      `tornozeloServo${k}`,
      "servo",
      `perna${k}`,
      "bottom",
      [0, 0, s],
      X,
      { local: HORN, alvoW: P, sch: [sx(dT), SY, 270] },
    );
    // suporte do tornozelo (no braço do SG90): placa da frente + placa de cima do servo do pé
    const yF = ay - 1.2; // topo do servo do pé
    add(parts, `tornozelo${k}`, "bloco", `tornozeloServo${k}`, "horn", X, Y, {
      alvoW: [ax + 0.2, yF, r3(s * (az + 0.5))],
      config: bloco({ x: 0.3, y: 1.8, z: 2.4 }),
    });
    add(parts, `suporte${k}`, "bloco", `tornozelo${k}`, "top", X, Y, {
      alvoW: [0.35, yF, s * zc],
      config: bloco({ x: 2.9, y: 0.3, z: 1.6 }),
    });
    // pé: servo de rotação contínua de pé, saída para baixo, no centro do disco
    const discoTop = [0, disc.h, s * zc];
    add(
      parts,
      `pe${k}`,
      "servoFS90R",
      `suporte${k}`,
      "bottom",
      [-1, 0, 0],
      DOWN,
      { local: HORN, alvoW: discoTop, sch: [sx(dP), SY, 270] },
    );
    add(parts, `disco${k}`, "cilindro", `pe${k}`, "horn", X, DOWN, {
      alvoW: discoTop,
      config: { r: disc.r, h: disc.h, material: "pla", color: PRETO },
    });
    for (let i = 0; i < ring.n; i++) {
      const a = (i / ring.n) * 2 * Math.PI;
      add(parts, `aro${k}${i}`, "esfera", `disco${k}`, "top", X, Y, {
        alvoW: [r3(ring.R * Math.cos(a)), 0, r3(s * zc + ring.R * Math.sin(a))],
        config: { r: ring.r, material: "borracha", color: PRETO },
      });
    }
    // patins: barra por cima do bordo de dentro do disco, presa ao suporte por uma placa de trás
    const zSp = r3(s * (az - (WHEEL - (zc - az) - 0.64 - spur.folga))); // centro das esferas dos patins (z)
    add(parts, `placaPatins${k}`, "bloco", `suporte${k}`, "top", X, Y, {
      alvoW: [-2.4, spur.face, r3((zSp + s * zc) / 2)],
      config: bloco({
        x: 0.3,
        y: yF - spur.face,
        z: r3(Math.abs(s * zc - zSp) + 0.6),
      }),
    });
    add(parts, `barraPatins${k}`, "bloco", `placaPatins${k}`, "top", X, Y, {
      alvoW: [0, spur.face, zSp],
      config: bloco({ x: 2 * spur.sx + 1, y: spur.rail, z: 0.6 }),
    });
    for (const [n, x] of [
      ["Tras", -spur.sx],
      ["Frente", spur.sx],
    ])
      add(
        parts,
        `patim${n}${k}`,
        "casterBall",
        `barraPatins${k}`,
        "bottom",
        X,
        DOWN,
        { alvoW: [x, spur.face, zSp] },
      );
  }
  // eletrónica dentro da cabeça: bateria no fundo, HC-SR04 à frente (os transdutores saem pela janela
  // da cara, 2 mm à frente dela: o sensor não se vê a si próprio), placa de expansão na prateleira
  parts.push(
    part("bat", "aaBox4", {
      parent: ["cabeca", "top"],
      pos: [-0.8, 0, 0],
      rot: [0, 90, 0],
      config: { charge: 90, pilhas: "nimh" },
      sch: [400, -38, 180],
    }),
    part("olhos", "hcsr04", {
      parent: ["cabeca", "top"],
      pos: [r3(G.S / 2 + 0.2 - 0.8), 2.1, 0],
      sch: [-300, -400],
    }),
    part("shield", "nanoShield", {
      parent: ["prateleira", "top"],
      pos: [0, 0, 0],
      rot: [0, 90, 0],
      sch: [0, 0],
    }),
  );
  parts.push(
    placeInSocket(
      part("nano", "nanoKeyestudio", { config: { usb: false } }),
      parts.at(-1),
      "socket",
    ),
  );

  // fios dos conectores G/V/S (como no Otto bípede): o S sai pela esquerda, o V pela direita e o G a
  // direito; sobem até níveis diferentes e seguem para a peça, por cima
  const W = H.fios(parts);
  const lig = [
    [5, "peD"],
    [4, "peE"],
    [3, "tornozeloServoD"],
    [2, "tornozeloServoE"],
  ].flatMap(([d, sid]) => [
    [`D${d}.S`, sid, "SIG", SIG],
    [`D${d}.V`, sid, "VCC", RED],
    [`D${d}.G`, sid, "GND", CAST],
  ]);
  lig.push(
    ["D8.S", "olhos", "Trig", COR.amarelo],
    ["D9.S", "olhos", "Echo", COR.verde],
    ["D9.V", "olhos", "VCC", RED],
    ["D9.G", "olhos", "GND", BLK],
  );
  const DX = { S: -4, V: 4, G: 0 };
  const rotas = lig.map(([sp, id, pin, color]) => {
    const P = W.at("shield", sp);
    return {
      sp,
      id,
      pin,
      color,
      P,
      lane: P[0] + DX[sp.split(".")[1]],
      t: W.at(id, pin),
    };
  });
  const yTop = Math.min(...rotas.map((r) => r.P[1])) - 30;
  const wires = [];
  for (const grupo of [
    rotas.filter((r) => r.t[0] < r.lane).sort((a, b) => a.lane - b.lane),
    rotas.filter((r) => r.t[0] >= r.lane).sort((a, b) => b.lane - a.lane),
  ])
    grupo.forEach((r, i) => {
      const y = yTop - i * 8;
      const pts = [
        ...(r.lane !== r.P[0] ? [[r.lane, r.P[1]]] : []),
        [r.lane, y],
        [r.t[0], y],
      ];
      wires.push(w("shield", r.sp, r.id, r.pin, r.color, pts));
    });
  const U5 = W.at("shield", "U.5V");
  const UG = W.at("shield", "U.GND");
  wires.push(
    w("bat", "+", "shield", "U.5V", RED, [[U5[0], W.at("bat", "+")[1]]]),
    w("bat", "-", "shield", "U.GND", BLK, [[UG[0], W.at("bat", "-")[1]]]),
  );
  return { parts, wires };
}

// ---------------- programa ----------------
export const CODE_NINJA = `// ==========================================
// Otto Ninja: anda, transforma-se em carro e evita obstáculos
// ==========================================
// Como os exemplos do OttoNinja (github.com/OttoDIY/OttoNinja, para ESP8266), num Arduino Nano.
// 4 servos:
//   tornozelos (SG90, posição)           inclinam os pés para os lados
//   pés (rotação contínua: 90 = parado)  rodam os discos dos pés
// Modo andar: inclina-se sobre um pé e roda esse pé (o corpo gira à volta dele e o outro pé
// avança); depois o mesmo do outro lado. Modo rodar: os pés viram rodas.
#include <Servo.h>

const int PIN_TORNOZELO_E = 2;
const int PIN_TORNOZELO_D = 3;
const int PIN_PE_E = 4;
const int PIN_PE_D = 5;
const int TRIG = 8;
const int ECHO = 9;

// CALIBRAÇÃO (graus do Servo.h). No original o modo andar é 60 / 120 (o braço do servo fica
// noutra posição); aqui a montagem foi feita com os pés deitados a 90.
int LA0 = 90;    // tornozelo esquerdo: modo andar (pé deitado)
int RA0 = 90;    // tornozelo direito: modo andar
int LA1 = 180;   // tornozelo esquerdo: modo rodar (o disco fica de pé: roda)
int RA1 = 0;     // tornozelo direito: modo rodar
int LATR = LA0 - 45;  // inclinar para a direita (levanta o pé esquerdo)
int RATR = RA0 - 20;
int LATL = LA0 + 20;  // inclinar para a esquerda (levanta o pé direito)
int RATL = RA0 + 45;
int PASSO = 15;  // velocidade dos pés a andar (0 = parado ... 90 = máxima)
int RODA = 20;   // velocidade das rodas no modo rodar
const int PERTO = 15;  // cm: obstáculo

Servo tornozeloE, tornozeloD, peE, peD;
int anguloE = 90;  // posição atual dos tornozelos
int anguloD = 90;

// move os dois tornozelos devagar até (e, d), em ms
void tornozelos(int e, int d, int ms) {
  int n = ms / 20;
  int e0 = anguloE;
  int d0 = anguloD;
  for (int i = 1; i <= n; i++) {
    tornozeloE.write(e0 + (e - e0) * i / n);
    tornozeloD.write(d0 + (d - d0) * i / n);
    delay(20);
  }
  anguloE = e;
  anguloD = d;
}

void pes(int e, int d) {
  peE.write(e);
  peD.write(d);
}

int distancia() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long t = pulseIn(ECHO, HIGH, 30000);
  if (t == 0) return 999;  // nada à frente
  return t * 0.034 / 2;
}

// ---------- modo andar ----------
void modoAndar() {
  Serial.println("Modo andar: pes deitados");
  pes(90, 90);
  tornozelos(LA0, RA0, 1000);
  delay(300);
}

// um passo: inclina-se para a direita e roda o pé direito (o esquerdo avança);
// depois inclina-se para a esquerda e roda o pé esquerdo
void passo() {
  tornozelos(LATR, RATR, 600);
  delay(200);
  peD.write(90 - PASSO);
  delay(400);
  peD.write(90);
  tornozelos(LA0, RA0, 400);
  delay(200);
  tornozelos(LATL, RATL, 600);
  delay(200);
  peE.write(90 + PASSO);
  delay(400);
  peE.write(90);
  tornozelos(LA0, RA0, 400);
  delay(200);
}

// ---------- modo rodar ----------
void modoRodar() {
  Serial.println("Modo rodar: os pes viram rodas");
  pes(90, 90);
  tornozelos(LA1, RA1, 1000);
  delay(300);
}

void rodarFrente()   { pes(90 + RODA, 90 - RODA); }
void rodarTras()     { pes(90 - RODA, 90 + RODA); }
void rodarEsquerda() { pes(90 - RODA, 90 - RODA); }
void parar()         { pes(90, 90); }

void setup() {
  Serial.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  peE.attach(PIN_PE_E);
  peD.attach(PIN_PE_D);
  parar();
  tornozeloE.attach(PIN_TORNOZELO_E);
  tornozeloD.attach(PIN_TORNOZELO_D);
  tornozeloE.write(LA0);
  tornozeloD.write(RA0);
  anguloE = LA0;
  anguloD = RA0;
  Serial.println("Ola! Sou o Otto Ninja.");
  delay(2000);
}

void loop() {
  // 1) a andar: 4 passos (pára se houver um obstáculo à frente)
  modoAndar();
  for (int i = 1; i <= 4; i++) {
    int d = distancia();
    if (d < PERTO) {
      Serial.print("Obstaculo a ");
      Serial.print(d);
      Serial.println(" cm: vou rodar");
      break;
    }
    Serial.print("Passo ");
    Serial.println(i);
    passo();
  }

  // 2) a rodar durante 15 s, a evitar obstáculos
  modoRodar();
  unsigned long t0 = millis();
  while (millis() - t0 < 15000) {
    int d = distancia();
    if (d < PERTO) {
      Serial.print("Obstaculo a ");
      Serial.print(d);
      Serial.println(" cm: recuar e virar");
      parar();
      delay(200);
      rodarTras();
      delay(500);
      rodarEsquerda();
      delay(700);
      parar();
      delay(200);
    } else {
      rodarFrente();
      delay(100);
    }
  }
  parar();
  delay(500);
}
`;

// ---------------- cenários de teste (bun scripts/check-examples.js) ----------------
export const PRESETS = {
  ottoNinja: {
    name: "Otto Ninja: anda e transforma-se em carro (4 servos)",
    cat: "Robôs",
    track: "obstaculos",
    build: () => buildNinja(),
    code: CODE_NINJA,
    scenario: {
      check: (S) => {
        const tz = Math.max(
          S.servoRange("tornozeloServoE"),
          S.servoRange("tornozeloServoD"),
        );
        // (o teste é curto: só apanha os primeiros passos; o modo rodar vem depois de 4 passos)
        return tz > 30 &&
          /Ola! Sou o Otto Ninja/.test(S.serial) &&
          /Passo 1/.test(S.serial)
          ? `a andar: tornozelos ${tz.toFixed(0)}°; ${S.serial.match(/Modo [^\n]*/)?.[0]}`
          : null;
      },
    },
  },
};

export const SNIPPETS = {
  "Otto Ninja: andar e rodar": CODE_NINJA,
};
