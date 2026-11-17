// Simulação nativa (em Rust, dentro do processo da app). Porta por fases da simulação JS
// (backend/sim): cada parte é comparada com a versão JS (mesmos resultados) antes de a trocar.
//  - avr: emulador AVR (ATmega328P/2560) — tradução do avr8js.
pub mod avr;
