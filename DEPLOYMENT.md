# Deploying LendLoop

LendLoop needs a public HTTPS frontend, an API, and PostgreSQL. Google sign-in also needs production OAuth URLs. Test the full flow on staging before inviting real members.

## ☁️ Free cloud path

Free-tier offerings and limits change. Check each provider’s current plan before relying on it for an always-available community.

### 1. Create PostgreSQL

Create a PostgreSQL database at Neon or Supabase and keep its connection string private. Use the provider’s pooled URL only if it supports Prisma’s migration and runtime needs; otherwise use its direct connection URL for migrations and configure pooling separately.

### 2. Deploy the API

Create a Node service on Render or Railway, using the repository root so npm workspaces are available.

- Build command: `npm install && npm run db:generate -w @lendloop/api && npm run build -w @lendloop/api`
- Start command: `npm run start -w @lendloop/api`
- Release / pre-deploy command: `npm run db:deploy -w @lendloop/api`

Set these API variables in the provider dashboard:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Production PostgreSQL connection URL |
| `PORT` | Use the port supplied by the host, if required |
| `WEB_ORIGIN` | Exact deployed frontend origin, e.g. `https://lendloop.example.com` |
| `API_ORIGIN` | Exact public API origin, e.g. `https://api.example.com` |
| `API_PUBLIC_URL` | Same public API origin |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth web client secret |
| `JWT_SECRET` | Unique, random secret of at least 32 characters |
| `UPLOAD_DIR` | Persistent disk mount path if using host disk, e.g. `/var/data/uploads` |

Timeout and rate-limit variables are optional; review their defaults and tune them for your deployment. Keep credentials in the provider’s secret settings, never in source control or frontend variables.

### 3. Deploy the web app

Create a Vercel project rooted at `apps/web`. Vercel should build the web workspace using its package script (`npm run build` in that directory). Set `VITE_API_URL` to the API origin, for example `https://api.example.com`. If you add a same-site `/api` proxy, configure the app and API origins consistently with that proxy.

### 4. Configure Google OAuth

In Google Cloud Console, set the consent screen audience to **External** and publish the app by changing its publishing status to **In production** before opening sign-in to general Google accounts. Complete any Google verification that applies to your scopes or app. In the OAuth Web client, add:

- Authorized JavaScript origin: `https://lendloop.example.com`
- Authorized redirect URI: `https://api.example.com/api/auth/google/callback`

The callback must match `API_ORIGIN` plus `/api/auth/google/callback` exactly. Keep your production client secret in the API environment only.

### 5. Check database, CORS, and cookies

Run the release command and verify `https://api.example.com/api/health` reports both the API and database as healthy. CORS must list the exact web origin in `WEB_ORIGIN`, and must allow credentials; do not use `*` with credentialed requests.

The API sets its session cookie `HttpOnly`, `Secure` in production, and `SameSite=Lax`. `SameSite=Lax` works when frontend and API are same-site subdomains such as `lendloop.example.com` and `api.example.com`, or when `/api` is proxied through the frontend site. If they are on different registrable domains, a cross-site cookie may require `SameSite=None; Secure`; current code does not set `SameSite=None`, so deploy on the same site or use a same-site proxy. Verify sign-in and API requests in the target browsers before launch.

> **Photo storage warning:** Free web-service filesystems are often ephemeral and can be wiped on deploy, restart, or instance replacement. Photos uploaded to a local `UPLOAD_DIR` can disappear. Attach a persistent disk and mount it at `UPLOAD_DIR`, use a managed object-storage service with an appropriate integration, or rely on LendLoop’s automatic item icons and leave photos optional. Back up the photo storage separately from PostgreSQL.

## 🖥️ Always-on PC or VPS

1. Install a supported Node.js release (20+) and PostgreSQL. Create a dedicated production database and database role with only the permissions the app needs.
2. Deploy a reviewed copy of the repository, run `npm install`, then `npm run db:generate` and `npm run db:deploy` from the project root.
3. Create `apps/api/.env` with the production values listed above. Set `NODE_ENV=production`, exact HTTPS `WEB_ORIGIN`, `API_ORIGIN`, `API_PUBLIC_URL`, Google credentials, `DATABASE_URL`, and a strong `JWT_SECRET`.
4. Put `UPLOAD_DIR` on persistent storage with ownership and permissions limited to the service account. Keep it outside temporary/container directories.
5. Build the API and web app, then run the API under a process manager such as PM2. Configure restart-on-failure, startup on reboot, log rotation, and health monitoring. Serve the web build from a static host or a separately managed web server.
6. Use a Cloudflare Tunnel or similar HTTPS tunnel for a home/office machine, or use a reverse proxy with TLS on a VPS. Map stable HTTPS hostnames to the web and API services and set Google’s OAuth origins and callback to those exact addresses.
7. Apply firewall rules, restrict database access to the API host, patch the OS and dependencies, and verify backups and restore before inviting users.

## 🗄️ Back up and restore

Back up both PostgreSQL and the entire upload directory. Database rows refer to photo files by path; restoring just one side can leave missing photos or orphan files. Store backups off the machine and protect them as private data.

Create a database backup:

```sh
pg_dump --format=custom --file=lendloop-YYYYMMDD.dump "$DATABASE_URL"
```

Back up photos by copying or archiving the configured `UPLOAD_DIR` (default: `apps/api/uploads`). Example on Linux/macOS:

```sh
tar -czf lendloop-uploads-YYYYMMDD.tar.gz -C /path/to/persistent-storage uploads
```

Restore to a newly created empty database and the matching upload directory:

```sh
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" lendloop-YYYYMMDD.dump
tar -xzf lendloop-uploads-YYYYMMDD.tar.gz -C /path/to/persistent-storage
```

Use PowerShell’s `Copy-Item -Recurse` or an archive tool to copy the uploads directory on Windows. Test restores periodically in a separate database and directory. Do not restore over production without a reviewed maintenance plan.

## ✅ Pre-launch checklist

- [ ] Production OAuth consent screen is **In production**, and the exact HTTPS callback is registered.
- [ ] `NODE_ENV=production`; secrets are strong and stored outside Git.
- [ ] `WEB_ORIGIN`, `API_ORIGIN`, `API_PUBLIC_URL`, and `VITE_API_URL` use the intended HTTPS domains.
- [ ] Sign-in works in supported browsers; the session cookie is `HttpOnly`, `Secure`, and sent on API requests.
- [ ] Database migrations have been applied with `npm run db:deploy` and `/api/health` is healthy.
- [ ] Photo storage persists across deploys, or members understand photos are optional and automatic icons are used.
- [ ] Backups are automated, stored off-host, and a restore has been tested.
- [ ] Community creation/joining, member administration, listing, borrowing, returning, wanted posts, reporting, blocking, and account logout have been exercised on staging.
- [ ] Error logs, uptime checks, disk usage, and database capacity are monitored.

## 🔐 Security checklist

- [ ] Use HTTPS everywhere and a unique `JWT_SECRET` with at least 32 characters.
- [ ] Keep Google client secrets and database credentials out of frontend builds and source control.
- [ ] Restrict CORS to the exact trusted frontend origin(s); keep credentialed requests enabled only where needed.
- [ ] Limit database network access and use a least-privilege database role.
- [ ] Keep dependencies, OS packages, Node.js, PostgreSQL, and the process manager updated.
- [ ] Review rate limits, abuse reports, block handling, and admin membership before opening invites broadly.
- [ ] Protect backups and uploaded photos with private access controls and retention rules.
- [ ] Have an incident contact and a way to revoke OAuth secrets and rotate the session secret.
