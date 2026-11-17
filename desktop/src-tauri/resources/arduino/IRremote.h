#pragma once
#include "Arduino.h"
// Arduino-IRremote (4.x + API antiga 2.x) — interface usada pelo simulador
#define ENABLE_LED_FEEDBACK true
#define DISABLE_LED_FEEDBACK false
#define USE_DEFAULT_FEEDBACK_LED_PIN 0
#define IRDATA_FLAGS_IS_REPEAT 0x01
#define REPEAT 0xFFFFFFFF
typedef enum { UNKNOWN = -1, NEC = 8 } decode_type_t;
struct IRData {
  decode_type_t protocol;
  uint16_t address;
  uint16_t command;
  uint32_t decodedRawData;
  uint16_t numberOfBits;
  uint8_t flags;
};
const char *getProtocolString(decode_type_t protocol);
class decode_results {
 public:
  decode_type_t decode_type;
  unsigned long value;
  int bits;
  uint16_t address;
  uint16_t command;
};
class IRrecv {
 public:
  IRrecv();
  IRrecv(uint_fast8_t receivePin);
  void begin(uint_fast8_t receivePin, bool enableLEDFeedback = false, uint_fast8_t feedbackLEDPin = USE_DEFAULT_FEEDBACK_LED_PIN);
  void enableIRIn();
  void start();
  void stop();
  bool decode();
  bool decode(decode_results *results);
  void resume();
  bool isIdle();
  bool available();
  void printIRResultShort(Print *aSerial);
  void printIRResultMinimal(Print *aSerial);
  IRData decodedIRData;
};
extern IRrecv IrReceiver;
