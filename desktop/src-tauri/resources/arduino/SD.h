#pragma once
#include "Arduino.h"
#include "SPI.h"
// SD (Arduino) — interface usada pelo simulador
#define FILE_READ 0x01
#define FILE_WRITE 0x13
#define O_READ 0x01
#define O_WRITE 0x02
#define O_APPEND 0x04
#define O_CREAT 0x10
#ifndef SS
#define SS 10
#endif
class File : public Print {
 public:
  File();
  size_t write(uint8_t b);
  size_t write(const uint8_t *buf, size_t size);
  using Print::write;
  int read();
  int read(void *buf, uint16_t nbyte);
  int peek();
  int available();
  void flush();
  bool seek(uint32_t pos);
  uint32_t position();
  uint32_t size();
  void close();
  operator bool();
  char *name();
  bool isDirectory(void);
  File openNextFile(uint8_t mode = FILE_READ);
  void rewindDirectory(void);
  String readStringUntil(char terminator);
  String readString();
};
class SDClass {
 public:
  bool begin(uint8_t csPin = SS);
  void end();
  File open(const char *filename, uint8_t mode = FILE_READ);
  File open(const String &filename, uint8_t mode = FILE_READ);
  bool exists(const char *filepath);
  bool exists(const String &filepath);
  bool mkdir(const char *filepath);
  bool remove(const char *filepath);
  bool remove(const String &filepath);
  bool rmdir(const char *filepath);
};
extern SDClass SD;
