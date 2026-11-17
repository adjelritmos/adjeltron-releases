// Seguidor solar de um eixo: um painel solar num servo SG90 deitado (eixo horizontal) roda à
// procura do sol. O Arduino mede a tensão do painel (com uma carga de 33 Ω, para a tensão
// seguir a luz) num divisor 10k/10k em A0, faz um varrimento inicial e depois uma "subida do
// monte": experimenta ±2° e fica do lado que dá mais tensão.
// O sol (elevação e azimute) muda-se nas propriedades do painel; a luz no slider da simulação.
import { H } from '../examples.js'
import { add, pointW } from './bracos.js'

const { part, plug, fios, assentar, alimentar, railAt, RED, BLK, COR } = H
const arduino = () => H.mesa(part('uno', 'arduino'), 0, 0)
const breadboard = () => H.mesa(part('bb', 'breadboard'), H.BBX, H.BBY)

function buildSolar() {
  // eletrónica na mesa (Arduino e breadboard) e o seguidor ao lado, numa base de madeira
  const bb = breadboard()
  const res = (id, col, ohms) => plug(part(id, 'resistor', { config: { ohms } }), bb, '1', `${col}e`, 90)
  const parts = [
    arduino(),
    bb,
    res('rA', 10, 10000), // divisor: + do painel → A0
    res('rB', 14, 10000), // divisor: A0 → GND
    res('carga', 20, 33), // carga do painel
    part('base', 'bloco', { pos: [19, 0, -3], config: { x: 14, y: 1.5, z: 12, material: 'madeira' } }),
  ]
  parts.push(part('poste', 'bloco', { parent: ['base', 'top'], pos: [0, 0, 2], config: { x: 2, y: 9, z: 2, material: 'alu' } }))
  // servo deitado na face esquerda (−z) do poste: eixo do braço segundo −z
  add(parts, 'sv', 'servo', 'poste', 'left', [1, 0, 0], [0, 0, -1], { alvoW: [19, 9.2, -2], sch: [560, 40] })
  // espaçador no braço do servo e o painel por cima (o eixo fica no plano do painel)
  add(parts, 'apoio', 'bloco', 'sv', 'horn', [1, 0, 0], [0, 1, 0], { config: { x: 1.2, y: 1.2, z: 0.6, material: 'pla', color: '#263238' } })
  add(parts, 'pv', 'painelSolar', 'apoio', 'top', [1, 0, 0], [0, 1, 0], { alvoW: pointW(parts, 'apoio', 'top'), config: { model: 'm1', sunElev: 50, sunAz: 0 }, sch: [600, -330] })
  const all = assentar(parts)
  const W = fios(all)
  const wires = [
    ...alimentar(W, { v5: true }),
    // painel: + na coluna 10 (em cima), − no trilho negativo de cima
    W('pv', '+', 'bb', '10a', RED),
    W('pv', '-', 'bb', railAt('tn', 24), BLK),
    // divisor (rA: 10 em cima → 10 em baixo = A0; rB: 14 em baixo → 14 em cima = GND)
    W('bb', '10j', 'bb', '14j', COR.amarelo),
    W('bb', '14a', 'bb', railAt('tn', 14), BLK),
    W('uno', 'A0', 'bb', '10i', COR.amarelo, { y: 200 }),
    // carga de 33 Ω: + do painel → 20 em cima; 20 em baixo → GND
    W('bb', '10b', 'bb', '20b', RED),
    W('bb', '20j', 'bb', railAt('bn', 20), BLK),
    // servo: sinal no D9, alimentação nos trilhos de baixo
    W('uno', 'D9', 'sv', 'SIG', COR.laranja, { y: -150 }),
    W('sv', 'VCC', 'bb', railAt('bp', 28), RED),
    W('sv', 'GND', 'bb', railAt('bn', 28), BLK),
  ]
  return { parts: all, wires }
}

const CODE_SOLAR = `// ==========================================
//  Seguidor solar de 1 eixo
//  Painel solar 6 V 1 W com carga de 33 Ω; divisor 10k/10k para A0 (tensão / 2).
//  Servo SG90 no pino 9 roda o painel à procura da maior tensão.
//  Mude o sol nas propriedades do painel (elevação/azimute) e a luz no slider.
//  Veja "tensao" e "angulo" no Serial Plotter.
// ==========================================
#include <Servo.h>

Servo eixo;
int ang = 90;

float lerPainel() {
  long soma = 0;
  for (int i = 0; i < 8; i++) soma += analogRead(A0);
  return soma / 8.0 * 5.0 / 1023.0 * 2.0;   // ×2 por causa do divisor
}

void setup() {
  Serial.begin(115200);
  eixo.attach(9);
  eixo.write(ang);
  delay(600);
  // varrimento inicial: de 20° a 160°, guarda o ângulo com mais tensão
  float melhor = -1;
  int melhorAng = 90;
  for (int a = 20; a <= 160; a += 10) {
    eixo.write(a);
    delay(250);
    float v = lerPainel();
    if (v > melhor) { melhor = v; melhorAng = a; }
  }
  ang = melhorAng;
  eixo.write(ang);
  delay(300);
}

void loop() {
  // subida do monte: experimenta 2° para cada lado e fica com o melhor
  float v0 = lerPainel();
  eixo.write(constrain(ang + 2, 0, 180)); delay(120);
  float vMais = lerPainel();
  eixo.write(constrain(ang - 2, 0, 180)); delay(120);
  float vMenos = lerPainel();
  if (vMais > v0 + 0.01 && vMais >= vMenos) ang += 2;
  else if (vMenos > v0 + 0.01) ang -= 2;
  ang = constrain(ang, 0, 180);
  eixo.write(ang);
  delay(120);

  Serial.print("tensao:");
  Serial.print(v0, 2);
  Serial.print(",angulo:");
  Serial.println(ang);
}
`

export const PRESETS = {
  seguidorSolar: {
    name: 'Seguidor solar: painel num servo procura o sol',
    cat: 'Energia',
    track: 'mesa',
    build: buildSolar,
    code: CODE_SOLAR,
    scenario: {
      seconds: 9,
      check: (S) => {
        const L = S.samples.at(-1).live.pv
        return L && L.ang <= 8 && L.v > 4 ? `painel virado para o sol (desvio ${L.ang}°): ${L.v} V, ${Math.round(L.i * 1000)} mA` : null
      },
    },
  },
}

export const SNIPPETS = { 'Seguidor solar (painel + servo)': CODE_SOLAR }
