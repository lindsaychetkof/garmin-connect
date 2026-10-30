# Free friend pilot: use the hosted connector

Friends do not need a coding agent, GitHub checkout, or a deployment. The code does not charge a subscription. Hosting still uses the owner's Sites allowance, and ChatGPT account limits/policies apply.

This is a pilot setup, not yet verified end to end with a second account. Do not describe a website invitation as a completed plugin installation. Keep the service invitation-only; never share the owner's Garmin key, wrapping secret, service token, database, or ChatGPT account.

## Owner

1. Obtain the friend's ChatGPT sign-in email and permission to invite that account. Verify external invitations are enabled on this Site, then add them as a **viewer**, preserving existing access. Sites may email the invitation. Do not add them as an editor.
2. Give them the private setup URL and its `/mcp` address. The authenticated server looks up the caller's site-scoped user ID; the friend's account must show disconnected until they add their own key.
3. Have them complete the connection steps below. Verify with that account that status, history, activity details, extended data and disconnect use only its own records. Do not claim cross-account support is tested until this has passed.

## Friend

1. Open the invitation/setup page and sign in with the **same ChatGPT account that was invited**.
2. Create your own Garmin Personal API key and enter it only on that setup page. Never paste it into a conversation.
3. If the hosted plugin can be shared/installed for your account, install and connect it. Otherwise, if your ChatGPT account offers **Plugins → plus → Add custom MCP server**, enter the service's `/mcp` address, name it Garmin Health Connection, and use its OAuth sign-in/discovery flow. Review the permissions and risk notice. Do not select no authentication or enter someone else's credentials to bypass errors.
4. Start a new chat, select the connector, and ask it to check your connection, then request today's data. Copy the setup page's project instruction into your health project if you want a daily first-reply fetch.
5. If the custom MCP option is absent, account policy denies the connection, or sign-in/discovery fails, stop and report that exact limitation to the owner. No deployment work on the friend's computer is needed; the owner's distribution/authentication setup needs resolving. Do not promise that all ChatGPT plans or mobile setup screens support the custom-server creation option.

OpenAI's setup and metadata refresh guide: https://developers.openai.com/plugins/deploy/connect-chatgpt

The Garmin Personal API is intended for access to an individual's own data. Before turning this pilot into a broadly available hosted multi-user service, confirm that the proposed use complies with Garmin's terms and use the appropriate developer program where required: https://developer.garmin.com/gc-developer-program/personal/personal-faq/
