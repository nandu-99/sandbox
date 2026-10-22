# Developer Sandbox Bootstrapper

Foundation for an approval-controlled developer sandbox demo with independently deployable frontend and backend applications.

## Included

- Next.js 16 frontend with TypeScript and Tailwind CSS
- Express 5 API with TypeScript and CORS configuration
- Responsive application shell and three initial routes
- SQLite and Drizzle ORM owned by the Express API
- Zod API validation schemas
- Server-only Gemini configuration
- API health endpoint at `GET /api/health`
- Read-only mock repository and sandbox dashboard endpoints
- Traceable source IDs, URLs, and retrieval timestamps on every demo record
- Request form loading, error, empty, and evidence states
- Validated setup-request submission and SQLite persistence
- Deterministic production blocking with auditable aborted records
- Versioned setup plans with create/reuse and least-privilege decisions
- Optional Gemini explanations that cannot modify policy decisions
- Human approval and rejection with exact plan-version locking
- Server-side execution guard for unapproved or changed plans
- Simulated sandbox create/reuse and synthetic seed execution
- Idempotency keys that prevent duplicate sandbox and seed actions
- Independent mock smoke-login verification with intended and observed values
- Persisted pending, passed, and failed verification states
- Secret-scanned setup manifest with JSON view and download
- Stored TC1–TC4 runner with expected, actual, and evidence records
- Light and dark color tokens based on system preference

## Local setup

1. Install frontend dependencies with `npm install`.
2. Install backend dependencies with `npm --prefix server install`.
3. Copy `.env.example` to `.env.local`.
4. Copy `server/.env.example` to `server/.env`.
5. Start the frontend with `npm run dev`.
6. In a second terminal, start the API with `npm run dev:api`.

The frontend runs at `http://localhost:3000`. The API runs at `http://localhost:4000`.

## Deployment

- Deploy the Next.js frontend to Vercel.
- Deploy `server/` as a Node web service on Render.
- Set `NEXT_PUBLIC_API_URL` on Vercel to the Render service URL.
- Set `FRONTEND_URL` on Render to the Vercel frontend URL.
- Keep `GEMINI_API_KEY` only in the Render environment.

## Demo source endpoints

- `GET /api/templates`
- `GET /api/repositories`
- `GET /api/repositories/:repositoryId`
- `GET /api/sandboxes`
- `GET /api/sandboxes/by-repository/:repositoryId`
- `GET /api/seed-profiles`
- `POST /api/requests`
- `GET /api/requests/:requestId`
- `POST /api/requests/:requestId/approval`
- `POST /api/requests/:requestId/execute`
- `POST /api/requests/:requestId/verify`
- `POST /api/requests/:requestId/manifest`
- `GET /api/requests/:requestId/manifest/download`
- `GET /api/test-cases`
- `POST /api/test-cases/run`

The source records are synthetic and intentionally stored in memory for a predictable hackathon demo. Requests, evidence, plans, approvals, executions, verification observations, manifests, and official test runs are persisted in SQLite. When `GEMINI_API_KEY` is not configured, the planner uses a deterministic fallback explanation. No real credentials, OTP, CAPTCHA, cloud sandbox, or production account is used.
