// Adafruit_SSD1306 com SoftwareWire — camada de compatibilidade do adjeltron.
//
// A biblioteca Adafruit_SSD1306 original só aceita o I2C do hardware (TwoWire*). Com este
// ficheiro, `Adafruit_SSD1306 display(128, 64, &meuSoftwareWire, -1);` também funciona: os
// comandos e a imagem vão pela SoftwareWire, nos pinos dela. Funciona num Arduino real.
// O adjeltron inclui-o sozinho quando o sketch usa as duas bibliotecas; no Arduino IDE,
// copie esta pasta para Documentos/Arduino/libraries e ponha, depois dos #include,
//   #include <AdjeltronSSD1306SW.h>
#pragma once
#include <Adafruit_SSD1306.h>
#include <SoftwareWire.h>

template <class T> T &&__adjeltron_declval();  // (o AVR não tem <utility>: só para o decltype)

class Adafruit_SSD1306_SW : public Adafruit_SSD1306 {
 public:
  // I2C por software
  Adafruit_SSD1306_SW(uint8_t w, uint8_t h, SoftwareWire *sw, int8_t rst = -1, uint32_t clkDuring = 400000UL, uint32_t clkAfter = 100000UL)
      : Adafruit_SSD1306(w, h, &Wire, rst, clkDuring, clkAfter), _sw(sw) {}
  // todos os outros construtores da original (TwoWire, SPI…) continuam iguais
  // (só para argumentos que a original aceita, para não "roubar" o construtor de cima)
  template <typename... A, typename = decltype(Adafruit_SSD1306(__adjeltron_declval<A>()...))>
  Adafruit_SSD1306_SW(A... a) : Adafruit_SSD1306(a...), _sw(nullptr) {}

  bool begin(uint8_t vcs = SSD1306_SWITCHCAPVCC, uint8_t addr = 0, bool reset = true, bool periphBegin = true) {
    if (!_sw) return Adafruit_SSD1306::begin(vcs, addr, reset, periphBegin);
    if (!buffer && !(buffer = (uint8_t *)malloc(WIDTH * ((HEIGHT + 7) / 8)))) return false;
    clearDisplay();
    vccstate = vcs;
    i2caddr = addr ? addr : ((HEIGHT == 32) ? 0x3C : 0x3D);
    if (periphBegin) _sw->begin();
    if (reset && rstPin >= 0) {
      pinMode(rstPin, OUTPUT);
      digitalWrite(rstPin, HIGH);
      delay(1);
      digitalWrite(rstPin, LOW);
      delay(10);
      digitalWrite(rstPin, HIGH);
    }
    uint8_t comPins = 0x02;
    contrast = 0x8F;
    if (WIDTH == 128 && HEIGHT == 64) {
      comPins = 0x12;
      contrast = (vccstate == SSD1306_EXTERNALVCC) ? 0x9F : 0xCF;
    } else if (WIDTH == 96 && HEIGHT == 16) {
      contrast = (vccstate == SSD1306_EXTERNALVCC) ? 0x10 : 0xAF;
    }
    const uint8_t ext = (vccstate == SSD1306_EXTERNALVCC);
    const uint8_t init[] = {
        0xAE, 0xD5, 0x80, 0xA8, (uint8_t)(HEIGHT - 1), 0xD3, 0x00, 0x40,
        0x8D, (uint8_t)(ext ? 0x10 : 0x14), 0x20, 0x00, 0xA1, 0xC8,
        0xDA, comPins, 0x81, contrast, 0xD9, (uint8_t)(ext ? 0x22 : 0xF1),
        0xDB, 0x40, 0xA4, 0xA6, 0x2E, 0xAF};
    _cmds(init, sizeof(init));
    return true;
  }

  // envia a memória do ecrã (1 KB num 128×64) em blocos de até 31 bytes
  void display(void) {
    if (!_sw) return Adafruit_SSD1306::display();
    const uint8_t win[] = {0x22, 0x00, 0xFF, 0x21, 0x00, (uint8_t)(WIDTH - 1)};
    _cmds(win, sizeof(win));
    uint16_t n = WIDTH * ((HEIGHT + 7) / 8);
    uint8_t *p = buffer;
    while (n) {
      uint8_t k = n > 31 ? 31 : n;
      _sw->beginTransmission(i2caddr);
      _sw->write((uint8_t)0x40);
      _sw->write(p, k);
      _sw->endTransmission();
      p += k;
      n -= k;
    }
  }

  void ssd1306_command(uint8_t c) {
    if (!_sw) return Adafruit_SSD1306::ssd1306_command(c);
    _cmds(&c, 1);
  }
  void invertDisplay(bool i) {
    if (!_sw) return Adafruit_SSD1306::invertDisplay(i);
    ssd1306_command(i ? 0xA7 : 0xA6);
  }
  void dim(bool d) {
    if (!_sw) return Adafruit_SSD1306::dim(d);
    const uint8_t c[] = {0x81, (uint8_t)(d ? 0 : contrast)};
    _cmds(c, 2);
  }
  void startscrollright(uint8_t a, uint8_t b) { _scroll(0x26, a, b); }
  void startscrollleft(uint8_t a, uint8_t b) { _scroll(0x27, a, b); }
  void startscrolldiagright(uint8_t a, uint8_t b) { _diag(0x29, a, b); }
  void startscrolldiagleft(uint8_t a, uint8_t b) { _diag(0x2A, a, b); }
  void stopscroll(void) {
    if (!_sw) return Adafruit_SSD1306::stopscroll();
    ssd1306_command(0x2E);
  }

 private:
  SoftwareWire *_sw;
  void _cmds(const uint8_t *c, uint8_t n) {
    _sw->beginTransmission(i2caddr);
    _sw->write((uint8_t)0x00);  // Co = 0, D/C = 0: comandos
    _sw->write(c, n);
    _sw->endTransmission();
  }
  void _scroll(uint8_t op, uint8_t a, uint8_t b) {
    if (!_sw) {
      if (op == 0x26) Adafruit_SSD1306::startscrollright(a, b);
      else Adafruit_SSD1306::startscrollleft(a, b);
      return;
    }
    const uint8_t c[] = {op, 0x00, a, 0x00, b, 0x00, 0xFF, 0x2F};
    _cmds(c, sizeof(c));
  }
  void _diag(uint8_t op, uint8_t a, uint8_t b) {
    if (!_sw) {
      if (op == 0x29) Adafruit_SSD1306::startscrolldiagright(a, b);
      else Adafruit_SSD1306::startscrolldiagleft(a, b);
      return;
    }
    const uint8_t c[] = {0xA3, 0x00, (uint8_t)HEIGHT, op, 0x00, a, 0x00, b, 0x01, 0x2F};
    _cmds(c, sizeof(c));
  }
};

// o resto do sketch usa a versão com SoftwareWire
#define Adafruit_SSD1306 Adafruit_SSD1306_SW
