// Pico4Drive (github.com/P33a/Pico4DriveLib) — declarações para a verificação com o compilador;
// a simulação está em backend/sim/libs/Pico4Drive.js.
#ifndef PICO4DRIVE_H
#define PICO4DRIVE_H
#include "Arduino.h"
#ifdef ARDUINO_ARCH_RP2040
typedef enum { p2d_drv1 = 0, p2d_drv2, p2d_drv3, p2d_drv4 } driver_num_t;
class pico4drive_t {
 public:
  static constexpr int analogWriteBits = 10;
  static constexpr int analogWriteMax = (1 << analogWriteBits) - 1;
  int PWM_limit;
  float battery_voltage;
  int button_state;
  int button_press_count;
  pico4drive_t();
  void init(uint32_t PWM_freq = 16000);
  uint16_t read_adc(int channel);
  void set_driver_PWM(int new_PWM, int pin_a, int pin_b);
  void set_driver_PWM(int new_PWM, driver_num_t driver_num);
  int voltage_to_PWM(float u);
  int set_driver_voltage(float new_voltage, driver_num_t driver_num);
  void power_off(void);
  void update(void);
};
typedef pico4drive_t Pico4Drive;
#else
#error "Pico4Drive: biblioteca para a placa Pico4Drive — escolha uma Raspberry Pi Pico (Pico, Pico W, Pico 2 ou Pico 2 W)"
#endif
#endif
