#pragma once
#include "Arduino.h"
#include "Wire.h"
#define PCF8574_OK 0x00
#define PCF8574_PIN_ERROR 0x81
#define PCF8574_I2C_ERROR 0x82
#define P0 0
#define P1 1
#define P2 2
#define P3 3
#define P4 4
#define P5 5
#define P6 6
#define P7 7
class PCF8574 {
 public:
  PCF8574(uint8_t deviceAddress = 0x20, TwoWire *wire = &Wire);
  bool begin(uint8_t value = 0xFF);
  bool begin(int sda, int scl, uint8_t value = 0xFF);
  bool isConnected();
  bool setAddress(uint8_t deviceAddress);
  uint8_t getAddress();
  uint8_t read8();
  uint8_t read(uint8_t pin);
  uint8_t value();
  void write8(uint8_t value);
  void write(uint8_t pin, uint8_t value);
  uint8_t valueOut();
  uint8_t readButton8(uint8_t mask = 0xFF);
  uint8_t readButton(uint8_t pin);
  void toggle(uint8_t pin);
  void toggleMask(uint8_t mask = 0xFF);
  void shiftRight(uint8_t n = 1);
  void shiftLeft(uint8_t n = 1);
  void rotateRight(uint8_t n = 1);
  void rotateLeft(uint8_t n = 1);
  void reverse();
  int lastError();
  void pinMode(uint8_t pin, uint8_t mode);
  void digitalWrite(uint8_t pin, uint8_t value);
  uint8_t digitalRead(uint8_t pin);
  void digitalWriteAll(uint8_t value);
};
