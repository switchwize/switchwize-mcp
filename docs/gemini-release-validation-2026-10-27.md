# Gemini CLI extension 0.3.0 validation

Validated October 27, 2026 (America/New_York) against the public hosted MCP.
The extension is an HTTP configuration and context file; the existing npm
bridge remains 0.3.0 and is not republished by this extension release.

## Acceptance evidence

- Official `@google/gemini-cli@0.66.0` installed in an isolated temporary profile.
- `gemini extensions install <local source> --consent` installed and enabled
  `switchwize (0.3.0)`, including `GEMINI.md` and the `switchwize` MCP server.
- `gemini mcp list` reported the hosted HTTP server **Connected**.
- Gemini CLI's bundled `McpClient.discoverTools` discovered exactly the expected
  16 names. All were read-only with `destructiveHint: false`.
- All 16 passed `DiscoveredMCPTool.build` input validation and live `execute`.
  Responses were non-error JSON envelopes rendered as Gemini tool content.
- Savings, CDs, money market, and checking category calls completed.
- A negative balance was rejected by Gemini's input-schema validation.
- Requests from the all-tool verifier carried an internal-probe User-Agent.
  These are acceptance checks, not independent user traffic.

No Gemini model request was made. This verifies the Gemini tool integration,
not model tool selection or the completeness of every underlying dataset.

## Data limits observed

The Reality Score sample was stale; transfer bonuses were unavailable; CD
rollover rules, downgrade paths, and Fed-hike pass-through were aging. The
additional CD-rate sample was stale. Those states are preserved and must be
shown to users rather than presented as current offers.

The hosted `get_top_rates` category description still mentions mortgage. The
extension context explicitly restricts rate categories to savings, CDs, money
market, and checking; no mortgage call was made. This configuration does not
change or enforce a new scope on the hosted API.

The source checkout's existing npm lockfile has four transitive audit findings
(two moderate, two high). The native HTTP extension does not install or execute
that npm bridge or its dependencies. The source bridge build/package baseline
passed; dependency remediation is separate from this configuration release.

## Publication and discovery

Google's documented gallery discovery uses a public GitHub repository, a root
`gemini-extension.json`, and the `gemini-cli-extension` topic. Its crawler runs
daily. Publishing those files and the topic is a discovery request, not proof
that Google's gallery has already indexed or approved the entry.

References:

- https://geminicli.com/docs/extensions/releasing/
- https://geminicli.com/docs/extensions/reference/
- https://geminicli.com/docs/tools/mcp-server/
