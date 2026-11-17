// Adafruit_ST7735 com a API antiga (biblioteca de 2013–2017) — camada de compatibilidade do adjeltron.
//
// Muitos sketches da internet foram escritos para a versão antiga da biblioteca, que tinha:
//   - TFT.Color565(r, g, b)                 (hoje: color565, em minúsculas)
//   - TFT.setAddrWindow(x0, y0, x1, y1)     (cantos; hoje é x, y, largura, altura e exige
//                                            startWrite()/endWrite() à volta)
//   - TFT.pushColor(c) logo a seguir ao setAddrWindow
// Com a biblioteca atual esses sketches não compilam (Color565) ou desenham no sítio errado
// (setAddrWindow sem CS). Este ficheiro repõe a API antiga por cima da atual. Funciona num
// Arduino real. O adjeltron inclui-o sozinho quando o sketch usa Color565; no Arduino IDE,
// copie esta pasta para Documentos/Arduino/libraries e troque
//   #include <Adafruit_ST7735.h>   por   #include <AdjeltronST7735Legacy.h>
#pragma once
#include <Adafruit_ST7735.h>

class Adafruit_ST7735_Legacy : public Adafruit_ST7735 {
 public:
  using Adafruit_ST7735::Adafruit_ST7735;
  uint16_t Color565(uint8_t r, uint8_t g, uint8_t b) { return color565(r, g, b); }
  // API antiga: cantos (x0,y0)–(x1,y1), com a sua própria transação SPI.
  // É um template de propósito: um template não substitui o setAddrWindow virtual da biblioteca,
  // por isso o fillRect, o texto, etc. continuam a usar o da biblioteca (x, y, largura, altura);
  // só as chamadas feitas pelo sketch usam esta versão.
  template <class A, class B, class C, class D>
  void setAddrWindow(A x0, B y0, C x1, D y1) {
    startWrite();
    Adafruit_ST7735::setAddrWindow((uint16_t)x0, (uint16_t)y0, (uint16_t)(x1 - x0 + 1), (uint16_t)(y1 - y0 + 1));
    endWrite();
  }
};

#define Adafruit_ST7735 Adafruit_ST7735_Legacy
