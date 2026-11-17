// Grupo F de componentes (peças analógicas/energia/lógica do Velxio): transístores BC547,
// BC557, 2N3906, 2N3055; MOSFET 2N7000, IRF540N, IRF9540, FQP27P06; díodos 1N4148,
// 1N5817/1N5819, zeners 3,3/12 V; reguladores 7812/7905; pilhas AA e CR2032; amp-ops ideal,
// LM324, LM741, TL072; optoacoplador 4N25; bobina; condensador cerâmico; gerador de sinais;
// fonte de bancada; portas lógicas e flip-flops abstratos; junção de fios; mini breadboard.
import bjtF from './bjtF.js'
import fetF from './fetF.js'
import diodeF from './diodeF.js'
import regF from './regF.js'
import cellF from './cellF.js'
import opampF from './opampF.js'
import opto4n25 from './opto4n25.js'
import inductor from './inductor.js'
import ceramicCap from './ceramicCap.js'
import instrF from './instrF.js'
import gates from './gates.js'
import junction from './junction.js'
import breadboardMini from './breadboardMini.js'
import breadboardFull from './breadboardFull.js'

export const GROUP_F = [...bjtF, ...fetF, ...diodeF, ...regF, ...cellF, ...opampF, opto4n25, inductor, ceramicCap, ...instrF, ...gates, junction, breadboardMini, breadboardFull]
