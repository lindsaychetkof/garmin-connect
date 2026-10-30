# Garmin Health Connection

Read README.md (or SHARING.md in a private development checkout) and FRIEND-SETUP.md before deployment. Use the installed Sites skill for creating, building, and publishing Sites. This repository is a personal deployment template, not a shared multi-user hosted product.

- Keep Garmin requests on the fixed official Personal API host. Use `redirect: 'manual'` and explicitly reject redirects; Workers does not implement the Fetch `error` redirect mode.
- Owner-private hosting is required. Preserve platform authentication and derive user IDs only from trusted Sites identity headers. Do not add a caller-supplied user ID or a generic Garmin URL proxy.
- Preserve per-user encryption and database filtering. Runtime secrets never belong in source, hosting manifests, frontend code, logs, or Git commits.
- Default new-chat context is `get_daily_update`, not a multi-day history dump. Explicit historical queries paginate by 31 days; activity lists paginate by offset. Do not silently truncate or label partial results complete.
- Only measured Garmin fields and explicitly selected structured workout fields may be exported. Never expose routes, coordinates, profile identifiers, workout titles, or private notes. Workout targets are not measured execution.
- Use the owner's timezone in lib/config.ts. Do not promise an app-open trigger or exact cross-chat change feed.
- Run `node --test tests/garmin.test.mjs`, TypeScript checking, and the production build for relevant changes. Validate access controls when changing server routes. Do not query real health data just to create public fixtures.
- Before public publication, sanitize `.openai/hosting.json` to remove any deployment identity and exclude every environment file, private database, credential, health export, local runtime folder, build output, Git history from a private deployment, and publication archive.
- New private deployments need a new cryptographic wrapping secret. Updates must preserve the existing wrapping secret.

The public repository is https://github.com/lindsaychetkof/garmin-connect. A user deploying their own copy must receive a new private Site and their own plugin; do not point them at the original author's deployment.
