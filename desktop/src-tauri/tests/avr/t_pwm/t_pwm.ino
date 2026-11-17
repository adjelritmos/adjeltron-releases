// PWM em todos os pinos com timer, tone(), millis/micros
const int P[] = {3, 5, 6, 9, 10, 11};
void setup() { Serial.begin(115200); pinMode(8, OUTPUT); }
void loop() {
  static uint8_t k = 0;
  for (int i = 0; i < 6; i++) analogWrite(P[i], (k * 37 + i * 41) & 0xff);
  if (k % 3 == 0) tone(8, 200 + k * 10); else if (k % 3 == 1) noTone(8); else tone(8, 1000, 3);
  Serial.print(k); Serial.print(' '); Serial.print(millis()); Serial.print(' '); Serial.println(micros() % 1000);
  delay(2);
  k++;
}
