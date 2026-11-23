# X post disclosures

Set optional booleans `made_with_ai` (AI-generated media) and
`paid_partnership` (paid partnership) in `platform_configurations.x` or an
account's `account_configurations[].configuration`:

```json
{
  "platform_configurations": {
    "x": { "made_with_ai": true, "paid_partnership": true }
  },
  "account_configurations": [
    {
      "social_account_id": "your-x-account-id",
      "configuration": { "paid_partnership": false }
    }
  ]
}
```

Account values override platform values, including explicit `false`. An omitted
account field inherits the platform value. If omitted at both levels, the field
is not sent to X; no disclosure default is added. These are post-level fields,
not per-media upload settings.

## Upstream support and limitations

Verified against X's [Create or Edit Post documentation](https://docs.x.com/x-api/posts/create-post)
on November 23, 2026: `POST /2/tweets` declares both as optional top-level
booleans. The endpoint supports OAuth 1.0a user context or OAuth 2 user tokens
with `tweet.read`, `tweet.write`, and `users.read`. Normal X API publishing
access is required. The reference documents no additional plan, account, or
media prerequisites specifically for these fields. This is not a guarantee
that every account or media combination will be accepted; live publishing has
not been verified. X remains responsible for label display and enforcement.

## Customer verification after deployment

Ask the requesting customer on PFME-239 to publish a representative AI-made
short film with `made_with_ai: true` and confirm the label appears without
editing the post in X. For appropriate sponsored content, also verify
`paid_partnership: true`. Check account overrides with `false` and unchanged
behavior when omitted. Capture the Post for Me post/result IDs, X post URLs,
connection type, and any X errors for the team. Do not publish on the customer's
behalf or claim live verification until they confirm the results.
