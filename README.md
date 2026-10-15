# Dental Clinic

[![CI](https://github.com/Cachi1997/dental-clinic/actions/workflows/ci.yml/badge.svg)](https://github.com/Cachi1997/dental-clinic/actions/workflows/ci.yml)

Management system for a dental clinic: patients, appointments across multiple chairs,
clinical notes, treatment plans and payments.

> **Status:** in development. The API manages insurers and patients; the client is not
> implemented yet.

## Tech stack

| Layer    | Tools                                                               |
| -------- | ------------------------------------------------------------------- |
| Client   | React 19, Vite, TypeScript                                          |
| Server   | Express 5, Prisma 7                                                 |
| Database | PostgreSQL 18                                                       |
| Shared   | Zod schemas used by client and server                               |
| Tooling  | npm workspaces, ESLint, Prettier, Vitest, Supertest, GitHub Actions |

## Project structure

```
├── client/   React app (Vite)
├── server/   Express API + Prisma
└── shared/   Zod schemas and the types derived from them
```

## Getting started

### Prerequisites

- Node.js 22
- npm 11
- PostgreSQL 18, running locally on port 5432. The standard installers include the
  `btree_gist` extension, which the database schema requires.

### Setup

1. Install the dependencies for every workspace from the repository root:

   ```bash
   npm install
   ```

2. Create the database user and the database. Connect as the `postgres` superuser
   (with `psql -U postgres` or pgAdmin) and run:

   ```sql
   CREATE ROLE dental_clinic WITH LOGIN PASSWORD 'change-me' CREATEDB;
   CREATE DATABASE dental_clinic_db OWNER dental_clinic;
   ```

   `CREATEDB` is required: `prisma migrate dev` creates a temporary shadow database to
   check the migrations.

3. Create the server environment file from the example and set the password you chose
   in the previous step:

   ```bash
   cp server/.env.example server/.env
   ```

4. Apply the database migrations and generate the Prisma client:

   ```bash
   npm run db:migrate --workspace server
   npm run db:generate --workspace server
   ```

   Run `db:generate` again every time the Prisma schema changes.

5. Start the client:

   ```bash
   npm run dev
   ```

   The client runs on http://localhost:5173.

## Scripts

| Command                | Description                             |
| ---------------------- | --------------------------------------- |
| `npm run dev`          | Start the client                        |
| `npm run build`        | Build the client                        |
| `npm run preview`      | Preview the client build                |
| `npm run lint`         | Lint every workspace                    |
| `npm run format`       | Format every file with Prettier         |
| `npm run format:check` | Check formatting without changing files |
| `npm test`             | Run the test suites                     |

Database scripts live in the `server` workspace:

| Command                                      | Description                               |
| -------------------------------------------- | ----------------------------------------- |
| `npm run db:migrate --workspace server`      | Apply pending database migrations         |
| `npm run db:generate --workspace server`     | Generate the Prisma client                |
| `npm run db:studio --workspace server`       | Open Prisma Studio                        |
| `npm run db:migrate:test --workspace server` | Apply the migrations to the test database |

## Testing

The server tests call the real API against a separate PostgreSQL database, so your
development data is never touched.

1. Create the test database. Connect as the `postgres` superuser and run:

   ```sql
   CREATE DATABASE dental_clinic_test OWNER dental_clinic;
   ```

2. Create `server/.env.test` with a `DATABASE_URL` that points to `dental_clinic_test`:

   ```
   DATABASE_URL="postgresql://dental_clinic:change-me@localhost:5432/dental_clinic_test?schema=public"
   ```

   The database name **must end in `_test`**. Every test empties the database before it
   runs, so the test setup refuses to start against any other database.

3. Apply the migrations to the test database:

   ```bash
   npm run db:migrate:test --workspace server
   ```

4. Run the tests from the repository root:

   ```bash
   npm test
   ```

## Continuous integration

GitHub Actions runs on every push: formatting check, lint, typecheck of every
workspace, client build and the test suite against a PostgreSQL 18 service
container. See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
