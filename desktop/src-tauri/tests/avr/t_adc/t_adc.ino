// ADC (referências AVCC / INTERNAL / DEFAULT) e EEPROM (escrever, ler, update, get/put)
#include <EEPROM.h>
void setup() {
  Serial.begin(57600);
  for (int i = 0; i < 64; i++) EEPROM.write(i, i * 3 + 1);
  float f = 3.25; EEPROM.put(100, f);
}
void loop() {
  static uint16_t k = 0;
  long s = 0;
  for (int c = 0; c < 6; c++) s += analogRead(A0 + c) * (c + 1);
#ifdef INTERNAL1V1
  analogReference(k & 1 ? INTERNAL1V1 : DEFAULT);
#else
  analogReference(k & 1 ? INTERNAL : DEFAULT);
#endif
  EEPROM.update(k % 64, (EEPROM.read(k % 64) + k) & 0xff);
  float g; EEPROM.get(100, g);
  uint16_t crc = 0; for (int i = 0; i < 64; i++) crc = crc * 31 + EEPROM.read(i);
  Serial.print(s); Serial.print(' '); Serial.print(crc); Serial.print(' '); Serial.println(g);
  k++;
}
