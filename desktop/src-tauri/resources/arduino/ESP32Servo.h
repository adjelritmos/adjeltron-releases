#pragma once
#include "Servo.h"
// ESP32Servo: temporizadores do LEDC (na simulação não fazem nada)
class ESP32PWM {
 public:
  static void allocateTimer(int timer);
};
