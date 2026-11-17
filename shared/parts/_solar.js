// Células fotovoltaicas (modelo de um díodo): I = Iph − I0·(e^(V/a) − 1) − V/Rsh
//   Iph = Isc · G/1000 (G = irradiância útil, W/m²), a = n·Ns·Vt (n = 1,3; Vt = 25,7 mV)
// Valores de catálogo a 1000 W/m² e 25 °C. Ns = nº de células em série (~0,6 V cada).
export const SOLAR_MODELS = {
  m05: { name: '5 V 0,5 W (80 × 60 mm)', L: 8, W: 6, voc: 6.0, isc: 0.11, ns: 10, cols: 5, rows: 2 },
  m1: { name: '6 V 1 W (110 × 60 mm)', L: 11, W: 6, voc: 7.2, isc: 0.2, ns: 12, cols: 6, rows: 2 },
  m2: { name: '6 V 2 W (136 × 110 mm)', L: 13.6, W: 11, voc: 7.2, isc: 0.38, ns: 12, cols: 4, rows: 3 },
}
const VT = 0.0257
export function pvParams(m) {
  const a = 1.3 * m.ns * VT
  return { ...m, a, i0: m.isc / (Math.exp(m.voc / a) - 1), gsh: m.isc / (m.voc * 60) }
}
// corrente (A) que o painel dá à tensão V com a irradiância G
export function pvCurrent(p, V, G) {
  const iph = (p.isc * Math.max(0, G)) / 1000
  return iph - p.i0 * (Math.exp(Math.min(V / p.a, 80)) - 1) - V * p.gsh
}
// tensão em vazio (V) com a irradiância G
export function pvVoc(p, G) {
  const iph = (p.isc * Math.max(0, G)) / 1000
  return iph > 0 ? p.a * Math.log(iph / p.i0 + 1) : 0
}
// direção (unitária, para o sol) a partir da elevação e do azimute (graus; azimute 0 = +x, 90 = +z)
export function sunDir(elev, az) {
  const e = (elev * Math.PI) / 180
  const z = (az * Math.PI) / 180
  return [Math.cos(e) * Math.cos(z), Math.sin(e), Math.cos(e) * Math.sin(z)]
}
