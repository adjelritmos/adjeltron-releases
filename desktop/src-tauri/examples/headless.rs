// Servidor local da app sem janela, para testes (curl, Chrome headless com o Vite):
//   cargo run --example headless -- [pasta de dados]
// Escreve o endereço na primeira linha e fica a correr.
fn main() {
    let res = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("resources");
    let data = std::env::args().nth(1).map(Into::into).unwrap_or_else(|| std::env::temp_dir().join("adjeltron-headless"));
    std::fs::create_dir_all(&data).unwrap();
    let api = adjeltron_lib::start_server(res, data).unwrap();
    println!("{api}");
    loop {
        std::thread::park();
    }
}
