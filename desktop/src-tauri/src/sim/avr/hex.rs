// Intel HEX → memória de programa (igual a loadHex em backend/sim/avr/mcu.js)

/// Lê o HEX para `bytes` (tamanho da flash); devolve as palavras de 16 bits (little-endian).
pub fn load_hex(hex: &str, flash_bytes: usize) -> Vec<u16> {
    let mut bytes = vec![0u8; flash_bytes];
    let mut base = 0usize;
    let h = |s: &str| usize::from_str_radix(s, 16).unwrap_or(0);
    for line in hex.lines() {
        let line = line.trim();
        if !line.starts_with(':') || line.len() < 11 {
            continue;
        }
        let n = h(&line[1..3]);
        let addr = h(&line[3..7]);
        let kind = h(&line[7..9]);
        match kind {
            0 => {
                for i in 0..n {
                    let p = 9 + i * 2;
                    if p + 2 > line.len() {
                        break;
                    }
                    if let Some(b) = bytes.get_mut(base + addr + i) {
                        *b = h(&line[p..p + 2]) as u8;
                    }
                }
            }
            2 => base = h(&line[9..13]) << 4,
            4 => base = h(&line[9..13]) << 16,
            1 => break,
            _ => {}
        }
    }
    bytes.chunks(2).map(|c| c[0] as u16 | ((*c.get(1).unwrap_or(&0) as u16) << 8)).collect()
}
