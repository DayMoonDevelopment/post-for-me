export const pinterestControllerDescription = `
Use the Pinterest endpoint to list owned boards and group boards where the connected account is a collaborator.

Boards are returned unchanged from Pinterest. No privacy or publishability filter is applied.

- Requires **boards:read**. Visibility, including secret/protected boards, is limited by the connected token's scopes and Pinterest permissions.
- Results are paginated. Follow **meta.next** to enumerate all accessible boards.
- Boards are not discovered through other ad accounts or Business Access identities.
`;
