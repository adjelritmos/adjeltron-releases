#pragma once
#include "Arduino.h"
class TwoWire {
 public:
  TwoWire();
  TwoWire(uint8_t bus_num); // ESP32: barramento 0 ou 1
  void begin();
  void begin(int sda, int scl);
  bool begin(uint8_t address);
  bool begin(int sda, int scl, uint32_t frequency); // ESP32: pinos e frequência
  void end();
  // ESP32 / RP2040 (Pico): escolha dos pinos antes do begin()
  bool setPins(int sda, int scl);
  bool setSDA(int sda);
  bool setSCL(int scl);
  bool setClock(int hz);
  void setClock(uint32_t hz);
  void setTimeout(uint16_t ms);
  void setWireTimeout(uint32_t us = 25000, bool reset = false);
  void beginTransmission(uint8_t addr);
  void beginTransmission(int addr);
  uint8_t endTransmission(bool stop = true);
  size_t write(uint8_t b);
  size_t write(int n);
  size_t write(unsigned int n);
  size_t write(long n);
  size_t write(unsigned long n);
  size_t write(const uint8_t *buf, size_t n);
  size_t write(const char *s);
  uint8_t requestFrom(uint8_t addr, uint8_t n);
  uint8_t requestFrom(uint8_t addr, uint8_t n, uint8_t stop);
  uint8_t requestFrom(int addr, int n);
  uint8_t requestFrom(int addr, int n, int stop);
  int available();
  int read();
  int peek();
  void flush();
  void onReceive(void (*fn)(int));
  void onRequest(void (*fn)(void));
};
extern TwoWire Wire;
#if defined(ESP32) || defined(ARDUINO_ARCH_RP2040)
extern TwoWire Wire1;
#endif
