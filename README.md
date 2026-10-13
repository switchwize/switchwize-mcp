# SwitchWize MCP client

Read-only MCP tools for U.S. rates, savings comparisons, financial indexes,
card offers and changes, rewards, CD rollover rules, and downgrade paths.

## Connect now

For clients supporting Streamable HTTP, use the hosted endpoint:

`https://www.switchwize.com/api/mcp`

No SwitchWize account or API key is required. The API is rate-limited.
Documentation: [SwitchWize Developers](https://www.switchwize.com/developers).

## Run the stdio client from source

Use a supported Node.js LTS release and npm:

```sh
git clone https://github.com/switchwize/switchwize-mcp.git
cd switchwize-mcp
npm ci --ignore-scripts
npm run build
npm start
```

For a desktop MCP client, configure command `node` with the absolute path to
`dist/index.js` as its argument. No environment file or database credentials
are needed. `SWITCHWIZE_MCP_URL` is an optional full MCP endpoint override for developers.

## Run from npm

```sh
npx -y switchwize-mcp@0.3.0
```

For a desktop MCP client, configure command `npx` with arguments
`["-y", "switchwize-mcp@0.3.0"]`. No API key is required.

The source bridge and package manifest now use 0.3.0, matching the published npm
bridge. Building this repository does not republish the existing npm version.

## Available tools

- `get_top_rates`
- `get_top_hysa_rates`
- `get_bank_gap`
- `compare_switch_savings`
- `get_rate_freshness`
- `get_index_dataset`
- `get_bank_gap_index`
- `get_reality_score`
- `get_card_offers`
- `get_transfer_bonuses`
- `get_card_changes`
- `get_reward_valuations`
- `best_move_this_week`
- `get_cd_rollover_rules`
- `get_card_downgrade_path`
- `get_fed_hike_pass_through`

The hosted server currently discovers 16 tools, three prompts, and four resources.
The source-built stdio bridge forwards the hosted tool schemas and annotations,
prompts, resources, structured results and tool error status.

The client connects to `/api/mcp` using Streamable HTTP and exposes that catalog
over stdio. It does not initiate financial transactions or
request bank credentials. Balance inputs supplied to tools are transmitted to
the hosted API; do not include account numbers or other sensitive identifiers.

## Validate a source checkout

`npm run verify:package` checks the build and package contents without publishing.
`npm run verify:live` compares the source bridge's tools, prompts and resources
with the public hosted service and performs a hypothetical Bank Gap call. It
requires network access and contributes internal acceptance traffic; it does
not establish independent user adoption or verify every upstream data source.

## Data boundaries

Observations may be aggregator-sourced and may be aging. Preserve each response's
source dates and freshness labels. Monthly index data is not a current offer.
Confirm product terms directly with the provider before making a decision.

Savings-gap figures are hypothetical estimates. The comparison benchmark is
the average of the top three tracked savings rates, not an average across every
tracked bank. Card Reality Scores model a consumer segment's assumptions and
may carry stale terms; they are not personalized advice or guaranteed benefits.

Attribute data as **SwitchWize (switchwize.com)**. The MIT license covers this
client software, not upstream datasets, third-party materials, or trademarks.
See [data and service terms](https://www.switchwize.com/terms).

## Package verification

`npm run verify:package` builds the client and checks the npm tarball against an
exact allowlist: LICENSE, README.md, dist/index.js, and package.json.
`npm pack` creates a local tarball; neither command publishes it.

License: MIT. Copyright SW Digital Holdings LLC.
