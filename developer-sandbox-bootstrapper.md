# Developer Sandbox Bootstrapper

## 1. Problem summary

The **Developer Sandbox Bootstrapper** is an AI-assisted setup tool that helps a new developer create a safe, working development environment from a project template.

Instead of giving a developer a long setup document, the system:

1. Collects the project template and requested permissions.
2. Reads information from a demo repository and a sandbox dashboard.
3. Determines the correct setup sequence.
4. Reduces permissions to the minimum required.
5. Shows the proposed changes for human approval.
6. Creates or reuses a sandbox and seeds it with synthetic data.
7. Runs a smoke-login test.
8. Generates a traceable, secret-free setup manifest.

The core workflow is:

```text
Collect -> Investigate -> Decide -> Request approval -> Act -> Verify -> Report
```

The project is not merely a “create sandbox” button. It must demonstrate a controlled agentic workflow with safety, evidence, least privilege, approval, idempotency, verification, and auditability.

## 2. Intended users

The main user is likely a:

- Team lead
- Developer-experience engineer
- Platform administrator
- Engineering manager onboarding a developer

The new developer benefits from the environment, while a team lead or administrator approves the actual setup.

## 3. Recommended user flow

### Step 1: Start a setup request

The user creates a request containing fields such as:

- Developer name or synthetic identifier
- Project template
- Repository
- Target environment
- Requested role or permissions
- Seed-data profile

Every request receives a stable ID, such as `REQ-2026-001`. Required inputs must be validated before the agent runs.

### Step 2: Gather evidence

The agent reads from:

- The demo repository
- The mock sandbox dashboard

It can retrieve the repository identity, existing sandbox status, required services, environment-variable names, setup instructions, available roles, and seed-data requirements.

For every extracted value, the application should retain:

- Source ID or URL
- Retrieval timestamp
- Extracted value
- Evidence snippet or structured response

### Step 3: Generate the setup plan

The agent determines the ordered setup steps, for example:

1. Reuse or create a sandbox repository.
2. Create an isolated sandbox environment.
3. Grant the minimum required role.
4. Configure non-secret environment values.
5. Seed synthetic test data.
6. Run the smoke-login test.
7. Generate the setup manifest.

Each decision should include a reason and the evidence used. If required evidence is unavailable, the decision should be marked `Needs review` or `Uncertain` instead of being guessed.

### Step 4: Apply safety checks

Before proposing an action, the system checks:

- Is the target actually a sandbox?
- Was production selected accidentally?
- Does the sandbox or repository already exist?
- Are the requested permissions excessive?
- Is required evidence missing?
- Could the output expose secrets?

If production is selected, setup must stop.

### Step 5: Request human approval

Before creating or seeding anything, display an approval screen containing:

- Destination sandbox
- Repository to create or reuse
- Resources that will change
- Permissions to grant
- Seed data to insert
- Ordered setup steps
- Evidence and reasons
- Warnings and unresolved items

The user can approve, reject, or return the proposal for correction. The system must store the exact approved version. If the plan changes after approval, it must be approved again.

### Step 6: Execute the approved setup

After approval, the application:

- Creates the sandbox or reuses an existing one
- Configures its resources
- Applies least-privilege access
- Seeds synthetic data

The operation must be idempotent. Retrying the same approved request must not create duplicate repositories, sandboxes, users, or seed records. An idempotency key could be `REQ-2026-001:PLAN-V1`.

### Step 7: Verify the result separately

After setup, run a separate smoke-login check. A safe demo can use mocked authentication; it does not need real OTPs, passwords, or customer accounts.

The verification can check that:

- The sandbox URL responds.
- The mock developer can authenticate.
- The expected landing page is accessible.
- Required test data exists.
- Production resources are inaccessible.

A successful setup action must not automatically imply that verification passed.

### Step 8: Generate the setup manifest

The final result is a **Setup Manifest** that acts as the user-facing report and audit trail.

Example:

```yaml
request_id: REQ-2026-001
template: node-api-starter
target_environment: sandbox
repository:
  action: reused
  id: repo-sandbox-42
permissions:
  role: sandbox-developer
  production_access: false
seed_data:
  profile: ecommerce-demo
  status: completed
approval:
  plan_version: 1
  approved_by: demo-admin
verification:
  smoke_login: passed
unresolved_items: []
```

The manifest must never include passwords, API keys, access tokens, private keys, credential-bearing connection strings, or raw environment files.

## 4. Suggested demo application screens

1. **New Setup Request** — Form for template, repository, target environment, requested permissions, and seed profile.
2. **Agent Investigation** — Repository and sandbox evidence with source IDs and timestamps.
3. **Setup Plan and Approval** — Ordered steps, least-privilege decisions, warnings, and approval controls.
4. **Execution and Verification** — Action progress displayed separately from smoke-test results.
5. **Setup Manifest** — Final report, evidence, unresolved issues, and downloadable JSON or YAML.

Suggested status model:

```text
Draft
  -> Investigating
  -> Needs approval
  -> Approved
  -> Executing
  -> Verifying
  -> Completed / Failed / Aborted
```

## 5. How to demonstrate the project

Use a demo repository and a mock sandbox-management service. The workflow can be shown without a paid cloud provider.

Prepare:

- One demo repository containing template metadata
- A mock sandbox dashboard or API
- A database for requests, evidence, approvals, execution records, and test results
- Synthetic seed data
- A mock login endpoint
- Four preconfigured test scenarios

The judges should be able to see both the user interface and the underlying evidence.

### TC1: Project template

Input:

```text
Template: Standard web application
Environment: Sandbox
Requested permission: Developer
```

Demonstrate investigation, planning, approval, sandbox creation, data seeding, smoke login, and manifest generation.

Expected result: `Completed — sandbox created and smoke login passed`.

### TC2: Production selected by mistake

Input: `Environment: Production`.

The agent must detect the unsafe destination before execution. No approval or execution control should allow the production action to proceed.

Expected result: `Aborted — production environments are outside the permitted workflow`.

### TC3: Sandbox repository already exists

Preload an existing sandbox repository, run the setup, and show that it is found and reused. Running the request again should leave the repository count unchanged.

Expected result: `Completed — existing repository reused; no duplicate created`.

### TC4: Setup report generated

Complete a setup and inspect or download the manifest. Show that sensitive fields are excluded or redacted, evidence is referenced, the actual verification result is present, and the secret scan passes.

Expected result: `Manifest generated — no secrets detected`.

## 6. AI responsibilities versus deterministic rules

The implemented agent uses a hybrid planning model:

- Application policy code converts collected evidence into the safe executable plan.
- Gemini acts as a grounded planning analyst. It explains the sandbox action, least-privilege role, setup order, and risks to the human reviewer.
- If Gemini is unavailable, the same plan remains usable with a clearly labelled deterministic explanation.
- Gemini cannot approve the plan, execute it, or override a policy decision.

Safety-critical behavior should be enforced by normal application code:

- Production target blocking
- Required-field validation
- Approval enforcement
- Duplicate prevention
- Permission ceilings
- Secret redaction
- Idempotency
- Verification pass/fail rules

This gives the project meaningful agentic behavior without allowing the model to bypass safety controls.

## 7. Recommended technology stack

### Simple MVP stack

| Area | Recommended technology | Purpose |
|---|---|---|
| Frontend | Next.js 16 Active LTS with TypeScript | User interface deployed on Vercel |
| Backend | Express 5 with TypeScript | Standalone REST API deployed on Render |
| UI | Tailwind CSS; add shadcn/ui only where useful | Build the form, approval page, status view, and manifest screen |
| Database | SQLite with Drizzle ORM | Store the complete demo locally |
| AI integration | Gemini API | Review the grounded plan and explain its actions, order, permissions, and risks |
| AI alternative | Groq API | Use instead of Gemini if the team prefers it |
| Validation | Zod | Validate form inputs and AI-generated structured data |
| Demo sources | Local JSON fixtures served by Express | Simulate the repository and sandbox dashboards |
| Smoke test | Playwright | Test the sandbox login and expected post-login state |
| Manifest | Plain JSON, with optional YAML output | Produce the final secret-free setup report |
| Testing | Vitest + Playwright | Test policy rules and the four official scenarios |
| Deployment | Vercel frontend + Render API | Deploy both applications independently |

### Final recommended combination

```text
Next.js 16 + TypeScript
Tailwind CSS
Express 5 + TypeScript
SQLite + Drizzle ORM
Gemini API
Zod
Local JSON fixtures / Express REST routes
Playwright
Vitest
Vercel + Render
```

Use **Gemini as the default planning analyst**. The application creates the policy-constrained executable plan, then Gemini explains that plan for the human approver. Application code, not the model, handles approval, production blocking, duplicate prevention, execution, and verification.

If Gemini access is inconvenient, place the model call behind a small `generatePlan()` function and implement it with Groq instead. Use only one provider in the demo.

No background job framework, message queue, additional microservices, real cloud sandbox, live GitHub integration, or full authentication system is required.

### Current implementation status

- **Phase 1 complete:** Next.js frontend foundation, standalone Express API, SQLite/Drizzle schema, and API health check.
- **Phase 2 complete:** Synthetic templates, repositories, sandboxes, and seed profiles are exposed through read-only Express routes. Each record includes a stable source ID, mock URL, and retrieval timestamp. The request form loads these sources and shows loading, error, empty, and evidence states.
- **Phase 3 complete:** Express validates setup submissions with Zod, verifies catalogue references, stores requests and evidence snapshots in SQLite, and assigns stable request IDs. Sandbox requests become `CAPTURED`; production requests become auditable `ABORTED` records and cannot continue.
- **Phase 4 complete:** Deterministic rules choose sandbox creation or reuse, reduce administrator access to developer access, retain evidence and reasons, and return `NEEDS_REVIEW` when evidence is incomplete. Gemini returns structured reasoning, risk checks, and an ordering of the allowed setup steps. Express validates every step and mandatory safety dependency before accepting that order. Invalid or unavailable AI output uses the deterministic safe order.
- **Phase 5 complete:** A reviewer can approve or reject a ready plan. Express validates the decision, rejects stale versions and ineligible requests, and stores the reviewer, timestamp, rejection reason, approved version, and exact approved plan snapshot. The execution guard blocks unapproved requests and any plan changed after approval.
- **Phase 6 complete:** Approved plans can execute against the mock sandbox. The API creates or reuses the planned sandbox, applies the approved role, records synthetic seed counts, stores actual action results, and moves the request to `VERIFYING`. A plan-specific idempotency key makes retries return the original result without duplicating the sandbox or seed action.
- **Phase 7 complete:** Smoke login runs only after execution and records sandbox availability, mock authentication, landing-page access, seed count, and production isolation as intended-versus-observed checks. Passing requests become `COMPLETED`; failures remain visible as `VERIFICATION_FAILED`. Results are idempotent and contain no real credentials.
- **Phase 8 complete:** Completed or failed verification records can produce a traceable Setup Manifest. The server selects safe fields, scans keys and values for credential patterns, stores only manifests with zero findings, and provides a JSON download. The official runner executes and persists TC1–TC4 with their specified inputs, expected results, actual results, status, and evidence.
- **Core implementation complete:** Next work is deployment configuration, optional automated tests, and demo rehearsal.

## 8. Main application components

- **Request form:** template, target environment, requested permission, and seed profile.
- **Express planning API:** reads mock source data, creates a policy-constrained plan, and asks Gemini for grounded reviewer-facing reasoning.
- **Policy functions:** block production, reduce permissions, require approval, and prevent duplicates.
- **Approval and execution page:** runs the mock setup only after approval.
- **Verification:** runs the smoke-login check separately.
- **Result page:** shows evidence, actual result, and the setup manifest.

### Database records

Keep the schema small:

- `setup_requests` — input, evidence JSON, plan, approval, status, and manifest
- `sandboxes` — mock sandbox and repository records
- `executions` — idempotency key and action result
- `test_case_runs`

Every official test run should retain its input, expected result, actual result, evidence, and any explanation of differences.

## 9. Recommended repository structure

```text
developer-sandbox-bootstrapper/
├── app/                    # Next.js frontend pages
├── components/             # Dashboard UI components
├── lib/
│   └── api-client.ts       # Express API client
├── server/
│   ├── src/
│   │   ├── routes/         # Express REST routes
│   │   ├── policies/       # Safety and least-privilege rules
│   │   ├── services/       # Gemini, execution, and manifest logic
│   │   └── db/             # Drizzle schema and SQLite database
│   └── package.json
├── mocks/                  # Mock repo and sandbox fixtures
├── tests/                  # Policy tests and four official scenarios
└── public/
```

## 10. Important implementation principles

- Do not allow the AI model to execute actions directly.
- Require a stored approval for the exact plan version being executed.
- Block production through deterministic policy code.
- Use stable resource IDs and idempotency keys.
- Treat action success and verification success as separate states.
- Preserve failed, pending, and uncertain states in the UI.
- Store evidence and timestamps for every important decision.
- Use only mock or synthetic developer and seed data.
- Never store real credentials in prompts, logs, database records, or manifests.

In one sentence: **this is an auditable, approval-controlled developer onboarding agent that safely creates or reuses a sandbox, verifies access, and produces a secret-free setup record.**

## 11. Technology references

- [Next.js support policy](https://nextjs.org/support-policy)
- [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output?lang=web)
- [Groq structured outputs](https://console.groq.com/docs/structured-outputs)
- [Playwright authentication testing](https://playwright.dev/docs/auth)
