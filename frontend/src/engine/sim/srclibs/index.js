// Bibliotecas em C++ incluídas no simulador (escritas de raiz para o adjeltron). Uma fonte para tudo:
//  - simulador: o tradutor recebe estes ficheiros como bibliotecas do utilizador (compile-fast.js),
//    por isso walk()/turn()… cedem o tempo como o resto do sketch;
//  - servidor (Render/app desktop): o site envia-as junto com o sketch (withSourceLibs) e há cópias
//    em arduino/ e arduino-libs/<Biblioteca>, geradas por scripts/sync-srclibs.mjs (o
//    `bun run check` avisa se ficarem desatualizadas).
import { COMMON_FILES } from './otto-common.js'
import { OTTO_BIPED_FILES } from './otto.js'
import { QUAD_FILES } from './quad.js'
import { SERIALCMD_FILES } from './serialcmd.js'

// família Otto DIY: bípede (Otto, Otto9, Otto9Humanoid), quadrúpede (Quad, MiniKame) e utilitários
export const OTTO_FILES = { ...COMMON_FILES, ...OTTO_BIPED_FILES, ...QUAD_FILES, ...SERIALCMD_FILES }

// name: pasta em arduino-libs/ (biblioteca do arduino-cli); files: cabeçalho → texto;
// headers: os #include que a ativam (todos os ficheiros: qualquer um puxa a biblioteca inteira)
export const SOURCE_LIBS = [{ name: 'OttoDIY', files: OTTO_FILES, headers: Object.keys(OTTO_FILES), depends: 'Servo' }]
