// node:dns/promises no browser: o nome é resolvido pelo servidor Rust ao ligar (tcp-connect)
export const lookup = async (host, opts) => (opts?.all ? [{ address: host, family: 4 }] : { address: host, family: 4 })
export default { lookup }
