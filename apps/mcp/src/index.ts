import express from 'express'
import cors from 'cors'
import { env } from './env.js'
import { createServer, resolveUserFromAuth } from './mcp-server.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'payo-mcp', uptime: process.uptime() })
})

// MCP Streamable HTTP transport — handles GET (SSE), POST (RPC), DELETE (session close)
app.all('/mcp', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || (req.headers['x-api-key'] as string | undefined)
    const cookieHeader = req.headers.cookie
    const user = await resolveUserFromAuth(authHeader, cookieHeader)

    // Detect MCP client from initialize handshake (e.g. "ChatGPT", "claude-code")
    // so tools can adapt responses (rich markdown + images vs compact CLI text).
    let clientName: string | undefined
    try {
      const body = req.body
      if (body?.method === 'initialize') {
        clientName = body?.params?.clientInfo?.name as string | undefined
      }
    } catch { /* ignore */ }

    const server = createServer(user, clientName)
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless — new server per request
    })

    res.on('close', () => {
      transport.close()
      server.close()
    })

    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
  } catch (error: any) {
    console.error('[MCP Error]:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

app.listen(env.PORT, () => {
  console.log(`🚀 Payo MCP server running at http://localhost:${env.PORT}/mcp`)
})
