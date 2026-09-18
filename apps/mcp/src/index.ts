import express from 'express'
import cors from 'cors'
import { env } from './env.js'
import { resolveUserFromAuth, handleMcpPayload } from './mcp-server.js'

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Health check endpoint for Docker/Railway/Render
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'payo-mcp', uptime: process.uptime() })
})

// MCP JSON-RPC endpoint
app.post('/mcp', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || (req.headers['x-api-key'] as string | undefined)
    const cookieHeader = req.headers.cookie
    const user = await resolveUserFromAuth(authHeader, cookieHeader)

    const response = await handleMcpPayload(req.body, user)
    res.setHeader('Content-Type', 'application/json')
    res.json(response)
  } catch (error: any) {
    console.error('[MCP Error]:', error)
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal server error',
        data: error instanceof Error ? error.message : String(error),
      },
      id: req.body?.id ?? null,
    })
  }
})

app.listen(env.PORT, () => {
  console.log(`🚀 Payo MCP server running at http://localhost:${env.PORT}/mcp`)
})
