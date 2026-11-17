// Exemplos do grupo G (ecrãs): estação meteorológica num e-paper 2,9" (GxEPD2 + DHT22) e
// relógio de cores num TFT ST7789 (Adafruit_ST7789) com potenciómetro.
import { H } from '../../examples.js'

const { part, mesa, fios, arduino, RED, BLK, COR } = H
const at = (t0, t1, fn) => ({ t0, t1, fn })

// ---------------- Estação meteorológica em e-paper ----------------
const CODE_EPAPER = `// ==========================================
//  Estação meteorológica em e-paper 2,9"
//  DHT22 (D2) + ecrã de tinta eletrónica (SPI):
//  DIN → D11, CLK → D13, CS → D10, DC → D9,
//  RST → D8, BUSY → D7.
//  O e-paper só gasta energia ao mudar e a
//  imagem fica mesmo sem alimentação. A 1.ª
//  atualização é completa (~2 s, pisca); as
//  seguintes são parciais (~0,3 s, não piscam).
//  De 10 em 10 faz uma completa para limpar o
//  "fantasma" que as parciais deixam.
// ==========================================
#include <GxEPD2_BW.h>
#include <Fonts/FreeSansBold18pt7b.h>
#include <Fonts/FreeSans9pt7b.h>
#include <DHT.h>

GxEPD2_BW<GxEPD2_290_BS, GxEPD2_290_BS::HEIGHT> ecra(GxEPD2_290_BS(/*CS=*/ 10, /*DC=*/ 9, /*RST=*/ 8, /*BUSY=*/ 7));
DHT dht(2, DHT22);

float tMin = 99, tMax = -99;
int parciais = 0;

// ícone: sol (seco) ou nuvem com chuva (húmido)
void desenhaIcone(int cx, int cy, float h) {
  if (h < 70) {
    ecra.fillCircle(cx, cy, 12, GxEPD_BLACK);
    for (int a = 0; a < 360; a += 45) {
      float r = a * PI / 180.0;
      ecra.drawLine(cx + cos(r) * 16, cy + sin(r) * 16, cx + cos(r) * 22, cy + sin(r) * 22, GxEPD_BLACK);
    }
  } else {
    ecra.fillCircle(cx - 8, cy, 9, GxEPD_BLACK);
    ecra.fillCircle(cx + 6, cy - 4, 12, GxEPD_BLACK);
    ecra.fillRoundRect(cx - 17, cy, 36, 10, 5, GxEPD_BLACK);
    for (int i = 0; i < 3; i++) ecra.drawLine(cx - 10 + i * 10, cy + 14, cx - 13 + i * 10, cy + 21, GxEPD_BLACK);
  }
}

void desenha(float t, float h) {
  ecra.fillScreen(GxEPD_WHITE);
  ecra.setTextColor(GxEPD_BLACK);
  // cabeçalho
  ecra.setFont(&FreeSans9pt7b);
  ecra.setCursor(6, 18);
  ecra.print("Estacao meteo");
  ecra.drawFastHLine(0, 26, ecra.width(), GxEPD_BLACK);
  // temperatura grande
  ecra.setFont(&FreeSansBold18pt7b);
  ecra.setCursor(8, 70);
  ecra.print(t, 1);
  ecra.print(" C");
  ecra.drawCircle(ecra.getCursorX() - 26, 44, 3, GxEPD_BLACK);
  // humidade, mínimo e máximo
  ecra.setFont(&FreeSans9pt7b);
  ecra.setCursor(8, 100);
  ecra.print("Humidade ");
  ecra.print(h, 0);
  ecra.print(" %");
  ecra.setCursor(8, 122);
  ecra.print("min ");
  ecra.print(tMin, 1);
  ecra.print("  max ");
  ecra.print(tMax, 1);
  // termómetro: barra de -10 a 40 graus
  int alt = constrain(map(t * 10, -100, 400, 0, 80), 0, 80);
  ecra.drawRoundRect(270, 32, 14, 84, 7, GxEPD_BLACK);
  ecra.fillRect(273, 112 - alt, 8, alt, GxEPD_BLACK);
  ecra.fillCircle(277, 118, 9, GxEPD_BLACK);
  desenhaIcone(225, 60, h);
}

void setup() {
  Serial.begin(9600);
  dht.begin();
  ecra.init(115200);
  ecra.setRotation(1);   // deitado: 296 × 128
  // ecrã de arranque (atualização completa, ~2 s): dá tempo ao DHT22 para a 1.ª medição
  ecra.setFullWindow();
  ecra.firstPage();
  do {
    ecra.fillScreen(GxEPD_WHITE);
    ecra.setTextColor(GxEPD_BLACK);
    ecra.setFont(&FreeSansBold18pt7b);
    ecra.setCursor(20, 60);
    ecra.print("Meteo");
    ecra.setFont(&FreeSans9pt7b);
    ecra.setCursor(20, 95);
    ecra.print("a iniciar o sensor...");
  } while (ecra.nextPage());
  parciais = 1;
}

void loop() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (isnan(t) || isnan(h)) {
    Serial.println("Falha na leitura do DHT22!");
    delay(2000);
    return;
  }
  if (t < tMin) tMin = t;
  if (t > tMax) tMax = t;
  Serial.print("Temperatura: ");
  Serial.print(t, 1);
  Serial.print(" C  Humidade: ");
  Serial.print(h, 0);
  Serial.println(" %");

  if (parciais == 0) ecra.setFullWindow();          // atualização completa (pisca)
  else ecra.setPartialWindow(0, 0, ecra.width(), ecra.height());
  ecra.firstPage();
  do {
    desenha(t, h);
  } while (ecra.nextPage());
  parciais = (parciais + 1) % 10;
  ecra.hibernate();      // controlador a dormir: gasta ~1 µA e a imagem fica
  delay(400);
}
`

function buildEpaper() {
  const parts = [arduino(), mesa(part('epaper', 'epaper290'), 70, -330), mesa(part('dht', 'dht22'), 270, 30)]
  const W = fios(parts)
  const A = (pin) => W.at('uno', pin)
  const E = (pin) => W.at('epaper', pin)
  // fios do Arduino ao conector do e-paper (à esquerda do módulo): sobem até um canal, vão
  // para a esquerda do conector e entram nele pelo lado de fora
  const sig = [
    ['D7', 'BUSY', COR.roxo],
    ['D8', 'RST', COR.branco],
    ['D9', 'DC', COR.verde],
    ['D10', 'CS', COR.laranja],
    ['D11', 'DIN', COR.azul],
    ['D13', 'CLK', COR.amarelo],
  ]
  const wires = sig.map(([pin, ep, cor], i) => {
    const [ax] = A(pin)
    const [, py] = E(ep)
    const yc = -130 - i * 7
    const xl = -125 - (sig.length - i) * 7
    return W('uno', pin, 'epaper', ep, cor, [[ax, yc], [xl, yc], [xl, py]])
  })
  const [, yv] = E('VCC')
  const [, yg] = E('GND')
  wires.push(
    // alimentação: 5V e GND pela esquerda do Arduino
    W('uno', '5V', 'epaper', 'VCC', RED, [[A('5V')[0], 140], [-200, 140], [-200, yv]]),
    W('uno', 'GND.1', 'epaper', 'GND', BLK, [[A('GND.1')[0], -112], [-190, -112], [-190, yg]]),
    // DHT22 à direita: VCC e GND por baixo, DATA → D2 pelo lado direito
    W('dht', 'VCC', 'uno', '5V', RED, [[W.at('dht', 'VCC')[0], 150], [A('5V')[0] + 4, 150]]),
    W('dht', 'GND', 'uno', 'GND.3', BLK, [[W.at('dht', 'GND')[0], 160], [A('GND.3')[0], 160]]),
    W('dht', 'DATA', 'uno', 'D2', COR.ciano, [[W.at('dht', 'DATA')[0], 125], [200, 125], [200, -125], [A('D2')[0], -125]]),
  )
  return { parts, wires }
}

// ---------------- TFT ST7789: cor escolhida com o potenciómetro ----------------
const CODE_ST7789 = `// ==========================================
//  Roda de cores num TFT IPS 1,54" ST7789 (240×240)
//  SPI: SCL → D13, SDA → D11, CS → D10, DC → D9,
//  RES → D8. O potenciómetro (A0) escolhe a cor.
// ==========================================
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>
#include <SPI.h>

Adafruit_ST7789 tft = Adafruit_ST7789(10, 9, 8);   // CS, DC, RST
int anterior = -1;

// matiz 0–359 → RGB565
uint16_t cor(int h) {
  int r, g, b;
  int x = (h % 60) * 255 / 60;
  if (h < 60)       { r = 255; g = x;   b = 0; }
  else if (h < 120) { r = 255 - x; g = 255; b = 0; }
  else if (h < 180) { r = 0; g = 255; b = x; }
  else if (h < 240) { r = 0; g = 255 - x; b = 255; }
  else if (h < 300) { r = x; g = 0; b = 255; }
  else              { r = 255; g = 0; b = 255 - x; }
  return tft.color565(r, g, b);
}

void setup() {
  Serial.begin(9600);
  tft.init(240, 240);
  tft.fillScreen(ST77XX_BLACK);
  // roda de cores à volta
  for (int a = 0; a < 360; a += 6) {
    float r = a * PI / 180.0;
    tft.fillCircle(120 + cos(r) * 100, 120 + sin(r) * 100, 9, cor(a));
  }
}

void loop() {
  int h = map(analogRead(A0), 0, 1023, 0, 359);
  if (abs(h - anterior) > 3) {
    anterior = h;
    tft.fillCircle(120, 120, 70, cor(h));
    tft.setTextColor(ST77XX_BLACK);
    tft.setTextSize(3);
    tft.setCursor(h < 100 ? 93 : 84, 110);
    tft.print(h);
    Serial.print("Matiz: ");
    Serial.println(h);
  }
  delay(50);
}
`

function buildSt7789() {
  const parts = [arduino(), mesa(part('tft', 'st7789'), 60, -330), mesa(part('pot', 'pot'), 60, 220, 180)]
  const W = fios(parts)
  const A = (pin) => W.at('uno', pin)
  const T = (pin) => W.at('tft', pin)
  // pinos do TFT em cima do módulo: os fios contornam-no pela esquerda e entram por cima
  const sig = [
    ['D13', 'SCK', COR.amarelo],
    ['D11', 'MOSI', COR.azul],
    ['D8', 'RST', COR.branco],
    ['D9', 'DC', COR.verde],
    ['D10', 'CS', COR.laranja],
  ]
  const top = T('GND')[1] - 25
  const wires = sig.map(([pin, tp, cor], i) => {
    const [ax] = A(pin)
    const [tx] = T(tp)
    const yc = -125 - i * 7
    const xl = -40 - (sig.length - i) * 7
    return W('uno', pin, 'tft', tp, cor, [[ax, yc], [xl, yc], [xl, top - i * 6], [tx, top - i * 6]])
  })
  wires.push(
    W('uno', '5V', 'tft', 'VCC', RED, [[A('5V')[0], 140], [-200, 140], [-200, top - 40], [T('VCC')[0], top - 40]]),
    W('uno', 'GND.1', 'tft', 'GND', BLK, [[A('GND.1')[0], -112], [-190, -112], [-190, top - 34], [T('GND')[0], top - 34]]),
    W('uno', 'A0', 'pot', 'W', COR.azul),
    W('uno', '5V', 'pot', 'B', RED, { y: 165 }),
    W('uno', 'GND.3', 'pot', 'A', BLK, [[A('GND.3')[0], 180], [W.at('pot', 'A')[0] + 10, 180], [W.at('pot', 'A')[0] + 10, 190], [W.at('pot', 'A')[0], 190]]),
  )
  return { parts, wires }
}

export const PRESETS = {
  meteoEpaper: {
    name: 'Estação meteorológica em e-paper 2,9" (GxEPD2 + DHT22)',
    cat: 'Displays',
    track: 'mesa',
    build: buildEpaper,
    code: CODE_EPAPER,
    scenario: {
      inputs: [at(2.6, 9, (I) => (I.dht = { ...I.dht, value: 31 }))],
      check: (S) => {
        const L = S.samples.map((s) => s.live.epaper || {})
        const full = L.some((l) => l.ref?.full)
        const part = L.some((l) => l.ref && !l.ref.full)
        const sigs = new Set(L.map((l) => l.sig).filter(Boolean))
        const last = L.at(-1)
        return full && part && sigs.size >= 2 && last.ink > 0.03 && /Temperatura: 22\.0/.test(S.serial) && /Temperatura: 31\.0/.test(S.serial)
          ? `atualização completa e parciais vistas, ${sigs.size} imagens, ${last.refreshes} atualizações, tinta ${(last.ink * 100).toFixed(1)} %; série: ${S.serial.match(/Temperatura: 31\.0[^\n]*/)[0]}`
          : `seg=${full} ${part} ${sigs.size} ${last.ink} ${S.serial.slice(-200)}`
      },
    },
  },
  rodaCoresSt7789: {
    name: 'Roda de cores num TFT ST7789 240×240',
    cat: 'Displays',
    track: 'mesa',
    build: buildSt7789,
    code: CODE_ST7789,
    scenario: {
      inputs: [at(2.0, 9, (I) => (I.pot = { value: 0.8 }))],
      check: (S) => {
        const vers = new Set(S.samples.map((s) => s.live.tft?.ver).filter((v) => v != null))
        const m = [...S.serial.matchAll(/Matiz: (\d+)/g)].map((x) => +x[1])
        return vers.size >= 2 && m[0] > 160 && m[0] < 200 && m.at(-1) > 270 && S.samples.at(-1).live.tft?.px > 20000 ? `matiz ${m.join(' → ')}, ${vers.size} imagens, ${S.samples.at(-1).live.tft.px} pontos acesos` : `seg=${[...vers]} ${m}`
      },
    },
  },
}
