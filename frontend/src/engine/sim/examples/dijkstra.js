// Robô que calcula o caminho mais curto com o algoritmo de Dijkstra e o percorre numa grelha
// de ruas pintadas no chão (pista "grelha" de shared/tracks.js): 12 cruzamentos numerados,
// ruas com comprimentos diferentes, ruas cortadas e ruas de terra (tracejadas, custam o dobro).
// O mapa do sketch é gerado a partir da própria pista: o código e o chão nunca divergem.
//
// Sensores: 3 IR ao centro para seguir a linha e 2 IR afastados para detetar os cruzamentos.
import { H } from '../examples.js'
import { gridGraph, GRID, trackInfo } from '../../../../../shared/tracks.js'

const { part, w, RED, BLK } = H

function buildDijkstra() {
  const st = trackInfo('grelha').start
  const parts = [
    part('ch', 'chassis', { pos: [st.x, 0, st.z], rot: [0, (st.theta * 180) / Math.PI, 0] }),
    part('mL', 'motor', { parent: ['ch', 'motorL'], sch: [-640, -170] }),
    part('mR', 'motor', { parent: ['ch', 'motorR'], sch: [-640, 140] }),
    part('bat', 'battery', { parent: ['ch', 'top'], pos: [-6.2, 0, 0], rot: [0, -90, 0], sch: [-300, 290] }),
    part('drv', 'l298n', { parent: ['ch', 'top'], pos: [-2.0, 0, 0], sch: [-330, -20] }),
    part('uno', 'arduino', { parent: ['ch', 'top'], pos: [4.6, 0, 0], sch: [0, 0], config: { usb: false } }),
    // sensores de linha (por baixo, à frente): esquerda, centro, direita
    part('irE', 'ir', { parent: ['ch', 'bottom'], pos: [10, 0, -1.7], sch: [320, -200] }),
    part('irC', 'ir', { parent: ['ch', 'bottom'], pos: [10, 0, 0], sch: [560, 0] }),
    part('irD', 'ir', { parent: ['ch', 'bottom'], pos: [10, 0, 1.7], sch: [320, 200] }),
    // sensores de cruzamento (afastados: só veem preto quando há uma rua de lado)
    part('irLE', 'ir', { parent: ['ch', 'bottom'], pos: [10, 0, -4.4], sch: [560, -260] }),
    part('irLD', 'ir', { parent: ['ch', 'bottom'], pos: [10, 0, 4.4], sch: [560, 260] }),
  ]
  const wires = [
    w('bat', '+', 'drv', '12V', RED),
    w('bat', '-', 'drv', 'GND', BLK),
    w('drv', '5V', 'uno', '5V', RED),
    w('drv', 'GND', 'uno', 'GND.2', BLK),
    w('drv', 'OUT1', 'mL', 'M+', '#fb8c00'),
    w('drv', 'OUT2', 'mL', 'M-', '#8e24aa'),
    // o motor direito está rodado 180°: fios trocados para girar no mesmo sentido
    w('drv', 'OUT3', 'mR', 'M-', '#8e24aa'),
    w('drv', 'OUT4', 'mR', 'M+', '#fb8c00'),
    w('uno', 'D5', 'drv', 'ENA', '#fdd835'),
    w('uno', 'D7', 'drv', 'IN1', '#43a047'),
    w('uno', 'D8', 'drv', 'IN2', '#1e88e5'),
    w('uno', 'D9', 'drv', 'IN3', '#43a047'),
    w('uno', 'D10', 'drv', 'IN4', '#1e88e5'),
    w('uno', 'D6', 'drv', 'ENB', '#fdd835'),
  ]
  const sensores = [['irE', 'D2', '#fdd835'], ['irD', 'D3', '#43a047'], ['irC', 'D4', '#1e88e5'], ['irLE', 'D11', '#e53935'], ['irLD', 'D12', '#8e24aa']]
  const gnds = ['GND.1', 'GND.3', 'GND.1', 'GND.3', 'GND.1']
  sensores.forEach(([id, pin, cor], i) => wires.push(w(id, 'VCC', 'uno', '5V', RED), w(id, 'GND', 'uno', gnds[i], BLK), w(id, 'DO', 'uno', pin, cor)))
  return { parts, wires }
}

const CODE_DIJKSTRA = () => {
  const { nodes, edges } = gridGraph()
  const lista = edges.map(([a, b, , custo, terra]) => `  {${a}, ${b}, ${custo}},${terra ? '   // rua de terra (custo a dobrar)' : ''}`).join('\n')
  return `// ==========================================
//  Robô de entregas com o algoritmo de DIJKSTRA
//  Pista: "Grelha de ruas (Dijkstra)" — ${nodes.length} cruzamentos numerados no chão.
//  O robô sabe o mapa (que ruas existem e quanto custa cada uma), calcula o
//  caminho mais barato até ao destino com Dijkstra e percorre-o: segue a linha
//  e, em cada cruzamento, segue em frente, vira à esquerda/direita ou dá a volta.
//  Ruas de terra (tracejadas) custam o dobro: às vezes compensa dar a volta.
//
//  Sensores IR: D2 esquerda, D4 centro, D3 direita (seguir a linha);
//  D11 e D12 afastados, para ver as ruas de lado (cruzamentos).
//  L298N: ENA D5, IN1 D7, IN2 D8, IN3 D9, IN4 D10, ENB D6.
// ==========================================
#define ENA 5
#define IN1 7
#define IN2 8
#define IN3 9
#define IN4 10
#define ENB 6
#define S_ESQ 2
#define S_DIR 3
#define S_CEN 4
#define S_LONGE_ESQ 11
#define S_LONGE_DIR 12

// ---------------- mapa ----------------
const int N = ${nodes.length};           // cruzamentos (numerados por linhas)
const int COLUNAS = ${GRID.xs.length};
const int NA = ${edges.length};          // ruas
// rua: cruzamento A, cruzamento B, custo (cm de rua; terra = o dobro)
const int RUAS[NA][3] = {
${lista}
};
const long INF = 1000000;
int custo[N * N];            // custo[a * N + b] (0 = não há rua)

// ---------------- Dijkstra ----------------
long dist[N];
int anterior[N];
bool fechado[N];
int caminho[N];
int nCaminho = 0;

// caminho mais barato de 'origem' a 'destino' (fica em caminho[0..nCaminho-1])
long dijkstra(int origem, int destino) {
  for (int i = 0; i < N; i++) {
    dist[i] = INF;
    anterior[i] = -1;
    fechado[i] = false;
  }
  dist[origem] = 0;
  for (int k = 0; k < N; k++) {
    // o cruzamento ainda aberto com a menor distância
    int u = -1;
    for (int i = 0; i < N; i++)
      if (!fechado[i] && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || dist[u] == INF) break;
    fechado[u] = true;
    if (u == destino) break;
    // relaxa as ruas que saem de u
    for (int v = 0; v < N; v++) {
      int c = custo[u * N + v];
      if (c > 0 && dist[u] + c < dist[v]) {
        dist[v] = dist[u] + c;
        anterior[v] = u;
      }
    }
  }
  // reconstrói o caminho do destino para trás e inverte-o
  nCaminho = 0;
  for (int v = destino; v != -1; v = anterior[v]) caminho[nCaminho++] = v;
  for (int i = 0; i < nCaminho / 2; i++) {
    int t = caminho[i];
    caminho[i] = caminho[nCaminho - 1 - i];
    caminho[nCaminho - 1 - i] = t;
  }
  return dist[destino];
}

// ---------------- motores e sensores ----------------
const int VEL = 120;          // a seguir a linha
const int VEL_CURVA = 150;
const int VEL_RE = -70;
const int VEL_GIRO = 140;     // a rodar sobre si próprio nos cruzamentos
const int T_EIXO = 420;       // ms a andar para o eixo das rodas ficar sobre o cruzamento
                              // (sensores ~9 cm à frente das rodas; ajuste no robô real)

void motores(int velEsq, int velDir) {
  digitalWrite(IN1, velEsq >= 0 ? HIGH : LOW);
  digitalWrite(IN2, velEsq >= 0 ? LOW : HIGH);
  digitalWrite(IN3, velDir >= 0 ? HIGH : LOW);
  digitalWrite(IN4, velDir >= 0 ? LOW : HIGH);
  analogWrite(ENA, abs(velEsq));
  analogWrite(ENB, abs(velDir));
}
bool ve(int pino) { return digitalRead(pino) == HIGH; }   // HIGH = preto (linha)
bool veCruzamento() { return ve(S_LONGE_ESQ) || ve(S_LONGE_DIR); }

int ultimoLado = 0;            // -1 / +1: de que lado viu a linha pela última vez

// um passo de seguir a linha com os 3 sensores do meio
void segueLinha() {
  bool e = ve(S_ESQ), c = ve(S_CEN), d = ve(S_DIR);
  if (e && !d) {
    motores(VEL_RE, VEL_CURVA);
    ultimoLado = -1;
  } else if (d && !e) {
    motores(VEL_CURVA, VEL_RE);
    ultimoLado = 1;
  } else if (c || (e && d)) {
    motores(VEL, VEL);        // linha ao centro (ou cruzamento)
    ultimoLado = 0;
  } else if (ultimoLado < 0) {
    motores(VEL_RE, VEL_CURVA);   // perdeu-a: volta para o lado onde a viu
  } else if (ultimoLado > 0) {
    motores(VEL_CURVA, VEL_RE);
  } else {
    motores(VEL, VEL);        // falha da rua de terra: segue em frente
  }
}

// ---------------- navegação ----------------
// rumos: 0 Este (+x), 1 Norte, 2 Oeste, 3 Sul. Esquerda = rumo + 1.
int noAtual = 0;
int rumo = 0;
const char* NOME_RUMO[4] = {"Este", "Norte", "Oeste", "Sul"};

int linhaDe(int n) { return (int)(n / COLUNAS); }
int colunaDe(int n) { return n % COLUNAS; }
// rumo para ir do cruzamento a ao cruzamento b (vizinhos)
int rumoPara(int a, int b) {
  if (linhaDe(a) == linhaDe(b)) return colunaDe(b) > colunaDe(a) ? 0 : 2;
  return linhaDe(b) > linhaDe(a) ? 3 : 1;
}
// vizinho de 'a' no rumo r (ou -1 se não houver rua)
int vizinho(int a, int r) {
  int l = linhaDe(a), c = colunaDe(a);
  if (r == 0) c++;
  if (r == 1) l--;
  if (r == 2) c--;
  if (r == 3) l++;
  if (l < 0 || c < 0 || c >= COLUNAS || l * COLUNAS + c >= N) return -1;
  int b = l * COLUNAS + c;
  return custo[a * N + b] > 0 ? b : -1;
}

// roda sobre si próprio até o sensor do centro apanhar 'linhas' ruas
void roda(int lado, int linhas) {
  if (lado < 0) motores(-VEL_GIRO, VEL_GIRO);
  else motores(VEL_GIRO, -VEL_GIRO);
  delay(250);                       // sai da rua onde estava
  int n = 0;
  bool estava = ve(S_CEN);
  while (n < linhas) {
    bool agora = ve(S_CEN);
    if (agora && !estava) n++;
    estava = agora;
    delay(2);
  }
  motores(0, 0);
  delay(60);
  alinha();
}

// depois de rodar: acerta devagar até a linha ficar debaixo do sensor do centro
void alinha() {
  unsigned long t0 = millis();
  while (millis() - t0 < 600) {
    bool e = ve(S_ESQ), c = ve(S_CEN), d = ve(S_DIR);
    if (c && !e && !d) break;
    if (e && !d) motores(-80, 80);
    else if (d && !e) motores(80, -80);
    else break;
    delay(4);
  }
  motores(0, 0);
  delay(40);
  ultimoLado = 0;
}

// no cruzamento: vira para o rumo pedido
void vira(int novo) {
  int dif = (novo - rumo + 4) % 4;
  if (dif == 0) return;             // em frente
  motores(VEL, VEL);                // avança até as rodas ficarem sobre o cruzamento
  delay(T_EIXO);
  if (dif == 1) {
    Serial.println("   vira a esquerda");
    roda(-1, 1);
  } else if (dif == 3) {
    Serial.println("   vira a direita");
    roda(1, 1);
  } else {
    Serial.println("   da a volta");
    // meia volta pela esquerda: se houver rua à esquerda, o sensor passa por ela primeiro
    roda(-1, vizinho(noAtual, (rumo + 1) % 4) >= 0 ? 2 : 1);
  }
  rumo = novo;
}

const int T_FIM = 250;         // ms sem linha = fim da rua (as falhas da rua de terra duram ~150 ms)

// o cruzamento 'n' só tem a rua por onde se chega (beco sem saída): os sensores de fora
// nunca o veem, e a chegada é o fim da linha
bool becoSemSaida(int n) {
  int ruas = 0;
  for (int r = 0; r < 4; r++) if (vizinho(n, r) >= 0) ruas++;
  return ruas == 1;
}

// cruzamento sem ruas de lado (só a rua em frente e a de trás, ex.: o 7): quando o robô o
// atravessa a direito, os sensores de fora não o veem
bool invisivel(int n, int r) {
  return vizinho(n, r) >= 0 && vizinho(n, (r + 2) % 4) >= 0 && vizinho(n, (r + 1) % 4) < 0 && vizinho(n, (r + 3) % 4) < 0;
}

// segue a rua até ao próximo cruzamento (ou até ao fim de uma rua sem saída)
void andaAteCruzamento(bool beco) {
  unsigned long t0 = millis();
  // primeiro sai do cruzamento a direito: as ruas de lado enganariam os sensores do meio
  // (o robô virava para elas); só depois volta a seguir a linha
  while (millis() - t0 < 350 || veCruzamento()) {
    if (veCruzamento()) motores(VEL, VEL);
    else segueLinha();
    delay(4);
  }
  int seguidos = 0;
  unsigned long viuLinha = millis();
  while (seguidos < 2) {
    segueLinha();
    // cruzamento = um sensor de fora vê uma rua de lado E o do centro continua na linha
    // (se o robô ficar torto, o sensor de fora pode passar pela própria rua: aí o do centro não a vê)
    seguidos = veCruzamento() && ve(S_CEN) ? seguidos + 1 : 0;
    if (ve(S_ESQ) || ve(S_CEN) || ve(S_DIR)) viuLinha = millis();
    if (beco && millis() - viuLinha > T_FIM) {
      // beco sem saída: a rua acabou; recua até os sensores voltarem ao fim da linha
      motores(-VEL, -VEL);
      delay(T_FIM);
      motores(0, 0);
      return;
    }
    delay(4);
  }
}

void vaiPara(int destino) {
  long c = dijkstra(noAtual, destino);
  Serial.print("Dijkstra: ");
  Serial.print(noAtual);
  Serial.print(" -> ");
  Serial.print(destino);
  Serial.print("  custo ");
  Serial.print(c);
  Serial.print("  caminho:");
  for (int i = 0; i < nCaminho; i++) {
    Serial.print(" ");
    Serial.print(caminho[i]);
  }
  Serial.println();
  for (int i = 1; i < nCaminho; i++) {
    int prox = caminho[i];
    int r = rumoPara(noAtual, prox);
    vira(r);
    // atravessa a direito um cruzamento que não se vê: conta-o sem parar
    if (i + 1 < nCaminho && rumoPara(prox, caminho[i + 1]) == r && invisivel(prox, r)) {
      noAtual = prox;
      Serial.print(" passa pelo cruzamento ");
      Serial.print(prox);
      Serial.println(" (sem ruas de lado: segue em frente)");
      continue;
    }
    andaAteCruzamento(becoSemSaida(prox));
    noAtual = prox;
    Serial.print(" chegou ao cruzamento ");
    Serial.print(noAtual);
    Serial.print(" (a ir para ");
    Serial.print(NOME_RUMO[rumo]);
    Serial.println(")");
  }
  motores(0, 0);
  Serial.print("Entrega feita no cruzamento ");
  Serial.println(destino);
  delay(1000);
}

void setup() {
  pinMode(ENA, OUTPUT); pinMode(ENB, OUTPUT);
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  int sensores[5] = {S_ESQ, S_DIR, S_CEN, S_LONGE_ESQ, S_LONGE_DIR};
  for (int i = 0; i < 5; i++) pinMode(sensores[i], INPUT);
  Serial.begin(115200);
  // matriz de custos a partir da lista de ruas (as ruas são de dois sentidos)
  for (int i = 0; i < N * N; i++) custo[i] = 0;
  for (int i = 0; i < NA; i++) {
    custo[RUAS[i][0] * N + RUAS[i][1]] = RUAS[i][2];
    custo[RUAS[i][1] * N + RUAS[i][0]] = RUAS[i][2];
  }
  Serial.println("Robo de entregas pronto: comeca no cruzamento 0, virado a Este.");
  delay(500);
}

// missões: entregas em sequência (cada uma parte de onde a anterior acabou)
const int MISSOES[4] = {11, 9, 3, 0};
int missao = 0;

void loop() {
  vaiPara(MISSOES[missao]);
  missao = (missao + 1) % 4;
}
`
}

export const PRESETS = {
  dijkstra: {
    name: 'Robô de entregas: caminho mais curto com Dijkstra',
    cat: 'Robótica',
    track: 'grelha',
    build: buildDijkstra,
    code: CODE_DIJKSTRA(),
    scenario: {
      check: (S) => (/Dijkstra: 0 -> 11 {2}custo 310 {2}caminho: 0 1 5 6 10 11/.test(S.serial) && S.moved > 20 ? `Dijkstra calculou 0→11 (custo 310) e o robô andou ${S.moved.toFixed(0)} cm` : null),
    },
  },
}

export const SNIPPETS = { 'Dijkstra (caminho mais curto)': CODE_DIJKSTRA() }
