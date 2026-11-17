// Emulador AVR (tradução do avr8js): CPU e instruções, periféricos (GPIO, timers, USART, ADC,
// EEPROM, TWI, SPI, relógio, watchdog), configuração do ATmega328P/2560 e leitor de Intel HEX.
pub mod config;
pub mod cpu;
pub mod hex;
pub mod instruction;
pub mod periph;

pub use config::{atmega2560, atmega328p, McuCfg, MuxInput};
pub use cpu::{Cpu, Interrupt, Io, NoIo};
pub use instruction::step;
pub use periph::{Avr, Host, NoHost, TwiDone, TwiEvent};
