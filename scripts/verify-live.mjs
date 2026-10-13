import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const endpoint = process.env.SWITCHWIZE_MCP_URL ?? 'https://www.switchwize.com/api/mcp'
const direct = new Client({ name: 'switchwize-internal-probe-source-parity', version: '0.3.0' })
const bridge = new Client({ name: 'switchwize-internal-probe-source-stdio', version: '0.3.0' })
const http = new StreamableHTTPClientTransport(new URL(endpoint))
const stdio = new StdioClientTransport({
  command: process.execPath,
  args: [fileURLToPath(new URL('../dist/index.js', import.meta.url))],
  env: { SWITCHWIZE_MCP_URL: endpoint },
  stderr: 'pipe',
})
const sorted = items => [...items].sort((a, b) => (a.name ?? a.uri).localeCompare(b.name ?? b.uri))
try {
  await direct.connect(http)
  await bridge.connect(stdio)
  assert.equal(bridge.getServerVersion().version, '0.3.0')
  const tools = await direct.listTools()
  const prompts = await direct.listPrompts()
  const resources = await direct.listResources()
  assert.deepEqual(sorted((await bridge.listTools()).tools), sorted(tools.tools))
  assert.deepEqual(sorted((await bridge.listPrompts()).prompts), sorted(prompts.prompts))
  assert.deepEqual(sorted((await bridge.listResources()).resources), sorted(resources.resources))
  assert.equal(tools.tools.length, 16)
  assert.equal(prompts.prompts.length, 3)
  assert.equal(resources.resources.length, 4)
  const result = await bridge.callTool({ name: 'get_bank_gap', arguments: { bank: 'Chase', balance: 25000 } })
  assert.notEqual(result.isError, true)
  assert.ok(result.content.length > 0)
  assert.ok(result.structuredContent, 'Structured results must survive the bridge')
  const invalid = await bridge.callTool({ name: 'get_bank_gap', arguments: { balance: -1 } })
  assert.equal(invalid.isError, true, 'Rejected arguments must retain upstream error status')
  const resource = await bridge.readResource({ uri: resources.resources[0].uri })
  assert.ok(resource.contents.length > 0)
  const prompt = await bridge.getPrompt({ name: 'audit_savings', arguments: { balance: '25000', bank: 'Chase' } })
  assert.ok(prompt.messages.length > 0, 'Prompt retrieval must survive the bridge')
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), endpoint, version: '0.3.0', tools: tools.tools.length,
    prompts: prompts.prompts.length, resources: resources.resources.length, schemasAndAnnotationsMatch: true,
    structuredContentPreserved: true, errorStatusPreserved: true, resourceRead: true, promptRead: true,
    credentialsRequired: false }, null, 2))
} finally {
  await Promise.allSettled([bridge.close(), direct.close(), stdio.close(), http.close()])
}
