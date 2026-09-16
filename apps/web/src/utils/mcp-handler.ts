import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js'

export async function handleMcpRequest(request: Request, server: McpServer): Promise<Response> {
  try {
    const jsonRpcRequest = (await request.json()) as JSONRPCMessage

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

    const responsePromise = new Promise<JSONRPCMessage>((resolve) => {
      clientTransport.onmessage = (message: JSONRPCMessage) => resolve(message)
    })

    await server.connect(serverTransport)
    await clientTransport.start()
    await serverTransport.start()
    await clientTransport.send(jsonRpcRequest)

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('MCP tool timed out after 90s')), 90_000),
    )

    const responseData = await Promise.race([responsePromise, timeoutPromise])

    await clientTransport.close()
    await serverTransport.close()

    return Response.json(responseData, { headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('MCP handler error:', error)
    return Response.json(
      { jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error', data: error instanceof Error ? error.message : String(error) }, id: null },
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
