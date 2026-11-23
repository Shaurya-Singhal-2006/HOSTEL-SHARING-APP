# LendLoop

**Borrow a little. Share a lot.**

Share tools and everyday things with the people around you. This npm-workspaces monorepo contains a React/Vite frontend and an Express/Prisma API.

## Stack

- Frontend: React, Vite, Tailwind CSS, React Router, TanStack Query, Framer Motion
- API: Node.js, Express, Zod, Multer, Sharp
- Database: PostgreSQL with Prisma
- Sign-in: Google OAuth 2.0, JWT in an HTTP-only cookie

## Local setup

Requirements: Node.js 20.9+ and PostgreSQL 14+.

1. If `apps/api/.env` does not already exist, copy the root `.env.example` there. If it already exists, keep its database settings and add the variables listed below. Set Google OAuth credentials, an invite code, and a random `JWT_SECRET` of at least 32 characters.
2. Copy `apps/web/.env.example` to `apps/web/.env` if the API is not at `http://localhost:4000`.
3. Install dependencies from the repository root:

   ```sh
   npm install
   npm install -w @lendloop/api multer@^2.5.0 sharp
   npm install -D -w @lendloop/api @types/multer
   ```

4. Apply the database migrations and seed the starter community:

   ```sh
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

   Phase 3 adds listing indexes. Run `npm run db:generate` and `npm run db:migrate` after pulling this phase. To add sample listings for local development, use `npm run db:seed:demo`; it creates three `.test` demo users and 15 listings with no photos. The demo seed refuses to run when `NODE_ENV=production`.

5. Start the frontend and API:

   ```sh
   npm run dev
   ```

6. Open <http://localhost:5173/login>. The UI component specimen remains at <http://localhost:5173/design>. The API health endpoint is <http://localhost:4000/api/health>.

The main seed creates only **My Community**. It does not create accounts or sample loan history. Google sign-in accepts any verified Google account; the invite code controls access to this community.

## Google Cloud Console setup

1. Create or select a Google Cloud project and configure the OAuth consent screen for an **External** audience. Add your own account as a test user while setting up. This app requests only `openid`, `email`, and `profile`; Google’s current app-state rules describe how that basic identity scope set behaves in Testing. Publish the External app for production access by any Google account, and complete any verification Google requires.
2. Create an OAuth client with application type **Web application**.
3. Add `http://localhost:5173` as an authorized JavaScript origin.
4. Add `http://localhost:4000/api/auth/google/callback` as an authorized redirect URI. It must exactly match `API_ORIGIN` plus `/api/auth/google/callback`.
5. Put the client ID and secret in `apps/api/.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Keep the secret on the API only; never add it to a `VITE_` variable.

Google requires the callback URI to match the OAuth client configuration exactly. See [Google’s web server OAuth guide](https://developers.google.com/identity/protocols/oauth2/web-server) and [client ID setup guide](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid).

Google’s [OAuth app state overview](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview) explains External audience, Testing, and publishing behavior. The app code does not restrict email domains, but Google Cloud audience and publishing settings still apply.

For production, use HTTPS origins and redirect URIs. The session cookie is `SameSite=Lax`. If the frontend and API use different providers, put them on the same site (for example `app.example.com` and `api.example.com`) or proxy `/api` through the frontend domain so browsers will send the cookie on API requests.

## Environment variables

API variables in `apps/api/.env`:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | API listen port, default 4000 |
| `WEB_ORIGIN` | Comma-separated frontend origins allowed by CORS (for local testing, `http://localhost:5173,http://127.0.0.1:5173`) |
| `API_ORIGIN` | Public API origin used to construct Google’s callback URI |
| `API_REQUEST_TIMEOUT_MS` | Maximum API request duration before a 504 response; defaults to 15000 ms |
| `API_HEALTH_TIMEOUT_MS` | Database health-query timeout; defaults to 2500 ms |
| `DATABASE_STARTUP_TIMEOUT_MS` | Database connection check timeout before startup fails; defaults to 10000 ms |
| `API_PUBLIC_URL` | Public API origin used for local image URLs; defaults to `http://localhost:4000` |
| `UPLOAD_DIR` | API local-disk image directory; defaults to `./uploads` |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth web client secret |
| `JWT_SECRET` | Random signing secret, minimum 32 characters |
| `NODE_ENV` | Set to `production` to enable secure cookies |

`apps/web/.env` may set `VITE_API_URL`; it defaults to `http://localhost:4000`.

`UPLOAD_DIR` defaults to `./uploads`, resolved from the API process working directory (normally `apps/api/uploads`). `API_PUBLIC_URL` defaults to `http://localhost:4000` and is used when constructing public image URLs.

## Phase 2 manual test checklist

1. **Login:** open `/login`, choose a Google account, and verify the browser returns to LendLoop. A new account should land on `/join`; no college-domain restriction is applied.
2. **Wrong invite:** submit an incorrect code. Confirm the page shows a clear error and does not advance.
3. **Rate limit:** submit five incorrect codes, then submit another. Confirm the API responds with HTTP 429 and the page explains the 15-minute wait. Restart the API to clear the in-memory counter before continuing. The limiter is per process; use a shared store if running multiple API instances.
4. **Join and onboarding:** submit a community invite code; confirm the community’s configured location fields are required, the Google name is prefilled, and phone can be left blank.
5. **Protected redirects:** in a private/incognito window, open `/profile` and confirm redirect to `/login`. After sign-in but before joining, confirm `/profile` redirects to `/join`. After joining with an incomplete profile, confirm it redirects to `/onboarding`.
6. **Profile edit:** save a different name, the community’s configured location values, and an optional phone number. Refresh and verify the changes persist. `GET /api/me` returns profile data only to the signed-in account; it returns HTTP 401 without the session cookie.
7. **Logout:** sign out, confirm return to `/login`, and verify opening `/profile` again redirects to sign-in.

## Phase 3 manual test checklist

1. Sign in, join your community, and complete your profile. Open `/` and confirm the Home screen loads. Item and category routes require all three steps.
2. Create a listing with one photo, then repeat with two and three photos. Confirm the detail page carousel and Home card show the processed images.
3. Try four photos, a photo larger than 5 MB, and a text file renamed to `.jpg`. Confirm a clear error appears and no listing is created. The server checks file signatures and accepts only JPEG, PNG, and WebP content.
4. Edit your listing text and category, remove a current photo, and add a new photo. Confirm saved changes appear on the item detail page and removed image/thumbnail files are gone from `apps/api/uploads/items/<itemId>/`.
5. In **My items**, change a listing between Available, Lent, and Hidden. Confirm hidden listings disappear from other members’ browse/detail views but remain visible to their owner.
6. Create enough listings to exceed 20 in one hour for an account and confirm the API responds with HTTP 429.
7. Search for full and partial words, select a category, toggle Available now, and filter by the community’s configured location options. Load additional pages and confirm newest items appear first without duplicates.
8. Sign in as a second community member and try to edit or delete the first member’s item using its detail URL. The API must return HTTP 404 and leave the listing unchanged.
9. Inspect `/api/items`, `/api/items/:id`, and `/api/items/mine` responses in devtools. Confirm item owner objects contain only public name, community location values, avatar URL, and trust score; no owner email or phone is returned.
10. Open `/uploads/` and confirm it returns a not-found response rather than a file listing. Image URLs below it should load. The folder is ignored by Git except for its `.gitkeep`.
11. Delete a listing without an accepted borrow request. Confirm its item record and photo/thumbnail files are removed. After Phase 4, create an accepted request through the UI and confirm deletion returns HTTP 409.

## Local image storage

Uploads remain on the API server’s disk under `apps/api/uploads/items/<itemId>/` by default. This phase does not use cloud storage. A deployed API needs an attached persistent disk mounted at `UPLOAD_DIR`; ephemeral container filesystems can be cleared on restart or redeploy. Back up that disk together with the database because item photo paths refer to those files.

## Deployment outline

- Deploy `apps/web` as a Vercel project rooted at `apps/web`; set `VITE_API_URL` to the API origin unless `/api` is proxied through the same site.
- Deploy `apps/api` as a Render Node service rooted at the repository root. Build with `npm install && npm run db:generate -w @lendloop/api && npm run build -w @lendloop/api`; start with `npm run start -w @lendloop/api`.
- Set the API environment variables in Render. Use a release command `npm run db:deploy -w @lendloop/api` before serving traffic.
- Configure production JavaScript origin and OAuth callback URI in Google Cloud Console. Both must use the deployed HTTPS domains.

Authentication and profile setup are Phase 2. Phase 3 adds item listings, local photo uploads, browse/search, detail pages, and My items. Phase 4 adds borrowing requests, notifications, and contact sharing only after acceptance. Phase 5 adds the wanted board and post-return ratings.

## Phase 4 manual test checklist

1. Run `npm run db:generate` and `npm run db:migrate`. The Phase 4 migration safely converts legacy two-part location values such as `B` + `16` to `B16`, drops invalid combinations to `NULL`, adds location value `0`, request timestamps/reasons, the active-request index, and notifications.
2. Edit your profile with values matching your community’s location labels and options. Confirm the values are saved and shown with those labels in profile, listings, and request contacts.
3. Create an item without a photo. Confirm its Home, detail, My items, request, and notification visuals use the category/title icon. Check “drill machine” uses a drill, unknown titles use the category icon, a real photo replaces the icon, and Add/Edit live preview changes as title/category changes.
4. Request your own item, then a hidden/lent item; both should be blocked. Request an available item for more than its maximum days; confirm it is rejected. Submit a second active request for the same item; confirm HTTP 409.
5. Create overlapping pending requests from two borrowers. Accept one as owner; confirm the item becomes Lent and the overlapping pending request is automatically declined. Try accepting another overlapping request concurrently; expect HTTP 409.
6. Decline a request with and without a reason. Cancel pending and accepted requests as borrower. Confirm accepted cancellation returns the item to Available. Mark an accepted request returned as owner and confirm Available status and `returned_at`.
7. Open a request as a third user and confirm HTTP 404. In F12 → Network, inspect responses before acceptance, while accepted, and after return/decline/cancel: only an accepted request includes the other person’s phone, and no response includes email.
8. Confirm notifications are created for each request transition, the bell shows unread counts, opening it marks all read, and it refreshes every 30 seconds. Check the Requests navigation badge for owner pending requests.
9. Set an accepted request’s `to_date` to yesterday in the database and refresh Requests; confirm the API returns `isOverdue: true` and the card shows “Overdue”.

Legacy profile location values are retained for compatibility. Current profile locations come from each community’s configured labels and member values. Phase 4 adds no environment variables.

## Phase 5: Wanted board and reputation

No new environment variables are required. The API uses the active community, session, and notification configuration. Apply Phase 5 after pulling the migration:

```sh
npm run db:generate
npm run db:migrate
```

The migration adds wanted categories and helper selection, makes the optional needed-by date nullable, closes wanted posts as a supported status, enforces one response per member and post, adds wanted notification targets, and timestamps ratings. In production, run `npm run db:deploy` instead of `npm run db:migrate`.

Wanted feed and detail endpoints require sign-in, membership in a community, and a complete profile. Wanted responder phone numbers are only included in the author’s detail response while a post is open, or for the selected helper after fulfillment. Feeds, non-author detail, and public reputation summaries omit phone and email. Wanted-post limits are configurable with `WANTED_CREATE_LIMIT_PER_HOUR` and `WANTED_MAX_OPEN_POSTS`; defaults are relaxed to 1000/1000 in development and remain 10/5 in production. Past needed-by dates are returned with `isExpired: true`, and expired posts cannot accept new responses.

Ratings are one per exchange participant after the request is returned. The unique constraint blocks a second submission; no rating edit endpoint is provided. Trust score is recalculated as thumbs-up minus thumbs-down, with a floor of zero, inside the rating transaction. Reputation summaries expose only public profile fields, counts, completed lend/borrow totals, badges, and recent comments without contact details. No environment changes are needed for this phase.

### Phase 5 manual test checklist

1. Sign in as one community member and complete the profile. Open **Wanted** and post a title, category, optional note, and optional future/today needed-by date. Confirm the post appears in **My posts** and the open board.
2. Start typing an item title that matches an available listing. Confirm the “Someone already listed this” suggestion appears and opens the item detail/request flow.
3. Sign in as a second member. Open the first member’s post and respond once. Confirm the author receives a wanted notification and sees the response count increase. Attempt a second response; expect HTTP 409.
4. Attempt to respond to your own post; expect HTTP 400. Inspect the non-author `GET /api/wanted/:id` response in F12 → Network: it must include the response count and only your own response, with no other responder list, phone, or email.
5. As the author, open the detail. Confirm responder name, community location values, message, and phone are visible while the post is open. Select a helper and mark fulfilled. Confirm only the selected helper’s phone remains available to the author; other responders’ phones must be absent. Close a different open post and delete a test post.
6. Set a post’s `needed_by` to yesterday in the database. Refresh the board and detail; confirm it has an `Expired` label and `isExpired: true`, and the server blocks another response.
7. To exercise both caps in development without creating hundreds of posts, set `WANTED_MAX_OPEN_POSTS=5` and `WANTED_CREATE_LIMIT_PER_HOUR=10` in `apps/api/.env`, then restart the API. Create five open posts for one member and attempt a sixth; expect HTTP 409. Create ten posts within an hour and confirm the next post receives HTTP 429. The rate limiter is in-memory per API process, as with the existing item/request limiters.
8. Create a borrow request and attempt to rate it before return; expect HTTP 409. Complete the return, then submit a thumbs-up or thumbs-down rating from each participant. A third member must receive HTTP 403. Submit a second rating from the same participant; expect HTTP 409.
9. Confirm trust score changes after a rating, and test the derived badges with accounts that have zero lends, at least five positive ratings with fewer than ten percent negative ratings, and ten completed lends. The requester who rated first should see a polite note that the other participant can still rate.
10. Open the profile, item owner card, request card, and wanted responder name. Confirm the trust score/badges and public reputation modal appear. Inspect `GET /api/ratings/users/:id/reputation` in Network: it must not contain `phone` or `email` for the member or commenters.
