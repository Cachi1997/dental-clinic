# Dental Clinic

Management system for a dental clinic: patients, appointments across multiple chairs,
clinical notes, treatment plans and payments.

> **Status:** in development. Only the monorepo skeleton and the database setup exist so far.

## Tech stack

| Layer    | Tools                                 |
| -------- | ------------------------------------- |
| Client   | React 19, Vite, TypeScript            |
| Server   | Express, Prisma _(planned)_           |
| Database | PostgreSQL 18                         |
| Shared   | Zod schemas used by client and server |
| Tooling  | npm workspaces, ESLint, Prettier      |

## Project structure

```
├── client/   React app (Vite)
├── server/   API (not implemented yet)
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

4. Start the client:

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
