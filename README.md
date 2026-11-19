# LendLoop

Hostel item sharing for one campus community. This repository is an npm-workspaces monorepo with a React/Vite frontend and Express/Prisma API.

## Phase 1 foundation

- `apps/web`: React, Vite, Tailwind CSS, React Router, TanStack Query, Framer Motion, and the `/design` component preview.
- `apps/api`: Express app foundation and PostgreSQL schema managed by Prisma.
- `apps/api/prisma/migrations`: initial PostgreSQL migration, including checks, search indexes, and accepted-loan overlap protection.

## Requirements

- Node.js 20+
- PostgreSQL 14+

## Local setup

1. Copy `.env.example` to `apps/api/.env` and set `DATABASE_URL` to a PostgreSQL database you can use.
2. Install dependencies from the repository root:

   ```sh
   npm install
   ```

3. Create the database schema and seed the initial hostel community:

   ```sh
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

4. Start the frontend and API:

   ```sh
   npm run dev
   ```

5. Open <http://localhost:5173/design> to inspect the UI primitives. The API health endpoint is <http://localhost:4000/api/health>.

The initial seed creates one community named **LendLoop Hostel**. It does not create fake student accounts or loan history.

## Environment variables

`apps/api/.env` reads `DATABASE_URL`, `PORT`, `WEB_ORIGIN`, and `JWT_SECRET`. `apps/web/.env` may set `VITE_API_URL` (defaults to `http://localhost:4000`). Keep real secrets out of source control.

## Deployment outline

- Deploy `apps/web` as a Vercel project with the root directory `apps/web`; set `VITE_API_URL` to the deployed API origin.
- Deploy `apps/api` as a Render Node service with the root directory at the repository root and build command `npm install && npm run db:generate -w @lendloop/api`; start command `npm run start -w @lendloop/api`.
- Set `DATABASE_URL`, `WEB_ORIGIN`, and `JWT_SECRET` in the API environment. Run `npm run db:migrate -w @lendloop/api` as a release/pre-deploy command before serving traffic.

Authentication, product routes, uploads, and PWA support are intentionally left for the later phases in the supplied build plan.
