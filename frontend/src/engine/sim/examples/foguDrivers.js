// Versões em Fogu (biblioteca mcu + drivers "mcu/drivers/…", mcu v0.8.0) dos exemplos em C++ que
// usam sensores, displays e motores: o mesmo circuito e o mesmo comportamento. Os drivers são
// simulados em src/engine/fogu/drivers.js (mesmas unidades inteiras que os drivers reais).
// Verificação: bun scripts/check-examples.js --fogu <chave>

const TERMOMETRO_LCD = `// Termómetro com LCD em Fogu — DHT22 + LCD 16×2 I2C (drivers da biblioteca mcu)
import mcu from "mcu"
import dht from "mcu/drivers/dht"
import lcd from "mcu/drivers/lcd"

// décimas → texto com uma casa decimal (215 → "21.5")
fn decimal(v: int): str {
    let s = ""
    if v < 0 { s = "-" }
    let a = v
    if a < 0 { a = -a }
    return \`\${s}\${a / 10}.\${a % 10}\`
}

dht.begin(mcu.pin("D2"), dht.DHT22)
if !lcd.begin(mcu.i2c(), 0x27, 16, 2) { print("LCD nao responde") }
lcd.text(0, 0, "Termometro DHT22")
lcd.text(0, 1, "A iniciar...")
mcu.delay(2s)

loop {
    if dht.read() {
        const t = dht.temperature()
        const h = dht.humidity()
        lcd.clear()
        lcd.text(0, 0, \`Temp:  \${decimal(t)} C\`)
        lcd.text(0, 1, \`Humid: \${(h + 5) / 10} %\`)
        print(\`T = \${decimal(t)} C   HR = \${(h + 5) / 10} %\`)
    } else {
        lcd.clear()
        lcd.text(0, 0, "Erro no sensor!")
        print("Falha na leitura do DHT22, erro", dht.error())
    }
    mcu.delay(2s)
}
`

export const FOGU = {
  termometroLcd: TERMOMETRO_LCD,
}
