# adjeltron — frontend (site web + interface partilhada)

O site e a interface: React (HeroUI + Three.js) e o motor de simulação em JavaScript num Web Worker
(`src/engine`). A app desktop é o projeto [`../desktop`](../desktop), que usa estes mesmos componentes
(entrada `src/desktop.jsx`, configuração do Vite partilhada em `vite.shared.js`). Visão geral, downloads e publicação de versões no
[README principal](../README.md).

```bash
bun install
bun run dev          # http://localhost:5173  (/app = bancada; /app?exemplo=<id> abre um exemplo)
bun run check        # todos os exemplos no simulador (bun run check:fogu: versões em Fogu)
```

## Como se usa
| | |
|---|---|
| **Componentes** | Lista com miniaturas 3D. Arraste para o 2D ou para o 3D (largar sobre um chassi/servo/breadboard fixa a peça lá). |
| **Circuito 2D** | Clique pino → (clique no vazio para dobrar o fio) → pino. Peças por cima dos furos da breadboard ficam **encaixadas** (pinos verdes). Roda = zoom, arrastar o fundo = mover. `R` roda, `Del` apaga, `Esc` cancela. |
| **Montagem 3D** | Árvore mecânica: *Propriedades → Fixar em* (mesa, chassi, braço do servo, ponta de um elo…), posição e rotação. Arraste no plano de fixação. |
| **Código** | C/C++ Arduino ou Fogu (separador no topo do editor; nos exemplos troca para a versão nessa linguagem). `Ctrl+Enter` compila e carrega. Bibliotecas próprias no botão de bibliotecas. |
| **Simulação** | Clique em botões, teclados e comandos IR, rode potenciómetros (2D/3D); passe o rato num pino para ver a tensão. |

## Estrutura
```
src/
  main.jsx, index.css     arranque e tema (HeroUI/Tailwind em hero.js)
  screens/                páginas públicas e a bancada (/app)
  components/
    header/ editor/       cabeçalho, projetos, painel do código
    simulator/ panels/    Circuito / Montagem 3D, inspetor, monitor série, plotter, osciloscópio, MQTT
    circuit/              editor 2D
    three/                cena 3D, kit de modelos, fios 3D
      parts/              modelo 3D + overlay 2D de cada componente
      physics/            física de corpos rígidos (Rapier): montagens, servos, garras, tração
  engine/                 motor de simulação (o mesmo no browser, no desktop e nos scripts)
    compiler*.js          C/C++ Arduino → JavaScript (generators); compile-fast.js = ponto de entrada
    fogu/                 compilador Fogu (biblioteca mcu) → C++
    sim/                  engine.js (placa virtual, passo de 1 ms), electrical.js (solver nodal),
                          parts/ (comportamento de cada peça), libs/ (bibliotecas Arduino),
                          avr/ (emulação real do ATmega com avr8js), examples/ (exemplos)
  sim/                    Web Worker, adaptações (shims) para o browser e ponte para o desktop
  contexts/ services/     estado global (zustand) e controlo da simulação / compilação
scripts/                  gen-licenses.mjs, check-examples.js, walk-sim.js (física sem browser), run-sketch.js, preview-shot.sh
api/compile.js            função serverless da versão web (Vercel)
```

## Licenças de terceiros
`bun run build` corre primeiro `scripts/gen-licenses.mjs`, que gera `public/licenses/` (JSON + `THIRD_PARTY_LICENSES.txt`) com todos os pacotes npm de produção, as crates Rust da app desktop e as bibliotecas em `../desktop/src-tauri/resources`. A lista aparece em **/licencas** (rodapé do site) e em **Definições → Licenças de terceiros** na bancada.

- O build **falha** se entrar uma dependência com copyleft forte (GPL/AGPL/SSPL…), que obrigaria a abrir o código. MPL/LGPL só dão aviso (ok enquanto não se alterarem esses pacotes).
- Sem `cargo` (ex.: Vercel), a parte Rust é reaproveitada do JSON já gerado: depois de mudar o `Cargo.toml`, corra `bun run licenses` e faça commit de `public/licenses/`.
- Pacote sem licença no `package.json`: confirme-a no repositório e acrescente-a a `OVERRIDES` no script.
- O arduino-cli e os compiladores (GPL) **não** devem ser incluídos no instalador; são instalados pelo utilizador.

## Componente novo
Um ficheiro por camada (ver os `index.js` / `group-*.js` de cada pasta):
1. `../shared/parts/<tipo>.js` — catálogo: pinos, medidas, campos, interação;
2. `src/engine/sim/parts/<tipo>.js` — eletrónica/física (`stamp`, `step`, `output`, `diagnose`);
3. `src/components/three/parts/<tipo>.jsx` — modelo 3D e overlay 2D;
4. se tiver biblioteca: `src/engine/sim/libs/<Lib>.js`.

Acrescente o tipo a um grupo em `../shared/catalog.js` para aparecer no catálogo. A miniatura e a imagem 2D
são geradas a partir do modelo 3D.
