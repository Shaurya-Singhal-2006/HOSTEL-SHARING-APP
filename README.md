# LendLoop

Hostel item sharing for one campus community. This npm-workspaces monorepo contains a React/Vite frontend and an Express/Prisma API.

## Stack

- Frontend: React, Vite, Tailwind CSS, React Router, TanStack Query, Framer Motion
- API: Node.js, Express, Zod
- Database: PostgreSQL with Prisma
- Sign-in: Google OAuth 2.0, JWT in an HTTP-only cookie

## Local setup

Requirements: Node.js 20+ and PostgreSQL 14+.

1. If `apps/api/.env` does not already exist, copy the root `.env.example` there. If it already exists, keep its database settings and add the variables listed below. Set Google OAuth credentials, an invite code, and a random `JWT_SECRET` of at least 32 characters.
2. Copy `apps/web/.env.example` to `apps/web/.env` if the API is not at `http://localhost:4000`.
3. Install dependencies from the repository root:

   ```sh
   npm install
   ```

4. Apply the database migrations and seed the single hostel community:

   ```sh
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. Start the frontend and API:

   ```sh
   npm run dev
   ```

6. Open <http://localhost:5173/login>. The UI component specimen remains at <http://localhost:5173/design>. The API health endpoint is <http://localhost:4000/api/health>.

The seed creates only **LendLoop Hostel**. It does not create student accounts or sample loan history. Google sign-in accepts any verified Google account; the invite code controls access to this hostel.

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
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth web client secret |
| `HOSTEL_INVITE_CODE` | Private code required to join the seeded hostel |
| `JWT_SECRET` | Random signing secret, minimum 32 characters |
| `NODE_ENV` | Set to `production` to enable secure cookies |

`apps/web/.env` may set `VITE_API_URL`; it defaults to `http://localhost:4000`.

## Phase 2 manual test checklist

1. **Login:** open `/login`, choose a Google account, and verify the browser returns to LendLoop. A new account should land on `/join`; no college-domain restriction is applied.
2. **Wrong invite:** submit an incorrect code. Confirm the page shows a clear error and does not advance.
3. **Rate limit:** submit five incorrect codes, then submit another. Confirm the API responds with HTTP 429 and the page explains the 15-minute wait. Restart the API to clear the in-memory counter before continuing. The limiter is per process; use a shared store if running multiple API instances.
4. **Join and onboarding:** submit the configured `HOSTEL_INVITE_CODE`; confirm block, floor, and room are required, the Google name is prefilled, and phone can be left blank.
5. **Protected redirects:** in a private/incognito window, open `/profile` and confirm redirect to `/login`. After sign-in but before joining, confirm `/profile` redirects to `/join`. After joining with an incomplete profile, confirm it redirects to `/onboarding`.
6. **Profile edit:** save a different name, block, floor, room, and optional phone. Refresh and verify the changes persist. `GET /api/me` returns profile data only to the signed-in account; it returns HTTP 401 without the session cookie.
7. **Logout:** sign out, confirm return to `/login`, and verify opening `/profile` again redirects to sign-in.

## Deployment outline

- Deploy `apps/web` as a Vercel project rooted at `apps/web`; set `VITE_API_URL` to the API origin unless `/api` is proxied through the same site.
- Deploy `apps/api` as a Render Node service rooted at the repository root. Build with `npm install && npm run db:generate -w @lendloop/api && npm run build -w @lendloop/api`; start with `npm run start -w @lendloop/api`.
- Set the API environment variables in Render. Use a release command `npm run db:deploy -w @lendloop/api` before serving traffic.
- Configure production JavaScript origin and OAuth callback URI in Google Cloud Console. Both must use the deployed HTTPS domains.

Authentication, hostel joining, and profile setup are Phase 2. Item listings and borrowing workflows remain for Phase 3.
