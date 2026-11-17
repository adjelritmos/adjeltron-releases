// Grupo F de interfaces 3D/2D (um import por ficheiro; vários ficheiros exportam listas)
import bjtF from './bjtF.jsx'
import fetF from './fetF.jsx'
import diodeF from './diodeF.jsx'
import regF from './regF.jsx'
import cellF from './cellF.jsx'
import opampF from './opampF.jsx'
import opto4n25 from './opto4n25.jsx'
import inductor from './inductor.jsx'
import ceramicCap from './ceramicCap.jsx'
import instrF from './instrF.jsx'
import gates from './gates.jsx'
import junction from './junction.jsx'
import breadboardMini from './breadboardMini.jsx'
import breadboardFull from './breadboardFull.jsx'

export const UI_F = [...bjtF, ...fetF, ...diodeF, ...regF, ...cellF, ...opampF, opto4n25, inductor, ceramicCap, ...instrF, ...gates, junction, breadboardMini, breadboardFull]
