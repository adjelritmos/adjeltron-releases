#pragma once
#include "Arduino.h"
#define SPI_MODE0 0x00
#define SPI_MODE1 0x04
#define SPI_MODE2 0x08
#define SPI_MODE3 0x0C
#ifndef MSBFIRST
#define MSBFIRST 1
#define LSBFIRST 0
#endif
#define SPI_CLOCK_DIV2 0x04
#define SPI_CLOCK_DIV4 0x00
#define SPI_CLOCK_DIV8 0x05
#define SPI_CLOCK_DIV16 0x01
class SPISettings {
 public:
  SPISettings(uint32_t clock, uint8_t bitOrder, uint8_t dataMode);
  SPISettings();
};
class SPIClass {
 public:
  void begin();
  void end();
  void beginTransaction(SPISettings settings);
  void endTransaction();
  uint8_t transfer(uint8_t data);
  uint16_t transfer16(uint16_t data);
  void setBitOrder(uint8_t order);
  void setDataMode(uint8_t mode);
  void setClockDivider(uint8_t div);
  // RP2040 (Pico): escolha dos pinos antes do begin()
  bool setMISO(int pin);
  bool setMOSI(int pin);
  bool setSCK(int pin);
  bool setCS(int pin);
  bool setRX(int pin);
  bool setTX(int pin);
};
extern SPIClass SPI;
#if defined(ESP32) || defined(ARDUINO_ARCH_RP2040)
extern SPIClass SPI1;
#endif
