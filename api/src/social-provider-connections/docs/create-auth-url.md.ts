export const createAuthUrlDescription = `
Generates a URL that initiates the authentication flow for a user's social media account. When visited, the user is redirected to the selected social platform's login/authorization page. Upon successful authentication, they are redirected back to your application.

For Quickstart projects using Post for Me system credentials, \`redirect_url_override\` is not accepted. Configure the project redirect URL in the dashboard instead, and make sure the relevant provider app allows the generated Post for Me callback URL.
`;
