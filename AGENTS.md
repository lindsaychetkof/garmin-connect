# Garmin Health Connection

Read README.md (or SHARING.md in a private development checkout), FRIEND-CONNECT.md and FRIEND-SETUP.md before deployment. Use the installed Sites skill for creating, building, and publishing Sites. This repository supports personal deployments and an unverified invitation-only friend pilot; it is not a broadly available hosted product.

- Keep Garmin requests on the fixed official Personal API host. Use `redirect: 'manual'` and explicitly reject redirects; Workers does not implement the Fetch `error` redirect mode.
- Keep hosting owner-private unless the user explicitly invites identified friends. Preserve platform authentication and derive user IDs only from trusted Sites identity headers. Do not add a caller-supplied user ID or a generic Garmin URL proxy. A website invitation does not install a plugin; test each account's tool authorization and record isolation before claiming a working shared connector.
- Preserve per-user encryption and database filtering. Runtime secrets never belong in source, hosting manifests, frontend code, logs, or Git commits.
- Default new-chat context is `get_daily_update`, not a multi-day history dump. Explicit historical queries paginate by 31 days; activity lists paginate by offset. Do not silently truncate or label partial results complete.
- Only measured Garmin fields and explicitly selected structured workout fields may be exported. Never expose routes, coordinates, profile identifiers, workout titles, or private notes. Workout targets are not measured execution.
- Use the owner's timezone in lib/config.ts. Do not promise an app-open trigger or exact cross-chat change feed.
- Run `node --test tests/garmin.test.mjs`, TypeScript checking, and the production build for relevant changes. Validate access controls when changing server routes. Do not query real health data just to create public fixtures.
- Before public publication, sanitize `.openai/hosting.json` to remove any deployment identity and exclude every environment file, private database, credential, health export, local runtime folder, build output, Git history from a private deployment, and publication archive.
- New private deployments need a new cryptographic wrapping secret. Updates must preserve the existing wrapping secret.

The public repository is https://github.com/lindsaychetkof/garmin-connect. An independent owner deploying their own copy must receive a new private Site and their own plugin. An explicitly invited friend instead uses the hosted pilot steps and their own Garmin key, without deploying code. Never invite anyone without the owner's authorization or publish private deployment settings.
