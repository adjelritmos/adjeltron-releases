// escreve num parâmetro de saída (&var): o transpilador passa { v } (getter/setter) — ver
// OUT_PARAMS em ../compiler-extras.js; um objeto/vetor recebe a propriedade 0
export function setOut(ref, value) {
  if (ref && typeof ref === 'object' && 'v' in ref) ref.v = value
}
