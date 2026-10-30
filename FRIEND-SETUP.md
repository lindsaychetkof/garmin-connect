# Deploy your own private copy

This guide is for a coding assistant working for the person who will own the deployment. Use that person's connected Sites account and current timezone.

1. Fetch this repository into a new workspace. Read the installed Sites skill. Preserve the application's source rather than replacing it with an empty starter.
2. Read `.openai/hosting.json`. In this public template it contains only `d1: "DB"`, `r2: null`, and `capabilities: ["mcp"]`. It must have no `project_id`. If a prior deployment identity is present, verify it belongs to the current user before using it; do not reuse someone else's private Site.
3. Register a **new owner-private Site** and immediately persist its returned identity. Never make it public to bypass authentication or deployment problems. Provision a new database using the existing Drizzle migration.
4. Set `lib/config.ts` to the owner's IANA timezone. Generate 32 cryptographically random bytes, base64-encode them, and store them as the secret runtime variable `GARMIN_ENCRYPTION_KEY` through Sites. Never use a sample value for production or include a real secret in source, output, or chat. Keep it stable across updates so saved credentials remain decryptable.
5. Install the locked dependencies once using the installed Sites workflow. Run `node --test tests/garmin.test.mjs` and the TypeScript check. Build and package using Sites' source helper. Publish the private deployment and verify the deployment succeeded.
6. With `mcp` declared, Sites provisions the plugin. Read its exact plugin ID through `get_site(include_mcp_connection: true)` after publication and use the plugin management connection/install workflow. Do not invent plugin IDs or use the repository URL as an MCP endpoint.
7. Give the owner the **private setup page**. The owner obtains their own Personal API key in Garmin Connect and enters it there. The key must not be pasted into chat, committed, or put in a URL. This page verifies the key and encrypts it for storage.
8. Ask the owner to copy the project instruction from the page into their existing health project's instructions. A deployment cannot silently change arbitrary ChatGPT project instructions.
9. In a fresh health-project conversation, test `get_connection_status`, then `get_daily_update`. Show data dates/fetch time without claiming missing data is zero. Test a requested older range and one activity detail. Refresh the plugin's tool metadata if a prior version is still shown.

## What's automatic and what's not

The coding assistant can prepare code, provision the private service, and help connect its plugin when it has the right tools. The owner still signs in, creates/enters the Garmin key privately, and grants any required connection consent. Ordinary ChatGPT without execution/hosting tools cannot deploy this from a ZIP by itself.

No scheduled background polling is required. The service runs on demand when ChatGPT calls a tool. The owner's computer can be off.

## Updating

Keep your Site ID, encryption secret, database, and Garmin key private and outside the public repository. Fetch reviewed source updates, preserve your timezone and private settings, rerun tests/build, and redeploy the same private Site. Never overwrite the encryption secret during a routine update.
