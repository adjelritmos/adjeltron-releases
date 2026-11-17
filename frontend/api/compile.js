// Função serverless da Vercel: POST /api/compile { code, board } → { ok, js, diagnostics, … }
// Traduz o sketch para JavaScript (src/engine/compile-fast.js); a simulação corre no browser.
// Em desenvolvimento o Vite serve a mesma rota (vite.config.js).
import { handleCompile } from '../src/engine/compile-fast.js'

export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-headers', 'content-type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'use POST' })
  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      return res.status(400).json({ error: 'JSON inválido' })
    }
  }
  try {
    const r = handleCompile(body)
    return res.status(r.status).json(r.body)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
