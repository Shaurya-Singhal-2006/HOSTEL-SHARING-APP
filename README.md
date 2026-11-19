# LendLoop

Hostel item sharing for one campus community. This npm-workspaces monorepo contains a React/Vite frontend and an Express/Prisma API.

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

4. Apply the database migrations and seed the single hostel community:

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

The main seed creates only **LendLoop Hostel**. It does not create student accounts or sample loan history. Google sign-in accepts any verified Google account; the invite code controls access to this hostel.

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
| `WEB_ORIGIN` | Exact frontend origin allowed by CORS |
| `API_ORIGIN` | Public API origin used to construct Google’s callback URI |
| `API_PUBLIC_URL` | Public API origin used for local image URLs; defaults to `http://localhost:4000` |
| `UPLOAD_DIR` | API local-disk image directory; defaults to `./uploads` |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth web client secret |
| `HOSTEL_INVITE_CODE` | Private code required to join the seeded hostel |
| `JWT_SECRET` | Random signing secret, minimum 32 characters |
| `NODE_ENV` | Set to `production` to enable secure cookies |

`apps/web/.env` may set `VITE_API_URL`; it defaults to `http://localhost:4000`.

`UPLOAD_DIR` defaults to `./uploads`, resolved from the API process working directory (normally `apps/api/uploads`). `API_PUBLIC_URL` defaults to `http://localhost:4000` and is used when constructing public image URLs.

## Phase 2 manual test checklist

1. **Login:** open `/login`, choose a Google account, and verify the browser returns to LendLoop. A new account should land on `/join`; no college-domain restriction is applied.
2. **Wrong invite:** submit an incorrect code. Confirm the page shows a clear error and does not advance.
3. **Rate limit:** submit five incorrect codes, then submit another. Confirm the API responds with HTTP 429 and the page explains the 15-minute wait. Restart the API to clear the in-memory counter before continuing. The limiter is per process; use a shared store if running multiple API instances.
4. **Join and onboarding:** submit the configured `HOSTEL_INVITE_CODE`; confirm floor and a room such as `B16` are required, the Google name is prefilled, and phone can be left blank.
5. **Protected redirects:** in a private/incognito window, open `/profile` and confirm redirect to `/login`. After sign-in but before joining, confirm `/profile` redirects to `/join`. After joining with an incomplete profile, confirm it redirects to `/onboarding`.
6. **Profile edit:** save a different name, floor, room, and optional phone. Refresh and verify the changes persist. `GET /api/me` returns profile data only to the signed-in account; it returns HTTP 401 without the session cookie.
7. **Logout:** sign out, confirm return to `/login`, and verify opening `/profile` again redirects to sign-in.

## Phase 3 manual test checklist

1. Sign in, join the hostel, and complete your profile. Open `/` and confirm the Home screen loads. Item and category routes require all three steps.
2. Create a listing with one photo, then repeat with two and three photos. Confirm the detail page carousel and Home card show the processed images.
3. Try four photos, a photo larger than 5 MB, and a text file renamed to `.jpg`. Confirm a clear error appears and no listing is created. The server checks file signatures and accepts only JPEG, PNG, and WebP content.
4. Edit your listing text and category, remove a current photo, and add a new photo. Confirm saved changes appear on the item detail page and removed image/thumbnail files are gone from `apps/api/uploads/items/<itemId>/`.
5. In **My items**, change a listing between Available, Lent, and Hidden. Confirm hidden listings disappear from other members’ browse/detail views but remain visible to their owner.
6. Create enough listings to exceed 20 in one hour for an account and confirm the API responds with HTTP 429.
7. Search for full and partial words, select a category, toggle Available now, and filter by floor. Load additional pages and confirm newest items appear first without duplicates.
8. Sign in as a second hostel member and try to edit or delete the first member’s item using its detail URL. The API must return HTTP 404 and leave the listing unchanged.
9. Inspect `/api/items`, `/api/items/:id`, and `/api/items/mine` responses in devtools. Confirm item owner objects contain only name, floor, room, avatar URL, and trust score; no owner email or phone is returned.
10. Open `/uploads/` and confirm it returns a not-found response rather than a file listing. Image URLs below it should load. The folder is ignored by Git except for its `.gitkeep`.
11. Delete a listing without an accepted borrow request. Confirm its item record and photo/thumbnail files are removed. After Phase 4, create an accepted request through the UI and confirm deletion returns HTTP 409.

## Local image storage

Uploads remain on the API server’s disk under `apps/api/uploads/items/<itemId>/` by default. This phase does not use cloud storage. A deployed API needs an attached persistent disk mounted at `UPLOAD_DIR`; ephemeral container filesystems can be cleared on restart or redeploy. Back up that disk together with the database because item photo paths refer to those files.

## Deployment outline

- Deploy `apps/web` as a Vercel project rooted at `apps/web`; set `VITE_API_URL` to the API origin unless `/api` is proxied through the same site.
- Deploy `apps/api` as a Render Node service rooted at the repository root. Build with `npm install && npm run db:generate -w @lendloop/api && npm run build -w @lendloop/api`; start with `npm run start -w @lendloop/api`.
- Set the API environment variables in Render. Use a release command `npm run db:deploy -w @lendloop/api` before serving traffic.
- Configure production JavaScript origin and OAuth callback URI in Google Cloud Console. Both must use the deployed HTTPS domains.

Authentication and profile setup are Phase 2. Phase 3 adds item listings, local photo uploads, browse/search, detail pages, and My items. Phase 4 adds borrowing requests, notifications, and contact sharing only after acceptance. Wanted posts and ratings remain for Phase 5.

## Phase 4 manual test checklist

1. Run `npm run db:generate` and `npm run db:migrate`. The Phase 4 migration safely converts legacy two-part locations such as `B` + `16` to `B16`, drops invalid combinations to `NULL`, adds floor 0 for Basement, request timestamps/reasons, the active-request index, and notifications.
2. Edit your profile with room `b16`; confirm it saves as `B16`. Try `16B`; confirm it is rejected with “Enter your room like B2 or B16”. Set floor to 0 and confirm Basement appears in profile, listings, and request contacts.
3. Create an item without a photo. Confirm its Home, detail, My items, request, and notification visuals use the category/title icon. Check “drill machine” uses a drill, unknown titles use the category icon, a real photo replaces the icon, and Add/Edit live preview changes as title/category changes.
4. Request your own item, then a hidden/lent item; both should be blocked. Request an available item for more than its maximum days; confirm it is rejected. Submit a second active request for the same item; confirm HTTP 409.
5. Create overlapping pending requests from two borrowers. Accept one as owner; confirm the item becomes Lent and the overlapping pending request is automatically declined. Try accepting another overlapping request concurrently; expect HTTP 409.
6. Decline a request with and without a reason. Cancel pending and accepted requests as borrower. Confirm accepted cancellation returns the item to Available. Mark an accepted request returned as owner and confirm Available status and `returned_at`.
7. Open a request as a third user and confirm HTTP 404. In F12 → Network, inspect responses before acceptance, while accepted, and after return/decline/cancel: only an accepted request includes the other person’s phone, and no response includes email.
8. Confirm notifications are created for each request transition, the bell shows unread counts, opening it marks all read, and it refreshes every 30 seconds. Check the Requests navigation badge for owner pending requests.
9. Set an accepted request’s `to_date` to yesterday in the database and refresh Requests; confirm the API returns `isOverdue: true` and the card shows “Overdue”.

The profile floor is stored as an integer: `0` means Basement and `1` through `5` mean Floor 1 through Floor 5. Room values are stored uppercase and must match `^[A-Z][0-9]{1,3}$`. Phase 4 adds no environment variables; the existing `.env.example` remains current.
