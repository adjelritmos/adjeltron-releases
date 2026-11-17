// node:fs no browser (só usado por código do servidor, dentro de try/catch)
const no = () => {
  throw new Error('node:fs indisponível no browser')
}
export const readdirSync = no
export const readFileSync = no
export const existsSync = () => false
export default { readdirSync, readFileSync, existsSync }
