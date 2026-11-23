# Security notes

## API perimeter

- The API uses Helmet, a restrictive Content Security Policy, and CORS limited to `WEB_ORIGIN` with credentials enabled.
- API routes are available under `/api/v1`; `/api` remains an alias for existing clients. `/api/docs` is exposed only in development.
- Session cookies are HTTP-only, SameSite Lax, and Secure in production. OAuth uses a state value validated by the callback.
- Request logs include request ID, method, path, response status, duration, and authenticated user/community IDs when available. They omit request bodies, query strings, emails, phones, cookies, and authorization values.
- Uploads are limited to supported image formats and size limits. Files are decoded and re-encoded before storage, use generated names, and are served only to active community members.

## Contact data and community boundaries

- Public item, reputation, and community member responses do not include email or phone. Email is returned only to the signed-in account owner by `/api/me`.
- Borrow request responses include the other participant's phone only after the request reaches `accepted`.
- Wanted responders' phone numbers are withheld until the author fulfills the post and selects that responder. The author sees the responder's name and location before then.
- The community member endpoint does not return email, including to admins. Admins can identify members by display name and role.
- Read and write routes use the active community header and membership checks; a non-member receives a not-found response rather than another community's data.

## Admin audit trail

Invite-code regeneration, member approval/removal/role changes, and report resolution actions are recorded in `audit_logs` inside the same transaction as the corresponding change. Apply the pending `20261123010000_admin_audit_log` migration before deploying code that performs those actions.

## Operations

- Set a unique, random `JWT_SECRET` of at least 32 characters and keep OAuth secrets server-side.
- Set production `NODE_ENV=production`, a strict `WEB_ORIGIN`, and HTTPS origins. Configure proxy trust only for the deployment topology.
- Keep the test database separate from real and demo data. API integration tests require `SMOKE_DATABASE_URL` whose database name ends in `_test`; the test runner refuses to substitute `DATABASE_URL`.
- Rotate credentials if exposed, and review dependency audit output before production releases.
