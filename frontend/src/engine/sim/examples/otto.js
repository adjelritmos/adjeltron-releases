// Robôs Otto DIY (bípede de 4 micro servos, código aberto), montados como o Otto do utilizador
// (projeto "Otto Robot", que anda na app): corpo branco e cabeça preta em blocos de PLA, os servos
// das ancas nos lados do corpo, pernas em suportes em U, os servos dos pés na ponta das pernas, os
// tornozelos em U e os pés em placas; HC-SR04 (olhos) à frente da cabeça; placa de expansão para
// Nano com um Keyestudio Nano dentro do corpo; buzzer por baixo. Com esta montagem das pernas o
// Otto anda (walk FORWARD) para o lado −x: os olhos ficam nessa face da cabeça. Programas com as bibliotecas
// Otto.h / Otto9Humanoid.h incluídas no simulador (srclibs/).
//   pinos   YL 2, YR 3 (ancas)  RL 4, RR 5 (pés)  buzzer 10  HC-SR04 Trig 8 / Echo 9
//   Humanoide: + braços LA 6, RA 7 e boca (matriz MAX7219) DIN 11, CS 12, CLK 13
import { H } from '../examples.js'

const { w, COR, RED, BLK } = H
// peça com nome (label) — como no projeto original
const part = (id, type, o = {}) => ({ ...H.part(id, type, o), ...(o.label ? { label: o.label } : {}) })

// ---------------- montagem (a do projeto "Otto Robot") ----------------
function buildOtto({ humanoide = false } = {}) {
  const parts = [
    part('corpo', 'bloco', { pos: [0, 5.8, 0], config: {'x': 9.5, 'y': 4, 'z': 9.5, 'material': 'plaSolido', 'color': '#ffffff'}, label: 'corpo' }),
    part('cabeca', 'bloco', { parent: ['corpo', 'center'], pos: [0, 0, 0], config: {'x': 8.5, 'y': 3, 'z': 8.5, 'material': 'plaSolido', 'color': '#1a1a1a'}, label: 'cabeça' }),
    part('ancaD', 'servo', { parent: ['corpo', 'left'], pos: [0, -1.25, 0.5], rot: [-90, 0, 0], sch: [-310, 228.24, 90], label: 'PernaDireita' }),
    part('ancaE', 'servo', { parent: ['corpo', 'right'], pos: [0, -1.25, -0.5], rot: [90, 0, 0], sch: [-480, 228.24, 90], label: 'PernaEsquerda' }),
    part('pernaD', 'uLongo', { parent: ['ancaD', 'horn'], pos: [2, 3.5, 0], rot: [0, 0, -90], config: {'servo': 'mg996', 'length': 3.5, 'material': 'plaSolido', 'color': '#ffffff', 'width': 2.8, 'height': 4.45}, label: 'UPernaDireita' }),
    part('pernaE', 'uLongo', { parent: ['ancaE', 'horn'], pos: [2, 3.5, 0], rot: [0, 0, -90], config: {'servo': 'mg996', 'length': 3.5, 'material': 'plaSolido', 'height': 4.45}, label: 'UPernaEsquerda' }),
    part('servoPeD', 'servo', { parent: ['pernaD', 'top'], pos: [-1.5, -4.75, 0], rot: [180, 0, 180], config: {'scale': [1, 1.8, 1]}, sch: [30, 228.24, 90], label: 'PéDireito' }),
    part('servoPeE', 'servo', { parent: ['pernaE', 'top'], pos: [-1.5, -4.75, 0], rot: [180, 0, 180], config: {'scale': [0.9848, 1.8, 1]}, sch: [-140, 228.24, 90], label: 'PéEsquerdo' }),
    part('tornozeloD', 'uLongo', { parent: ['servoPeD', 'horn'], pos: [0, 0, 0], config: {'servo': 'mg996', 'length': 2, 'material': 'plaSolido', 'color': '#1a1a1a', 'height': 5.2}, label: 'UPED' }),
    part('tornozeloE', 'uLongo', { parent: ['servoPeE', 'horn'], pos: [0, 0, 0], config: {'servo': 'mg996', 'length': 2, 'material': 'plaSolido', 'color': '#1a1a1a', 'height': 5.2, 'width': 2.8}, label: 'UPEE' }),
    part('peD', 'placa', { parent: ['tornozeloD', 'cross'], pos: [0.75, 0, 0], config: {'l': 4.5, 'w': 9, 't': 0.1, 'holes': false, 'material': 'plaSolido', 'color': '#1a1a1a'}, label: 'BasePeDireito' }),
    part('peE', 'placa', { parent: ['tornozeloE', 'cross'], pos: [-0.75, 0, 0], config: {'l': 4.5, 'w': 9, 't': 0.1, 'holes': false, 'material': 'plaSolido', 'color': '#1a1a1a'}, label: 'BasePeEsquerdo' }),
    part('shield', 'nanoShield', { parent: ['corpo', 'top'], pos: [0, -2.75, 0], config: {'on': true}, sch: [-161.44, -67.68, 180] }),
    part('nano', 'nanoKeyestudio', { parent: ['shield', 'socket'], pos: [0, 0, 0], config: {'usb': false}, sch: [-147.44, -59.68, 180] }),
    part('buzzer', 'buzzerPassive', { parent: ['corpo', 'bottom'], pos: [0, -0.75, 0], sch: [-391.16, 91.44, 0] }),
  ]
  parts[0].physics = 'dynamic' // o corpo é a raiz de um robô livre (física real)
  // olhos (HC-SR04) na face da cabeça para onde o Otto anda com walk(FORWARD) — com esta montagem
  // das pernas é a face de trás (−x) do bloco; por isso a esquerda do robô é o lado +z (YL, RL)
  parts.push(part('olhos', 'hcsr04', { parent: ['cabeca', 'back'], pos: [-0.75, -1, 0], rot: [-180, 0, -90], config: { pinosDir: 'tras' }, sch: [-421.64, -215.56, 0] }))
  // alimentação: 4 pilhas AA recarregáveis (NiMH, ~4,8–5,5 V) dentro do corpo, nos 5 V do conector
  // série da placa (pela USB, os 4 servos pediam ~650 mA, mais do que os 500 mA da USB)
  parts.push(part('bat', 'aaBox4', { parent: ['corpo', 'top'], pos: [-2.9, -3.75, 0], rot: [0, 90, 0], config: { charge: 90, pilhas: 'nimh' }, sch: [200, -70, 180] }))
  const wires = [
    w('shield', 'D8.V', 'olhos', 'VCC', '#e53935', [[-440, 10.16], [-440, -162.56]]),
    w('shield', 'D8.G', 'olhos', 'GND', '#1a1a1a', [[-405, 20.32], [-405, -162.56]]),
    w('shield', 'D8.S', 'olhos', 'Trig', '#8b5cf6', [[-290, -0.0], [-290, 0], [-426.72, 0]]),
    w('olhos', 'Echo', 'shield', 'D9.S', '#3b82f6', [[-416.56, -10], [-144.08, -10]]),
    w('buzzer', '-', 'shield', 'D10.G', '#1a1a1a', [[-375.92, 90], [-121.92, 90]]),
    w('buzzer', '+', 'shield', 'D10.S', '#22c55e', [[-410, 91.44], [-410, 30], [-121.92, 30]]),
  ]
  wires.push(w('bat', '+', 'shield', 'U.5V', RED), w('bat', '-', 'shield', 'U.GND', BLK))
  if (humanoide) bracosEBoca(parts, wires)
  wires.push(...cabosServos(parts, humanoide))
  // o robô fica virado para +x (os olhos para a frente, como os outros exemplos e as imagens do site)
  parts[0].rot = [0, 180, 0]
  return { parts, wires }
}

// fios dos servos no 2D: dos conectores G/V/S da placa (por baixo dela) até à fila dos servos. Cada
// coluna tem S, V e G à mesma altura x; o S sai pela esquerda, o V pela direita e o G a direito; os
// fios descem até níveis diferentes e seguem para o servo sem se cruzarem entre cabos
function cabosServos(parts, humanoide) {
  const W = H.fios(parts)
  const lig = [[2, 'ancaE'], [3, 'ancaD'], [4, 'servoPeE'], [5, 'servoPeD'], ...(humanoide ? [[6, 'ombroE'], [7, 'ombroD']] : [])]
  const cor = { SIG: '#ffd700', VCC: '#e53935', GND: '#1a1a1a' }
  const rotas = lig.flatMap(([d, sid]) =>
    [['S', 'SIG', -4], ['V', 'VCC', 4], ['G', 'GND', 0]].map(([r, pin, dx]) => {
      const P = W.at('shield', `D${d}.${r}`)
      return { sp: `D${d}.${r}`, sid, pin, P, lane: P[0] + dx, t: W.at(sid, pin) }
    }),
  )
  const y0 = Math.max(...rotas.map((r) => r.P[1])) + 22
  const out = []
  for (const grupo of [rotas.filter((r) => r.t[0] < r.lane).sort((a, b) => a.lane - b.lane), rotas.filter((r) => r.t[0] >= r.lane).sort((a, b) => b.lane - a.lane)])
    grupo.forEach((r, i) => {
      const y = y0 + i * 7
      out.push(w('shield', r.sp, r.sid, r.pin, cor[r.pin], [...(r.lane !== r.P[0] ? [[r.lane, r.P[1]]] : []), [r.lane, y], [r.t[0], y]]))
    })
  return out
}

// Humanoide: um servo colado a cada lado do corpo com um braço em U, e a boca (matriz de LEDs) na
// frente do corpo — como no projeto corrigido pelo utilizador
function bracosEBoca(parts, wires) {
  // servos dos ombros colados aos lados do corpo; os braços são suportes em U, como as pernas
  const BRACO = { servo: 'mg996', length: 4.3, material: 'plaSolido', height: 2.75, width: 1.6, color: '#ffffff' }
  parts.push(
    part('ombroE', 'servo', { parent: ['corpo', 'right'], pos: [1.35, 0.61, -1.25], rot: [0, 0, 90], sch: [200, 228.24, 90], label: 'BracoEsquerdo' }),
    part('ombroD', 'servo', { parent: ['corpo', 'left'], pos: [1.25, 0.5, 1.25], rot: [0, 0, 90], sch: [370, 228.24, 90], label: 'BracoDireito' }),
    part('bracoE', 'uLongo', { parent: ['ombroE', 'horn'], rot: [0, -90, 0], config: BRACO, label: 'UBracoEsquerdo' }),
    part('bracoD', 'uLongo', { parent: ['ombroD', 'horn'], rot: [0, 90, 0], config: BRACO, label: 'UBracoDireito' }),
  )
  parts.push(part('boca', 'max7219', { parent: ['corpo', 'back'], pos: [0, -1, 0], rot: [0, -90, 0], sch: [-560, -420, 0] }))
  wires.push(
    w('shield', 'D11.S', 'boca', 'DIN', COR.azul),
    w('shield', 'D12.S', 'boca', 'CS', COR.roxo),
    w('shield', 'D13.S', 'boca', 'CLK', COR.verde),
    w('shield', 'D13.V', 'boca', 'VCC', RED),
    w('shield', 'D13.G', 'boca', 'GND', BLK),
  )
}

// ---------------- programas ----------------
// o programa do projeto "Otto Robot" (Otto All moves, ottodiy.com, CC BY-SA)
export const CODE_OTTO_TODOS = `//----------------------------------------------------------------
//--  Otto All moves setup
//-- You can add functions, gestures or sounds in loop
//--  CC BY SA (http://ottodiy.com)
//-- 25 October 2018
//-----------------------------------------------------------------
#include  <Servo.h> 
#include <Oscillator.h>
#include <US.h>
#include <Otto.h>
Otto  Otto;  //This is Otto!
//---------------------------------------------------------
//--  First step: Make sure the pins for servos are in the right position
/*
         ---------------  
        |     O   O     |
        |---------------|
YR 3==> |               |  <== YL 2
         --------------- 
            ||     ||
RR 5==>   -----   ------  <== RL 4
         |-----   ------|
*/
  #define PIN_YL 2 //servo[2]
  #define PIN_YR 3 //servo[3]
  #define PIN_RL 4 //servo[4]
  #define PIN_RR  5 //servo[5]
  #define PIN_BUZZER 10
/*SOUNDS******************
 * S_connection  S_disconnection  S_buttonPushed  S_mode1 S_mode2 S_mode3 S_surprise S_OhOoh  S_OhOoh2  S_cuddly 
 * S_sleeping  S_happy S_superHappy S_happy_short S_sad S_confused S_fart1 S_fart2  S_fart3 
  */
/*MOVEMENTS LIST**************
 * dir=1---> FORWARD/LEFT
 * dir=-1--->  BACKWARD/RIGTH
 * T : amount of movement. HIGHER VALUE SLOWER MOVEMENT usually  1000 (from 600 to 1400)
 * h: height of mov. around 20
     jump(steps=1,  int T = 2000);
     walk(steps, T, dir);
     turn(steps, T, dir);
     bend  (steps, T, dir); //usually steps =1, T=2000
     shakeLeg (steps, T, dir);
     updown(steps, T, HEIGHT);
     swing(steps, T, HEIGHT);
     tiptoeSwing(steps,  T, HEIGHT);
     jitter(steps, T, HEIGHT); (small T)
     ascendingTurn(steps,  T, HEIGHT);
     moonwalker(steps, T, HEIGHT,dir);
     crusaito(steps, T,  HEIGHT,dir);
     flapping(steps, T, HEIGHT,dir);
/*GESTURES LIST***************
OttoHappy  OttoSuperHappy  OttoSad   OttoSleeping  OttoFart  OttoConfused OttoLove  OttoAngry   
OttoFretful OttoMagic  OttoWave  OttoVictory  OttoFail*/
///////////////////////////////////////////////////////////////////
//--  Global Variables -------------------------------------------//
///////////////////////////////////////////////////////////////////
bool  obstacleDetected = false;
int distance = 0;
///////////////////////////////////////////////////////////////////
//--  Setup ------------------------------------------------------//
///////////////////////////////////////////////////////////////////
void  setup(){
  //Set the servo pins
  Otto.init(PIN_YL,PIN_YR,PIN_RL,PIN_RR,true, PIN_BUZZER);
  Otto.sing(S_connection); //Otto wake up!
  Otto.home();
  delay(50);
}
///////////////////////////////////////////////////////////////////
//--  Principal Loop ---------------------------------------------//
//--Uncomment  lines or add you own-------------------------------//
///////////////////////////////////////////////////////////////////
void  loop() {
  //OBSTACLE MODE ON!!!! 
  obstacleMode();
  Otto.sing(S_surprise);
  Otto.walk(2,1000,1); //2 steps FORWARD
  Otto.sing(S_OhOoh);
  Otto.walk(2,1000,-1); //2 steps BACKSWARD
  Otto.sing(S_OhOoh2);
  Otto.playGesture(OttoFretful);
  Otto.sing(S_cuddly);
  Otto.home();
  Otto.playGesture(OttoSleeping);
  Otto.sing(S_sleeping);
  delay(1000);
  Otto.sing(S_happy);
  Otto.playGesture(OttoHappy);
  Otto.turn(2,1000,1);//2 steps turning RIGHT  
  Otto.sing(S_happy_short);    
  delay(50);
  Otto.playGesture(OttoSuperHappy);
  Otto.sing(S_superHappy);
  Otto.turn(2,1000,-1);//2 steps turning  RIGHT 
  Otto.playGesture(OttoSad);
  Otto.sing(S_sad);     
  delay(50);
  Otto.moonwalker(3, 1000, 25, 1);
  Otto.playGesture(OttoConfused);
  Otto.sing(S_confused);
  Otto.home();
  Otto.bend  (1, 2000, 1);
  Otto.playGesture(OttoFart);
  Otto.sing(S_fart1);
  Otto.sing(S_fart2);
  Otto.sing(S_fart3);
  Otto.home();
  Otto.ascendingTurn(1, 2000, 22);
  Otto.playGesture(OttoVictory);
  Otto.home();
  Otto.updown(1, 2000, 22);
  Otto.playGesture(OttoMagic);
  Otto.home();
  Otto.playGesture(OttoFail);
  Otto.sing(S_disconnection);
}
///////////////////////////////////////////////////////////////////
//--  Function to avoid obstacles
void obstacleMode(){
  distance = Otto.getDistance();
  if(distance<15){
      Otto.sing(S_surprise); 
     Otto.walk(2,1300,-1);  
     Otto.turn(3,1000,-1);    
   delay(50);  
    }
    else{
      Otto.walk(2,1000,1); 
    }
}
`

export const CODE_OTTO_EVITA = `// ==========================================
// Otto DIY: anda e evita obstáculos (HC-SR04 = olhos)
// ==========================================
#include <Otto.h>
Otto Otto;

#define PIN_YL 2
#define PIN_YR 3
#define PIN_RL 4
#define PIN_RR 5
#define PIN_Buzzer 10
#define PIN_Trigger 8
#define PIN_Echo 9
#define PIN_Noise A6

const int PERTO = 15;   // cm: mais perto do que isto, o Otto recua e vira

void setup() {
  Serial.begin(9600);
  // forma com sensores: (YL, YR, RL, RR, calibração, microfone, buzzer, Trig, Echo)
  Otto.init(PIN_YL, PIN_YR, PIN_RL, PIN_RR, true, PIN_Noise, PIN_Buzzer, PIN_Trigger, PIN_Echo);
  Otto.sing(S_connection);
  Otto.home();
}

void loop() {
  float d = Otto.getDistance();
  Serial.print("Distancia: ");
  Serial.print(d);
  Serial.println(" cm");
  if (d > 0 && d < PERTO) {
    Serial.println("Obstaculo! Recuar e virar");
    Otto.sing(S_surprise);
    Otto.playGesture(OttoConfused);
    Otto.walk(2, 1300, BACKWARD);
    Otto.home();
    Otto.turn(3, 1500, RIGHT);
    Otto.home();
  } else {
    Otto.walk(1, 1000, FORWARD);
  }
}
`

export const CODE_OTTO_HUMANOIDE = `// ==========================================
// Otto Humanoide: braços, boca de LEDs e passos (Otto9Humanoid.h)
// ==========================================
#include <Otto9Humanoid.h>
Otto9Humanoid Otto;

#define PIN_YL 2
#define PIN_YR 3
#define PIN_RL 4
#define PIN_RR 5
#define PIN_LA 6       // braço esquerdo
#define PIN_RA 7       // braço direito
#define PIN_Buzzer 10
#define PIN_Trigger 8
#define PIN_Echo 9
#define PIN_Noise A6
#define DIN 11         // matriz de LEDs MAX7219 (boca)
#define CS 12
#define CLK 13
#define Orientation 1

void setup() {
  Serial.begin(9600);
  Otto.init(PIN_YL, PIN_YR, PIN_RL, PIN_RR, PIN_LA, PIN_RA, true, PIN_Noise, PIN_Buzzer, PIN_Trigger, PIN_Echo);
  Otto.initMATRIX(DIN, CS, CLK, Orientation);
  Otto.matrixIntensity(5);
  Otto.home();
  Otto.putMouth(smile);
  Otto.sing(S_connection);
  Serial.println("Ola! Sou o Otto Humanoide.");
}

void loop() {
  Serial.println("Acenar");
  Otto.putMouth(happyOpen);
  Otto.handwave(RIGHT);
  Otto.handwave(LEFT);

  Serial.println("Maos no ar!");
  Otto.putMouth(bigSurprise);
  Otto.handsup();
  Otto.sing(S_superHappy);
  delay(500);
  Otto.home();

  Serial.println("Bater as asas");
  Otto.putMouth(heart);
  Otto.armsFlap(3, 800, 40);

  Serial.println("Andar");
  Otto.putMouth(smile);
  Otto.walk(3, 1000, FORWARD);
  Otto.turn(2, 1500, LEFT);
  Otto.home();

  float d = Otto.getDistance();
  Serial.print("Distancia: ");
  Serial.println(d);
  if (d > 0 && d < 20) {
    Otto.putMouth(xMouth);
    Otto.playGesture(OttoFretful);
  } else {
    Otto.playGesture(OttoVictory);
  }
  delay(800);
}
`

// ---------------- cenários de teste (bun scripts/check-examples.js) ----------------
export const PRESETS = {
  ottoDanca: {
    name: 'Otto DIY: todos os movimentos (anda, dança, sons e gestos)',
    cat: 'Robôs',
    track: 'mesa',
    build: () => buildOtto(),
    code: CODE_OTTO_TODOS,
    scenario: {
      check: (S) => {
        // (amostras de 0,5 s: conforme a fase, apanham as ancas ou os pés no zero do seno)
        const anca = Math.max(S.servoRange('ancaE'), S.servoRange('ancaD'))
        const pe = Math.max(S.servoRange('servoPeE'), S.servoRange('servoPeD'))
        return Math.max(anca, pe) > 20 ? `a andar: ancas ${anca.toFixed(0)}°, pés ${pe.toFixed(0)}°` : null
      },
    },
  },
  ottoEvita: {
    name: 'Otto DIY: anda e evita obstáculos (HC-SR04)',
    cat: 'Robôs',
    track: 'obstaculos',
    build: () => buildOtto(),
    code: CODE_OTTO_EVITA,
    scenario: {
      check: (S) => {
        const anca = Math.max(S.servoRange('ancaE'), S.servoRange('ancaD'))
        return anca > 20 && /Distancia: [\d.]+/.test(S.serial) ? `ancas ${anca.toFixed(0)}°; ${S.serial.match(/Distancia: [\d.]+/)?.[0]} cm` : null
      },
    },
  },
  ottoHumanoide: {
    name: 'Otto Humanoide: acena, boca de LEDs e anda (6 servos)',
    cat: 'Robôs',
    track: 'mesa',
    build: () => buildOtto({ humanoide: true }),
    code: CODE_OTTO_HUMANOIDE,
    scenario: {
      check: (S) => {
        const bracos = Math.max(S.servoRange('ombroE'), S.servoRange('ombroD'))
        return bracos > 40 && /Acenar/.test(S.serial) && S.samples.at(-1).live.boca ? `acenou (braços ${bracos.toFixed(0)}°); ${S.serial.match(/Ola![^\n]*/)?.[0]}` : null
      },
    },
  },
}

export const SNIPPETS = {
  'Otto DIY: todos os movimentos': CODE_OTTO_TODOS,
  'Otto DIY: evitar obstáculos': CODE_OTTO_EVITA,
  'Otto Humanoide: braços e boca': CODE_OTTO_HUMANOIDE,
}
