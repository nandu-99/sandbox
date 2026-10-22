# Team Quick Start

This guide helps a new team member run and understand the project quickly.

## What the project does

The Developer Sandbox Bootstrapper:

1. Collects a project template, repository, permission, and seed-data profile.
2. Creates a safe sandbox setup plan.
3. Uses Gemini to order the allowed steps and explain the recommendation.
4. Requires a human to approve the plan.
5. Creates or reuses a simulated sandbox.
6. Runs a mock smoke login.
7. Generates a secret-free setup manifest.

This project uses a simulated sandbox. It does not create real cloud resources.

## Main technologies

- Next.js frontend
- Express backend
- SQLite and Drizzle ORM
- Gemini API
- TypeScript and Zod

## Setup

Run all commands from the project root.

### 1. Install dependencies

```bash
npm install
npm --prefix server install
```

### 2. Create environment files

```bash
cp .env.example .env.local
cp server/.env.example server/.env
```

Frontend configuration in `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Backend configuration in `server/.env`:

```env
PORT=4000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=file:./data/bootstrapper.db
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
```

Add a valid `GEMINI_API_KEY` to demonstrate live AI planning. If the key is empty, the application uses a safe deterministic fallback.

Never commit API keys or environment files.

### 3. Prepare the database

```bash
npm --prefix server run db:migrate
```

### 4. Start the backend

Open one terminal in the project root:

```bash
npm run dev:api
```

The API runs at `http://localhost:4000`.

### 5. Start the frontend

Open another terminal in the project root:

```bash
npm run dev
```

Open `http://localhost:3000`.

## How AI and approval work

- The policy engine enforces production blocking, least privilege, and duplicate prevention.
- Gemini orders the allowed steps and generates reasoning and reviewer checks.
- Express validates Gemini's output.
- A human team lead approves or rejects the exact plan.
- The executor runs only after approval.

Gemini cannot approve or execute the setup.

## Complete demo flow

1. Open **New request**.
2. Keep **Sandbox** as the target.
3. Keep **Administrator** as the requested permission.
4. Create the request.
5. Open **Agent plan** and review the AI recommendation.
6. Confirm the assigned permission was reduced to **Developer**.
7. Open **Human decision** and approve the plan.
8. Open **Sandbox setup** and execute the approved plan.
9. Open **Smoke login** and run verification.
10. Open **Setup manifest** and generate the final report.

The guided workspace unlocks one stage at a time.

## Official test cases

Open `/test-cases` and select **Run all official tests**.

- TC1: Sandbox created and smoke login passes
- TC2: Production setup is stopped
- TC3: Existing sandbox is reused
- TC4: Manifest contains no secrets

## Validate your changes

```bash
npm run lint
npm run typecheck
npm run typecheck:api
npm run build
npm run build:api
```

## Common problems

### API unavailable

Make sure the backend is running:

```bash
npm run dev:api
```

### Gemini fallback is displayed

Add a valid key to `server/.env`, restart the backend, and create a new request.

### `server/server/package.json` error

Run commands from the project root. If you are already inside `server`, use `npm run db:migrate` without `--prefix server`.

## More information

- `MANUAL_TESTING_GUIDE.md`: detailed manual testing
- `developer-sandbox-bootstrapper.md`: full project explanation
