export const createAuthUrlDescription = `
Generates a URL that initiates the authentication flow for a user's social media account. When visited, the user is redirected to the selected social platform's login/authorization page. Upon successful authentication, they are redirected back to your application.

For Quickstart projects using Post for Me system credentials, \`redirect_url_override\` is not accepted. Configure the project redirect URL in the dashboard instead.

Use the top-level \`force_reauth\` boolean to control whether the OAuth flow forces the account picker / consent screen to be shown again during re-authorization, rather than silently reusing previously granted access. This only applies to \`facebook\`, \`instagram\` (both \`connection_type\` values), \`tiktok\`, \`tiktok_business\`, \`youtube\`, and \`x\` (with \`connection_type\` set to \`oauth1\`) — it is ignored for all other platforms. There is no single global default: \`facebook\`, \`instagram\` (facebook connection type), \`tiktok\`, \`tiktok_business\`, and \`youtube\` default to forcing re-auth; \`instagram\` (instagram connection type) and \`x\` (oauth1) default to not forcing re-auth. Set \`force_reauth\` explicitly to \`true\` or \`false\` to override a given platform's default.
`;
