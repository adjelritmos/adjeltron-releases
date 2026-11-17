# adjeltron — app desktop (Tauri)

A mesma bancada do site, numa janela nativa para Windows e macOS. Não tem as páginas públicas do site:
abre direto no simulador.

| Pasta / ficheiro | O que é |
|---|---|
| `src-tauri/` | App Rust: janela, servidor local (compilação clang++ e arduino-cli, broker MQTT na rede, TCP/HTTP do ESP32, página do WebServer), recursos Arduino |
| `index.html`, `src/main.js` | Entrada da interface: carrega `frontend/src/desktop.jsx` |
| `vite.config.js` | Vite com a configuração partilhada `frontend/vite.shared.js` (porta 1420, saída `dist/`) |

A interface **não é copiada**: os componentes, o motor de simulação e os idiomas vêm de `../frontend/src`.
Uma correção no site chega à app no build seguinte. O que só existe no desktop decide-se em runtime por
`DESKTOP` (`frontend/src/services/platform.js`), que a janela ativa ao injetar `window.__ADJELTRON_API__`.

## Comandos

Requisitos: [Bun](https://bun.sh), Node, [Rust](https://rustup.rs) e os
[pré-requisitos do Tauri](https://v2.tauri.app/start/prerequisites/).

```bash
bun install          # instala o Tauri CLI e (postinstall) as dependências de ../frontend
bun run dev          # app em desenvolvimento (Vite em http://localhost:1420 + janela Tauri)
bun run build        # instalador para o sistema atual
bun run build:mac    # macOS universal (.dmg)
bun run build:win    # Windows (.exe NSIS e .msi)
bun run build:ui     # só a interface (licenças + Vite → dist/)
```

Os instaladores ficam em `src-tauri/target/…/release/bundle/`. As versões publicadas são criadas pelo
workflow `.github/workflows/desktop.yml` a cada tag `v*`, e o site mostra-as em **/descarregar**.
