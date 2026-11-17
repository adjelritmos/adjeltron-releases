// Grupo F de comportamentos (ver shared/parts/group-f.js). A junção e a mini breadboard
// não têm comportamento (só ligações).
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

export const GROUP_F = [...bjtF, ...fetF, ...diodeF, ...regF, ...cellF, ...opampF, opto4n25, inductor, ceramicCap, ...instrF, ...gates]
