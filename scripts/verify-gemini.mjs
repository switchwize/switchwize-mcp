import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Use the pinned CLI's actual MCP discovery, schema validation, and invocation
// code without invoking an LLM, reading account credentials, or spending tokens.
const cliDir = process.env.GEMINI_CLI_PACKAGE_DIR
assert.ok(cliDir, 'Set GEMINI_CLI_PACKAGE_DIR to an installed @google/gemini-cli@0.66.0 package directory')
const cliPackage = JSON.parse(await readFile(join(cliDir, 'package.json'), 'utf8'))
assert.equal(cliPackage.version, '0.66.0', 'Recheck bundled APIs before changing the validation CLI version')
const bundleDir = join(cliDir, 'bundle')
const coreFile = (await readdir(bundleDir)).find(name => /^dist-.*\.js$/.test(name))
assert.ok(coreFile, 'Gemini CLI core bundle was not found')
const { Config, McpClient } = await import(pathToFileURL(join(bundleDir, coreFile)).href)
assert.equal(typeof Config, 'function')
assert.equal(typeof McpClient, 'function')

const manifestPath = process.env.SWITCHWIZE_GEMINI_MANIFEST ?? fileURLToPath(new URL('../gemini-extension.json', import.meta.url))
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
assert.equal(manifest.name, 'switchwize')
assert.deepEqual(Object.keys(manifest.mcpServers), ['switchwize'])
assert.equal(manifest.mcpServers.switchwize.httpUrl, 'https://www.switchwize.com/api/mcp')
assert.equal(manifest.contextFileName, 'GEMINI.md')
assert.equal(manifest.mcpServers.switchwize.trust, undefined, 'Do not disable user approval in the extension')
const samples = {
  get_top_rates: { category: 'savings', limit: 3 },
  get_top_hysa_rates: { limit: 3 },
  get_bank_gap: { bank: 'Chase', balance: 25000 },
  compare_switch_savings: { currentApy: 0.5, balance: 25000 },
  get_rate_freshness: { category: 'savings' },
  get_index_dataset: { indexId: 'bank-gap-index', limit: 3 },
  get_bank_gap_index: {},
  get_reality_score: { card: 'platinum-card', segment: 'small-business-owner' },
  get_card_offers: { limit: 3 },
  get_transfer_bonuses: {},
  get_card_changes: { sinceDays: 90, limit: 3 },
  get_reward_valuations: {},
  best_move_this_week: { wallet: ['chase:sapphire-preferred', 'amex:gold-card'] },
  get_cd_rollover_rules: {},
  get_card_downgrade_path: {},
  get_fed_hike_pass_through: {},
}
const workspace = await mkdtemp(join(tmpdir(), 'switchwize-gemini-probe-'))
const config = new Config({ sessionId: randomUUID(), targetDir: workspace,
  cwd: workspace, debugMode: false, telemetry: { enabled: false },
  usageStatisticsEnabled: false, enableAgents: false, enableHooks: false })
const serverConfig = { ...manifest.mcpServers.switchwize,
  headers: { 'User-Agent': 'switchwize-internal-probe-gemini-cli-validation/0.3.0' } }
const client = new McpClient('switchwize', serverConfig, config.getWorkspaceContext(), config, false, cliPackage.version)
const report = { checkedAt: new Date().toISOString(), cliVersion: cliPackage.version,
  extensionVersion: manifest.version, endpoint: serverConfig.httpUrl,
  validationMethod: 'Gemini CLI bundled McpClient and DiscoveredMCPTool.build/execute; no model call',
  traffic: 'Internal acceptance probes with hypothetical inputs; not consumer adoption',
  tools: [], extraDepositCategories: [], upstreamSchemaNotes: [], failures: [] }
const summarize = data => {
  const statuses = new Set()
  const walk = value => {
    if (!value || typeof value !== 'object') return
    for (const [key, entry] of Object.entries(value)) {
      if (['freshnessStatus', 'freshness_status', 'approval_status'].includes(key) && typeof entry === 'string') statuses.add(`${key}:${entry}`)
      else if (entry && typeof entry === 'object') walk(entry)
    }
  }
  walk(data)
  return [...statuses].sort()
}
async function call(tool, args) {
  const started = performance.now()
  const invocation = tool.build(args)
  const result = await invocation.execute({ abortSignal: AbortSignal.timeout(60000) })
  assert.equal(result.error, undefined, `${tool.serverToolName} returned an MCP tool error`)
  assert.ok(result.llmContent?.length, `${tool.serverToolName} did not produce Gemini content`)
  const data = JSON.parse(result.returnDisplay)
  assert.ok(data && typeof data === 'object', 'Expected a JSON data envelope')
  assert.equal(data.error, undefined, `${tool.serverToolName} returned a domain error`)
  return { schemaAndInvocationPass: true, elapsedMs: Math.round(performance.now() - started), dataStatuses: summarize(data) }
}
try {
  await client.connect()
  const tools = await client.discoverTools(config, config.getMessageBus())
  report.discoveredTools = tools.length
  assert.deepEqual(tools.map(tool => tool.serverToolName).sort(), Object.keys(samples).sort())
  for (const tool of tools) {
    const name = tool.serverToolName
    try {
      assert.equal(tool.isReadOnly, true, `${name} is not annotated read-only`)
      assert.equal(tool.toolAnnotations.destructiveHint, false)
      assert.ok(tool.getFullyQualifiedName().startsWith('mcp_switchwize_'))
      report.tools.push({ name, readOnly: true, ...await call(tool, samples[name]) })
    } catch (error) {
      report.failures.push({ name, error: error.message })
    }
  }
  const rates = tools.find(tool => tool.serverToolName === 'get_top_rates')
  if (/mortgage/i.test(JSON.stringify(rates.parameterSchema))) {
    report.upstreamSchemaNotes.push('Hosted get_top_rates category description still mentions mortgage. The extension context restricts requests to savings, money-market, cds, and checking; this release does not change the hosted schema.')
  }
  for (const category of ['cds', 'money-market', 'checking']) {
    try { report.extraDepositCategories.push({ category, ...await call(rates, { category, limit: 3 }) }) }
    catch (error) { report.failures.push({ category, error: error.message }) }
  }
  const bankGap = tools.find(tool => tool.serverToolName === 'get_bank_gap')
  assert.throws(() => bankGap.build({ balance: -1 }), 'Gemini must reject negative balances during schema validation')
  report.invalidInputRejected = true
  assert.equal(report.failures.length, 0, 'One or more tools failed; see the validation report')
} catch (error) {
  report.failures.push({ stage: 'validation', error: error.message })
  process.exitCode = 1
} finally {
  await client.disconnect()
  await rm(workspace, { recursive: true, force: true })
  report.passed = report.failures.length === 0
  if (process.argv[2]) await writeFile(resolve(process.argv[2]), JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
}
