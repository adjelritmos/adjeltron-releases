// O worker está na app desktop (ligado ao servidor Rust)? Definido por desktop/net.js.
let on = false
export const desktopNet = () => on
export const setDesktopNet = (v) => (on = !!v)
