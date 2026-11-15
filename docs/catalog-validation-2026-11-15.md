# 24-tool catalog validation — November 15, 2026

The production endpoint at `https://www.switchwize.com/api/mcp` advertises 24
read-only tools. The six additions are `search_cards`, `get_card_details`,
`compare_cards`, `cards_by_goal`, `best_card_for_spend`, and `issuer_summary`.
The server and credentials-free bridge retain version 0.3.0; catalog count is
not a package version. The October 27 release's original 16-tool receipt and
November 7 source's 18-tool receipt are historical checkpoints.

Gemini CLI 0.66.0's bundled MCP client discovered, input-validated and invoked
all 24 tools. The run passed without an LLM call, user credentials or token
spend. The script uses a separate temporary workspace and an explicit internal
probe label. It also checked other deposit categories and rejected invalid
input. This is acceptance traffic, not independent consumer adoption.

The source stdio bridge matched every hosted tool schema and annotation, all
four resources and three prompts. A hypothetical Bank Gap call, structured
result, rejected argument, resource read and prompt retrieval passed. Package
build and exact-file verification passed. A compatible transitive Hono update
cleared the new npm audit finding without changing dependency ranges.

The application acceptance additionally passed all 24 positive invocation and
input/output schema checks, six negative cases, five freshness aliases, four
resource reads and three prompt retrievals. Unknown banks return
`ACCOUNT_NOT_FOUND`; unknown cards return `CARD_NOT_FOUND`.

Source freshness is separate from successful protocol operation. Preserve
stale or unavailable research, fee/benefit evidence gaps, modeled assumptions
and partial bank coverage. No production data, scheduled evaluation or
notification job was changed by these checks. Mortgage is outside this MCP's
scope.
