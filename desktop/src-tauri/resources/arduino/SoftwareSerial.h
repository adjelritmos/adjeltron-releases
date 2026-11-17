#pragma once
#include "Arduino.h"
class SoftwareSerial : public Print {
 public:
  SoftwareSerial(uint8_t receivePin, uint8_t transmitPin, bool inverse_logic = false);
  void begin(long speed);
  void end();
  bool listen();
  bool isListening();
  bool stopListening();
  bool overflow();
  int available();
  int read();
  int peek();
  void flush();
  void setTimeout(unsigned long ms);
  String readString();
  String readStringUntil(char terminator);
  size_t readBytes(char *buf, size_t n);
  size_t readBytes(uint8_t *buf, size_t n);
  bool find(const char *target);
  long parseInt();
  float parseFloat();
  int availableForWrite();
  using Print::write;
  size_t write(uint8_t b);
  size_t write(const uint8_t *buf, size_t n);
  operator bool() { return true; }
};
