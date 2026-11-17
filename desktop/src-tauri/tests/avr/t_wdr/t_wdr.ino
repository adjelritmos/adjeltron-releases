// Watchdog a reiniciar o chip (sem wdt_reset no loop): o setup volta a correr
#include <avr/wdt.h>
void setup() { Serial.begin(115200); Serial.print("arranque MCUSR="); Serial.println(MCUSR); MCUSR = 0; wdt_enable(WDTO_15MS); }
void loop() { static uint16_t k = 0; Serial.println(k++); delay(1); }
