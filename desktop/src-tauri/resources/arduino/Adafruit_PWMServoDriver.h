#pragma once
#include "Arduino.h"
#include "Wire.h"
#define PCA9685_I2C_ADDRESS 0x40
#define FREQUENCY_OSCILLATOR 25000000
#define PCA9685_PRESCALE_MIN 3
#define PCA9685_PRESCALE_MAX 255
class Adafruit_PWMServoDriver {
 public:
  Adafruit_PWMServoDriver();
  Adafruit_PWMServoDriver(const uint8_t addr);
  Adafruit_PWMServoDriver(const uint8_t addr, TwoWire &i2c);
  bool begin(uint8_t prescale = 0);
  void reset();
  void sleep();
  void wakeup();
  void setExtClk(uint8_t prescale);
  void setPWMFreq(float freq);
  void setOutputMode(bool totempole);
  uint16_t getPWM(uint8_t num, bool off = false);
  uint8_t setPWM(uint8_t num, uint16_t on, uint16_t off);
  void setPin(uint8_t num, uint16_t val, bool invert = false);
  uint8_t readPrescale(void);
  void writeMicroseconds(uint8_t num, uint16_t Microseconds);
  void setOscillatorFrequency(uint32_t freq);
  uint32_t getOscillatorFrequency(void);
};
