# LendLoop

## 🏡 Borrow a little. Share a lot.

LendLoop helps people in apartments, hostels, offices, and colleges share useful things with their neighbours.

![Home screen screenshot placeholder](docs/images/home-placeholder.png)

## ✨ What you can do

- Join a community with an invite code. Community creation is supported by the API, but the current web setup screen does not expose the creation wizard yet.
- List useful items with automatic category icons and optional photos.
- Search and filter by category and your community’s location labels.
- Request to borrow an item; its owner can accept, decline, and mark it returned.
- Ask for something on the Wanted board and respond when you can help.
- Rate completed exchanges and build a trust score.
- Receive in-app notifications, report a user or item, and block a member.
- The API includes report and block endpoints; matching controls are not currently exposed in the web screens.
- Install the site as a PWA. Push notifications are not currently included.

## 🧰 Built with

React, Vite, Tailwind CSS, React Router, TanStack Query, Node.js, Express, PostgreSQL, Prisma, and Google OAuth 2.0.

## 🚀 Run locally

### Requirements

- Node.js 20 or newer and npm
- PostgreSQL 14 or newer
- A Google OAuth 2.0 web client

### Windows (PowerShell)

1. Create a PostgreSQL database named `lendloop` (for example, with pgAdmin or `createdb lendloop`).
2. From the project root, copy `.env.example` to `apps/api/.env`. Fill in the database URL, Google client ID and secret, a random `JWT_SECRET` of at least 32 characters, and `WEB_ORIGIN`.
3. Run the one-time setup, then start the app:

   ```powershell
   npm run setup
   npm run dev
   ```

### macOS / Linux

1. Create a PostgreSQL database named `lendloop` (for example, `createdb lendloop`).
2. Copy `.env.example` to `apps/api/.env`, then fill in the database URL, Google client ID and secret, a random `JWT_SECRET` of at least 32 characters, and `WEB_ORIGIN`.
3. Run the same commands from the project root:

   ```sh
   npm run setup
   npm run dev
   ```

Open [http://localhost:5173](http://localhost:5173). The web app uses port **5173** and the API uses port **4000**. The API health check is [http://localhost:4000/api/health](http://localhost:4000/api/health). Configure Google OAuth as below before signing in.

### Google OAuth setup

1. In Google Cloud Console, create a project and configure the OAuth consent screen for an **External** audience. Add your Google account as a test user while the app is in testing.
2. Create an OAuth client with type **Web application**.
3. Add `http://localhost:5173` under **Authorized JavaScript origins**.
4. Add this exact **Authorized redirect URI**: `http://localhost:4000/api/auth/google/callback`.
5. Put the client ID and secret in `apps/api/.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Do not put the secret in a `VITE_` variable.

Google’s [web server OAuth guide](https://developers.google.com/identity/protocols/oauth2/web-server) describes client setup and redirect URIs. Google audience and publishing settings determine who can use a deployed OAuth app.

## ⚙️ Environment variables

Copy the root `.env.example` to `apps/api/.env`. Variables marked **Yes** must be supplied. Defaults are shown where the API supplies one.

| Variable | Required? | Purpose / default |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection URL, e.g. `postgresql://postgres:password@localhost:5432/lendloop?schema=public` |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth web client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth web client secret |
| `JWT_SECRET` | Yes | Session signing secret; at least 32 characters |
| `PORT` | No | API port; `4000` |
| `NODE_ENV` | No | `development` by default; use `production` when deployed |
| `WEB_ORIGIN` | No | Comma-separated allowed web origins; local default includes ports 5173 on localhost and 127.0.0.1 |
| `API_ORIGIN` | No | API origin used for OAuth callback; `http://localhost:4000` |
| `API_PUBLIC_URL` | No | Public API origin used in image URLs; `http://localhost:4000` |
| `UPLOAD_DIR` | No | Local photo storage directory; `./uploads` relative to the API process |
| `API_REQUEST_TIMEOUT_MS` | No | Request timeout; `15000` |
| `API_HEALTH_TIMEOUT_MS` | No | Database health check timeout; `2500` |
| `DATABASE_STARTUP_TIMEOUT_MS` | No | Database connection timeout at startup; `10000` |
| `LOG_LEVEL` | No | Pino log level; defaults to `debug` in development and `info` in production |
| `DEMO_MODE` | Internal | Set to `true` only by `npm run dev:demo`; rejected in production or unless the active database ends in `_demo`. |
| `DEMO_SOURCE_DATABASE_URL` | Internal | Source database URL used by demo mode to confirm its target is separate. |
| `WANTED_CREATE_LIMIT_PER_HOUR` | No | Wanted posts allowed per hour; development default `1000`, production default `10` |
| `WANTED_MAX_OPEN_POSTS` | No | Open wanted posts per member; development default `1000`, production default `5` |
| `COMMUNITY_CREATE_LIMIT_PER_HOUR` | No | Communities created per hour; development default `1000`, production default `3` |
| `COMMUNITY_MAX_ADMIN_COMMUNITIES` | No | Communities administered; development default `1000`, production default `3` |
| `COMMUNITY_JOIN_LIMIT_PER_15_MINUTES` | No | Join attempts; development default `1000`, production default `5` |
| `ITEM_CREATE_LIMIT_PER_HOUR` | No | Items created per hour; development default `1000`, production default `20` |
| `REQUEST_CREATE_LIMIT_PER_HOUR` | No | Borrow requests created per hour; development default `1000`, production default `10` |
| `FEEDBACK_LIMIT_PER_HOUR` | No | Feedback notes per hour; development default `1000`, production default `3` |
| `REPORT_LIMIT_PER_HOUR` | No | Reports per hour; development default `1000`, production default `5` |
| `VITE_API_URL` | No | Web app API origin; set in `apps/web/.env` if the API is not at `http://localhost:4000` |
| `DEMO_DATABASE_URL` | No | Optional demo database URL override. If omitted, the seed derives `lendloop_demo` from `DATABASE_URL` while preserving the connection credentials and query parameters. The name must end in `_demo` and differ from the source database. |
| `SMOKE_DATABASE_URL` | For smoke test | Dedicated PostgreSQL URL whose database name ends in `_test` |
| `DEMO_MODE` | Internal | Set to `true` only by `npm run dev:demo`; enables local demo login endpoints and is rejected in production or against a non-`_demo` database. |
| `DEMO_SOURCE_DATABASE_URL` | Internal | Source database URL used by demo mode to recheck that its target database is different. |
| `VITE_DEMO_MODE` | Internal | Set only by `npm run dev:demo` to show the demo-account picker in development. |

Demo and smoke commands are guarded so they never write to the ordinary `DATABASE_URL` database. The demo seed derives a separate `_demo` database automatically; the smoke test requires `SMOKE_DATABASE_URL` ending in `_test`.

The API's versioned routes are available under `/api/v1`; `/api` remains a backward-compatible alias. In development, `/api/docs` serves the OpenAPI document. `/api/health` is a liveness check and `/api/ready` checks PostgreSQL availability.

## 🧯 Troubleshooting

### A port is already in use

Close the old dev servers, or find and stop only processes listening on ports 4000 and 5173. In PowerShell, this command deduplicates process IDs before stopping them:

```powershell
$ports = 4000, 5173
$listenerIds = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in $ports } | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($listenerId in $listenerIds) { Stop-Process -Id $listenerId -Force -ErrorAction SilentlyContinue }
```

### The web app opened on the wrong port / CORS error

Use `http://localhost:5173`. Vite uses strict port behavior and will stop with an error if that port is busy. Run `npm run kill-ports` to stop processes listening on ports 4000, 5173, and 5174, then start the app again.

### “Failed to fetch”

Check that PostgreSQL is running and the API started successfully. Open `http://localhost:4000/api/health`; if it does not answer, start the API with `npm run dev:api` and fix the database or startup error it prints.

### Prisma asks for a new migration name

Stop before accepting the prompt. Check `apps/api/prisma/schema.prisma` against `apps/api/prisma/migrations`. Review `git status` and recent migration changes; do not create a migration just to silence an unexplained schema mismatch. For a production database, use `npm run db:deploy`, not `npm run db:migrate`.

### `prisma generate` fails with Windows `EPERM` renaming `query_engine-windows.dll.node`

Another Node process or Prisma Studio may be holding Prisma’s engine file. Stop `npm run dev` and Prisma Studio, then run `npm run db:generate` again.

### Google says `redirect_uri_mismatch`

The redirect URI must exactly equal the API callback URI configured in Google Cloud Console. Locally it is `http://localhost:4000/api/auth/google/callback`. Check `API_ORIGIN`, including protocol, host, port, and path, and save the same URI in the OAuth client.

## 🗂️ Project structure

```text
apps/
  api/       Express API, Prisma schema/migrations, seeds
  web/       React/Vite PWA
README.md
DEPLOYMENT.md
```

## 🧪 Handy commands

| Command | What it does |
| --- | --- |
| `npm run setup` | Install dependencies, generate Prisma Client, and apply committed migrations; requires `apps/api/.env` and the normal `lendloop` database to exist |
| `npm run dev` | Check PostgreSQL from `apps/api/.env`, then start the API and web app together; ignores test/demo database overrides |
| `npm run kill-ports` | Stop processes listening on ports 4000, 5173, and 5174 (Windows) |
| `npm run dev:web` | Start only the Vite web app |
| `npm run dev:api` | Start only the API |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Apply a development migration and compatibility seed |
| `npm run db:migrate:deploy` | Apply committed migrations non-interactively |
| `npm run db:deploy` | Apply committed migrations for deployment |
| `npm run db:seed` | Add the starter community seed |
| `npm run db:seed:demo` | Create/prepare the isolated `_demo` database, apply migrations, and add sample data |
| `npm run db:seed:demo -- --reset` | Wipe and recreate only the validated `_demo` database, then reseed it |
| `npm run dev:demo` | Start web and API on ports 5173/4000 against the demo database only |
| `npm run test:smoke` | Run API smoke checks against a dedicated `_test` database |
| `npm run build -w @lendloop/api` | Build the API |
| `npm run build -w @lendloop/web` | Type-check and build the web app |

## 🧪 Demo data and smoke test

The demo command uses `DATABASE_URL` only to copy its server/user/password/query settings and to confirm the target database is different. It creates and migrates `lendloop_demo`, never the source database. If your database user cannot create databases, create `lendloop_demo` yourself or set `DEMO_DATABASE_URL` to a pre-created database ending in `_demo`. The smoke test separately requires a database named with the `_test` suffix.

PowerShell:

```powershell
npm run db:seed:demo
$env:DEMO_DATABASE_URL = 'postgresql://postgres:password@localhost:5432/lendloop_demo?schema=public'
npm run db:seed:demo -- --reset
npm run dev:demo
$env:SMOKE_DATABASE_URL = 'postgresql://postgres:password@localhost:5432/lendloop_test?schema=public'
npm run test:smoke
```

macOS/Linux:

```sh
npm run db:seed:demo
DEMO_DATABASE_URL='postgresql://postgres:password@localhost:5432/lendloop_demo?schema=public' npm run db:seed:demo -- --reset
npm run dev:demo
SMOKE_DATABASE_URL='postgresql://postgres:password@localhost:5432/lendloop_test?schema=public' npm run test:smoke
```

The seed refuses production, a target name without `_demo`, or a target whose name matches `DATABASE_URL`. It creates the database if needed, applies all migrations, and upserts three communities, nine `.test` identities, nine items, two borrow requests, and two wanted posts. A reset drops only the validated demo database. Its output lists community names, invite codes, fake demo emails, and the sign-in steps. Run `npm run dev:demo`; the login page shows a “Sign in as a demo user” picker only in this mode. This route is disabled in production and when the demo flag is off. Office Desk is optional for demo members.

Verification output in this workspace (the seed could not proceed because PostgreSQL was stopped):

```text
Demo target database: lendloop_demo (source database: lendloop)
Could not prepare demo database "lendloop_demo" ... Can't reach database server at `localhost:5432`
```

`npm run dev:demo` printed `DEMO DATABASE: not real data` and Vite became ready on port 5173. The API printed its database-unavailable startup message, so community data could not be served during this run.

The smoke test deploys migrations to `_test`, exercises the HTTP API, and removes only the records it created. It refuses any other database name and does not use your normal `.env` database. In this environment the real run reported that PostgreSQL at `localhost:5432` was unreachable; see the final Stage 5 check report before treating these commands as verified.

## 💡 Future ideas

- Public community discovery
- In-app chat
- Push notifications

These are ideas only; they are not current features.

## 🖼️ Screenshots

Add real screenshots here when available. No screenshots are included yet.
