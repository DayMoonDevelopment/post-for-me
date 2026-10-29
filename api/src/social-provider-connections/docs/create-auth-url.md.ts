export const createAuthUrlDescription = `
Generates a URL that initiates the authentication flow for a user's social media account. When visited, the user is redirected to the selected social platform's login/authorization page. Upon successful authentication, they are redirected back to your application.

For Quickstart projects using Post for Me system credentials, \`redirect_url_override\` is not accepted. Configure the project redirect URL in the dashboard instead.

Use the top-level \`force_reauth\` boolean to control whether the OAuth flow forces the account picker / consent screen to be shown again during re-authorization, rather than silently reusing previously granted access. This only applies to \`facebook\`, \`instagram\` (both \`connection_type\` values), \`tiktok\`, \`tiktok_business\`, \`youtube\`, and \`x\` (with \`connection_type\` set to \`oauth1\`) — it is ignored for all other platforms. There is no single global default: \`facebook\`, \`instagram\` (facebook connection type), \`tiktok\`, \`tiktok_business\`, and \`youtube\` default to forcing re-auth; \`instagram\` (instagram connection type) and \`x\` (oauth1) default to not forcing re-auth. Set \`force_reauth\` explicitly to \`true\` or \`false\` to override a given platform's default.

## Callback Redirect
Once the platform authentication completes (successfully or not), the user is redirected to your configured callback URL (the project's redirect URL, or \`redirect_url_override\` if one was provided) with the result appended as query params:

- \`provider\` - the platform that was authenticated
- \`projectId\` - the project the account was connected to
- \`isSuccess\` - \`"true"\` or \`"false"\`
- \`accountIds\` - comma-separated IDs of accounts that connected successfully (may be empty)
- \`failedAccountIds\` - comma-separated IDs of accounts that failed to connect; only present if at least one account failed
- \`error\` - present only if there was at least one error. If multiple errors occurred they are joined with \`|\`

Example success redirect:
\`\`\`
https://your-app.com/callback?provider=x&projectId=proj_123&isSuccess=true&accountIds=acc_123,acc_456
\`\`\`

Example failure redirect:
\`\`\`
https://your-app.com/callback?provider=x&projectId=proj_123&isSuccess=false&accountIds=&failedAccountIds=acc_789&error=External+Id+already+exists+for+account+acc_789
\`\`\`

## Reconnecting an Account
If \`external_id\` is provided and an account resolved during authentication already has a connection for that provider/project:

- If the existing connection's \`external_id\` matches the one you supplied, the connection is updated in place (fresh tokens are stored) and no error is raised.
- If the existing connection has a **different** \`external_id\` already set, that account fails to connect - no new token is issued for it, it's included in \`failedAccountIds\`, and \`error\` includes \`External Id already exists for account {id}\`. If this happens for every account in the attempt, the overall result is \`isSuccess=false\` and \`error\` also includes \`No valid accounts found\`.
- To reconnect the account with a different \`external_id\` then you must first disconnect or delete the account.
`;
