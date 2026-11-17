// Exemplos das ferramentas do simulador: interrupções (attachInterrupt), EEPROM,
// Plotter Série, osciloscópio e FreeRTOS no ESP32.
import { H, PRESETS as BASE } from '../examples.js'

const { part, plug, mesa, assentar, fios, alimentar, railAt, ledChain, arduino, breadboard, RED, BLK, COR } = H
const at = (t0, t1, fn) => ({ t0, t1, fn })

// ---------------- Contador com interrupção ----------------
const CODE_INTERRUPCAO = `// ==========================================
//  Contador de cliques com interrupção externa
//  Botão no pino 2 (pull-down de 10 kΩ): cada subida
//  (RISING) chama a ISR contar(), mesmo durante o delay().
//  No Uno só os pinos 2 e 3 têm interrupção externa.
// ==========================================
const int BOTAO = 2;
const int LED = 13;

volatile unsigned int cliques = 0;   // alterada dentro da ISR -> volatile
volatile bool mudou = false;

// ISR: curta, sem delay() nem Serial
void contar() {
  static unsigned long ultimo = 0;   // static: mantém o valor entre chamadas
  unsigned long agora = millis();
  if (agora - ultimo > 20) {         // anti-ressalto
    cliques++;
    mudou = true;
  }
  ultimo = agora;
}

void setup() {
  Serial.begin(9600);
  pinMode(BOTAO, INPUT);
  pinMode(LED, OUTPUT);
  attachInterrupt(digitalPinToInterrupt(BOTAO), contar, RISING);
  Serial.println("Carregue no botao: a ISR conta cada clique");
}

void loop() {
  // o loop está "ocupado" com um delay longo, mas nenhum clique se perde
  delay(400);
  if (mudou) {
    noInterrupts();                  // lê a variável partilhada sem ser interrompido
    unsigned int n = cliques;
    mudou = false;
    interrupts();
    digitalWrite(LED, n % 2);
    Serial.print("Cliques: ");
    Serial.println(n);
  }
}
`

// ---------------- Contador de arranques na EEPROM ----------------
const CODE_EEPROM = `// ==========================================
//  Contador de arranques guardado na EEPROM
//  A EEPROM não se apaga ao desligar: pare e volte a
//  iniciar a simulação e o número sobe. O botão apaga o
//  contador; "Apagar EEPROM" (no monitor série) limpa tudo.
// ==========================================
#include <EEPROM.h>

const int BOTAO = 2;
const int LED = 13;
const int ENDERECO = 0;      // unsigned int = 2 bytes (endereços 0 e 1)

unsigned int arranques = 0;

void setup() {
  Serial.begin(9600);
  pinMode(BOTAO, INPUT);
  pinMode(LED, OUTPUT);

  EEPROM.get(ENDERECO, arranques);
  if (arranques == 0xFFFF) arranques = 0;   // EEPROM nova: tudo a 0xFF
  arranques++;
  EEPROM.put(ENDERECO, arranques);          // put() só grava os bytes que mudam

  Serial.print("Arranque n.o ");
  Serial.println(arranques);
  Serial.print("Tamanho da EEPROM: ");
  Serial.print(EEPROM.length());
  Serial.println(" bytes");

  // pisca o LED tantas vezes quantos os arranques (máx. 5)
  for (unsigned int i = 0; i < arranques && i < 5; i++) {
    digitalWrite(LED, HIGH);
    delay(150);
    digitalWrite(LED, LOW);
    delay(150);
  }
}

void loop() {
  if (digitalRead(BOTAO) == HIGH) {
    arranques = 0;
    EEPROM.put(ENDERECO, arranques);
    Serial.println("Contador apagado (fica 0 no proximo arranque + 1)");
    while (digitalRead(BOTAO) == HIGH) delay(10);
  }
}
`

// ---------------- Plotter: seno + potenciómetro ----------------
const CODE_PLOTTER = `// ==========================================
//  Plotter Série: abra o separador "Plotter" junto
//  ao Monitor Série. Cada linha "nome:valor,nome:valor"
//  é um ponto de cada série.
//  Rode o potenciómetro e veja a curva "pot" mudar.
// ==========================================
const int POT = A0;
float fase = 0;

void setup() {
  Serial.begin(115200);
}

void loop() {
  int pot = analogRead(POT);                   // 0–1023
  float amplitude = map(pot, 0, 1023, 0, 100); // o pot controla a amplitude do seno
  float seno = amplitude * sin(fase);
  fase += 0.15;

  Serial.print("seno:");
  Serial.print(seno);
  Serial.print(",pot:");
  Serial.print(pot / 10.23);   // 0–100 %
  Serial.print(",zero:");
  Serial.println(0);
  delay(20);
}
`

// ---------------- Osciloscópio: PWM e tone() ----------------
const CODE_OSCILOSCOPIO = `// ==========================================
//  Sinais para o osciloscópio (botão de onda no
//  monitor série): escolha CH1 = D9, CH2 = D8, CH3 = A0.
//  D9: PWM a 490 Hz, duty pelo potenciómetro (LED)
//  D8: tone() de 1 kHz durante 300 ms, a cada segundo
//  D7: impulso de 200 µs a cada 5 ms (digitalWrite)
// ==========================================
const int PWM_LED = 9;
const int SOM = 8;
const int PULSO = 7;
unsigned long tSom = 0;

void setup() {
  Serial.begin(9600);
  pinMode(PWM_LED, OUTPUT);
  pinMode(PULSO, OUTPUT);
}

void loop() {
  int pot = analogRead(A0);
  int duty = map(pot, 0, 1023, 0, 255);
  analogWrite(PWM_LED, duty);

  if (millis() - tSom >= 1000) {
    tSom = millis();
    tone(SOM, 1000, 300);
    Serial.print("duty PWM = ");
    Serial.print(map(duty, 0, 255, 0, 100));
    Serial.println(" %");
  }

  digitalWrite(PULSO, HIGH);
  delayMicroseconds(200);
  digitalWrite(PULSO, LOW);
  delay(5);
}
`

// ---------------- ESP32: FreeRTOS (tarefas + fila + mutex) ----------------
const CODE_RTOS = `// ==========================================
//  ESP32 com FreeRTOS: duas tarefas e o loop()
//   - tarefaLed (núcleo 0): pisca o LED (GPIO18)
//   - tarefaPot: lê o potenciómetro (GPIO34) e envia
//     para uma fila; o loop() recebe e mostra
//   - mutex: protege a Serial partilhada
// ==========================================
const int LED = 18;
const int POT = 34;

QueueHandle_t fila;
SemaphoreHandle_t serialMutex;

void escrever(const char *quem, int valor) {
  xSemaphoreTake(serialMutex, portMAX_DELAY);
  Serial.printf("[%lu ms] %s: %d\\n", millis(), quem, valor);
  xSemaphoreGive(serialMutex);
}

void tarefaLed(void *parametro) {
  pinMode(LED, OUTPUT);
  for (;;) {
    digitalWrite(LED, HIGH);
    vTaskDelay(pdMS_TO_TICKS(200));
    digitalWrite(LED, LOW);
    vTaskDelay(pdMS_TO_TICKS(200));
  }
}

void tarefaPot(void *parametro) {
  for (;;) {
    int leitura = analogRead(POT);
    xQueueSend(fila, &leitura, portMAX_DELAY);
    vTaskDelay(pdMS_TO_TICKS(500));
  }
}

void setup() {
  Serial.begin(115200);
  fila = xQueueCreate(4, sizeof(int));
  serialMutex = xSemaphoreCreateMutex();
  xTaskCreatePinnedToCore(tarefaLed, "LED", 2048, NULL, 1, NULL, 0);
  xTaskCreate(tarefaPot, "Pot", 2048, NULL, 1, NULL);
  escrever("setup", 0);
}

void loop() {
  int valor;
  if (xQueueReceive(fila, &valor, pdMS_TO_TICKS(1000)) == pdTRUE) {
    escrever("pot", valor);
  }
}
`

// Arduino + potenciómetro (A0) + LED no D9 na breadboard
function buildPotLed() {
  const bb = breadboard()
  const parts = assentar([arduino(), bb, ...ledChain(bb, 'led1', 6, 'red'), plug(part('pot', 'pot'), bb, 'A', '20f')])
  const W = fios(parts)
  const wires = [
    ...alimentar(W, { v5: true }),
    W('uno', 'D9', 'bb', '6j', COR.laranja, { y: -150 }),
    W('bb', '7a', 'bb', railAt('tn', 7), BLK),
    W('bb', '20j', 'bb', railAt('bn', 20), BLK),
    W('bb', '22j', 'bb', railAt('bp', 22), RED),
    W('bb', '21j', 'uno', 'A0', COR.azul, { y: -120 }),
  ]
  return { parts, wires }
}

export const PRESETS = {
  interrupcao: {
    name: 'Contador com interrupção (attachInterrupt)',
    cat: 'Básicos',
    track: 'mesa',
    build: BASE.botaoLed.build,
    code: CODE_INTERRUPCAO,
    scenario: {
      inputs: [at(1.0, 1.15, (I) => (I.btn = { pressed: true })), at(2.0, 2.15, (I) => (I.btn = { pressed: true })), at(3.0, 3.15, (I) => (I.btn = { pressed: true }))],
      release: (I) => (I.btn = { pressed: false }),
      check: (S) => {
        const n = [...S.serial.matchAll(/Cliques: (\d+)/g)].map((m) => +m[1])
        return n.at(-1) === 3 && S.ledMax('led1') > 0.4 ? `ISR contou ${n.join(' → ')} cliques (loop em delay(400)); LED alterna` : null
      },
    },
  },
  eepromArranques: {
    name: 'Contador de arranques (EEPROM)',
    cat: 'Básicos',
    track: 'mesa',
    build: BASE.botaoLed.build,
    code: CODE_EEPROM,
    scenario: {
      inputs: [at(3.0, 3.2, (I) => (I.btn = { pressed: true }))],
      release: (I) => (I.btn = { pressed: false }),
      check: (S) => (/Arranque n\.o 1\n/.test(S.serial) && /1024 bytes/.test(S.serial) && /Contador apagado/.test(S.serial) ? 'arranque n.º 1 gravado na EEPROM (1024 bytes); botão apaga o contador' : null),
    },
  },
  plotterSeno: {
    name: 'Plotter Série: seno + potenciómetro',
    cat: 'Sensores',
    track: 'mesa',
    build: buildPotLed,
    code: CODE_PLOTTER,
    scenario: {
      inputs: [at(2.5, 9, (I) => (I.pot = { value: 0.1 }))],
      check: (S) => {
        const pts = [...S.serial.matchAll(/seno:(-?[\d.]+),pot:([\d.]+),zero:0/g)].map((m) => [+m[1], +m[2]])
        const hi = Math.max(...pts.slice(0, 60).map((p) => Math.abs(p[0])))
        const lo = Math.max(...pts.slice(-60).map((p) => Math.abs(p[0])))
        return pts.length > 150 && hi > 40 && lo < 15 ? `${pts.length} pontos; amplitude do seno ${hi.toFixed(0)} → ${lo.toFixed(0)} com o pot a 10 %` : null
      },
    },
  },
  osciloscopio: {
    name: 'Sinais para o osciloscópio (PWM, tone)',
    cat: 'Básicos',
    track: 'mesa',
    build: buildPotLed,
    code: CODE_OSCILOSCOPIO,
    scenario: {
      inputs: [at(2.0, 9, (I) => (I.pot = { value: 0.25 }))],
      check: (S) => {
        const d = [...S.serial.matchAll(/duty PWM = (\d+) %/g)].map((m) => +m[1])
        return d.length >= 3 && d[0] >= 45 && d[0] <= 55 && d.at(-1) >= 20 && d.at(-1) <= 30 && S.ledMax('led1') > 0.2 ? `duty ${d.join(' → ')} % (pot), LED com PWM` : null
      },
    },
  },
  esp32Rtos: {
    name: 'ESP32: FreeRTOS (tarefas, fila, mutex)',
    cat: 'ESP32',
    track: 'mesa',
    build: BASE.esp32Pwm.build,
    code: CODE_RTOS,
    scenario: {
      inputs: [at(2.6, 9, (I) => (I.pot = { value: 0.9 }))],
      check: (S) => {
        const v = [...S.serial.matchAll(/\] pot: (\d+)/g)].map((m) => +m[1])
        return v.length >= 8 && v[0] > 1500 && v.at(-1) < v[0] - 800 && S.ledMax('led1') > 0.3 && /setup: 0/.test(S.serial) ? `fila: ${v.length} leituras (${v[0]} → ${v.at(-1)}); LED a piscar na tarefa` : null
      },
    },
  },
}

export const SNIPPETS = {
  'attachInterrupt (botão)': `volatile int cliques = 0;
void contar() { cliques++; }
// no setup():
attachInterrupt(digitalPinToInterrupt(2), contar, RISING);`,
  'EEPROM: ler/gravar': `#include <EEPROM.h>
int valor;
EEPROM.get(0, valor);   // lê (2 bytes no Uno)
EEPROM.put(0, valor);   // grava só se mudou`,
  'Preferences (ESP32)': `#include <Preferences.h>
Preferences prefs;
prefs.begin("config", false);
int n = prefs.getInt("arranques", 0);
prefs.putInt("arranques", n + 1);
prefs.end();`,
  'Plotter Série': `Serial.print("temp:");
Serial.print(t);
Serial.print(",hum:");
Serial.println(h);`,
  'FreeRTOS: tarefa': `void tarefa(void *p) {
  for (;;) {
    // ...
    vTaskDelay(pdMS_TO_TICKS(100));
  }
}
// no setup():
xTaskCreate(tarefa, "tarefa", 2048, NULL, 1, NULL);`,
}
