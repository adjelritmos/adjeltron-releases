#pragma once
// SoftwareWire (Testato): I2C por software em quaisquer dois pinos (só modo mestre)
#include "Arduino.h"
#define SOFTWAREWIRE_NO_ERROR 0
#define SOFTWAREWIRE_BUFFER_FULL 1
#define SOFTWAREWIRE_ADDRESS_NACK 2
#define SOFTWAREWIRE_DATA_NACK 3
#define SOFTWAREWIRE_OTHER 4
#define SOFTWAREWIRE_BUFSIZE 32
class SoftwareWire {
 public:
  SoftwareWire();
  SoftwareWire(uint8_t sdaPin, uint8_t sclPin, boolean pullups = true, boolean detectClockStretch = true);
  ~SoftwareWire();
  void end();
  void begin();
  void setClock(uint32_t clock);
  void beginTransmission(uint8_t address);
  void beginTransmission(int address);
  uint8_t endTransmission(boolean sendStop = true);
  uint8_t requestFrom(uint8_t address, uint8_t size, boolean sendStop = true);
  uint8_t requestFrom(int address, int size, boolean sendStop = true);
  size_t write(uint8_t data);
  size_t write(const uint8_t *data, size_t quantity);
  size_t write(const char *s);
  size_t write(int n);
  int available(void);
  int read(void);
  int readBytes(uint8_t *buf, uint8_t size);
  int readBytes(char *buf, uint8_t size);
  int readBytes(char *buf, int size);
  int peek(void);
  void setTimeout(long timeout);
  void printStatus(Print &Ser);
};
