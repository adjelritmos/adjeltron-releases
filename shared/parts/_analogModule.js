// Fábrica de definições para módulos de sensor analógico com comparador LM393
// (saída analógica AO + saída digital DO com limiar ajustado num trimpot).
import { rowZ } from '../geometry.js'

const KIND = { VCC: 'pwr', GND: 'gnd', AO: 'out', DO: 'out' }

export function analogModuleDef({ type, name, short, description, order, pinX, size, view2d, interactive, threshold = 0.5 }) {
  return {
    type,
    name,
    short,
    cat: 'sensor',
    description,
    size,
    pins: rowZ(order, pinX, 0.3, order.map((id) => KIND[id])),
    config: { threshold },
    fields: [{ key: 'threshold', label: 'Limiar do comparador (trimpot, fração de VCC)', type: 'range', min: 0.02, max: 0.98, step: 0.01 }],
    interactive,
    view2d,
  }
}
