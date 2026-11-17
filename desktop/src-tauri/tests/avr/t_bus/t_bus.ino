// SPI (modos e divisores) e I2C (scan, escrita, leitura sem dispositivos)
#include <SPI.h>
#include <Wire.h>
void setup() { Serial.begin(115200); SPI.begin(); Wire.begin(); Wire.setClock(400000); }
void loop() {
  static uint8_t k = 0;
  SPI.beginTransaction(SPISettings(k & 1 ? 4000000 : 500000, k & 2 ? LSBFIRST : MSBFIRST, k % 4 == 0 ? SPI_MODE0 : SPI_MODE3));
  uint16_t s = 0; for (int i = 0; i < 8; i++) s += SPI.transfer(k + i);
  SPI.endTransaction();
  Wire.beginTransmission(0x20 + (k % 16)); Wire.write(k); uint8_t e = Wire.endTransmission();
  uint8_t n = Wire.requestFrom(0x68, 4); while (Wire.available()) s += Wire.read();
  Serial.print(k); Serial.print(' '); Serial.print(s); Serial.print(' '); Serial.print(e); Serial.print(' '); Serial.println(n);
  k++;
}
