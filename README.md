# Dental Clinic

Management system for a dental clinic: patients, appointments across multiple chairs,
clinical notes, treatment plans and payments.

> **Status:** in development. Only the monorepo skeleton exists so far.

## Tech stack

| Layer   | Tools                                   |
| ------- | --------------------------------------- |
| Client  | React 19, Vite, TypeScript              |
| Server  | Express, Prisma, PostgreSQL _(planned)_ |
| Shared  | Zod schemas used by client and server   |
| Tooling | npm workspaces, ESLint                  |

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

### Setup

Install the dependencies for every workspace from the repository root:

```bash
npm install
```

Start the client:

```bash
npm run dev
```

The client runs on http://localhost:5173.

## Scripts

| Command           | Description              |
| ----------------- | ------------------------ |
| `npm run dev`     | Start the client         |
| `npm run build`   | Build the client         |
| `npm run preview` | Preview the client build |
| `npm run lint`    | Lint every workspace     |
| `npm test`        | Run the test suites      |
