// Servo (Timer1 CTC com ISR) e Timer1/3 em PWM de fase e frequência correta e fast PWM com ICR
#include <Servo.h>
Servo s1, s2;
void setup() {
  Serial.begin(115200);
  s1.attach(9); s2.attach(7);
#ifdef ARDUINO_AVR_MEGA2560
  pinMode(5, OUTPUT); TCCR3A = (1 << COM3A1) | (1 << WGM31); TCCR3B = (1 << WGM33) | (1 << WGM32) | (1 << CS30); ICR3 = 999; OCR3A = 250;
#else
  pinMode(3, OUTPUT); TCCR2A = (1 << COM2B1) | (1 << WGM20); TCCR2B = (1 << WGM22) | (1 << CS21); OCR2A = 99; OCR2B = 30;
#endif
}
void loop() {
  static int a = 0, d = 3;
  s1.write(a); s2.writeMicroseconds(1000 + a * 5);
  a += d; if (a >= 180 || a <= 0) d = -d;
#ifdef ARDUINO_AVR_MEGA2560
  OCR3A = (a * 5) % 1000;
#else
  OCR2B = a % 100;
#endif
  Serial.print(a); Serial.print(' '); Serial.println(TCNT1);
  delay(3);
}
