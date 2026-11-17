// Cabeçalho mínimo do core Arduino (AVR / Uno) usado só para VERIFICAR o
// sketch com um compilador C++ real. Os tipos imitam o AVR: int = 16 bits.
#pragma once
#include <stdint.h>
#include <stddef.h>
#include <math.h>
// (o core real também inclui estes: strcmp, snprintf, atoi…)
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <ctype.h>
// radians()/degrees() (no core são macros com DEG_TO_RAD/RAD_TO_DEG)
inline double radians(double deg) { return deg * 0.017453292519943295; }
inline double degrees(double rad) { return rad * 57.29577951308232; }
// WCharacter.h (Arduino): classificação de caracteres
inline bool isAlpha(int c) { return isalpha(c); }
inline bool isAlphaNumeric(int c) { return isalnum(c); }
inline bool isDigit(int c) { return isdigit(c); }
inline bool isHexadecimalDigit(int c) { return isxdigit(c); }
inline bool isSpace(int c) { return isspace(c); }
inline bool isWhitespace(int c) { return c == ' ' || c == '\t'; }
inline bool isUpperCase(int c) { return isupper(c); }
inline bool isLowerCase(int c) { return islower(c); }
inline bool isPunct(int c) { return ispunct(c); }
inline bool isPrintable(int c) { return isprint(c); }
inline bool isControl(int c) { return iscntrl(c); }
inline bool isGraph(int c) { return isgraph(c); }
inline bool isAscii(int c) { return c >= 0 && c < 128; }
inline int toUpperCase(int c) { return toupper(c); }
inline int toLowerCase(int c) { return tolower(c); }
inline int toAscii(int c) { return c & 0x7f; }
// (o sprintf da libc do macOS/Linux está marcado como obsoleto; no Arduino não está)
#pragma GCC diagnostic ignored "-Wdeprecated-declarations"
char *dtostrf(double val, signed char width, unsigned char prec, char *s);
char *itoa(int val, char *s, int radix);
char *ltoa(long val, char *s, int radix);
char *utoa(unsigned int val, char *s, int radix);
char *ultoa(unsigned long val, char *s, int radix);

typedef uint8_t byte;
typedef bool boolean;
typedef unsigned int word;

#define HIGH 0x1
#define LOW 0x0
#define INPUT 0x0
#define OUTPUT 0x1
#define INPUT_PULLUP 0x2
#define PI 3.1415926535897932384626433832795
#define HALF_PI 1.5707963267948966192313216916398
#define TWO_PI 6.283185307179586476925286766559
#define DEG_TO_RAD 0.017453292519943295769236907684886
#define RAD_TO_DEG 57.295779513082320876798154814105
#define DEC 10
#define HEX 16
#define OCT 8
#define BIN 2
#ifdef ESP32
// modos de interrupção do core Arduino-ESP32
#define RISING 0x01
#define FALLING 0x02
#define CHANGE 0x03
#define ONLOW 0x04
#define ONHIGH 0x05
#define ONLOW_WE 0x0C
#define ONHIGH_WE 0x0D
#define IRAM_ATTR
#define ARDUINO_ISR_ATTR
#else
#define CHANGE 1
#define FALLING 2
#define RISING 3
#endif
#define NOT_AN_INTERRUPT -1
#define ICACHE_RAM_ATTR

#ifdef ESP32
// ESP32 DevKit V1
#define LED_BUILTIN 2
#define INPUT_PULLDOWN 0x09
static const uint8_t A0 = 36, A3 = 39, A4 = 32, A5 = 33, A6 = 34, A7 = 35, A10 = 4, A11 = 0, A12 = 2, A13 = 15, A14 = 13,
                     A15 = 12, A16 = 14, A17 = 27, A18 = 25, A19 = 26, DAC1 = 25, DAC2 = 26, SDA = 21, SCL = 22,
                     T0 = 4, T2 = 2, T3 = 15, T4 = 13, T5 = 12, T6 = 14, T7 = 27, T8 = 33, T9 = 32;
#elif defined(ARDUINO_AVR_MEGA2560)
// Arduino Mega 2560 (ATmega2560): A0–A15 = 54–69, I2C em 20/21
#define LED_BUILTIN 13
static const uint8_t A0 = 54, A1 = 55, A2 = 56, A3 = 57, A4 = 58, A5 = 59, A6 = 60, A7 = 61, A8 = 62, A9 = 63, A10 = 64,
                     A11 = 65, A12 = 66, A13 = 67, A14 = 68, A15 = 69, SDA = 20, SCL = 21;
#elif defined(ARDUINO_ARCH_RP2040)
// Raspberry Pi Pico (RP2040, core Arduino-Pico): A0–A3 = GP26–GP29, Wire em GP4/GP5
#ifdef PICO_CYW43_SUPPORTED
// Pico W / Pico 2 W: o LED está no WL_GPIO0 do chip Wi-Fi CYW43439 (pino virtual 64)
#define LED_BUILTIN 64
#define PIN_LED 64
#else
#define LED_BUILTIN 25
#define PIN_LED 25
#endif
#define INPUT_PULLDOWN 0x3
#define PIN_WIRE0_SDA 4
#define PIN_WIRE0_SCL 5
static const uint8_t A0 = 26, A1 = 27, A2 = 28, A3 = 29, SDA = 4, SCL = 5;
#else
// Arduino Uno / Nano (ATmega328P)
#define LED_BUILTIN 13
static const uint8_t A0 = 14, A1 = 15, A2 = 16, A3 = 17, A4 = 18, A5 = 19, SDA = 18, SCL = 19;
static const uint8_t A6 = 20, A7 = 21; // só analógicos (Nano; o Uno não os tem — a compilação real avisa)
#endif

#define min(a, b) ((a) < (b) ? (a) : (b))
#define max(a, b) ((a) > (b) ? (a) : (b))
#define constrain(x, lo, hi) ((x) < (lo) ? (lo) : ((x) > (hi) ? (hi) : (x)))
#define sq(x) ((x) * (x))
#define bitRead(v, b) (((v) >> (b)) & 0x01)
#define bitSet(v, b) ((v) |= (1UL << (b)))
#define bitClear(v, b) ((v) &= ~(1UL << (b)))
#define bit(b) (1UL << (b))
#define F(s) (s)
#define lowByte(w) ((uint8_t)((w) & 0xff))
#define highByte(w) ((uint8_t)((w) >> 8))

void pinMode(uint8_t pin, uint8_t mode);
void digitalWrite(uint8_t pin, uint8_t val);
int digitalRead(uint8_t pin);
int analogRead(uint8_t pin);
void analogWrite(uint8_t pin, int val);
unsigned long millis(void);
unsigned long micros(void);
void delay(unsigned long ms);
void delayMicroseconds(unsigned int us);
unsigned long pulseIn(uint8_t pin, uint8_t state, unsigned long timeout = 1000000L);
void tone(uint8_t pin, unsigned int frequency, unsigned long duration = 0);
void noTone(uint8_t pin);
#ifndef MSBFIRST
#define MSBFIRST 1
#define LSBFIRST 0
#endif
void shiftOut(uint8_t dataPin, uint8_t clockPin, uint8_t bitOrder, uint8_t val);
uint8_t shiftIn(uint8_t dataPin, uint8_t clockPin, uint8_t bitOrder);
long map(long x, long in_min, long in_max, long out_min, long out_max);
long random(long howbig);
long random(long howsmall, long howbig);
void randomSeed(unsigned long seed);
void attachInterrupt(uint8_t interrupt, void (*isr)(void), int mode);
void detachInterrupt(uint8_t interrupt);
uint8_t digitalPinToInterrupt(uint8_t pin);
void interrupts(void);
void noInterrupts(void);
void yield(void);
#ifdef ESP32
void attachInterruptArg(uint8_t pin, void (*isr)(void *), void *arg, int mode);
#endif

class String {
 public:
  String(const char *s = "");
  String(const String &s);
  String(char c);
  String(int v, unsigned char base = 10);
  String(unsigned int v, unsigned char base = 10);
  String(long v, unsigned char base = 10);
  String(unsigned long v, unsigned char base = 10);
  String(float v, unsigned char decimals = 2);
  String(double v, unsigned char decimals = 2);
  String &operator=(const String &rhs);
  String &operator+=(const String &rhs);
  friend String operator+(const String &a, const String &b);
  bool operator==(const String &rhs) const;
  bool operator!=(const String &rhs) const;
  char operator[](unsigned int i) const;
  unsigned int length() const;
  int indexOf(char c) const;
  int indexOf(const String &s) const;
  String substring(unsigned int from) const;
  String substring(unsigned int from, unsigned int to) const;
  long toInt() const;
  float toFloat() const;
  void trim();
  void toUpperCase();
  void toLowerCase();
  bool startsWith(const String &s) const;
  bool endsWith(const String &s) const;
  bool equals(const String &s) const;
  char charAt(unsigned int i) const;
  const char *c_str() const;
  // (mais métodos da String — usados pelos sketches de rede)
  int indexOf(char c, unsigned int from) const;
  int indexOf(const String &s, unsigned int from) const;
  int lastIndexOf(char c) const;
  int lastIndexOf(const String &s) const;
  bool equalsIgnoreCase(const String &s) const;
  int compareTo(const String &s) const;
  void replace(const String &a, const String &b);
  void replace(char a, char b);
  void remove(unsigned int index);
  void remove(unsigned int index, unsigned int count);
  bool concat(const String &s);
  bool reserve(unsigned int size);
  bool isEmpty() const;
  double toDouble() const;
  void setCharAt(unsigned int i, char c);
  void toCharArray(char *buf, unsigned int size) const;
  void getBytes(unsigned char *buf, unsigned int size) const;
  bool operator<(const String &rhs) const;
  bool operator>(const String &rhs) const;
  explicit operator bool() const;
};

class Print {
 public:
  size_t write(uint8_t c);
  size_t write(const char *s);
  size_t print(const String &s);
  size_t print(const char s[]);
  size_t print(char c);
  size_t print(unsigned char v, int base = DEC);
  size_t print(int v, int base = DEC);
  size_t print(unsigned int v, int base = DEC);
  size_t print(long v, int base = DEC);
  size_t print(unsigned long v, int base = DEC);
  size_t print(double v, int digits = 2);
  size_t println(const String &s);
  size_t println(const char s[]);
  size_t println(char c);
  size_t println(unsigned char v, int base = DEC);
  size_t println(int v, int base = DEC);
  size_t println(unsigned int v, int base = DEC);
  size_t println(long v, int base = DEC);
  size_t println(unsigned long v, int base = DEC);
  size_t println(double v, int digits = 2);
  size_t println(void);
  size_t print(const class Printable &x);
  size_t println(const class Printable &x);
#ifdef ESP32
  // Serial.println(&timeinfo, "%H:%M:%S") (core ESP32)
  size_t print(const struct tm *timeinfo, const char *format = nullptr);
  size_t println(const struct tm *timeinfo, const char *format = nullptr);
#endif
};

class Printable {
 public:
  virtual size_t printTo(Print &p) const = 0;
};

class HardwareSerial : public Print {
 public:
  void begin(unsigned long baud);
  void end();
  int available(void);
  int read(void);
  int peek(void);
  void flush(void);
  String readString();
  String readStringUntil(char terminator);
  long parseInt();
  float parseFloat();
  void setTimeout(unsigned long ms);
  size_t readBytes(char *buf, size_t n);
  size_t readBytes(uint8_t *buf, size_t n);
  bool find(const char *target);
  int availableForWrite(void);
  using Print::write;
  size_t write(const uint8_t *buf, size_t n);
  operator bool() { return true; }
#if defined(ESP32) || defined(ARDUINO_ARCH_RP2040)
  size_t printf(const char *format, ...) __attribute__((format(printf, 2, 3)));
#endif
#ifdef ESP32
  void begin(unsigned long baud, uint32_t config, int8_t rxPin = -1, int8_t txPin = -1);
  void setPins(int8_t rxPin, int8_t txPin);
#endif
#ifdef ARDUINO_ARCH_RP2040
  bool setTX(uint8_t pin);
  bool setRX(uint8_t pin);
#endif
};
extern HardwareSerial Serial;
#if defined(ARDUINO_AVR_MEGA2560)
extern HardwareSerial Serial1, Serial2, Serial3; // 18/19, 16/17, 14/15
#elif defined(ARDUINO_ARCH_RP2040)
extern HardwareSerial Serial1, Serial2; // UART0 (GP0/GP1), UART1 (GP8/GP9 ou outros)
#elif defined(ESP32)
extern HardwareSerial Serial1, Serial2; // Serial2: RX 16 / TX 17; Serial1: indique os pinos no begin()
#endif
#define SERIAL_8N1 0x800001c

#ifdef ARDUINO_ARCH_RP2040
// extras do core Arduino-Pico
void analogReadResolution(int bits);
void analogWriteResolution(int bits);
void analogWriteRange(uint32_t range);
void analogWriteFreq(uint32_t freq);
float analogReadTemp(float vref = 3.3f);
class RP2040 {
 public:
  uint32_t getCpuFreqMHz();
  uint32_t f_cpu();
  int getFreeHeap();
  int getUsedHeap();
  int getTotalHeap();
  uint32_t getCycleCount();
  uint64_t getCycleCount64();
  void reboot();
  void restart();
  void idleOtherCore();
  void resumeOtherCore();
  const char *getChipID();
  bool isPicoW();
  uint32_t hwrand32();
  int cpuid();
};
extern RP2040 rp2040;
// botão BOOTSEL da placa (lê-se como bool: if (BOOTSEL) …)
class __Bootsel {
 public:
  operator bool();
};
extern __Bootsel BOOTSEL;
#endif

#ifdef ESP32
// LEDC (PWM): API 3.x e 2.x
bool ledcAttach(uint8_t pin, uint32_t freq, uint8_t resolution);
bool ledcAttachChannel(uint8_t pin, uint32_t freq, uint8_t resolution, uint8_t channel);
bool ledcDetach(uint8_t pin);
uint32_t ledcSetup(uint8_t channel, uint32_t freq, uint8_t resolution);
void ledcAttachPin(uint8_t pin, uint8_t channel);
void ledcDetachPin(uint8_t pin);
bool ledcWrite(uint8_t pinOrChannel, uint32_t duty);
uint32_t ledcWriteTone(uint8_t pinOrChannel, uint32_t freq);
void dacWrite(uint8_t pin, uint8_t value);
void analogReadResolution(uint8_t bits);
void analogWriteResolution(uint8_t bits);
void analogSetAttenuation(int attenuation);
uint32_t analogReadMilliVolts(uint8_t pin);
uint16_t touchRead(uint8_t pin);
class EspClass {
 public:
  void restart();
  uint32_t getFreeHeap();
  const char *getChipModel();
  uint32_t getCpuFreqMHz();
  uint64_t getEfuseMac();
};
extern EspClass ESP;
#endif

#ifdef ESP32
// o core Arduino-ESP32 inclui o FreeRTOS (tarefas, filas, semáforos)
#include "freertos/FreeRTOS.h"
#endif

void setup(void);
void loop(void);
