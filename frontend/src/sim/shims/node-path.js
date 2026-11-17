// node:path no browser (mínimo)
export const join = (...a) => a.filter((x) => x != null).join('/')
export default { join }
