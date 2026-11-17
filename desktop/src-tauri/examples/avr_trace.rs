// Traço da CPU AVR em Rust para comparar com o avr8js (frontend/scripts/avr-trace.mjs):
//   cargo run --release --example avr_trace -- <firmware.hex> <passos> <cada>
// Imprime, a cada <cada> instruções: passo pc ciclos sreg sp soma(registos) soma(memória)
use adjeltron_lib::sim::avr::{hex::load_hex, step, Cpu, NoIo};

fn main() {
    let a: Vec<String> = std::env::args().collect();
    let hex = std::fs::read_to_string(&a[1]).expect("hex");
    let steps: u64 = a.get(2).and_then(|s| s.parse().ok()).unwrap_or(1_000_000);
    let every: u64 = a.get(3).and_then(|s| s.parse().ok()).unwrap_or(10_000);
    let mut cpu = Cpu::new(load_hex(&hex, 0x8000), 2048);
    let mut io = NoIo;
    let sum = |v: &[u8]| v.iter().enumerate().fold(0u64, |h, (i, &b)| (h.wrapping_mul(31).wrapping_add(b as u64 * (i as u64 + 1))) % 1_000_000_007);
    let t = std::time::Instant::now();
    for n in 1..=steps {
        step(&mut cpu, &mut io);
        cpu.tick(&mut io);
        if n % every == 0 {
            println!("{} {} {} {} {} {} {}", n, cpu.pc, cpu.cycles, cpu.sreg(), cpu.sp(), sum(&cpu.data[..32]), sum(&cpu.data));
        }
    }
    eprintln!("rust: {} instruções em {:?}", steps, t.elapsed());
}
