# Garmin Health Connection

A small, private Garmin-to-ChatGPT connector you can deploy for yourself. Built with Garmin's official Personal API and ChatGPT Sites. Your laptop does not need to stay on.

## Friend setup: intended experience

The goal is a shared hosted connector: open an install link in ChatGPT, connect with your own account, enter your Garmin key once on an authenticated setup page, then use it in your health chats. Friends should not need a coding agent or their own deployment.

**That consumer install flow is not available in this repository yet.** The current implementation is a tested personal connector and developer source. Publishing source does not publish a broadly installable plugin. OpenAI documents Sites plugin sharing for Business/Enterprise teammates; access for unrelated personal accounts must be verified separately. A website viewer invitation alone does not grant plugin access. See [OpenAI MCP sharing](https://learn.chatgpt.com/docs/extend/mcp).

A shared service additionally needs tested cross-account isolation, per-user timezone settings, appropriate credential/consent handling, and confirmation of Garmin's terms for the intended use. Garmin's Personal API is for an individual's own data; its developer program covers organizational multi-user integrations. See [Garmin's FAQ](https://developer.garmin.com/gc-developer-program/personal/personal-faq/).

## Developer option: deploy your own copy

Give a coding assistant with **Sites access and a local executor** this prompt:

> Fetch https://github.com/lindsaychetkof/garmin-connect and read AGENTS.md and FRIEND-SETUP.md. Deploy a new owner-private Garmin Health Connection for my own account. Use my timezone. Create a new Site identity, database, and encryption secret. Do not reuse anyone else's deployment settings or credentials. Run the included tests and build before publishing. Then give me the private setup link and help me connect its ChatGPT plugin. I will enter my Garmin Personal API key only on the private setup page, never in chat or source code.

The assistant handles the deployment; you create your own Garmin Personal API key and enter it once. Then install/connect your own plugin and copy PROJECT-INSTRUCTIONS.md into your health project's instructions.

**A repository URL or uploaded ZIP alone does not create or host a tool.** Setup requires a coding agent with execution and Sites hosting capabilities. If those tools are unavailable, the assistant should say so rather than claim deployment succeeded. No OpenAI API key is required by this connector itself.

## Tools

| Tool | Purpose |
| --- | --- |
| `get_daily_update` | Default first call: latest available wellness record and workouts from the rolling last 24 hours. |
| `get_health_context` | Recent calendar days, default 1; request up to 31. |
| `get_health_history` | Explicit dates and selected sections. Returns up to 31 days per call, with `next_start_date` for further pages. |
| `get_activities` | Find workouts over any explicit date range, filtered by type if needed; follow `next_offset`. |
| `get_activity_details` | Measured activity summary, Garmin split summaries, and optional associated workout steps. |
| `get_connection_status` | Connection and last cached context fetch time. |

Examples: “Show my sleep and HRV last month.” “Find last year's longest runs.” “Show the measured power, cadence, training effect and split summaries for that workout.”

Historical coverage depends on Garmin and the account/device. Long ranges require multiple calls; there is no promise that every metric exists for every past date. Split summaries are not necessarily individual laps. Raw FIT files and per-second time series are not decoded. Associated workout steps describe targets, not proof of completion.

## Daily behavior

New-chat behavior is driven by project instructions and tool descriptions. Opening a blank chat does not trigger server activity. ChatGPT must call the tool before its first reply. The daily update is a current snapshot, not an exact “changes since another chat” feed. It reads two calendar dates so that a rolling 24-hour activity window can cross midnight, but returns only the latest wellness record per section. Every record has its date; yesterday's available record is not labeled as today's.

Daily/recent context can be reused for 15 minutes. `force_refresh` bypasses that cache after a device sync. Older history and activity details are fetched on request and are not persisted by this connector. The last cached context stays in the database until replaced or disconnected; the cache age is not an automatic deletion policy.

## Privacy and access

- Each person should run their own owner-private copy with their own Garmin key. This repository contains no live deployment identity, key, token, database, or health records.
- Keys are encrypted with AES-GCM and authenticated to the signed-in user's site-scoped ID. The wrapping secret is a server-only runtime secret, not source code.
- The server decrypts the key when contacting Garmin. It never returns the key in tool results.
- The code excludes GPS coordinates, routes, profile identifiers, workout titles, and private notes. It includes exercise names where Garmin provides structured workout steps.
- Data returned by a tool enters your ChatGPT conversation and is subject to your ChatGPT privacy settings. Deleting the connector's data does not delete prior chats or downloaded/local copies.
- Disconnect deletes the hosted connection row and cached context. Revoke the key in Garmin to end its access.
- This is a personal project with tests, not an independently audited security product. Review the code before using it for sensitive data.

Garmin describes the Personal API as access to your own data; commercial multi-user applications use a separate developer program. Share copies of the code for independent personal deployments. Do not turn this template into a public shared health-data service without reviewing Garmin's terms and implementing the appropriate authorization model.

## Development

Node 24 is recommended (Node >=22.13 is the runtime minimum). This is a Vinext application targeting Cloudflare Workers via Sites; it is not a static website.

```sh
npm run install:ci
node --test tests/garmin.test.mjs
npx tsc --noEmit
npm run build
```

For local development, create a private `.dev.vars` containing `GARMIN_ENCRYPTION_KEY=<a fresh base64-encoded 32-byte random key>`. Never commit this file. Use the existing Sites skill for database provisioning, local migration application, packaging, and publication. See FRIEND-SETUP.md. Keep third-party license notices in scripts/vite/ and vendor/.

## Official references

- Garmin Personal API: https://developer.garmin.com/gc-developer-program/personal/personal-api/
- Garmin FAQ: https://developer.garmin.com/gc-developer-program/personal/personal-faq/
- Garmin endpoint schema: https://developer.garmin.com/gc-developer-program/personal/swagger-docs/
- ChatGPT custom MCP: https://developers.openai.com/api/docs/guides/custom-mcp-server

Not affiliated with or endorsed by Garmin or OpenAI.
