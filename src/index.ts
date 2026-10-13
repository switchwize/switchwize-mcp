#!/usr/bin/env node
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"

/**
 * Credentials-free stdio bridge to the public hosted MCP service. Importing
 * the application server initializes its private database client, which would
 * make `npx -y switchwize-mcp` unusable for normal users.
 */
const DEFAULT_ENDPOINT = "https://www.switchwize.com/api/mcp"
const endpoint = process.env.SWITCHWIZE_MCP_URL ?? DEFAULT_ENDPOINT

async function connectUpstream() {
  const client = new Client({ name: "switchwize-mcp-stdio-bridge", version: "0.3.0" })
  const transport = new StreamableHTTPClientTransport(new URL(endpoint))
  await client.connect(transport)
  return { client, transport }
}

export async function main() {
  const { client, transport } = await connectUpstream()
  const [toolCatalog, promptCatalog, resourceCatalog] = await Promise.all([
    client.listTools(),
    client.listPrompts(),
    client.listResources(),
  ])
  const server = new Server(
    { name: "switchwize-mcp", version: "0.3.0" },
    { capabilities: { tools: {}, prompts: {}, resources: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => toolCatalog)
  server.setRequestHandler(CallToolRequestSchema, async request => (
    client.callTool({ name: request.params.name, arguments: request.params.arguments ?? {} })
  ))
  server.setRequestHandler(ListPromptsRequestSchema, async () => promptCatalog)
  server.setRequestHandler(GetPromptRequestSchema, async request => (
    client.getPrompt({ name: request.params.name, arguments: request.params.arguments })
  ))
  server.setRequestHandler(ListResourcesRequestSchema, async () => resourceCatalog)
  server.setRequestHandler(ReadResourceRequestSchema, async request => (
    client.readResource({ uri: request.params.uri })
  ))

  const stdio = new StdioServerTransport()
  await server.connect(stdio)

  const close = async () => {
    await Promise.allSettled([client.close(), transport.close()])
  }
  process.once("SIGINT", () => { void close() })
  process.once("SIGTERM", () => { void close() })
}

main().catch(error => {
  console.error(`[switchwize-mcp] unable to connect to ${endpoint}`, error)
  process.exit(1)
})
