// Idioma das mensagens geradas pelo servidor local (erros de compilação, pedidos inválidos…).
// A interface define-o com POST /api/lang { lang: "pt" | "en" } ao abrir e quando o utilizador muda.
use std::sync::atomic::{AtomicBool, Ordering};

static EN: AtomicBool = AtomicBool::new(false);

pub fn set_lang(lang: &str) {
    EN.store(lang == "en", Ordering::Relaxed);
}

pub fn en() -> bool {
    EN.load(Ordering::Relaxed)
}

pub fn lang() -> &'static str {
    if en() { "en" } else { "pt" }
}

/// tr!(português, inglês): escolhe pelo idioma atual (as duas expressões têm o mesmo tipo)
#[macro_export]
macro_rules! tr {
    ($pt:expr, $en:expr) => {
        if $crate::i18n::en() { $en } else { $pt }
    };
}
