# Current 18-tool catalog validation — November 7, 2026

This supersedes the 16-tool expectation in the dated October 27 validation; it does not modify or republish the existing Gemini release or npm package.

- Gemini CLI 0.66.0's bundled discovery, input validation and invocation passed all 18 tools, including `compare_accounts` and `business_card_cost`. No model call was made. The sanitized report is [gemini-validation-2026-11-07.json](gemini-validation-2026-11-07.json).
- Savings, CDs, money market and checking calls completed; Gemini rejected a negative balance during input validation. Advertised parameter schemas contained no mortgage references.
- Source build and package checks passed. Direct HTTP versus source-built stdio parity passed for 18 tools, three prompts, four resources, schemas and annotations, structured content, error status, a resource read and a prompt retrieval. No application credentials were supplied.
- A compatible lockfile refresh updated five vulnerable transitive packages; `npm audit` reported zero vulnerabilities after remediation. The bridge version remains 0.3.0; no npm publish was performed.
- Stale, aging and unavailable source outcomes remain visible in the report. Positive protocol validation does not certify underlying data freshness or completeness. The application separately owns the unknown-bank matching fix; this bridge check does not establish its deployment.
- Validation requests were internal probes, not consumer adoption. No normal Gemini account settings or credentials were read, and no model tokens were spent.

The repository is public, has the `gemini-cli-extension` topic and a root `gemini-extension.json`, but GitHub Code Search returned zero manifest results on November 7. The browser code-search troubleshooting step requires GitHub sign-in in this session. Follow [Google's indexing guidance](https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/releasing.md), then check actual gallery inclusion after a crawler cycle. A source commit or successful CLI call does not prove gallery indexing or independent installs.
