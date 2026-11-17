// Interrupções: externa (CHANGE), mudança de pino, Timer1 CTC, Timer2 overflow, watchdog;
// eco da Serial (RX) e no fim mudança do prescaler do relógio (CLKPR)
#include <avr/wdt.h>
#include <avr/power.h>
volatile uint16_t nExt = 0, nPc = 0, nT1 = 0, nT2 = 0, nWdt = 0;
#ifdef ARDUINO_AVR_MEGA2560
const int EXT = 19; // INT2 (PD2)
#define PCVECT PCINT2_vect
#else
const int EXT = 2;  // INT0 (PD2)
#define PCVECT PCINT1_vect
#endif
void onExt() { nExt++; }
ISR(PCVECT) { nPc++; }
ISR(TIMER1_COMPA_vect) { nT1++; }
ISR(TIMER2_OVF_vect) { nT2++; }
ISR(WDT_vect) { nWdt++; }
void setup() {
  Serial.begin(9600);
  pinMode(EXT, INPUT);
  attachInterrupt(digitalPinToInterrupt(EXT), onExt, CHANGE);
#ifdef ARDUINO_AVR_MEGA2560
  PCICR |= 1 << PCIE2; PCMSK2 |= 1 << PCINT19; // K3 (A11)
#else
  PCICR |= 1 << PCIE1; PCMSK1 |= 1 << PCINT11; // C3 (A3)
#endif
  cli();
  TCCR1A = 0; TCCR1B = (1 << WGM12) | (1 << CS11); OCR1A = 1999; TIMSK1 |= 1 << OCIE1A;
  TCCR2A = 0; TCCR2B = (1 << CS22); TIMSK2 |= 1 << TOIE2;
#ifdef WDTCSR
  wdt_reset(); WDTCSR = (1 << WDCE) | (1 << WDE); WDTCSR = (1 << WDIE); // 16 ms, só interrupção
#endif
  sei();
}
void loop() {
  static uint16_t k = 0;
  while (Serial.available()) { char c = Serial.read(); Serial.print('<'); Serial.print(c); Serial.print('>'); }
  noInterrupts(); uint16_t a = nExt, b = nPc, c = nT1, d = nT2, w = nWdt; interrupts();
  Serial.print(a); Serial.print(' '); Serial.print(b); Serial.print(' '); Serial.print(c); Serial.print(' '); Serial.print(d); Serial.print(' '); Serial.println(w);
  if (++k == 40) clock_prescale_set(clock_div_2);
  delay(1);
}
