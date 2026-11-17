// node:os no browser. Na app desktop o servidor Rust diz o nome da máquina e os IPs
// (frontend/src/sim/desktop/net.js preenche globalThis.__ADJ_OS__).
const os = () => globalThis.__ADJ_OS__ || {}
export const hostname = () => os().hostname || 'localhost'
export const networkInterfaces = () => ({ lan: (os().ips || []).map((address) => ({ address, family: 'IPv4' })) })
export default { hostname, networkInterfaces }
