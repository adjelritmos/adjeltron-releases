// Interface (3D + 2D) dos componentes em plugin. Cada ficheiro exporta por omissão:
//   {
//     type,
//     Model({ part }),                 // modelo 3D procedural em cm (ver ../kit.jsx); lê o estado
//                                      // vivo a cada frame com liveOf(part.id) / inputOf(part.id)
//     Overlay2D({ part, info, live }), // (opcional) SVG desenhado por cima da imagem 2D durante a
//                                      // simulação; coordenadas em px com (0,0) no centro da peça;
//                                      // info.project([x, y, z]) converte cm locais → px
//   }
// A imagem do editor 2D e a miniatura são renders automáticos do Model.
import { UI_A } from './group-a.js'
import { UI_B } from './group-b.js'
import { UI_C } from './group-c.js'
import { UI_D } from './group-d.js'
import { UI_E } from './group-e.js'
import { UI_F } from './group-f.js'
import { UI_ROBOT } from './group-robot.js'
import { UI_G } from './group-g.js'
import { UI_PICO } from './group-pico.js'
import { UI_MECH } from './group-mech.js'
import { UI_MATERIAL } from './group-material.js'
import { UI_CASA } from './group-casa.js'
import { UI_MDF } from './group-mdf.js'
import { UI_CAO } from './group-cao.js'
import { UI_PATO } from './group-pato.js'
import { UI_V } from './group-v.js'
import rgbled from './rgbled.jsx'
import lcd1602 from './lcd1602.jsx'
import esp32 from './esp32.jsx'
import esp32Uno from './esp32Uno.jsx'
import mega from './mega.jsx'
import pico from './pico.jsx'
import frame from './frame.jsx'

export const PART_UI = Object.fromEntries([frame, mega, esp32, esp32Uno, pico, rgbled, lcd1602, ...UI_A, ...UI_B, ...UI_C, ...UI_D, ...UI_E, ...UI_F, ...UI_ROBOT, ...UI_G, ...UI_PICO, ...UI_MECH, ...UI_MATERIAL, ...UI_CASA, ...UI_MDF, ...UI_CAO, ...UI_PATO, ...UI_V].map((u) => [u.type, u]))
