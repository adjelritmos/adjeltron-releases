// Sensor magnético de porta/janela MC-38 (contacto reed): o corpo com os fios fica no aro e o
// íman (peça "Íman do sensor de porta") na folha. Com o íman a menos de ~2 cm o contacto fecha.
// Origem no centro da face de trás (a que cola na parede); o corpo cresce segundo +y.
export const MC38 = { L: 2.7, W: 1.4, H: 1.0, GAP: 2.5 } // GAP: distância máx. (cm) entre centros para fechar

export default {
  type: 'sensorMagnetico',
  name: 'Sensor magnético de porta (MC-38)',
  short: 'Sensor porta',
  cat: 'casa',
  description:
    'Contacto reed de alarme (MC-38): o corpo com os dois fios cola-se no aro (na face da parede, ao lado do vão) e o íman cola-se na folha da porta/janela, alinhado com ele. Com a porta fechada o íman fica a menos de ~2 cm e o contacto fecha; ao abrir, afasta-se e o contacto abre. Ligação típica: um fio ao GND e o outro a um pino com pinMode(pino, INPUT_PULLUP) → LOW = fechada, HIGH = aberta. O simulador vê sozinho se a folha onde está o íman rodou (servo ou dobradiça); sem íman por perto use o interruptor "Porta aberta" durante a simulação.',
  size: [2.7, 1.0, 1.4],
  pins: [
    { id: '1', label: 'Fio 1', pos: [-1.6, 0.5, -0.2], kind: 'pass', conn: 'solder', dir: [-1, 0, 0] },
    { id: '2', label: 'Fio 2', pos: [-1.6, 0.5, 0.2], kind: 'pass', conn: 'solder', dir: [-1, 0, 0] },
  ],
  config: { contacto: 'nf' },
  fields: [{ key: 'contacto', label: 'Contacto', type: 'select', options: [['nf', 'Fechado com o íman perto (MC-38, NF)'], ['na', 'Aberto com o íman perto (NA)']] }],
  interactive: { kind: 'toggle', label: 'Porta aberta (íman longe)' },
  mass: 8,
  collider: { size: [2.7, 1.0, 1.4], pos: [0, 0.5, 0] },
  view2d: { view: 'top', x: [-1.75, 1.4], z: [-0.75, 0.75] },
}
