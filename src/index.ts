#!/usr/bin/env node
/**
 * switchwize-mcp — thin stdio MCP proxy for SwitchWize's free, read-only,
 * public rate-data API (https://www.switchwize.com/developers).
 *
 * Unlike @switchwize/mcp-server (the SwitchWize monorepo's own server, which
 * requires a full repo checkout + database credentials), this package needs
 * nothing but network access. At startup it fetches the live tool list from
 * GET /api/public/tools, then proxies every call_tool request to
 * POST /api/public/tools/{tool}. No SwitchWize account or API key required;
 * the API is rate-limited (60 requests/min/IP) rather than key-gated.
 *
 * Input schemas are hardcoded below rather than fetched, since the discovery
 * endpoint intentionally returns name/description only (see
 * src/lib/public-data/tools.ts in the main repo). If SwitchWize adds a new
 * tool this package needs a version bump to describe its arguments — the
 * tool *list* and descriptions still update live without a new release.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"

const BASE_URL = process.env.SWITCHWIZE_API_URL ?? "https://www.switchwize.com"
const TOOLS_URL = `${BASE_URL}/api/public/tools`

// Mirrors src/lib/mcp/server.ts's inputSchemas in the main repo. Kept here
// (rather than fetched) because the discovery endpoint doesn't serve them —
// see the file header above.
const INPUT_SCHEMAS: Record<string, Record<string, unknown>> = {
  get_top_rates: {
    type: "object",
    properties: {
      category: { type: "string", description: "Rate category, e.g. savings, cds, money-market, checking, mortgage." },
      limit: { type: "integer", minimum: 1, maximum: 25 },
    },
    required: ["category"],
    additionalProperties: false,
  },
  get_top_hysa_rates: {
    type: "object",
    properties: {
      limit: { type: "integer", minimum: 1, maximum: 25 },
    },
    additionalProperties: false,
  },
  get_bank_gap: {
    type: "object",
    properties: {
      bank: { type: "string", description: "Optional bank name for user-facing context." },
      balance: { type: "number", minimum: 0, maximum: 10000000 },
    },
    additionalProperties: false,
  },
  compare_switch_savings: {
    type: "object",
    properties: {
      currentApy: { type: "number", minimum: 0, maximum: 25 },
      balance: { type: "number", minimum: 0, maximum: 10000000 },
    },
    required: ["currentApy"],
    additionalProperties: false,
  },
  get_rate_freshness: {
    type: "object",
    properties: {
      category: { type: "string" },
    },
    additionalProperties: false,
  },
  get_index_dataset: {
    type: "object",
    properties: {
      indexId: { type: "string", description: "Index id, e.g. bank-gap-index, cd-spread, mma-spread, checking-gap." },
      limit: { type: "integer", minimum: 1, maximum: 60 },
    },
    required: ["indexId"],
    additionalProperties: false,
  },
  get_bank_gap_index: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  get_reality_score: {
    type: "object",
    properties: {
      card: { type: "string", description: "Card slug or name, e.g. platinum-card or Chase Sapphire Reserve." },
      segment: { type: "string", description: "Optional segment id, e.g. occasional-traveler, small-business-owner, balance-carrier." },
    },
    required: ["card"],
    additionalProperties: false,
  },
}

const FALLBACK_SCHEMA = { type: "object", properties: {}, additionalProperties: true }

interface RemoteTool {
  name: string
  description: string
  readOnly?: boolean
}

async function fetchToolList(): Promise<RemoteTool[]> {
  const res = await fetch(TOOLS_URL)
  if (!res.ok) throw new Error(`GET ${TOOLS_URL} failed: ${res.status} ${res.statusText}`)
  const body = (await res.json()) as { tools?: RemoteTool[] }
  return body.tools ?? []
}

async function callRemoteTool(name: string, args: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${TOOLS_URL}/${encodeURIComponent(name)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args ?? {}),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Tool "${name}" failed (${res.status}): ${text}`)
  return text
}

async function main() {
  const tools = await fetchToolList()
  const toolNames = new Set(tools.map(t => t.name))

  const server = new Server(
    { name: "switchwize-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: INPUT_SCHEMAS[t.name] ?? FALLBACK_SCHEMA,
    })),
  }))

  server.setRequestHandler(CallToolRequestSchema, async request => {
    const name = request.params.name
    if (!toolNames.has(name)) {
      return {
        isError: true,
        content: [{
          type: "text",
          text: JSON.stringify({ error: "Unknown tool", supported: [...toolNames] }),
        }],
      }
    }
    try {
      const text = await callRemoteTool(name, (request.params.arguments ?? {}) as Record<string, unknown>)
      return { content: [{ type: "text", text }] }
    } catch (error) {
      return {
        isError: true,
        content: [{
          type: "text",
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
        }],
      }
    }
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(error => {
  console.error("[switchwize-mcp] fatal", error)
  process.exit(1)
})
