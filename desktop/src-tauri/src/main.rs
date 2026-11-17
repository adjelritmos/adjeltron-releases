// sem janela de consola no Windows (build de produção)
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    adjeltron_lib::run()
}
