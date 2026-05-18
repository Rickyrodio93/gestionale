// server.js — proxy minimale per Anthropic API
// Avvialo con: node server.js
// Poi in un altro terminale: npm run dev

import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'

const app = express()
const API_KEY = process.env.ANTHROPIC_API_KEY

if (!API_KEY) {
    console.error('❌  Variabile ANTHROPIC_API_KEY non impostata')
    process.exit(1)
}

app.use(
    '/api/anthropic',
    createProxyMiddleware({
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        pathRewrite: { '^/api/anthropic': '' },
        on: {
            proxyReq: (proxyReq) => {
                proxyReq.setHeader('x-api-key', API_KEY)
                proxyReq.setHeader('anthropic-version', '2023-06-01')
            },
        },
    })
)

app.listen(3001, () => console.log('✅  Proxy in ascolto su http://localhost:3001'))