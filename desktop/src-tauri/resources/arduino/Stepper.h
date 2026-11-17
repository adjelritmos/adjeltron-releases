#pragma once
#include "Arduino.h"
class Stepper {
 public:
  Stepper(int number_of_steps, int motor_pin_1, int motor_pin_2);
  Stepper(int number_of_steps, int motor_pin_1, int motor_pin_2, int motor_pin_3, int motor_pin_4);
  Stepper(int number_of_steps, int motor_pin_1, int motor_pin_2, int motor_pin_3, int motor_pin_4, int motor_pin_5);
  void setSpeed(long whatSpeed);
  void step(int number_of_steps);
  int version(void);
};
