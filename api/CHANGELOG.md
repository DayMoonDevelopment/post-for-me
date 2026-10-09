# API changelog

## Unreleased

- Fixed LinkedIn account-feed pagination to honor the requested limit (up to
  100), advance the cursor, and recognize native continuation links and totals.
- **Response contract correction:** LinkedIn feed `platform_account_id` now
  contains the native organization ID for Pages or person ID for personal
  accounts, rather than the Post for Me `spc_` ID. Use `social_account_id` for
  the Post for Me account ID.
- Pagination next URLs now use the public protocol and host forwarded by the
  trusted ingress proxy.
