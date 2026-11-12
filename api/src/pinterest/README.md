# Pinterest account resources

Account-scoped platform resources use `/v1/{platform}/{resource}/{social_account_id}`.
`GET /v1/pinterest/boards/{social_account_id}` uses the existing API authentication
and only looks up accounts in the authenticated caller's project.

## Boards and pagination

- `limit`: integer, 1–250 (default 25).
- `cursor`: opaque next-page cursor, returned in `meta.cursor`.
- Response: `{ data: [<unchanged Pinterest board objects>], meta: { cursor, limit, next, has_more } }`.
- Follow `meta.next` until it is `null`. The final cursor is an empty string.
- Each request fetches exactly one Pinterest page. No board privacy, ownership,
  or publishability filter is applied. IDs remain suitable for `pinterest.board_ids`.
- Response DTOs document known upstream fields only; they do not transform or
  strip board objects or additional fields.

## Upstream coverage and limitations

Verified against Pinterest's [v5 OpenAPI specification](https://github.com/pinterest/api-description/blob/main/v5/openapi.yaml)
(version 5.28.0): `boards/list` (`GET /v5/boards`) includes boards owned by the
token's user **and group boards where that user is a collaborator**. A separate
shared-board operation is not required. With no `privacy` parameter Pinterest
returns all boards it permits for the token's scopes and permissions.

The list operation requires `boards:read`, already requested by the existing
Pinterest connection flow. Secret-board visibility may additionally require
`boards:read_secret`; this endpoint does not expand OAuth scopes or bypass
Pinterest permissions. It does not switch to another operation user through
`ad_account_id`/Business Access. “All accessible boards” means the collection
Pinterest exposes for this connected identity across pages, not every board on
Pinterest or an unbounded response. Sandbox accounts use Pinterest's sandbox API.

Schema references: `Board`, `BoardBase`, `BoardOwner`, `BoardMedia`, `BoardPrivacy`.
Pagination references: `Pinterest.Lib.BookmarkParams.bookmark` and `page_size`.
